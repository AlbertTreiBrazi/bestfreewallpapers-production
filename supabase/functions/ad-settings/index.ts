import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const DEFAULT_GUEST = {
  guest_ad_active: false,
  guest_timer_duration: 5,
  guest_ad_content_type: 'image_upload',
  guest_ad_image_url: null,
  guest_ad_external_url: null,
  guest_ad_html_content: null,
  guest_ad_click_url: null,
}

const DEFAULT_LOGGED_IN = {
  logged_in_ad_active: false,
  logged_in_timer_duration: 6,
  logged_in_ad_content_type: 'image_upload',
  logged_in_ad_image_url: null,
  logged_in_ad_external_url: null,
  logged_in_ad_html_content: null,
  logged_in_ad_click_url: null,
}

const DEFAULT_SETTINGS = {
  countdown_duration: 5,
  ad_title: 'Free Wallpapers',
  ad_description: 'Supported by ads',
  ad_image_url: null,
  is_active: true,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { action, ...updateData } = body

    // ── get (legacy - folosit de AdScreen vechi) ──────────────────────────────
    if (action === 'get') {
      // Returnam date combinate din ambele tabele pentru compatibilitate
      const { data: guestData } = await supabase
        .from('guest_ad_settings')
        .select('*')
        .eq('id', 1)
        .single()

      const { data: loggedData } = await supabase
        .from('logged_in_ad_settings')
        .select('*')
        .eq('id', 1)
        .single()

      return new Response(JSON.stringify({
        data: {
          ...DEFAULT_SETTINGS,
          guest_ad_image_url: guestData?.guest_ad_image_url || null,
          guest_ad_active: guestData?.guest_ad_active || false,
          logged_in_ad_image_url: loggedData?.logged_in_ad_image_url || null,
          logged_in_ad_active: loggedData?.logged_in_ad_active || false,
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── get_guest ─────────────────────────────────────────────────────────────
    if (action === 'get_guest') {
      const { data, error } = await supabase
        .from('guest_ad_settings')
        .select('*')
        .eq('id', 1)
        .single()

      return new Response(JSON.stringify({
        data: (error || !data) ? DEFAULT_GUEST : data
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── get_logged_in ─────────────────────────────────────────────────────────
    if (action === 'get_logged_in') {
      const { data, error } = await supabase
        .from('logged_in_ad_settings')
        .select('*')
        .eq('id', 1)
        .single()

      return new Response(JSON.stringify({
        data: (error || !data) ? DEFAULT_LOGGED_IN : data
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── update_guest ──────────────────────────────────────────────────────────
    if (action === 'update_guest') {
      const { error } = await supabase
        .from('guest_ad_settings')
        .upsert({ id: 1, ...updateData, updated_at: new Date().toISOString() }, { onConflict: 'id' })

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── update_logged_in ──────────────────────────────────────────────────────
    if (action === 'update_logged_in') {
      const { error } = await supabase
        .from('logged_in_ad_settings')
        .upsert({ id: 1, ...updateData, updated_at: new Date().toISOString() }, { onConflict: 'id' })

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── update (legacy) ───────────────────────────────────────────────────────
    if (action === 'update') {
      const { error } = await supabase
        .from('ad_settings')
        .upsert({ id: 1, ...updateData }, { onConflict: 'id' })

      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, data: DEFAULT_SETTINGS }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
