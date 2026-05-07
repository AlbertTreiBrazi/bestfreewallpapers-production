import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/sitemap-page — Servește toate sub-sitemapurile paginate
// ============================================================================
// Această singură funcție gestionează:
//   /sitemap-static.xml          → ?type=static
//   /sitemap-wallpapers-1.xml    → ?type=wallpapers&page=1
//   /sitemap-wallpapers-2.xml    → ?type=wallpapers&page=2
//   /sitemap-ringtones.xml       → ?type=ringtones
//   /sitemap-live.xml            → ?type=live
//
// Fiecare sub-sitemap are max 10.000 URL-uri și se generează în sub-1s.
// ============================================================================

const BASE_URL = 'https://bestfreewallpapers.com';
const PAGE_SIZE = 10000;

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapUrlset(entries: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries}</urlset>`;
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;
}

// ---------------------------------------------------------------------------
// STATIC — pagini statice + categorii + colecții
// ---------------------------------------------------------------------------
async function generateStatic(supabase: ReturnType<typeof createClient>): Promise<string> {
  const currentDate = new Date().toISOString().split('T')[0];

  const staticPages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/free-wallpapers', changefreq: 'daily', priority: '0.9' },
    { path: '/categories', changefreq: 'weekly', priority: '0.8' },
    { path: '/collections', changefreq: 'weekly', priority: '0.8' },
    { path: '/ai-wallpapers', changefreq: 'daily', priority: '0.8' },
    { path: '/mobile-wallpapers', changefreq: 'daily', priority: '0.8' },
    { path: '/ringtones', changefreq: 'daily', priority: '0.9' },
    { path: '/ringtones/how-to-set', changefreq: 'monthly', priority: '0.6' },
    { path: '/live-wallpapers', changefreq: 'daily', priority: '0.8' },
  ];

  let entries = '';
  for (const p of staticPages) {
    entries += urlEntry(`${BASE_URL}${p.path}`, currentDate, p.changefreq, p.priority);
  }

  // Categorii
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true);

  for (const cat of categories || []) {
    const lastmod = cat.updated_at
      ? new Date(cat.updated_at).toISOString().split('T')[0]
      : currentDate;
    entries += urlEntry(`${BASE_URL}/category/${escapeXml(cat.slug)}`, lastmod, 'weekly', '0.8');
  }

  // Colecții
  const { data: collections } = await supabase
    .from('collections')
    .select('slug, updated_at')
    .eq('is_published', true);

  for (const col of collections || []) {
    const lastmod = col.updated_at
      ? new Date(col.updated_at).toISOString().split('T')[0]
      : currentDate;
    entries += urlEntry(`${BASE_URL}/collections/${escapeXml(col.slug)}`, lastmod, 'weekly', '0.8');
  }

  // Categorii ringtones
  const { data: ringtoneCategories } = await supabase
    .from('ringtone_categories')
    .select('slug, updated_at')
    .eq('is_active', true);

  for (const cat of ringtoneCategories || []) {
    const lastmod = cat.updated_at
      ? new Date(cat.updated_at).toISOString().split('T')[0]
      : currentDate;
    entries += urlEntry(`${BASE_URL}/ringtones/category/${escapeXml(cat.slug)}`, lastmod, 'weekly', '0.8');
  }

  return wrapUrlset(entries);
}

// ---------------------------------------------------------------------------
// WALLPAPERS — paginate, câte PAGE_SIZE
// ---------------------------------------------------------------------------
async function generateWallpapers(
  supabase: ReturnType<typeof createClient>,
  page: number
): Promise<string> {
  const currentDate = new Date().toISOString().split('T')[0];
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: wallpapers, error } = await supabase
    .from('wallpapers')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('id', { ascending: true }) // id e stabil — nu sare rânduri între pagini
    .range(from, to);

  if (error) {
    console.error(`[Sitemap] Wallpapers page ${page} error:`, error.message);
    return wrapUrlset('');
  }

  let entries = '';
  for (const wp of wallpapers || []) {
    const lastmod = wp.updated_at
      ? new Date(wp.updated_at).toISOString().split('T')[0]
      : currentDate;
    entries += urlEntry(`${BASE_URL}/wallpaper/${escapeXml(wp.slug)}`, lastmod, 'monthly', '0.7');
  }

  return wrapUrlset(entries);
}

// ---------------------------------------------------------------------------
// RINGTONES
// ---------------------------------------------------------------------------
async function generateRingtones(supabase: ReturnType<typeof createClient>): Promise<string> {
  const currentDate = new Date().toISOString().split('T')[0];

  const { data: ringtones, error } = await supabase
    .from('ringtones')
    .select('slug, updated_at')
    .eq('is_active', true)
    .eq('is_published', true)
    .order('id', { ascending: true })
    .limit(50000); // ringtones vor fi probabil mult mai puține

  if (error) {
    console.error('[Sitemap] Ringtones error:', error.message);
    return wrapUrlset('');
  }

  let entries = '';
  for (const rt of ringtones || []) {
    const lastmod = rt.updated_at
      ? new Date(rt.updated_at).toISOString().split('T')[0]
      : currentDate;
    entries += urlEntry(`${BASE_URL}/ringtone/${escapeXml(rt.slug)}`, lastmod, 'monthly', '0.7');
  }

  return wrapUrlset(entries);
}

// ---------------------------------------------------------------------------
// LIVE WALLPAPERS
// ---------------------------------------------------------------------------
async function generateLive(supabase: ReturnType<typeof createClient>): Promise<string> {
  const currentDate = new Date().toISOString().split('T')[0];

  // Încearcă cu is_published, fallback la is_active dacă coloana nu există
  let { data: liveWallpapers, error } = await supabase
    .from('live_wallpapers')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('id', { ascending: true })
    .limit(50000);

  if (error) {
    // Fallback — unele versiuni de tabelă nu au is_published
    const fallback = await supabase
      .from('live_wallpapers')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .limit(50000);
    liveWallpapers = fallback.data;
    if (fallback.error) {
      console.error('[Sitemap] Live wallpapers error:', fallback.error.message);
      return wrapUrlset('');
    }
  }

  let entries = '';
  for (const lw of liveWallpapers || []) {
    const lastmod = lw.updated_at
      ? new Date(lw.updated_at).toISOString().split('T')[0]
      : currentDate;
    entries += urlEntry(`${BASE_URL}/live-wallpaper/${escapeXml(lw.slug)}`, lastmod, 'monthly', '0.7');
  }

  return wrapUrlset(entries);
}

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.status(200).send('ok');
    return;
  }

  const type = (request.query.type as string) || '';
  const pageParam = parseInt((request.query.page as string) || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  if (!type) {
    response.status(400).send('Missing ?type parameter');
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    response.status(500).send('Server configuration error');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let xml = '';

    switch (type) {
      case 'static':
        xml = await generateStatic(supabase);
        break;
      case 'wallpapers':
        xml = await generateWallpapers(supabase, page);
        break;
      case 'ringtones':
        xml = await generateRingtones(supabase);
        break;
      case 'live':
        xml = await generateLive(supabase);
        break;
      default:
        response.status(404).send('Unknown sitemap type');
        return;
    }

    response.status(200);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Cache 24 ore — sub-sitemapurile se schimbă rar și sunt mari
    response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    response.send(xml);

  } catch (error) {
    console.error(`[Sitemap Page] Error (type=${type}, page=${page}):`, error);
    response.status(500);
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.send(wrapUrlset(''));
  }
}
