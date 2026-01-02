Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Use RPC function for optimized performance
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_collections_with_stats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error('Failed to fetch collections');
        }

        const collections = await response.json();

        // Enrich collections with first wallpaper image for thumbnails
        const enrichedCollections = await Promise.all(
            collections.map(async (collection: any) => {
                try {
                    // Fetch first wallpaper for this collection
                    const wallpaperResponse = await fetch(
                        `${supabaseUrl}/rest/v1/collection_wallpapers?collection_id=eq.${collection.id}&select=wallpaper:wallpapers(thumbnail_url,image_url)&limit=1`,
                        {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey
                            }
                        }
                    );

                    if (wallpaperResponse.ok) {
                        const wallpaperData = await wallpaperResponse.json();
                        if (wallpaperData.length > 0 && wallpaperData[0].wallpaper) {
                            return {
                                ...collection,
                                wallpapers: [wallpaperData[0].wallpaper]
                            };
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch wallpaper for collection ${collection.id}:`, err);
                }
                
                return collection;
            })
        );

        return new Response(JSON.stringify({
            data: enrichedCollections
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Collections API error:', error);
        
        const errorResponse = {
            error: {
                code: 'COLLECTIONS_FETCH_ERROR',
                message: error.message || 'Failed to fetch collections'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});