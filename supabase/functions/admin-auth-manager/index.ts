import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || ''
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const days = parseInt(url.searchParams.get('days') || '30')
    const limitParam = parseInt(url.searchParams.get('limit') || '10')

    if (action === 'list-users') {
      const { data: authUsers } = await supabase.auth.admin.listUsers({ page, perPage: limit })
      const userIds = authUsers?.users?.map(u => u.id) || []
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds)
      const profileMap: Record<string, any> = {}
      for (const p of profiles || []) profileMap[p.id] = p
      const users = (authUsers?.users || []).map(u => ({
        id: u.id, user_id: u.id, email: u.email,
        created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
        profile: profileMap[u.id] || null
      }))
      const total = authUsers?.total || users.length
      return new Response(JSON.stringify({
        data: { users, total, totalCount: total, totalPages: Math.ceil(total / limit), page }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update-user') {
      const body = await req.json()
      const { userId, updates } = body
      const allowed: Record<string, any> = {}
      if (updates.plan_type !== undefined) allowed.plan_type = updates.plan_type
      if (updates.is_admin !== undefined) allowed.is_admin = updates.is_admin
      if (updates.premium_expires_at !== undefined) allowed.premium_expires_at = updates.premium_expires_at
      await supabase.from('profiles').update(allowed).eq('id', userId)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete-user') {
      const body = await req.json()
      await supabase.auth.admin.deleteUser(body.userId)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'download-analytics') {
      const since = new Date()
      since.setDate(since.getDate() - days)
      let guest = 0, free = 0, premium = 0, total = 0
      const { data: downloads } = await supabase
        .from('downloads').select('user_id, user_type').gte('created_at', since.toISOString())
      if (downloads) {
        for (const d of downloads) {
          total++
          if (!d.user_id) guest++
          else if (d.user_type === 'premium') premium++
          else free++
        }
      }
      return new Response(JSON.stringify({ data: { guest, free, premium, total } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'download-trends') {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const trendsMap: Record<string, { guest: number, free: number, premium: number, total: number }> = {}
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        trendsMap[d.toISOString().split('T')[0]] = { guest: 0, free: 0, premium: 0, total: 0 }
      }
      const { data: downloads } = await supabase
        .from('downloads').select('created_at, user_id, user_type').gte('created_at', since.toISOString())
      if (downloads) {
        for (const d of downloads) {
          const dateStr = d.created_at.substring(0, 10)
          if (!trendsMap[dateStr]) trendsMap[dateStr] = { guest: 0, free: 0, premium: 0, total: 0 }
          trendsMap[dateStr].total++
          if (!d.user_id) trendsMap[dateStr].guest++
          else if (d.user_type === 'premium') trendsMap[dateStr].premium++
          else trendsMap[dateStr].free++
        }
      }
      return new Response(JSON.stringify({ data: Object.entries(trendsMap).map(([date, c]) => ({ date, ...c })) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'top-downloads') {
      const since = new Date()
      since.setDate(since.getDate() - days)

      // Ia direct wallpaper_id din downloads cu perioada
      const { data: downloads } = await supabase
        .from('downloads')
        .select('wallpaper_id')
        .gte('created_at', since.toISOString())
        .not('wallpaper_id', 'is', null)

      let topDownloads: any[] = []

      if (downloads && downloads.length > 0) {
        // Numara per wallpaper
        const counts: Record<number, number> = {}
        for (const d of downloads) {
          const wid = Number(d.wallpaper_id)
          if (wid) counts[wid] = (counts[wid] || 0) + 1
        }

        // Sort si ia top N
        const sorted = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limitParam)
          .map(([id, count]) => ({ id: Number(id), count }))

        // Fetch fiecare wallpaper individual pentru siguranta
        for (const { id, count } of sorted) {
          const { data: w } = await supabase
            .from('wallpapers')
            .select('id, title, image_url, thumbnail_url')
            .eq('id', id)
            .single()

          topDownloads.push({
            wallpaper_id: id,
            count,
            wallpapers: {
              id,
              title: w?.title || `Wallpaper #${id}`,
              image_url: w?.image_url || w?.thumbnail_url || null
            }
          })
        }
      } else {
        // Fallback din download_count
        const { data: wallpapers } = await supabase
          .from('wallpapers')
          .select('id, title, image_url, thumbnail_url, download_count')
          .order('download_count', { ascending: false })
          .limit(limitParam)
        if (wallpapers) {
          topDownloads = wallpapers.map(w => ({
            wallpaper_id: w.id,
            count: w.download_count || 0,
            wallpapers: { id: w.id, title: w.title, image_url: w.image_url || w.thumbnail_url }
          }))
        }
      }

      return new Response(JSON.stringify({ data: topDownloads }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // list-admins default
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, admin_role, created_at, user_id')
      .eq('is_admin', true)
      .order('created_at', { ascending: false })

    return new Response(JSON.stringify({ data: admins || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, data: { users: [], total: 0, totalCount: 0 } }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
