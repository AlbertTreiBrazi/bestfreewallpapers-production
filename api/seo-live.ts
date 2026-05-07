import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://cdn.bestfreewallpapers.com/thumbnails/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

interface LiveWallpaperData {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  category: string | null;
  is_premium: boolean;
  downloads_count: number;
  views_count: number;
  created_at: string;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getBaseHtml(): string {
  try {
    const p = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  } catch (e) { console.error('[SEO Live] index.html error:', e); }
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
    .replace(/<meta[^>]+property=["']og:video["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:video:type["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:site["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:creator["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:player["'][^>]*>/gi, '')
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

async function fetchLiveWallpaper(slug: string): Promise<LiveWallpaperData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/live_wallpapers?select=id,title,slug,description,video_url,thumbnail_url,tags,category,is_premium,downloads_count,views_count,created_at&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&is_published=eq.true&limit=1`,
      { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (e) { return null; }
}

// ── Handler pentru /live-wallpapers (lista) ───────────────────────────────
async function handleList(res: VercelResponse) {
  const canonicalUrl = `${SITE_URL}/live-wallpapers`;
  const title = 'Free Live Wallpapers — Animated HD Video Wallpapers | BestFreeWallpapers';
  const description = 'Download free animated live wallpapers for your phone. AI-generated HD video wallpapers in MP4 format — nature, fantasy, cars, abstract and more. Updated weekly.';
  const keywords = 'free live wallpapers, animated wallpapers, video wallpapers, mobile live wallpapers, HD animated backgrounds, AI wallpapers, phone live wallpapers, free MP4 wallpapers';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': canonicalUrl,
      name: title,
      description,
      url: canonicalUrl,
      isPartOf: { '@id': SITE_URL },
      publisher: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Live Wallpapers', item: canonicalUrl },
      ],
    },
  ];

  const seoTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${OG_IMAGE_DEFAULT}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="Free Live Wallpapers" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE_DEFAULT}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLd.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
  `;

  let html = getBaseHtml();
  html = injectHead(html, seoTags);
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.send(html);
}

// ── Handler pentru /live-wallpaper/:slug (detaliu) ────────────────────────
async function handleDetail(slug: string, res: VercelResponse) {
  const canonicalUrl = `${SITE_URL}/live-wallpaper/${slug}`;
  const wallpaper = await fetchLiveWallpaper(slug);

  if (!wallpaper) {
    const seoTags = `
  <title>Live Wallpaper | BestFreeWallpapers</title>
  <meta name="description" content="Download free animated live wallpapers for your phone." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${canonicalUrl}" />
  `;
    let html = getBaseHtml();
    html = injectHead(html, seoTags);
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  }

  const title = `${wallpaper.title} — Free Live Wallpaper | BestFreeWallpapers`;
  const description = wallpaper.description || `Download ${wallpaper.title} free animated live wallpaper for your phone. High-quality MP4 video wallpaper, no watermark, no signup required.`;
  const keywords = ['free live wallpaper', wallpaper.title.toLowerCase(), ...(wallpaper.tags || []), wallpaper.category || '', 'animated wallpaper', 'video wallpaper', 'MP4 wallpaper'].filter(Boolean).join(', ');
  const ogImage = wallpaper.thumbnail_url || OG_IMAGE_DEFAULT;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': canonicalUrl,
      name: wallpaper.title,
      description,
      contentUrl: wallpaper.video_url,
      thumbnailUrl: wallpaper.thumbnail_url || OG_IMAGE_DEFAULT,
      uploadDate: wallpaper.created_at,
      url: canonicalUrl,
      interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: wallpaper.views_count || 0 },
      publisher: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.webp` } },
      isPartOf: { '@id': `${SITE_URL}/live-wallpapers` },
      isFamilyFriendly: true,
      inLanguage: 'en',
      ...(wallpaper.tags && wallpaper.tags.length > 0 ? { keywords: wallpaper.tags.join(', ') } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Live Wallpapers', item: `${SITE_URL}/live-wallpapers` },
        ...(wallpaper.category ? [{ '@type': 'ListItem', position: 3, name: wallpaper.category, item: `${SITE_URL}/live-wallpapers?cat=${wallpaper.category}` }] : []),
        { '@type': 'ListItem', position: wallpaper.category ? 4 : 3, name: wallpaper.title, item: canonicalUrl },
      ],
    },
  ];

  const seoTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="video.other" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1920" />
  <meta property="og:image:alt" content="${escapeHtml(wallpaper.title)} live wallpaper" />
  <meta property="og:video" content="${escapeHtml(wallpaper.video_url)}" />
  <meta property="og:video:type" content="video/mp4" />
  <meta name="twitter:card" content="player" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:player" content="${canonicalUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLd.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
  `;

  let html = getBaseHtml();
  html = injectHead(html, seoTags);
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.send(html);
}

// ── Main export ───────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
  if (slug) {
    await handleDetail(slug, res);
  } else {
    await handleList(res);
  }
}
