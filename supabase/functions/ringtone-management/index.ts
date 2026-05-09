// ============================================================================
// 🎵 RINGTONE-MANAGEMENT EDGE FUNCTION
// ============================================================================
// Admin-only endpoint pentru:
//   - upload-audio  : urcă MP3 în R2, returnează URL public
//   - create        : creează ringtone în DB
//   - update        : editează ringtone
//   - delete        : șterge ringtone (soft: is_active=false)
//   - list          : listing admin (include nepublicate)
//   - toggle-publish: publică / dezpublică
//
// Validări la upload-audio:
//   - Doar fișiere audio/mpeg (MP3)
//   - Durata ≤ 30 secunde (citită din header MP3)
//   - Dimensiune ≤ 5 MB
//
// Folder R2: ringtones/
// URL public: cdn.bestfreewallpapers.com/ringtones/filename.mp3
// ============================================================================

import { S3Client, PutObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    const supabaseHeaders = {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    };

    // =========================================================
    // ACTION: list — for admin panel listing
    // =========================================================
    if (action === 'list') {
      const { page = 1, limit = 20, search = '' } = body;
      const offset = (page - 1) * limit;

      let query = `${supabaseUrl}/rest/v1/ringtones?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
      if (search) {
        query += `&title=ilike.*${encodeURIComponent(search)}*`;
      }

      const resp = await fetch(query, {
        headers: { ...supabaseHeaders, 'Prefer': 'count=exact' },
      });

      if (!resp.ok) throw new Error(`DB list error: ${resp.status}`);

      const ringtones = await resp.json();
      const range = resp.headers.get('content-range') || '';
      const total = parseInt(range.match(/\/(\d+)$/)?.[1] || '0');

      return new Response(
        JSON.stringify({ success: true, data: { ringtones, total, page } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // ACTION: upload-audio — Upload MP3 to Cloudflare R2
    // =========================================================
    if (action === 'upload-audio') {
      const { audioData, fileName } = body;

      if (!audioData || !fileName) {
        return new Response(JSON.stringify({ error: 'audioData and fileName required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Decode base64
      const base64 = audioData.replace(/^data:[^;]+;base64,/, '');
      let binaryData: Uint8Array;
      try {
        const binaryString = atob(base64);
        binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }
      } catch {
        throw new Error('Invalid base64 audio data');
      }

      // Validate size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (binaryData.length > maxSize) {
        throw new Error(`File too large. Maximum 5MB, got ${(binaryData.length / 1024 / 1024).toFixed(2)}MB`);
      }

      // Validate MP3 by checking magic bytes (ID3 header or MPEG sync)
      const isMP3 = (
        (binaryData[0] === 0x49 && binaryData[1] === 0x44 && binaryData[2] === 0x33) || // ID3
        (binaryData[0] === 0xFF && (binaryData[1] & 0xE0) === 0xE0) // MPEG sync
      );
      if (!isMP3) {
        throw new Error('Invalid file format. Only MP3 files are allowed.');
      }

      const clientDuration = parseInt(body.duration_seconds) || 0;
      if (clientDuration > 30) {
        throw new Error(`Ringtone is ${clientDuration} seconds. Maximum allowed is 30 seconds.`);
      }

      // Cloudflare R2 setup
      const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || Deno.env.get('R2_ACCOUNT_ID');
      const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
      const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
      const bucketName = Deno.env.get('R2_BUCKET') || 'bestfreewallpapers';
      const publicUrlBase = (Deno.env.get('R2_PUBLIC_URL') || 'https://cdn.bestfreewallpapers.com').replace(/\/$/, '');

      if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error('Cloudflare R2 configuration missing.');
      }

      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });

      // Build safe filename
      const timestamp = Date.now();
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.mp3$/i, '');
      const r2Key = `ringtones/${timestamp}-${safeFileName}.mp3`;

      // Upload to R2
      await r2Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: binaryData,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=31536000',
      }));

      const publicUrl = `${publicUrlBase}/${r2Key}`;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            url: publicUrl,
            key: r2Key,
            size_bytes: binaryData.length,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // ACTION: create — Insert ringtone in DB
    // =========================================================
    if (action === 'create') {
      const {
        title, slug, description,
        audio_url, duration_seconds,
        cover_image_url,
        genre_id, mood_id, use_case_id,
        tags, is_premium, is_published,
        seo_title, seo_description, meta_keywords,
        ai_tool, ai_prompt,
      } = body;

      if (!title || !slug || !audio_url || !duration_seconds) {
        return new Response(JSON.stringify({ error: 'title, slug, audio_url, duration_seconds required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload: Record<string, any> = {
        title: title.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: description?.trim() || null,
        audio_url,
        cover_image_url: cover_image_url?.trim() || null,
        duration_seconds: Math.min(parseInt(duration_seconds), 30),
        genre_id: genre_id || null,
        mood_id: mood_id || null,
        use_case_id: use_case_id || null,
        tags: Array.isArray(tags) ? tags : [],
        is_premium: Boolean(is_premium),
        is_published: Boolean(is_published),
        is_active: true,
        creator_name: 'BestFreeWallpapers',
        ai_generated: true,
        ai_tool: ai_tool || 'suno',
        ai_prompt: ai_prompt || null,
        seo_title: seo_title?.trim() || null,
        seo_description: seo_description?.trim() || null,
        meta_keywords: Array.isArray(meta_keywords) ? meta_keywords : [],
        published_at: is_published ? new Date().toISOString() : null,
      };

      const resp = await fetch(`${supabaseUrl}/rest/v1/ringtones`, {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`DB create error ${resp.status}: ${errText}`);
      }

      const created = await resp.json();
      return new Response(
        JSON.stringify({ success: true, data: Array.isArray(created) ? created[0] : created }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // ACTION: update — Edit ringtone
    // =========================================================
    if (action === 'update') {
      const { id, ...fields } = body;
      if (!id) throw new Error('id required');

      // Only allow safe fields to be updated
      const allowed = ['title','slug','description','genre_id','mood_id','use_case_id',
        'tags','is_premium','is_published','seo_title','seo_description','meta_keywords',
        'ai_tool','ai_prompt','audio_url','duration_seconds','cover_image_url'];
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const k of allowed) {
        if (k in fields) patch[k] = fields[k];
      }
      if ('is_published' in patch && patch.is_published && !fields.published_at) {
        patch.published_at = new Date().toISOString();
      }

      const resp = await fetch(`${supabaseUrl}/rest/v1/ringtones?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify(patch),
      });

      if (!resp.ok) throw new Error(`DB update error: ${resp.status}`);
      const updated = await resp.json();
      return new Response(
        JSON.stringify({ success: true, data: Array.isArray(updated) ? updated[0] : updated }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // ACTION: delete — Soft delete (is_active = false)
    // =========================================================
    if (action === 'delete') {
      const { id } = body;
      if (!id) throw new Error('id required');

      const resp = await fetch(`${supabaseUrl}/rest/v1/ringtones?id=eq.${id}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({ is_active: false, is_published: false, updated_at: new Date().toISOString() }),
      });

      if (!resp.ok) throw new Error(`DB delete error: ${resp.status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Ringtone deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // ACTION: toggle-publish
    // =========================================================
    if (action === 'toggle-publish') {
      const { id, is_published } = body;
      if (!id) throw new Error('id required');

      const patch: Record<string, any> = {
        is_published: Boolean(is_published),
        updated_at: new Date().toISOString(),
      };
      if (is_published) patch.published_at = new Date().toISOString();

      const resp = await fetch(`${supabaseUrl}/rest/v1/ringtones?id=eq.${id}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(patch),
      });

      if (!resp.ok) throw new Error(`DB toggle-publish error: ${resp.status}`);
      return new Response(
        JSON.stringify({ success: true, is_published: Boolean(is_published) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ringtone-management] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
