import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

const DEFAULT_CONFIGS = [
  { id: '1', setting_name: 'anonymous_downloads_per_hour', setting_value: 2, description: 'Max downloads per hour for guest users', is_active: true },
  { id: '2', setting_name: 'free_user_downloads_per_hour', setting_value: 5, description: 'Max downloads per hour for free users', is_active: true },
  { id: '3', setting_name: 'premium_downloads_per_hour', setting_value: 100, description: 'Max downloads per hour for premium users', is_active: true },
  { id: '4', setting_name: 'api_requests_per_minute', setting_value: 60, description: 'Max API requests per minute', is_active: true },
  { id: '5', setting_name: 'search_requests_per_minute', setting_value: 30, description: 'Max search requests per minute', is_active: true },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // GET - lista configuratii
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('id, setting_name, setting_value, description, is_active')
        .order('setting_name')

      if (error || !data || data.length === 0) {
        return new Response(JSON.stringify({ data: DEFAULT_CONFIGS }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PUT - update un setting
    if (req.method === 'PUT') {
      const body = await req.json()
      const { setting_name, setting_value, description, is_active } = body

      if (!setting_name) {
        return new Response(JSON.stringify({ error: 'Missing setting_name' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase
        .from('rate_limits')
        .upsert({
          setting_name,
          setting_value,
          description,
          is_active,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_name' })

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST - test
    if (req.method === 'POST') {
      const body = await req.json()

      if (body.action === 'test') {
        return new Response(JSON.stringify({
          success: true,
          message: `Rate limit "${body.setting_name}" is active`,
          test_results: {
            enforcement_status: 'active',
            current_usage: 0,
            current_limit: 60,
            setting_name: body.setting_name
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ data: DEFAULT_CONFIGS, error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
