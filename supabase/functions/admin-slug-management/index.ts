import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

function generateSlug(title: string, id?: string | number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  return id ? `${base}-${String(id).slice(-6)}` : base
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { action, data, search, page = 1, limit = 20 } = body

    // ── list_wallpapers ───────────────────────────────────────────────────────
    if (action === 'list_wallpapers') {
      let query = supabase
        .from('wallpapers')
        .select('id, title, slug, is_published, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`)

      const from = (page - 1) * limit
      query = query.range(from, from + limit - 1)

      const { data: wallpapers, count, error } = await query
      if (error) throw error

      return new Response(JSON.stringify({
        data: wallpapers || [],
        pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── update_slug ───────────────────────────────────────────────────────────
    if (action === 'update_slug') {
      const { id, slug } = data || {}
      if (!id || !slug) {
        return new Response(JSON.stringify({ error: 'id and slug are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').trim()

      // Verifica unicitate
      const { data: existing } = await supabase
        .from('wallpapers')
        .select('id')
        .eq('slug', cleanSlug)
        .neq('id', id)
        .single()

      if (existing) {
        return new Response(JSON.stringify({ error: 'Slug already exists' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { error } = await supabase.from('wallpapers').update({ slug: cleanSlug }).eq('id', id)
      if (error) throw error

      return new Response(JSON.stringify({ success: true, slug: cleanSlug }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── regenerate_all ────────────────────────────────────────────────────────
    if (action === 'regenerate_all') {
      const { data: wallpapers } = await supabase
        .from('wallpapers')
        .select('id, title')
        .is('slug', null)

      let updated = 0
      for (const wp of wallpapers || []) {
        const slug = generateSlug(wp.title, wp.id)
        await supabase.from('wallpapers').update({ slug }).eq('id', wp.id)
        updated++
      }

      return new Response(JSON.stringify({ success: true, updated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
