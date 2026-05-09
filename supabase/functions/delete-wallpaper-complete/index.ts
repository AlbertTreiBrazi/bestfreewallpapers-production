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
        // Get service role key from environment
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        
        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Required environment variables not available');
        }

        // Parse request body
        const requestData = await req.json();
        const { wallpaper_id } = requestData;
        
        if (!wallpaper_id) {
            throw new Error('wallpaper_id is required');
        }

        // Step 1: Get wallpaper details before deletion
        const wallpaperResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}&select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        
        const wallpapers = await wallpaperResponse.json();
        
        if (!wallpapers || wallpapers.length === 0) {
            throw new Error('Wallpaper not found');
        }
        
        const wallpaper = wallpapers[0];
        
        // Step 2: Collect all storage paths for this wallpaper
        const storagePaths = [];
        
        // Extract paths from wallpaper record
        if (wallpaper.file_path) {
            storagePaths.push(wallpaper.file_path);
        }
        if (wallpaper.thumbnail_path) {
            storagePaths.push(wallpaper.thumbnail_path);
        }
        if (wallpaper.preview_path) {
            storagePaths.push(wallpaper.preview_path);
        }
        if (wallpaper.original_path) {
            storagePaths.push(wallpaper.original_path);
        }
        
        console.log(`Wallpaper ${wallpaper_id} storage paths:`, storagePaths);
        
        // Step 3: Delete storage files from all relevant buckets
        const storageDeleteResults = [];
        const buckets = ['wallpapers', 'wallpapers-original', 'wallpapers-preview', 'wallpapers-thumbnails', 'public-wallpapers', 'original', 'thumbnails'];
        
        for (const bucket of buckets) {
            for (const path of storagePaths) {
                if (path) {
                    try {
                        // Extract filename from path
                        const filename = path.split('/').pop() || path;
                        const fullPath = `${bucket}/${filename}`;
                        
                        const deleteResponse = await fetch(`${supabaseUrl}/storage/v1/object/${fullPath}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (deleteResponse.ok) {
                            storageDeleteResults.push({ bucket, filename, status: 'deleted' });
                        } else {
                            storageDeleteResults.push({ bucket, filename, status: 'not_found' });
                        }
                    } catch (error) {
                        storageDeleteResults.push({ bucket, filename: path, status: 'error', error: error.message });
                    }
                }
            }
        }
        
        // Step 4: Delete the wallpaper from database (CASCADE will handle related records)
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            throw new Error(`Failed to delete wallpaper from database: ${errorText}`);
        }
        
        // Step 5: Verify CASCADE deletion worked
        const verifyDownloads = await fetch(`${supabaseUrl}/rest/v1/downloads?wallpaper_id=eq.${wallpaper_id}&select=count`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        
        const verifyOrders = await fetch(`${supabaseUrl}/rest/v1/premium_orders?wallpaper_id=eq.${wallpaper_id}&select=count`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        
        const downloadsResult = await verifyDownloads.json();
        const ordersResult = await verifyOrders.json();
        
        // Return success response with details
        return new Response(JSON.stringify({ 
            data: {
                success: true,
                wallpaper_id: wallpaper_id,
                wallpaper_title: wallpaper.title || 'Unknown',
                storage_cleanup: {
                    total_operations: storageDeleteResults.length,
                    successful_deletions: storageDeleteResults.filter(r => r.status === 'deleted').length,
                    details: storageDeleteResults
                },
                cascade_verification: {
                    remaining_downloads: downloadsResult.length || 0,
                    remaining_orders: ordersResult.length || 0
                },
                message: 'Wallpaper and all associated records deleted successfully'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        const errorResponse = {
            error: {
                code: 'WALLPAPER_DELETE_ERROR',
                message: error.message,
                details: 'Complete wallpaper deletion with storage cleanup failed'
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});