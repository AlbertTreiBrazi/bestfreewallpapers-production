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

    const [
      { count: totalWallpapers },
      { count: totalUsers },
      { count: premiumUsers },
      { count: totalDownloads },
      { count: totalRingtones },
      { count: totalLiveWallpapers },
      { count: totalCollections },
      { count: totalCategories },
    ] = await Promise.all([
      supabase.from('wallpapers').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan_type', 'premium'),
      supabase.from('wallpapers').select('download_count', { count: 'exact', head: true }),
      supabase.from('ringtones').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('live_wallpapers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('collections').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ])

    // New users this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    return new Response(JSON.stringify({
      data: {
        totalWallpapers: totalWallpapers || 0,
        totalUsers: totalUsers || 0,
        premiumUsers: premiumUsers || 0,
        totalDownloads: totalDownloads || 0,
        totalRingtones: totalRingtones || 0,
        totalLiveWallpapers: totalLiveWallpapers || 0,
        totalCollections: totalCollections || 0,
        totalCategories: totalCategories || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        newUsersLast30Days: newUsersThisMonth || 0,
        downloadsLast30Days: 0,
        totalRevenue: 0,
        growthRate: totalUsers ? Number(((newUsersThisMonth || 0) / totalUsers * 100).toFixed(1)) : 0,
        engagement: totalUsers ? Number(((totalDownloads || 0) / totalUsers).toFixed(1)) : 0,
        live_update: true,
        conversionRate: totalUsers ? ((premiumUsers || 0) / totalUsers * 100).toFixed(1) : '0',
        avgDownloadsPerUser: totalUsers ? ((totalDownloads || 0) / totalUsers).toFixed(1) : '0',
        monthlyGrowth: '0',
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
