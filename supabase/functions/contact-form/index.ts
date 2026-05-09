Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false',
    'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none'; frame-src 'none'"
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Input sanitization function to prevent XSS attacks
  function sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input || '');
    }
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, 'javascript&#58;')
      .replace(/vbscript:/gi, 'vbscript&#58;')
      .replace(/data:(?!image\/(png|jpeg|jpg|gif|webp|svg\+xml))/gi, 'data&#58;');
  }

  // Validate if content contains potentially dangerous elements
  function isContentSafe(input: string): boolean {
    if (typeof input !== 'string') {
      return true;
    }
    
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /<\/script>/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i, // Event handlers like onclick, onload, etc.
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
      /<form[^>]*>/i,
      /<meta[^>]*>/i,
      /<link[^>]*>/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(input));
  }

  try {
    // Extract form data from request body
    const requestData = await req.json();
    const { name, email, subject, message, _csrf, timestamp } = requestData;

    // Validate required fields and sanitize inputs
    if (!name || !email || !message) {
      throw new Error('Name, email, and message are required');
    }

    // Sanitize all input fields to prevent XSS
    const sanitizedName = sanitizeInput(name.trim());
    const sanitizedEmail = email.trim(); // Email will be validated, don't need HTML sanitization
    const sanitizedSubject = sanitizeInput((subject || 'General Inquiry').trim());
    const sanitizedMessage = sanitizeInput(message.trim());

    // Check for potentially dangerous content
    if (!isContentSafe(name) || !isContentSafe(subject || '') || !isContentSafe(message)) {
      console.warn('Potentially dangerous content detected in contact form:', {
        name: name.substring(0, 50),
        subject: (subject || '').substring(0, 50),
        email: email
      });
      // Still allow submission but log for security monitoring
    }

    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Get Supabase service role key
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    // Insert contact message into database
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: sanitizedName,
        email: sanitizedEmail,
        subject: sanitizedSubject,
        message: sanitizedMessage,
        status: 'unread',
        created_at: new Date().toISOString()
      })
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      throw new Error(`Failed to save message: ${errorText}`);
    }

    const savedMessage = await insertResponse.json();

    // Return success response
    return new Response(JSON.stringify({
      data: {
        success: true,
        message: 'Thank you for your message! We will get back to you within 24 hours.',
        messageId: savedMessage[0]?.id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Contact form error:', error);

    const errorResponse = {
      error: {
        code: 'CONTACT_FORM_ERROR',
        message: error.message || 'Failed to send message. Please try again.'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});