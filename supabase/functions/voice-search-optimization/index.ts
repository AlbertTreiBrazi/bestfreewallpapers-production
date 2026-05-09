// Voice search optimization service
// Processes voice queries and provides optimized responses

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
        const { query, action = 'search' } = await req.json();

        if (!query) {
            throw new Error('Search query is required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing environment variables');
        }

        // Analyze voice query intent and structure
        const normalizedQuery = query.toLowerCase().trim();
        let searchIntent = 'transactional';
        let answerType = 'direct';
        let optimizedResponse = '';
        let suggestedActions: any[] = [];

        // Detect search intent patterns
        if (normalizedQuery.includes('how to') || normalizedQuery.includes('tutorial') || normalizedQuery.includes('guide')) {
            searchIntent = 'informational';
            answerType = 'how-to';
        } else if (normalizedQuery.includes('show me') || normalizedQuery.includes('find') || normalizedQuery.includes('search')) {
            searchIntent = 'navigational';
            answerType = 'list';
        } else if (normalizedQuery.includes('download') || normalizedQuery.includes('get')) {
            searchIntent = 'transactional';
            answerType = 'direct';
        }

        // Extract category and keywords from query
        const categories = ['nature', 'abstract', 'technology', 'gaming', 'anime', 'space', 'cars', 'sports', 'animals', 'architecture'];
        const devices = ['desktop', 'mobile', 'phone', 'tablet', 'laptop', 'iphone', 'android'];
        const resolutions = ['hd', '4k', 'uhd', 'ultra', 'high resolution'];

        let detectedCategory = null;
        let detectedDevice = null;
        let detectedResolution = null;

        // Category detection
        for (const category of categories) {
            if (normalizedQuery.includes(category)) {
                detectedCategory = category;
                break;
            }
        }

        // Device detection
        for (const device of devices) {
            if (normalizedQuery.includes(device)) {
                detectedDevice = device;
                break;
            }
        }

        // Resolution detection
        for (const resolution of resolutions) {
            if (normalizedQuery.includes(resolution)) {
                detectedResolution = resolution;
                break;
            }
        }

        if (action === 'search') {
            // Perform optimized search based on voice query
            let searchUrl = '/search?q=' + encodeURIComponent(query);
            
            if (detectedCategory) {
                searchUrl = `/category/${detectedCategory}`;
                optimizedResponse = `I found ${detectedCategory} wallpapers for you. Showing the best ${detectedCategory} backgrounds.`;
            } else if (normalizedQuery.includes('latest') || normalizedQuery.includes('newest')) {
                searchUrl = '/wallpapers?sort=newest';
                optimizedResponse = 'Here are the latest wallpapers uploaded to our collection.';
            } else if (normalizedQuery.includes('popular') || normalizedQuery.includes('trending')) {
                searchUrl = '/wallpapers?sort=popular';
                optimizedResponse = 'These are the most popular wallpapers right now.';
            } else {
                optimizedResponse = `I found wallpapers matching "${query}". Here are the best results.`;
            }

            // Add device-specific suggestions
            if (detectedDevice) {
                suggestedActions.push({
                    type: 'filter',
                    label: `Filter for ${detectedDevice}`,
                    url: `${searchUrl}&device=${detectedDevice}`
                });
            }

            // Add resolution-specific suggestions
            if (detectedResolution) {
                suggestedActions.push({
                    type: 'filter',
                    label: `Show ${detectedResolution} quality`,
                    url: `${searchUrl}&resolution=${detectedResolution}`
                });
            }

        } else if (action === 'faq') {
            // Generate FAQ-style responses for common voice queries
            if (normalizedQuery.includes('how to download')) {
                optimizedResponse = 'To download a wallpaper, simply click on the image you like, then click the Download button. Choose your preferred resolution and the download will start automatically.';
                answerType = 'how-to';
            } else if (normalizedQuery.includes('free')) {
                optimizedResponse = 'Yes, all our wallpapers are completely free to download. No registration required for basic downloads.';
                answerType = 'direct';
            } else if (normalizedQuery.includes('resolution') || normalizedQuery.includes('quality')) {
                optimizedResponse = 'We offer wallpapers in multiple resolutions: HD (1920x1080), 4K (3840x2160), and Ultra HD. Premium users get access to all resolutions.';
                answerType = 'list';
            }
        }

        // Store voice query for analytics
        const voiceQueryData = {
            query: normalizedQuery,
            search_intent: searchIntent,
            answer_type: answerType,
            optimized_response: optimizedResponse,
            confidence_score: 0.8,
            usage_count: 1,
            wallpaper_id: null,
            category_id: null
        };

        // Insert voice query record
        await fetch(`${supabaseUrl}/rest/v1/voice_search_queries`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(voiceQueryData)
        });

        return new Response(JSON.stringify({
            data: {
                query: normalizedQuery,
                search_intent: searchIntent,
                answer_type: answerType,
                optimized_response: optimizedResponse,
                detected_category: detectedCategory,
                detected_device: detectedDevice,
                detected_resolution: detectedResolution,
                suggested_actions: suggestedActions,
                timestamp: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Voice search optimization error:', error);

        const errorResponse = {
            error: {
                code: 'VOICE_SEARCH_OPTIMIZATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});