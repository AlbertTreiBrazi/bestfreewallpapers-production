import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /sitemap.xml — Sitemap Index
// ============================================================================
// Returnează un sitemap index care listează toate sub-sitemapurile.
// Nu face niciun query pentru wallpapers — e ultra-rapid.
// Sub-sitemapurile paginate sunt servite de /api/sitemap-page.
//
// Structura:
//   /sitemap.xml                → sitemap index (această funcție)
//   /sitemap-static.xml         → pagini statice + categorii + colecții
//   /sitemap-wallpapers-1.xml   → wallpapers 1-10000
//   /sitemap-wallpapers-2.xml   → wallpapers 10001-20000
//   ... etc
//   /sitemap-ringtones.xml      → ringtones
//   /sitemap-live.xml           → live wallpapers
// ============================================================================

const BASE_URL = 'https://bestfreewallpapers.com';
const PAGE_SIZE = 10000; // URL-uri per sub-sitemap (limita Google: 50000)

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.status(200).send('ok');
    return;
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      response.status(500).send('Server configuration error');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obținem doar COUNT-ul — nu datele efective
    // Ultra-rapid indiferent de câte wallpapere există
    const { count: wallpaperCount, error: countError } = await supabase
      .from('wallpapers')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true);

    if (countError) {
      console.error('[Sitemap Index] Count error:', countError.message);
    }

    const totalWallpapers = wallpaperCount || 0;
    const wallpaperPages = Math.max(1, Math.ceil(totalWallpapers / PAGE_SIZE));

    const currentDate = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
`;

    for (let page = 1; page <= wallpaperPages; page++) {
      xml += `  <sitemap>
    <loc>${BASE_URL}/sitemap-wallpapers-${page}.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
`;
    }

    xml += `  <sitemap>
    <loc>${BASE_URL}/sitemap-ringtones.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-live.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`;

    response.status(200);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(xml);

  } catch (error) {
    console.error('[Sitemap Index] Error:', error);
    const currentDate = new Date().toISOString().split('T')[0];
    response.status(200);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`);
  }
}
