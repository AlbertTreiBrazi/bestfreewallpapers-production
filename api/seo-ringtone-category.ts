import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://cdn.bestfreewallpapers.com/thumbnails/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category_type: 'genre' | 'mood' | 'use_case';
  preview_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getBaseHtml(): string {
  try {
    const p = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  } catch (e) { console.error('[SEO RingtoneCategory] index.html error:', e); }
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>BestFreeWallpapers</title></head><body><div id="root"></div></body></html>`;
}

function injectHead(html: string, tags: string): string {
  let m = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']keywords["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:title["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:type["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:url["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:site_name["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:locale["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image:width["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image:height["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image:alt["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:site["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:creator["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/gi, '');
  if (m.includes('<meta charset=')) {
    m = m.replace(/(<meta\s+charset[^>]*>)/i, `$1${tags}`);
  } else {
    m = m.replace(/(<head[^>]*>)/i, `$1${tags}`);
  }
  return m;
}

async function fetchCategory(slug: string): Promise<CategoryData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ringtone_categories?select=id,name,slug,description,category_type,preview_image,seo_title,seo_description&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`,
      { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] as CategoryData : null;
  } catch (e) {
    console.error('[SEO RingtoneCategory] fetch error:', e);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = req.query.slug as string;
  if (!slug) { res.status(400).send('Missing slug'); return; }

  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const canonicalUrl = `${SITE_URL}/ringtones/category/${safeSlug}`;

  const category = await fetchCategory(safeSlug);

  let seoTags: string;

  if (!category) {
    seoTags = `
  <title>Ringtone Category | BestFreeWallpapers</title>
  <meta name="description" content="Browse free ringtones by category on BestFreeWallpapers." />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${canonicalUrl}" />
  `;
  } else {
    const ogImage = category.preview_image?.startsWith('http') ? category.preview_image : OG_IMAGE_DEFAULT;
    const title = category.seo_title || `${category.name} Ringtones - Free MP3 Downloads | BestFreeWallpapers`;
    const description = category.seo_description
      || category.description
      || `Download free ${category.name.toLowerCase()} ringtones in MP3 format. High-quality audio, max 30 seconds, perfect for calls and notifications.`;
    const keywords = `${category.name.toLowerCase()} ringtones, ${category.name.toLowerCase()} mp3, free ${category.name.toLowerCase()} ringtones, phone ringtones, mobile ringtones`;

    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': canonicalUrl,
        name: `${category.name} Ringtones`,
        description: description,
        url: canonicalUrl,
        isPartOf: { '@id': `${SITE_URL}/ringtones` },
        about: { '@type': 'Thing', name: category.name },
        provider: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Ringtones', item: `${SITE_URL}/ringtones` },
          { '@type': 'ListItem', position: 3, name: category.name, item: canonicalUrl },
        ],
      },
    ];

    seoTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="${escapeHtml(category.name)} ringtones" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLd.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
  `;
  }

  let html = getBaseHtml();
  html = injectHead(html, seoTags);

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', category
    ? 'public, s-maxage=3600, stale-while-revalidate=86400'
    : 'no-store');
  res.send(html);
}
