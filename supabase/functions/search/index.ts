Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { query, type, category, limit = 20, premium } = await req.json();

        if (!query || query.trim().length === 0) {
            throw new Error('Search query is required');
        }

        if (!type || !['wallpapers', 'portfolio', 'blog'].includes(type)) {
            throw new Error('Search type must be wallpapers, portfolio, or blog');
        }

        // Get environment variables
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        let searchResults = [];
        const searchTerm = query.trim().toLowerCase();

        if (type === 'wallpapers') {
            // Build wallpapers search query
            let wallpaperQuery = `title.ilike.*${searchTerm}*,or(description.ilike.*${searchTerm}*)`;
            
            // Add category filter if provided
            if (category && category !== 'all') {
                wallpaperQuery += `,category.ilike.*${category}*`;
            }

            // Build query URL with filters
            let queryUrl = `${supabaseUrl}/rest/v1/wallpapers?${wallpaperQuery}&is_active=eq.true`;
            
            // Add premium filter
            if (premium !== undefined) {
                queryUrl += `&is_premium=eq.${premium}`;
            }
            
            queryUrl += `&limit=${limit}`;

            const response = await fetch(queryUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wallpapers search failed: ${errorText}`);
            }

            searchResults = await response.json();

        } else if (type === 'portfolio') {
            // Search portfolio items
            const response = await fetch(`${supabaseUrl}/rest/v1/portfolio_items?title.ilike.*${searchTerm}*,or(description.ilike.*${searchTerm}*)&is_published=eq.true&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Portfolio search failed: ${errorText}`);
            }

            searchResults = await response.json();

        } else if (type === 'blog') {
            // Search blog posts
            const response = await fetch(`${supabaseUrl}/rest/v1/blog_posts?title.ilike.*${searchTerm}*,or(content.ilike.*${searchTerm}*)&is_published=eq.true&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Blog search failed: ${errorText}`);
            }

            searchResults = await response.json();
        }

        return new Response(JSON.stringify({
            data: {
                results: searchResults,
                query: query,
                type: type,
                count: searchResults.length,
                category: category || null
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Search error:', error);

        return new Response(JSON.stringify({
            error: {
                code: 'SEARCH_FAILED',
                message: error.message
            }
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
