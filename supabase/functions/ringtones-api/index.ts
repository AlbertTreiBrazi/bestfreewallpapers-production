// ============================================================================
// 🎵 RINGTONES-API
// ============================================================================
// Endpoint: POST /functions/v1/ringtones-api
// Purpose: List ringtones with filtering, search, pagination
//
// Body parameters (all optional):
//   - page: number (default 1)
//   - limit: number (default 24, max 60)
//   - genre: string (slug, e.g. "rock")
//   - mood: string (slug, e.g. "calm")
//   - use_case: string (slug, e.g. "phone-call")
//   - is_premium: boolean (filter premium-only or free-only)
//   - onlyFree: boolean (only free ringtones)
//   - search: string (search in title and description)
//   - sort: 'newest' | 'popular' | 'downloads' | 'random' (default 'newest')
//
// Returns: { success, data: { ringtones, total, page, totalPages } }
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
    const {
      sort = 'newest',
      limit = 24,
      page = 1,
      genre,
      mood,
      use_case,
      is_premium,
      onlyFree,
      search
    } = requestData;

    // Validate and clamp limits
    const safeLimit = Math.min(Math.max(parseInt(limit) || 24, 1), 60);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

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

    // ----- Resolve category slugs to IDs -----
    let genreId: number | null = null;
    let moodId: number | null = null;
    let useCaseId: number | null = null;

    if (genre || mood || use_case) {
      const slugs = [genre, mood, use_case].filter(Boolean).join(',');
      const catResponse = await fetch(
        `${supabaseUrl}/rest/v1/ringtone_categories?select=id,slug,category_type&slug=in.(${slugs})&is_active=eq.true`,
        { headers: supabaseHeaders }
      );

      if (catResponse.ok) {
        const cats = await catResponse.json();
        for (const c of cats) {
          if (c.slug === genre && c.category_type === 'genre') genreId = c.id;
          if (c.slug === mood && c.category_type === 'mood') moodId = c.id;
          if (c.slug === use_case && c.category_type === 'use_case') useCaseId = c.id;
        }
      }
    }

    // ----- Build query -----
    let query = `${supabaseUrl}/rest/v1/ringtones?select=id,title,slug,description,audio_url,waveform_url,duration_seconds,genre_id,mood_id,use_case_id,tags,is_premium,downloads_count,plays_count,created_at,creator_name`;

    // Filters: only published & active by default
    query += '&is_active=eq.true&is_published=eq.true&visibility=eq.public';

    if (genreId) query += `&genre_id=eq.${genreId}`;
    if (moodId) query += `&mood_id=eq.${moodId}`;
    if (useCaseId) query += `&use_case_id=eq.${useCaseId}`;

    if (onlyFree === true) {
      query += '&is_premium=eq.false';
    } else if (typeof is_premium === 'boolean') {
      query += `&is_premium=eq.${is_premium}`;
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const safeSearch = search.trim().replace(/[%_]/g, '\\$&').replace(/[(),]/g, '');
      query += `&or=(title.ilike.*${encodeURIComponent(safeSearch)}*,description.ilike.*${encodeURIComponent(safeSearch)}*)`;
    }

    // Sorting
    switch (sort) {
      case 'newest':
        query += '&order=created_at.desc';
        break;
      case 'popular':
        query += '&order=plays_count.desc.nullslast,downloads_count.desc.nullslast';
        break;
      case 'downloads':
        query += '&order=downloads_count.desc.nullslast';
        break;
      case 'random':
        // Postgres doesn't support random() through PostgREST easily; fall back to newest
        query += '&order=created_at.desc';
        break;
      default:
        query += '&order=created_at.desc';
    }

    // Pagination
    query += `&limit=${safeLimit}&offset=${offset}`;

    // Fetch data + count using PostgREST Prefer: count=exact
    const dataResponse = await fetch(query, {
      headers: { ...supabaseHeaders, 'Prefer': 'count=exact' }
    });

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      console.error('Ringtones fetch failed:', errorText);
      throw new Error(`Failed to fetch ringtones: ${dataResponse.status}`);
    }

    const ringtones = await dataResponse.json();

    // Parse total count from Content-Range header (e.g., "0-23/156")
    const contentRange = dataResponse.headers.get('content-range') || '';
    const totalMatch = contentRange.match(/\/(\d+)$/);
    const total = totalMatch ? parseInt(totalMatch[1]) : ringtones.length;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ringtones,
          total,
          page: safePage,
          limit: safeLimit,
          totalPages
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    );

  } catch (error) {
    console.error('Ringtones-api error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { ringtones: [], total: 0, page: 1, totalPages: 0 }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
