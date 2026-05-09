// ============================================================================
// 🎵 ringtone-download — Edge Function pentru descărcare ringtone
// ============================================================================
// Primește slug-ul ringtone-ului → returnează fișierul MP3 ca attachment
// (browserul îl salvează direct în Downloads, nu deschide pagină nouă).
//
// Bonus: înregistrează descărcarea în ringtone_downloads și incrementează
// downloads_count pe ringtone.
//
// Apelat din frontend cu:
//   GET /functions/v1/ringtone-download?slug=deep-pulse
// ============================================================================

// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false',
}

Deno.serve(async (req) => {
  // ---- CORS preflight ----
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // ---- 1. Get slug from query string OR body ----
    const url = new URL(req.url)
    let slug = url.searchParams.get('slug')

    if (!slug && req.method === 'POST') {
      try {
        const body = await req.json()
        slug = body?.slug
      } catch {
        // ignore JSON parse errors
      }
    }

    if (!slug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing slug parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---- 2. Setup Supabase client (service role for write access) ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // ---- 3. Fetch ringtone by slug ----
    const { data: ringtone, error: rtError } = await supabase
      .from('ringtones')
      .select('id, title, slug, audio_url, is_published, is_active')
      .eq('slug', slug)
      .eq('is_published', true)
      .eq('is_active', true)
      .maybeSingle()

    if (rtError) {
      console.error('[ringtone-download] DB error:', rtError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ringtone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ringtone not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ringtone.audio_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'No audio file available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---- 4. Fetch the MP3 file from CDN (server-to-server, no CORS issues) ----
    const audioRes = await fetch(ringtone.audio_url)
    if (!audioRes.ok) {
      console.error('[ringtone-download] CDN fetch failed:', audioRes.status, ringtone.audio_url)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch audio file' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const audioBuffer = await audioRes.arrayBuffer()

    // ---- 5. Track download (best-effort; nu blocăm răspunsul dacă pică) ----
    //
    // NOTĂ: Schema tabelei ringtone_downloads e presupusă cu următoarele coloane:
    //   ringtone_id (int8), user_id (uuid nullable), ip_address (text nullable),
    //   user_agent (text nullable), downloaded_at (timestamptz default now())
    //
    // Dacă ai alte nume de coloane, modifică obiectul de mai jos.
    try {
      const ipAddress =
        req.headers.get('cf-connecting-ip') ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        null
      const userAgent = req.headers.get('user-agent') || null

      // Detectăm dacă userul e autentificat din token (opțional)
      let userId: string | null = null
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '')
        try {
          const { data: { user } } = await supabase.auth.getUser(token)
          userId = user?.id ?? null
        } catch {
          // anonimous user — token invalid sau anon key
        }
      }

      // Insert în ringtone_downloads
      await supabase.from('ringtone_downloads').insert({
        ringtone_id: ringtone.id,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      // Incrementăm contorul (folosim RPC dacă există, altfel update direct)
      await supabase.rpc('increment_ringtone_downloads', { p_ringtone_id: ringtone.id })
        .then(({ error }) => {
          if (error) {
            // Fallback: SELECT current + UPDATE (mai puțin sigur la race conditions)
            return supabase
              .from('ringtones')
              .select('downloads_count')
              .eq('id', ringtone.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  return supabase
                    .from('ringtones')
                    .update({ downloads_count: (data.downloads_count || 0) + 1 })
                    .eq('id', ringtone.id)
                }
              })
          }
        })
    } catch (trackErr) {
      // Tracking-ul nu blochează descărcarea
      console.error('[ringtone-download] tracking failed (non-fatal):', trackErr)
    }

    // ---- 6. Return MP3 with Content-Disposition: attachment ----
    // Browserul va salva fișierul direct fără să deschidă pagină nouă.
    const safeFilename = `${ringtone.slug || 'ringtone'}.mp3`

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[ringtone-download] unexpected error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
