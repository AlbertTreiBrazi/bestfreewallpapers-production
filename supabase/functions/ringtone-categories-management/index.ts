// ============================================================================
// 🎵 ringtone-categories-management — Edge Function admin pentru categorii
// ============================================================================
// Acțiuni:
//   POST {action: 'list'}                 — listează toate categoriile
//   POST {action: 'create', ...}          — creează categorie nouă
//   POST {action: 'update', id, ...}      — modifică categorie existentă
//   POST {action: 'delete', id}           — șterge categorie
//   POST {action: 'toggle', id}           — activează/dezactivează (is_active)
// ============================================================================

// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceKey) {
      return jsonError('Server misconfigured', 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    let body = {}
    try { body = await req.json() } catch { /* ignore */ }

    const action = body?.action || ''

    // list — fără auth
    if (action === 'list') {
      return await handleList(supabaseAdmin)
    }

    // Restul — verifică admin
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) return jsonError('Authentication required', 401)

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${token}` }
    })

    if (!userResponse.ok) return jsonError('Invalid token', 401)

    const user = await userResponse.json()

    // Verificare admin — tabela "profiles", coloana "user_id"
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=eq.${user.id}&select=is_admin`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        }
      }
    )
    const profiles = await profileResponse.json()

    if (!profiles?.[0]?.is_admin) {
      return jsonError('Admin access required', 403)
    }

    const userId = user.id

    switch (action) {
      case 'create': return await handleCreate(supabaseAdmin, body, userId)
      case 'update': return await handleUpdate(supabaseAdmin, body, userId)
      case 'delete': return await handleDelete(supabaseAdmin, body, userId)
      case 'toggle': return await handleToggle(supabaseAdmin, body, userId)
      default: return jsonError(`Unknown action: ${action}`, 400)
    }

  } catch (err) {
    console.error('[ringtone-categories-management] error:', err)
    return jsonError(String(err?.message || err), 500)
  }
})

async function handleList(supabase) {
  const { data, error } = await supabase
    .from('ringtone_categories')
    .select('*')
    .order('category_type', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) return jsonError(error.message, 500)
  return jsonOk({ categories: data || [] })
}

async function handleCreate(supabase, body, userId) {
  const { name, slug, description, category_type, sort_order, is_active, preview_image, seo_title, seo_description } = body
  if (!name || !slug || !category_type) return jsonError('Missing: name, slug, category_type', 400)
  if (!['genre', 'mood', 'use_case'].includes(category_type)) return jsonError('Invalid category_type', 400)

  const { data: existing } = await supabase.from('ringtone_categories').select('id').eq('slug', slug).eq('category_type', category_type).maybeSingle()
  if (existing) return jsonError(`Slug "${slug}" already exists in ${category_type}`, 409)

  const { data, error } = await supabase.from('ringtone_categories').insert({
    name, slug,
    description: description || null,
    category_type,
    sort_order: sort_order ?? 0,
    is_active: is_active ?? true,
    preview_image: preview_image || null,
    seo_title: seo_title || null,
    seo_description: seo_description || null,
  }).select().single()

  if (error) return jsonError(error.message, 500)
  await logAction(supabase, userId, 'create_ringtone_category', { id: data.id, name })
  return jsonOk({ category: data })
}

async function handleUpdate(supabase, body, userId) {
  const { id, name, slug, description, category_type, sort_order, is_active, preview_image, seo_title, seo_description } = body
  if (!id) return jsonError('Missing id', 400)

  const updates = {}
  if (name !== undefined) updates.name = name
  if (slug !== undefined) updates.slug = slug
  if (description !== undefined) updates.description = description
  if (category_type !== undefined) {
    if (!['genre', 'mood', 'use_case'].includes(category_type)) return jsonError('Invalid category_type', 400)
    updates.category_type = category_type
  }
  if (sort_order !== undefined) updates.sort_order = Number(sort_order)
  if (is_active !== undefined) updates.is_active = is_active
  if (preview_image !== undefined) updates.preview_image = preview_image || null
  if (seo_title !== undefined) updates.seo_title = seo_title || null
  if (seo_description !== undefined) updates.seo_description = seo_description || null

  if (Object.keys(updates).length === 0) return jsonError('No fields to update', 400)

  const { data, error } = await supabase.from('ringtone_categories').update(updates).eq('id', id).select().single()
  if (error) return jsonError(error.message, 500)

  await logAction(supabase, userId, 'update_ringtone_category', { id })
  return jsonOk({ category: data })
}

async function handleDelete(supabase, body, userId) {
  const { id } = body
  if (!id) return jsonError('Missing id', 400)

  const { count } = await supabase.from('ringtones').select('*', { count: 'exact', head: true }).or(`genre_id.eq.${id},mood_id.eq.${id},use_case_id.eq.${id}`)
  if (count && count > 0) return jsonError(`Cannot delete: ${count} ringtone(s) use this category. Disable it instead.`, 409)

  const { error } = await supabase.from('ringtone_categories').delete().eq('id', id)
  if (error) return jsonError(error.message, 500)

  await logAction(supabase, userId, 'delete_ringtone_category', { id })
  return jsonOk({ deleted: true })
}

async function handleToggle(supabase, body, userId) {
  const { id } = body
  if (!id) return jsonError('Missing id', 400)

  const { data: current } = await supabase.from('ringtone_categories').select('is_active').eq('id', id).single()
  if (!current) return jsonError('Category not found', 404)

  const { data, error } = await supabase.from('ringtone_categories').update({ is_active: !current.is_active }).eq('id', id).select().single()
  if (error) return jsonError(error.message, 500)

  await logAction(supabase, userId, 'toggle_ringtone_category', { id, is_active: !current.is_active })
  return jsonOk({ category: data })
}

function jsonOk(data) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function logAction(supabase, userId, action, details) {
  try {
    await supabase.from('admin_actions_log').insert({ admin_id: userId, action_type: action, details, created_at: new Date().toISOString() })
  } catch { /* non-critical */ }
}
