// Guest Ad Image Upload Edge Function
// Simplified - no JWT required (admin panel handles access)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Create Supabase client (SERVICE ROLE)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new Error('No file provided')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type')
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('File too large (max 5MB)')
    }

    // Generate filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `guest-ad-${timestamp}.${extension}`
    const filePath = `guest-ads/${filename}`

    // Upload to bucket (IMPORTANT: verifică numele bucketului!)
    const { error: uploadError } = await supabase.storage
      .from('wallpaper-uploads') // <-- pune exact bucketul tău
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('wallpaper-uploads')
      .getPublicUrl(filePath)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          publicUrl: urlData.publicUrl,
          filePath
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error: any) {
    console.error('Upload error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})