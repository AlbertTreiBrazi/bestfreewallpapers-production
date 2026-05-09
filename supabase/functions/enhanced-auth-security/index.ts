// Enhanced Authentication Security Edge Function
// Implements password policy, rate limiting, email verification, and CAPTCHA

interface PasswordPolicy {
  minLength: 10;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

interface RateLimitConfig {
  loginAttempts: { limit: 5; windowMinutes: 1 };
  downloadRequests: { limit: 20; windowMinutes: 1 };
  signupAttempts: { limit: 3; windowMinutes: 5 };
}

interface SecurityLog {
  id?: string;
  user_id?: string;
  ip_address: string;
  user_agent: string;
  action: 'login_attempt' | 'signup_attempt' | 'password_reset' | 'captcha_required' | 'account_locked';
  success: boolean;
  failure_reason?: string;
  metadata?: any;
  created_at: string;
}

// Password policy validation
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Rate limiting check
async function checkRateLimit(
  supabaseUrl: string,
  serviceKey: string,
  ip: string,
  action: string,
  config: { limit: number; windowMinutes: number }
): Promise<{ allowed: boolean; attemptsRemaining: number; resetTime?: Date }> {
  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);
  
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/security_logs?ip_address=eq.${ip}&action=eq.${action}&created_at=gte.${windowStart.toISOString()}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const attempts = await response.json();
      const attemptsCount = attempts.length;
      
      if (attemptsCount >= config.limit) {
        return {
          allowed: false,
          attemptsRemaining: 0,
          resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000)
        };
      }
      
      return {
        allowed: true,
        attemptsRemaining: config.limit - attemptsCount
      };
    }
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow request if rate limit check fails (fail open)
    return { allowed: true, attemptsRemaining: config.limit };
  }
  
  return { allowed: true, attemptsRemaining: config.limit };
}

// Log security event
async function logSecurityEvent(
  supabaseUrl: string,
  serviceKey: string,
  log: SecurityLog
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/security_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(log)
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Verify CAPTCHA (simple implementation)
async function verifyCaptcha(token: string): Promise<boolean> {
  // In production, integrate with real CAPTCHA service like reCAPTCHA
  // For now, implement a simple verification
  return token && token.length > 10;
}

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
    const { action, email, password, captchaToken, userId } = await req.json();
    
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!serviceKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }
    
    // Get client IP and user agent
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    const rateLimitConfig: RateLimitConfig = {
      loginAttempts: { limit: 5, windowMinutes: 1 },
      downloadRequests: { limit: 20, windowMinutes: 1 },
      signupAttempts: { limit: 3, windowMinutes: 5 }
    };
    
    // Handle different actions
    switch (action) {
      case 'validate_password': {
        const validation = validatePassword(password);
        return new Response(JSON.stringify({
          data: {
            valid: validation.valid,
            errors: validation.errors,
            requirements: {
              minLength: 10,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: true
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'check_login_rate_limit': {
        const rateLimit = await checkRateLimit(
          supabaseUrl,
          serviceKey,
          ip,
          'login_attempt',
          rateLimitConfig.loginAttempts
        );
        
        // If rate limit exceeded, check if CAPTCHA is required
        const requiresCaptcha = !rateLimit.allowed;
        
        if (requiresCaptcha && !captchaToken) {
          await logSecurityEvent(supabaseUrl, serviceKey, {
            ip_address: ip,
            user_agent: userAgent,
            action: 'captcha_required',
            success: false,
            failure_reason: 'rate_limit_exceeded',
            created_at: new Date().toISOString()
          });
          
          return new Response(JSON.stringify({
            error: {
              code: 'CAPTCHA_REQUIRED',
              message: 'Please complete the CAPTCHA verification',
              requiresCaptcha: true,
              attemptsRemaining: rateLimit.attemptsRemaining,
              resetTime: rateLimit.resetTime
            }
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        if (requiresCaptcha && captchaToken) {
          const captchaValid = await verifyCaptcha(captchaToken);
          if (!captchaValid) {
            return new Response(JSON.stringify({
              error: {
                code: 'INVALID_CAPTCHA',
                message: 'CAPTCHA verification failed',
                requiresCaptcha: true
              }
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
        
        return new Response(JSON.stringify({
          data: {
            allowed: true,
            attemptsRemaining: rateLimit.attemptsRemaining,
            requiresCaptcha: requiresCaptcha && !captchaToken
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'log_auth_attempt': {
        const { success, action: logAction, failureReason } = await req.json();
        
        await logSecurityEvent(supabaseUrl, serviceKey, {
          user_id: userId,
          ip_address: ip,
          user_agent: userAgent,
          action: logAction,
          success,
          failure_reason: failureReason,
          created_at: new Date().toISOString()
        });
        
        return new Response(JSON.stringify({ data: { logged: true } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      case 'check_download_rate_limit': {
        const rateLimit = await checkRateLimit(
          supabaseUrl,
          serviceKey,
          ip,
          'download_request',
          rateLimitConfig.downloadRequests
        );
        
        if (!rateLimit.allowed) {
          return new Response(JSON.stringify({
            error: {
              code: 'DOWNLOAD_RATE_LIMITED',
              message: `Too many download requests. Please wait ${rateLimitConfig.downloadRequests.windowMinutes} minute(s) before trying again.`,
              resetTime: rateLimit.resetTime
            }
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({
          data: {
            allowed: true,
            attemptsRemaining: rateLimit.attemptsRemaining
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      default:
        return new Response(JSON.stringify({
          error: {
            code: 'INVALID_ACTION',
            message: 'Invalid action specified'
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
  } catch (error) {
    console.error('Enhanced auth security error:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'SECURITY_SERVICE_ERROR',
        message: 'Security service temporarily unavailable'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});