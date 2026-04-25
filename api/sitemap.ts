import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://bestfreewallpapers.com';

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    response.status(200).send('ok');
    return;
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      response.status(500).send('Server configuration error');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published wallpapers (limit to 50000 for sitemap size)
    const { data: wallpapers, error: wpError } = await supabase
      .from('wallpapers')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(50000);

    if (wpError) {
      console.error('Wallpapers error:', wpError.message);
    }

    // Fetch all active categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .eq('is_active', true);

    if (catError) {
      console.error('Categories error:', catError.message);
    }

    // Fetch all published collections
    const { data: collections, error: colError } = await supabase
      .from('collections')
      .select('slug, updated_at')
      .eq('is_published', true);

    if (colError) {
      console.error('Collections error:', colError.message);
    }

    // Log counts for debugging
    console.log(`Sitemap generated: ${wallpapers?.length || 0} wallpapers, ${categories?.length || 0} categories, ${collections?.length || 0} collections`);

    // Use runtime current date - NOT hardcoded
    const currentDate = new Date().toISOString().split('T')[0];

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Static Pages -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/free-wallpapers</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/categories</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/collections</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/ai-wallpapers</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/mobile-wallpapers</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add wallpaper pages
    if (wallpapers && wallpapers.length > 0) {
      for (const wp of wallpapers) {
        const lastmod = wp.updated_at ? new Date(wp.updated_at).toISOString().split('T')[0] : currentDate;
        xml += `  <url>
    <loc>${BASE_URL}/wallpaper/${escapeXml(wp.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Add category pages
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        const lastmod = cat.updated_at ? new Date(cat.updated_at).toISOString().split('T')[0] : currentDate;
        xml += `  <url>
    <loc>${BASE_URL}/category/${escapeXml(cat.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add collection pages
    if (collections && collections.length > 0) {
      for (const col of collections) {
        const lastmod = col.updated_at ? new Date(col.updated_at).toISOString().split('T')[0] : currentDate;
        xml += `  <url>
    <loc>${BASE_URL}/collections/${escapeXml(col.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    // Send response with proper cache headers
    response.status(200);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    response.setHeader('X-Debug-Lastmod', currentDate); // Debug header showing generation date
    response.send(xml);

  } catch (error) {
    console.error('Sitemap error:', error);

    // Return minimal valid sitemap on error
    const currentDate = new Date().toISOString().split('T')[0];
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    response.status(200);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store'); // Don't cache errors
    response.send(fallbackXml);
  }
}
