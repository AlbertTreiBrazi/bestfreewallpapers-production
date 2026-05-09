Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase configuration missing');
    }

    let responseData = {};

    if (req.method === 'GET') {
      // Get all banners for admin view
      const response = await fetch(`${supabaseUrl}/rest/v1/premium_banners?select=*&order=display_order.asc,created_at.desc`, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch banners');
      }

      const banners = await response.json();
      responseData = { data: banners };
    }
    else if (req.method === 'POST') {
      // Create new banner
      const requestData = await req.json();
      const { title, subtitle, cta_label, cta_url, image_url, display_order } = requestData;

      if (!title || !cta_label || !cta_url) {
        throw new Error('Title, CTA label, and CTA URL are required');
      }

      const createResponse = await fetch(`${supabaseUrl}/rest/v1/premium_banners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle?.trim() || null,
          cta_label: cta_label.trim(),
          cta_url: cta_url.trim(),
          image_url: image_url?.trim() || null,
          display_order: display_order || 0,
          active: true,
          created_at: new Date().toISOString()
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create banner: ${errorText}`);
      }

      responseData = await createResponse.json();
    }
    else if (req.method === 'PUT') {
      // Update banner
      const requestData = await req.json();
      const { id, title, subtitle, cta_label, cta_url, image_url, display_order, active } = requestData;

      if (!id) {
        throw new Error('Banner ID is required');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title.trim();
      if (subtitle !== undefined) updateData.subtitle = subtitle?.trim() || null;
      if (cta_label !== undefined) updateData.cta_label = cta_label.trim();
      if (cta_url !== undefined) updateData.cta_url = cta_url.trim();
      if (image_url !== undefined) updateData.image_url = image_url?.trim() || null;
      if (display_order !== undefined) updateData.display_order = display_order;
      if (active !== undefined) updateData.active = active;

      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/premium_banners?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update banner: ${errorText}`);
      }

      responseData = await updateResponse.json();
    }
    else if (req.method === 'DELETE') {
      // Delete banner
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (!id) {
        throw new Error('Banner ID is required');
      }

      const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/premium_banners?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`Failed to delete banner: ${errorText}`);
      }

      responseData = { success: true, message: 'Banner deleted successfully' };
    }
    else {
      throw new Error('Method not allowed');
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Premium banners error:', error);

    const errorResponse = {
      error: {
        code: 'PREMIUM_BANNERS_ERROR',
        message: error.message || 'Failed to manage premium banners'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});