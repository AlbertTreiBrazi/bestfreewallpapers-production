import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { email } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verifica daca userul exista deja
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('email', email)
      .single()

    if (existingProfile) {
      // Userul exista - il facem admin
      await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('email', email)

      return new Response(JSON.stringify({
        success: true,
        message: `User ${email} has been granted admin access`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Userul nu exista - trimitem invite
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { is_admin: true }
    })

    if (error) throw error

    // Setam is_admin in profiles dupa invite
    if (data?.user?.id) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        is_admin: true,
        plan_type: 'free'
      }, { onConflict: 'id' })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Admin invitation sent to ${email}`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
