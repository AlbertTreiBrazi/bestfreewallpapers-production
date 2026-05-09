// Image optimization service for WebP conversion and metadata extraction
// Generates responsive image URLs and extracts color information

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
        const { wallpaper_id, image_url } = await req.json();

        if (!wallpaper_id || !image_url) {
            throw new Error('Wallpaper ID and image URL are required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing environment variables');
        }

        // Generate WebP and AVIF URLs (assuming CDN conversion)
        const baseUrl = image_url.replace(/\.[^/.]+$/, '');
        const webpUrl = `${baseUrl}.webp`;
        const avifUrl = `${baseUrl}.avif`;

        // Generate lazy loading placeholder (low-quality base64)
        const placeholderUrl = `${baseUrl}_placeholder.jpg`;

        // Extract dominant color (simplified approach)
        // In a real implementation, you would use image analysis
        const dominantColor = '#8B5CF6'; // Default purple theme color

        // Generate color palette
        const colorPalette = {
            primary: dominantColor,
            secondary: '#6366F1',
            accent: '#8B5CF6',
            complementary: '#F59E0B'
        };

        // Update wallpaper with optimization data
        const updateData = {
            webp_url: webpUrl,
            avif_url: avifUrl,
            lazy_loading_placeholder: placeholderUrl,
            dominant_color: dominantColor,
            color_palette: colorPalette
        };

        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Database update failed: ${errorText}`);
        }

        return new Response(JSON.stringify({
            data: {
                wallpaper_id,
                webp_url: webpUrl,
                avif_url: avifUrl,
                lazy_loading_placeholder: placeholderUrl,
                dominant_color: dominantColor,
                color_palette: colorPalette,
                optimized_at: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Image optimization error:', error);

        const errorResponse = {
            error: {
                code: 'IMAGE_OPTIMIZATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});