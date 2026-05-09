import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '')
    if (!safeSlug) {
      return new Response(JSON.stringify({ error: 'Invalid slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: wallpaper, error: dbError } = await supabase
      .from('live_wallpapers')
      .select('id, title, slug, video_url')
      .eq('slug', safeSlug)
      .eq('is_active', true)
      .single()

    if (dbError || !wallpaper) {
      return new Response(JSON.stringify({ error: 'Live wallpaper not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!wallpaper.video_url) {
      return new Response(JSON.stringify({ error: 'No video URL available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch video server-side — fara restrictii CORS
    const videoResponse = await fetch(wallpaper.video_url)

    if (!videoResponse.ok) {
      throw new Error(`CDN returned ${videoResponse.status}`)
    }

    const videoBlob = await videoResponse.blob()
    const filename = `${safeSlug}.mp4`

    // Track download — incrementeaza contorul
    supabase
      .from('live_wallpapers')
      .update({ downloads_count: (wallpaper as any).downloads_count + 1 })
      .eq('id', wallpaper.id)
      .then(() => {})
      .catch(() => {})

    return new Response(videoBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[live-wallpaper-download] Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Download failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
