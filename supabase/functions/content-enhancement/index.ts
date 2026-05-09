// Content enhancement service for categories and collections
// Generates SEO-optimized descriptions and content

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
        const { entity_type, entity_id, name, current_description, wallpaper_count } = await req.json();

        if (!entity_type || !entity_id || !name) {
            throw new Error('Entity type, ID, and name are required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing environment variables');
        }

        let enhancedContent: any = {};

        if (entity_type === 'category') {
            // Generate enhanced category content
            const categoryName = name.toLowerCase();
            
            // SEO title optimization
            const seoTitle = `${name} Wallpapers - Free HD ${name} Backgrounds | Best Free Wallpapers`;
            
            // Enhanced description with SEO keywords
            let contentDescription = `Discover our stunning collection of ${categoryName} wallpapers. `;
            contentDescription += `Download high-quality ${categoryName} backgrounds for your desktop, laptop, and mobile devices. `;
            
            if (wallpaper_count) {
                contentDescription += `Browse through ${wallpaper_count}+ premium ${categoryName} wallpapers. `;
            }
            
            contentDescription += `All ${categoryName} wallpapers are available in HD, 4K, and ultra-HD resolutions. `;
            contentDescription += `Perfect for personalizing your screen with beautiful ${categoryName} imagery.`;
            
            // Meta description (120-160 characters)
            const metaDescription = `Download free ${categoryName} wallpapers in HD. ${wallpaper_count || 'Hundreds of'} high-quality ${categoryName} backgrounds for desktop and mobile.`;
            
            // Voice search queries
            const voiceSearchQueries = [
                `show me ${categoryName} wallpapers`,
                `find ${categoryName} backgrounds`,
                `download ${categoryName} wallpapers`,
                `free ${categoryName} wallpapers`,
                `best ${categoryName} backgrounds`,
                `${categoryName} wallpapers for desktop`,
                `${categoryName} wallpapers for phone`,
                `hd ${categoryName} wallpapers`
            ];

            // SEO keywords
            const metaKeywords = [
                `${categoryName} wallpapers`,
                `${categoryName} backgrounds`,
                `free ${categoryName} wallpapers`,
                `hd ${categoryName} wallpapers`,
                `${categoryName} desktop wallpapers`,
                `${categoryName} mobile wallpapers`
            ];

            // Focus keyphrase
            const focusKeyphrase = `${categoryName} wallpapers`;

            enhancedContent = {
                seo_title: seoTitle,
                content_description: contentDescription,
                seo_description: metaDescription,
                meta_keywords: metaKeywords,
                voice_search_queries: voiceSearchQueries,
                focus_keyphrase: focusKeyphrase
            };

            // Update category
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${entity_id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(enhancedContent)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Category update failed: ${errorText}`);
            }

        } else if (entity_type === 'collection') {
            // Generate enhanced collection content
            const collectionName = name.toLowerCase();
            
            let description = `Explore our curated ${collectionName} collection featuring hand-picked wallpapers. `;
            description += `This ${collectionName} collection includes premium quality backgrounds perfect for any device. `;
            
            if (wallpaper_count) {
                description += `Discover ${wallpaper_count} carefully selected wallpapers in this collection. `;
            }
            
            description += `Download and enjoy these exceptional ${collectionName} wallpapers for free.`;

            enhancedContent = {
                description: description
            };

            // Update collection
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/collections?id=eq.${entity_id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(enhancedContent)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Collection update failed: ${errorText}`);
            }
        }

        // Create or update content freshness tracking
        await fetch(`${supabaseUrl}/rest/v1/content_freshness`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                entity_type,
                entity_id: entity_id.toString(),
                last_updated: new Date().toISOString(),
                update_frequency: 'monthly',
                freshness_score: 100,
                auto_update_enabled: true
            })
        });

        return new Response(JSON.stringify({
            data: {
                entity_type,
                entity_id,
                enhanced_content: enhancedContent,
                updated_at: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Content enhancement error:', error);

        const errorResponse = {
            error: {
                code: 'CONTENT_ENHANCEMENT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});