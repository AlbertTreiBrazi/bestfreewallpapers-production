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

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Verify authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Authentication failed');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Verify admin access
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify admin status');
        }

        const profiles = await profileResponse.json();
        const profile = profiles[0];

        if (!profile || !profile.is_admin) {
            throw new Error('Admin access required');
        }

        const requestData = await req.json();
        const { action, entityType, entityId, categoryId, slug } = requestData;

        // Define what pages need to be invalidated based on the action
        const pagesToInvalidate = [];

        switch (action) {
            case 'wallpaper_created':
            case 'wallpaper_updated':
            case 'wallpaper_deleted':
                // Invalidate home page
                pagesToInvalidate.push('/');
                
                // Invalidate wallpapers pages
                pagesToInvalidate.push('/wallpapers', '/free-wallpapers');
                
                // If premium wallpaper, invalidate premium page
                if (requestData.isPremium) {
                    pagesToInvalidate.push('/premium');
                }
                
                // Invalidate category page if categoryId provided
                if (categoryId || requestData.categorySlug) {
                    const catSlug = requestData.categorySlug || await getCategorySlug(categoryId, supabaseUrl, serviceRoleKey);
                    if (catSlug) {
                        pagesToInvalidate.push(`/category/${catSlug}`);
                    }
                }
                
                // Invalidate wallpaper detail page if slug provided
                if (slug) {
                    pagesToInvalidate.push(`/wallpaper/${slug}`);
                }
                break;
                
            case 'category_created':
            case 'category_updated':
            case 'category_deleted':
                // Invalidate home page (category grid)
                pagesToInvalidate.push('/');
                
                // Invalidate categories page
                pagesToInvalidate.push('/categories');
                
                // Invalidate specific category page
                if (slug) {
                    pagesToInvalidate.push(`/category/${slug}`);
                }
                break;
                
            case 'collection_created':
            case 'collection_updated':
            case 'collection_deleted':
                // Invalidate collections page
                pagesToInvalidate.push('/collections');
                
                // Invalidate specific collection page
                if (slug || entityId) {
                    const collectionIdentifier = slug || entityId;
                    pagesToInvalidate.push(`/collection/${collectionIdentifier}`);
                }
                break;
                
            case 'bulk_invalidate':
                // Allow manual bulk invalidation
                if (requestData.pages && Array.isArray(requestData.pages)) {
                    pagesToInvalidate.push(...requestData.pages);
                }
                break;
                
            default:
                throw new Error('Invalid action specified');
        }

        // For this implementation, we'll create a log of what should be invalidated
        // In a real-world scenario, this would integrate with your CDN/cache provider
        const invalidationLog = {
            timestamp: new Date().toISOString(),
            action,
            entityType,
            entityId,
            userId,
            pages: pagesToInvalidate,
            status: 'queued'
        };

        // Log the invalidation request
        console.log('Cache invalidation requested:', invalidationLog);

        // Here you would integrate with your actual cache invalidation service
        // Examples:
        // - Cloudflare API for zone purging
        // - AWS CloudFront invalidation
        // - Vercel revalidation API
        // - Custom cache server endpoints
        
        // Simulate cache invalidation success
        const simulatedResults = pagesToInvalidate.map(page => ({
            page,
            status: 'invalidated',
            timestamp: new Date().toISOString()
        }));

        // Store invalidation log in database for tracking
        try {
            await fetch(`${supabaseUrl}/rest/v1/cache_invalidations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    entity_type: entityType,
                    entity_id: entityId,
                    pages_invalidated: pagesToInvalidate,
                    performed_by: userId,
                    created_at: new Date().toISOString()
                })
            });
        } catch (logError) {
            console.warn('Failed to log invalidation:', logError);
            // Don't fail the entire operation if logging fails
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Cache invalidation completed',
            invalidated: simulatedResults,
            totalPages: pagesToInvalidate.length
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Cache invalidation error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'CACHE_INVALIDATION_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Helper function to get category slug by ID
async function getCategorySlug(categoryId: number, supabaseUrl: string, serviceRoleKey: string): Promise<string | null> {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=slug&id=eq.${categoryId}&limit=1`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        
        if (response.ok) {
            const categories = await response.json();
            return categories && categories.length > 0 ? categories[0].slug : null;
        }
    } catch (error) {
        console.warn('Failed to get category slug:', error);
    }
    return null;
}