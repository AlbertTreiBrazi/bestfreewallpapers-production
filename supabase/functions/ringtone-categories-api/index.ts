// ============================================================================
// 🎵 RINGTONE-CATEGORIES-API
// ============================================================================
// Endpoint: GET or POST /functions/v1/ringtone-categories-api
// Purpose: List all active ringtone categories (genres, moods, use_cases)
//          with count of ringtones in each category.
//
// Body (optional, for POST): { type: 'genre' | 'mood' | 'use_case' }
// Query string (optional, for GET): ?type=genre
//
// Returns:
//   {
//     success: true,
//     data: {
//       genres: [...],
//       moods: [...],
//       use_cases: [...],
//       all: [...]   // flat list of everything
//     }
//   }
// ============================================================================

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Read filter from either body (POST) or query string (GET)
    let typeFilter: string | undefined;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      typeFilter = body?.type;
    } else {
      const url = new URL(req.url);
      typeFilter = url.searchParams.get('type') || undefined;
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

    // ----- Fetch all active categories -----
    let query = `${supabaseUrl}/rest/v1/ringtone_categories?select=id,name,slug,description,category_type,sort_order,preview_image,seo_title,seo_description&is_active=eq.true&order=category_type.asc,sort_order.asc`;

    if (typeFilter && ['genre', 'mood', 'use_case'].includes(typeFilter)) {
      query += `&category_type=eq.${typeFilter}`;
    }

    const catsResponse = await fetch(query, { headers: supabaseHeaders });

    if (!catsResponse.ok) {
      throw new Error(`Failed to fetch categories: ${catsResponse.status}`);
    }

    const allCategories = await catsResponse.json();

    // ----- Fetch counts for each category in parallel -----
    // We count published ringtones in each category for the user-facing badge
    const countPromises = allCategories.map(async (cat: any) => {
      const fkColumn = cat.category_type === 'genre' ? 'genre_id' :
                       cat.category_type === 'mood' ? 'mood_id' :
                       'use_case_id';

      try {
        const countResp = await fetch(
          `${supabaseUrl}/rest/v1/ringtones?select=id&${fkColumn}=eq.${cat.id}&is_active=eq.true&is_published=eq.true&visibility=eq.public&limit=1`,
          { headers: { ...supabaseHeaders, 'Prefer': 'count=exact' } }
        );

        if (!countResp.ok) return 0;

        const range = countResp.headers.get('content-range') || '';
        const m = range.match(/\/(\d+)$/);
        return m ? parseInt(m[1]) : 0;
      } catch {
        return 0;
      }
    });

    const counts = await Promise.all(countPromises);

    // Attach counts
    const categoriesWithCount = allCategories.map((cat: any, i: number) => ({
      ...cat,
      ringtones_count: counts[i] || 0
    }));

    // ----- Group by type -----
    const result = {
      genres: categoriesWithCount.filter((c: any) => c.category_type === 'genre'),
      moods: categoriesWithCount.filter((c: any) => c.category_type === 'mood'),
      use_cases: categoriesWithCount.filter((c: any) => c.category_type === 'use_case'),
      all: categoriesWithCount
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900'
        }
      }
    );

  } catch (error) {
    console.error('Ringtone-categories-api error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { genres: [], moods: [], use_cases: [], all: [] }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
