// UPLOAD IMAGINI pentru panoul de administrare

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const { imageData, fileName, bucketName = 'branding-images' } = await req.json();
        
        if (!imageData || !fileName) {
            throw new Error('Image data and filename are required');
        }

        // Obține cheile de mediu
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Extrage datele base64 din data URL
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(';')[0].split(':')[1];

        // Convertește base64 în binary
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload la Supabase Storage
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': mimeType,
                'x-upsert': 'true'
            },
            body: binaryData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        // Obține URL-ul public
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;

        // Salvează metadata în baza de date (opțional)
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/media_items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                title: fileName,
                file_url: publicUrl,
                file_type: mimeType,
                file_size: binaryData.length,
                is_public: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        });

        let mediaId = null;
        if (insertResponse.ok) {
            const mediaData = await insertResponse.json();
            mediaId = mediaData[0]?.id;
        }

        return new Response(JSON.stringify({
            data: {
                publicUrl,
                fileName,
                mediaId,
                fileSize: binaryData.length,
                mimeType
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Image upload error:', error);

        const errorResponse = {
            error: {
                code: 'IMAGE_UPLOAD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});