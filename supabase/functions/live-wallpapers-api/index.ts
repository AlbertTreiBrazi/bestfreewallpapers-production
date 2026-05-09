// ============================================================================
// 🎬 live-wallpapers-api — Edge Function pentru Live Wallpapers
// FIX: admin_list acum filtrează is_active = true (fix pentru delete)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── R2 Upload Helper ──────────────────────────────────────────────────────
async function uploadToR2(
  fileData: string,
  fileName: string,
  folder: string,
  contentType: string
): Promise<string> {
  const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!
  const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!
  const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!
  const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!
  const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')!

  const base64 = fileData.includes(',') ? fileData.split(',')[1] : fileData
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }

  const key = `${folder}/${fileName}`
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const endpoint = `https://${host}/${R2_BUCKET_NAME}/${key}`
  const region = 'auto'
  const service = 's3'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateStamp = amzDate.slice(0, 8)

  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const payloadHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n'

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = [
    'PUT',
    `/${R2_BUCKET_NAME}/${key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const encoder = new TextEncoder()

  const crHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest))
  const crHex = Array.from(new Uint8Array(crHash))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, crHex].join('\n')

  const hmac = async (key: ArrayBuffer, data: string) => {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    return crypto.subtle.sign('HMAC', k, encoder.encode(data))
  }

  const kDate = await hmac(encoder.encode(`AWS4${R2_SECRET_ACCESS_KEY}`), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  const kSigning = await hmac(kService, 'aws4_request')
  const sigBuffer = await hmac(kSigning, stringToSign)
  const signature = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Host': host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': authHeader,
    },
    body: bytes,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`R2 upload failed: ${res.status} ${text}`)
  }

  return `${R2_PUBLIC_URL}/${key}`
}

// ── Main Handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { action } = body

    // ── LIST (public) ────────────────────────────────────────────────────
    if (action === 'list') {
      const { page = 0, pageSize = 24, search, sort = 'newest', onlyFree, category } = body

      let query = db
        .from('live_wallpapers')
        .select('*', { count: 'exact' })
        .eq('is_published', true)
        .eq('is_active', true)

      if (search) query = query.ilike('title', `%${search}%`)
      if (onlyFree) query = query.eq('is_premium', false)
      if (category) query = query.eq('category', category)

      if (sort === 'downloads') query = query.order('downloads_count', { ascending: false })
      else if (sort === 'popular') query = query.order('views_count', { ascending: false })
      else query = query.order('created_at', { ascending: false })

      query = query.range(page * pageSize, (page + 1) * pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error

      return new Response(
        JSON.stringify({ wallpapers: data, total: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── DETAIL (public) ──────────────────────────────────────────────────
    if (action === 'detail') {
      const { slug } = body
      const { data, error } = await db
        .from('live_wallpapers')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .eq('is_active', true)
        .single()

      if (error) throw error

      await db.from('live_wallpapers')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id)

      return new Response(
        JSON.stringify({ wallpaper: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── TRACK DOWNLOAD ───────────────────────────────────────────────────
    if (action === 'track_download') {
      const { id } = body
      const { data: current } = await db
        .from('live_wallpapers').select('downloads_count').eq('id', id).single()
      await db.from('live_wallpapers')
        .update({ downloads_count: (current?.downloads_count || 0) + 1 })
        .eq('id', id)

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── ADMIN LIST (FIX: filtrează is_active = true) ─────────────────────
    if (action === 'admin_list') {
      const { page = 0, pageSize = 20, search } = body
      let query = db
        .from('live_wallpapers')
        .select('*', { count: 'exact' })
        .eq('is_active', true)  // ← FIX: nu mai arată cele șterse
        .order('created_at', { ascending: false })

      if (search) query = query.ilike('title', `%${search}%`)
      query = query.range(page * pageSize, (page + 1) * pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error

      return new Response(
        JSON.stringify({ wallpapers: data, total: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── UPLOAD VIDEO ─────────────────────────────────────────────────────
    if (action === 'upload_video') {
      const { videoData, fileName } = body
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '-')}`
      const url = await uploadToR2(videoData, safeName, 'live-wallpapers', 'video/mp4')
      return new Response(
        JSON.stringify({ url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── UPLOAD THUMBNAIL ─────────────────────────────────────────────────
    if (action === 'upload_thumbnail') {
      const { imageData, fileName } = body
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '-')}`
      const url = await uploadToR2(imageData, safeName, 'live-wallpapers/thumbs', 'image/jpeg')
      return new Response(
        JSON.stringify({ url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── CREATE ───────────────────────────────────────────────────────────
    if (action === 'create') {
      const { title, slug, description, video_url, thumbnail_url, tags, category: wallpaperCategory, is_premium, is_published } = body
      const { data, error } = await db.from('live_wallpapers').insert({
        title, slug, description, video_url, thumbnail_url,
        tags: tags || [],
        category: wallpaperCategory || null,
        is_premium: is_premium || false,
        is_published: is_published !== false,
        is_active: true,
        downloads_count: 0,
        views_count: 0,
      }).select().single()

      if (error) throw error
      return new Response(JSON.stringify({ wallpaper: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── UPDATE ───────────────────────────────────────────────────────────
    if (action === 'update') {
      const { id, ...fields } = body
      delete fields.action
      const { data, error } = await db
        .from('live_wallpapers').update(fields).eq('id', id).select().single()
      if (error) throw error
      return new Response(JSON.stringify({ wallpaper: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── DELETE (soft delete: is_active = false) ───────────────────────────
    if (action === 'delete') {
      const { id } = body
      const { error } = await db
        .from('live_wallpapers')
        .update({ is_active: false, is_published: false })
        .eq('id', id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
