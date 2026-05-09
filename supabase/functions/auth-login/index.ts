// SISTEM DE AUTENTIFICARE SIMPLU pentru Mirela Photography
// Credențiale: admin / f7tL9UwYWB

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

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const { username, password } = await req.json();
        
        if (!username || !password) {
            return new Response(JSON.stringify({ 
                error: { code: 'MISSING_CREDENTIALS', message: 'Username and password are required' } 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Verifică credențialele fixe
        if (username === 'admin' && password === 'f7tL9UwYWB') {
            // Generează un token simplu JWT
            const payload = {
                username: 'admin',
                role: 'admin',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 ore
            };

            const header = {
                alg: 'HS256',
                typ: 'JWT'
            };

            const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/]/g, (match) => 
                match === '+' ? '-' : '_'
            ).replace(/=/g, '');
            
            const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/]/g, (match) => 
                match === '+' ? '-' : '_'
            ).replace(/=/g, '');
            
            const data = `${encodedHeader}.${encodedPayload}`;
            
            // Semnătură simplă (în producție ar trebui să folosim o cheie secretă)
            const signature = btoa(data).replace(/[+/]/g, (match) => 
                match === '+' ? '-' : '_'
            ).replace(/=/g, '').substring(0, 16);
            
            const token = `${data}.${signature}`;

            return new Response(JSON.stringify({ 
                success: true,
                token,
                user: {
                    username: 'admin',
                    role: 'admin'
                },
                expiresIn: 24 * 60 * 60
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ 
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } 
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Auth error:', error);
        return new Response(JSON.stringify({ 
            error: { code: 'INTERNAL_ERROR', message: 'Authentication service error' } 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});