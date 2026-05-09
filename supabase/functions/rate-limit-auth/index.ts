/**
 * Rate Limiting Edge Function for Authentication Attempts
 * Limits: 5 attempts per 15 minutes per IP+email combination
 * 
 * CRITICAL: No external imports allowed in Deno environment
 */

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, ipAddress } = await req.json();
    
    if (!email || !ipAddress) {
      return new Response(
        JSON.stringify({ 
          error: { code: 'MISSING_PARAMS', message: 'Email and IP address required' },
          allowed: false
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase service role key for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: { code: 'CONFIG_ERROR', message: 'Supabase not configured' },
          allowed: true // Fail open for availability
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create unique identifier for rate limiting
    const identifier = `${ipAddress}:${email}`;
    const windowMinutes = 15;
    const maxAttempts = 5;
    const now = new Date().toISOString();
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    // Query rate_limit_tracking table
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/rate_limit_tracking?identifier=eq.${encodeURIComponent(identifier)}&created_at=gte.${windowStart}&select=count`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );

    if (!countResponse.ok) {
      // Fail open - allow request if database query fails
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          remaining: maxAttempts,
          resetAt: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString()
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const countHeader = countResponse.headers.get('content-range');
    const attemptCount = countHeader ? parseInt(countHeader.split('/')[1]) : 0;

    // Check if rate limit exceeded
    if (attemptCount >= maxAttempts) {
      // Log violation
      await fetch(
        `${supabaseUrl}/rest/v1/rate_limit_violations`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            identifier,
            email,
            ip_address: ipAddress,
            violation_type: 'auth_rate_limit',
            attempt_count: attemptCount
          })
        }
      );

      return new Response(
        JSON.stringify({ 
          allowed: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many authentication attempts. Please try again in ${windowMinutes} minutes.`
          },
          remaining: 0,
          resetAt: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString()
        }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record attempt
    await fetch(
      `${supabaseUrl}/rest/v1/rate_limit_tracking`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          identifier,
          email,
          ip_address: ipAddress,
          action_type: 'auth_attempt'
        })
      }
    );

    // Allow request
    return new Response(
      JSON.stringify({ 
        allowed: true,
        remaining: maxAttempts - attemptCount - 1,
        resetAt: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString()
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Fail open - allow request on error for availability
    return new Response(
      JSON.stringify({ 
        allowed: true,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
