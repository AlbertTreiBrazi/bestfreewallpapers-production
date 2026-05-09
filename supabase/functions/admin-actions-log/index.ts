import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const adminEmail = url.searchParams.get('admin_email')
    const userEmail = url.searchParams.get('user_email')
    const actionType = url.searchParams.get('action_type')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const id = url.searchParams.get('id')

    // DELETE - sterge o inregistrare
    if (req.method === 'DELETE' && id) {
      await supabase.from('admin_actions_log').delete().eq('id', id)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // POST - creeaza o inregistrare noua
    if (req.method === 'POST') {
      const body = await req.json()
      await supabase.from('admin_actions_log').insert({
        admin_id: body.admin_id,
        admin_email: body.admin_email,
        user_id: body.user_id || null,
        user_email: body.user_email || null,
        action_type: body.action_type || body.action || 'unknown',
        action_details: body.action_details || body.details || {},
        duration_days: body.duration_days || null,
        notes: body.notes || null,
        timestamp: new Date().toISOString()
      })
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET - lista actiuni
    // Coloana de sortare corecta: 'timestamp' (nu 'created_at')
    let query = supabase
      .from('admin_actions_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })

    if (adminEmail) query = query.ilike('admin_email', `%${adminEmail}%`)
    if (userEmail) query = query.ilike('user_email', `%${userEmail}%`)
    // Coloana corecta: 'action_type' (nu 'action')
    if (actionType && actionType !== 'all') query = query.eq('action_type', actionType)
    // Coloana corecta: 'timestamp' (nu 'created_at')
    if (startDate) query = query.gte('timestamp', startDate)
    if (endDate) query = query.lte('timestamp', endDate + 'T23:59:59')

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return new Response(JSON.stringify({
        data: [],
        pagination: { page, limit, total: 0, pages: 0 }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ data: [], error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
