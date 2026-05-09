import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const search = url.searchParams.get('search') || ''
    const hasVideoDownload = url.searchParams.get('has_video_download') || 'all'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    // GET action=users
    if (req.method === 'GET' && action === 'users') {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, plan_type, is_admin, admin_role, has_video_download, created_at, premium_expires_at', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
      if (hasVideoDownload === 'true') query = query.eq('has_video_download', true)
      if (hasVideoDownload === 'false') query = query.eq('has_video_download', false)

      const from = (page - 1) * limit
      query = query.range(from, from + limit - 1)

      const { data, count, error } = await query
      if (error) throw error

      return new Response(JSON.stringify({
        data: data || [],
        pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET action=admins
    if (req.method === 'GET' && action === 'admins') {
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, is_admin, admin_role, created_at')
        .eq('is_admin', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify({
        data: admins || [],
        availableRoles: ['super_admin', 'admin', 'moderator', 'editor']
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GET fara action - dashboard stats
    if (req.method === 'GET') {
      const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
      const { count: premiumUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan_type', 'premium')
      const { count: totalWallpapers } = await supabase.from('wallpapers').select('id', { count: 'exact', head: true })

      return new Response(JSON.stringify({
        data: { totalUsers, premiumUsers, totalWallpapers }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // PUT - toate actiunile de modificare
    if (req.method === 'PUT') {
      const body = await req.json()

      // Schimbare rol admin
      if (body.action === 'update-user-role') {
        const { user_id, admin_role, is_admin } = body
        // Cauta dupa user_id SAU id (profiles are ambele campuri diferite)
        const { data: found } = await supabase
          .from('profiles')
          .select('id')
          .or(`user_id.eq.${user_id},id.eq.${user_id}`)
          .single()
        
        if (!found) throw new Error('Profile not found for user_id: ' + user_id)
        
        const { error } = await supabase
          .from('profiles')
          .update({ is_admin: is_admin, admin_role: admin_role || null })
          .eq('id', found.id)
        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Grant premium manual by email
      if (body.action === 'grant-manual-premium-by-email') {
        const { email, duration_days = 30 } = body
        const { data: targetUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (!targetUser) return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + duration_days)

        await supabase.from('profiles').update({
          plan_type: 'premium',
          premium_expires_at: expiresAt.toISOString(),
          manual_premium_granted_at: new Date().toISOString(),
        }).eq('id', targetUser.id)

        return new Response(
          JSON.stringify({ success: true, message: `Premium granted to ${email} for ${duration_days} days` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Revoke premium
      if (body.action === 'revoke-manual-premium') {
        const { user_id } = body
        await supabase.from('profiles').update({
          plan_type: 'free',
          premium_expires_at: null,
          manual_premium_revoked_at: new Date().toISOString(),
        }).eq('id', user_id)
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Create admin
      if (body.action === 'create-admin') {
        const { email, admin_role } = body
        const { data: targetUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (!targetUser) return new Response(
          JSON.stringify({ error: { code: 'USER_NOT_FOUND', message: 'User not found. They must sign up first.' } }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

        await supabase.from('profiles').update({
          is_admin: true,
          admin_role: admin_role || 'admin'
        }).eq('id', targetUser.id)

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Update premium direct
      if (body.action === 'update-user-premium') {
        const { userId, plan_type, premium_expires_at } = body
        await supabase.from('profiles')
          .update({ plan_type, premium_expires_at })
          .eq('id', userId)
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Process premium request
      if (body.action === 'process-premium-request') {
        const { requestId, status, adminNotes } = body
        await supabase.from('premium_requests')
          .update({ status, admin_notes: adminNotes, processed_at: new Date().toISOString() })
          .eq('id', requestId)
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
