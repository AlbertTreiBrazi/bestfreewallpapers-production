// ============================================================================
// 🎵 RINGTONE-DETAIL
// ============================================================================
// Endpoint: POST /functions/v1/ringtone-detail
// Purpose: Get full details of one ringtone by slug, including category info
//          and related ringtones (same genre, max 4)
//
// Body:
//   { "slug": "rock-energy-call" }
//
// Returns:
//   {
//     success: true,
//     data: {
//       ringtone: { ...full data... genre: {}, mood: {}, use_case: {} },
//       related: [ ...up to 4 related ringtones... ]
//     }
//   }
// ============================================================================

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestData = await req.json().catch(() => ({}));
    const { slug } = requestData;

    if (!slug || typeof slug !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    const supabaseHeaders = {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    };

    // ----- Fetch the ringtone by slug -----
    // Sanitize slug to allow only safe characters
    const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');

    if (!safeSlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid slug' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ringtoneResponse = await fetch(
      `${supabaseUrl}/rest/v1/ringtones?select=*&slug=eq.${safeSlug}&is_active=eq.true&is_published=eq.true&limit=1`,
      { headers: supabaseHeaders }
    );

    if (!ringtoneResponse.ok) {
      throw new Error(`Failed to fetch ringtone: ${ringtoneResponse.status}`);
    }

    const ringtones = await ringtoneResponse.json();

    if (!Array.isArray(ringtones) || ringtones.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'not_found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ringtone = ringtones[0];

    // ----- Fetch category details (genre, mood, use_case) -----
    const categoryIds = [ringtone.genre_id, ringtone.mood_id, ringtone.use_case_id]
      .filter(id => id !== null && id !== undefined);

    let categoriesMap: Record<number, any> = {};

    if (categoryIds.length > 0) {
      const catsResponse = await fetch(
        `${supabaseUrl}/rest/v1/ringtone_categories?select=id,name,slug,description,category_type&id=in.(${categoryIds.join(',')})`,
        { headers: supabaseHeaders }
      );

      if (catsResponse.ok) {
        const cats = await catsResponse.json();
        for (const c of cats) {
          categoriesMap[c.id] = c;
        }
      }
    }

    // Attach category objects to ringtone
    ringtone.genre = ringtone.genre_id ? categoriesMap[ringtone.genre_id] || null : null;
    ringtone.mood = ringtone.mood_id ? categoriesMap[ringtone.mood_id] || null : null;
    ringtone.use_case = ringtone.use_case_id ? categoriesMap[ringtone.use_case_id] || null : null;

    // ----- Fetch related ringtones (same genre, exclude self) -----
    let related: any[] = [];

    if (ringtone.genre_id) {
      const relatedResponse = await fetch(
        `${supabaseUrl}/rest/v1/ringtones?select=id,title,slug,description,audio_url,waveform_url,duration_seconds,is_premium,downloads_count,creator_name&genre_id=eq.${ringtone.genre_id}&id=neq.${ringtone.id}&is_active=eq.true&is_published=eq.true&visibility=eq.public&order=downloads_count.desc.nullslast&limit=4`,
        { headers: supabaseHeaders }
      );

      if (relatedResponse.ok) {
        related = await relatedResponse.json();
      }
    }

    // ----- Increment plays count (fire and forget, don't await) -----
    // We do this asynchronously so the response isn't delayed
    fetch(
      `${supabaseUrl}/rest/v1/rpc/increment_ringtone_plays`,
      {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({ ringtone_id_input: ringtone.id })
      }
    ).catch(err => console.error('Failed to increment plays:', err));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ringtone,
          related
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600'
        }
      }
    );

  } catch (error) {
    console.error('Ringtone-detail error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
