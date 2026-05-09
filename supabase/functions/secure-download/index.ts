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
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Parse request data
    const { wallpaper_id, ad_gate_token, user_id } = await req.json();

    if (!wallpaper_id) {
      return new Response(JSON.stringify({
        error: { code: 'MISSING_WALLPAPER_ID', message: 'Wallpaper ID is required' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get wallpaper data
    const wallpaperResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!wallpaperResponse.ok) {
      throw new Error('Failed to fetch wallpaper');
    }

    const wallpapers = await wallpaperResponse.json();
    if (!wallpapers || wallpapers.length === 0) {
      return new Response(JSON.stringify({
        error: { code: 'WALLPAPER_NOT_FOUND', message: 'Wallpaper not found' }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const wallpaper = wallpapers[0];
    let isPremium = false;
    let userId = user_id;

    // Check user premium status if user is logged in
    if (userId) {
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (profileResponse.ok) {
        const profiles = await profileResponse.json();
        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          isPremium = profile.plan_type === 'premium' && 
                     (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
        }
      }
    }

    // Log download attempt
    const logEvent = async (event: string, details: any = {}) => {
      try {
        await fetch(`${supabaseUrl}/rest/v1/download_logs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            wallpaper_id,
            user_id: userId,
            event_type: event,
            details,
            created_at: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to log event:', error);
      }
    };

    // Premium users get instant download
    if (isPremium) {
      await logEvent('dl_start', { user_type: 'premium' });
      
      // Increment download count
      await fetch(
        `${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            download_count: (wallpaper.download_count || 0) + 1
          })
        }
      );

      await logEvent('dl_success', { user_type: 'premium' });
      
      return new Response(JSON.stringify({
        success: true,
        download_url: wallpaper.image_url,
        filename: `${wallpaper.slug || wallpaper.title.toLowerCase().replace(/\s+/g, '-')}.jpg`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Non-premium users must have valid ad gate token
    if (!ad_gate_token || ad_gate_token !== `ad_gate_${wallpaper_id}_${Date.now()}`.slice(0, 32)) {
      await logEvent('dl_blocked_no_gate', { 
        user_type: userId ? 'logged_non_premium' : 'guest',
        token_provided: !!ad_gate_token
      });
      
      return new Response(JSON.stringify({
        error: { 
          code: 'AD_GATE_REQUIRED', 
          message: 'Ad gate completion required for non-premium downloads' 
        }
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Valid ad gate token - allow download
    await logEvent('dl_start', { 
      user_type: userId ? 'logged_non_premium' : 'guest'
    });
    
    // Increment download count
    await fetch(
      `${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          download_count: (wallpaper.download_count || 0) + 1
        })
      }
    );

    await logEvent('dl_success', { 
      user_type: userId ? 'logged_non_premium' : 'guest'
    });
    
    return new Response(JSON.stringify({
      success: true,
      download_url: wallpaper.image_url,
      filename: `${wallpaper.slug || wallpaper.title.toLowerCase().replace(/\s+/g, '-')}.jpg`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorResponse = {
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
