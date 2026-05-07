import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE = 'https://cdn.bestfreewallpapers.com/thumbnails/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

// ── Metadata pentru fiecare pagină statică ────────────────────────────────
const PAGES: Record<string, { title: string; description: string; keywords: string; route: string }> = {
  'free-wallpapers': {
    title: 'Free Wallpapers - 10,000+ HD Mobile Backgrounds | BestFreeWallpapers',
    description: 'Browse and download over 10,000 free wallpapers in HD, 4K, and 8K quality. Perfect for desktop, mobile, and tablet devices. Updated daily with new designs.',
    keywords: 'free wallpapers, free desktop wallpapers, free mobile wallpapers, hd wallpapers, 4k wallpapers, free backgrounds, download wallpapers',
    route: '/free-wallpapers',
  },
  'premium': {
    title: 'Premium Wallpapers - Exclusive HD & 4K Wallpapers | BestFreeWallpapers',
    description: 'Unlock exclusive premium wallpapers in 4K and 8K resolution. Get early access to new designs, ad-free experience, and high-resolution downloads with our premium membership.',
    keywords: 'premium wallpapers, 4K wallpapers, 8K wallpapers, exclusive wallpapers, premium membership, ad-free wallpapers, high resolution wallpapers',
    route: '/premium',
  },
  'upgrade': {
    title: 'Upgrade to Premium - Exclusive HD & 4K Wallpapers | BestFreeWallpapers',
    description: 'Unlock exclusive premium wallpapers in 4K and 8K resolution. Get early access to new designs, ad-free experience, and high-resolution downloads.',
    keywords: 'premium wallpapers, upgrade, 4K wallpapers, 8K wallpapers, exclusive wallpapers, premium membership',
    route: '/upgrade',
  },
  'collections': {
    title: 'Wallpaper Collections - Curated Sets for Every Device | BestFreeWallpapers',
    description: 'Browse our curated wallpaper collections for iPhone, Android, Samsung Galaxy, iPad, and desktop. Each collection features matching wallpapers designed for specific devices.',
    keywords: 'wallpaper collections, iPhone wallpapers, Android wallpapers, Samsung Galaxy wallpapers, iPad wallpapers, curated wallpapers, device wallpapers',
    route: '/collections',
  },
  'categories': {
    title: 'Wallpaper Categories - Browse by Style & Theme | BestFreeWallpapers',
    description: 'Browse wallpapers by category. From nature and abstract to gaming and anime, find the perfect wallpaper organized by style, theme, and aesthetic.',
    keywords: 'wallpaper categories, nature wallpapers, abstract wallpapers, gaming wallpapers, anime wallpapers, minimalist wallpapers, space wallpapers, 4K categories',
    route: '/categories',
  },
  'mobile-wallpapers': {
    title: 'Mobile Wallpapers - HD & 4K Phone Backgrounds | BestFreeWallpapers',
    description: 'Download free mobile wallpapers in HD and 4K resolution. Perfect wallpapers for iPhone, Samsung Galaxy, Google Pixel, OnePlus, Xiaomi, and all Android devices.',
    keywords: 'mobile wallpapers, phone wallpapers, iPhone wallpapers, Android wallpapers, HD phone wallpapers, 4K mobile wallpapers, smartphone backgrounds',
    route: '/mobile-wallpapers',
  },
  'ringtones': {
    title: 'Free Ringtones - HD MP3 Downloads for iPhone & Android | BestFreeWallpapers',
    description: 'Download free high-quality MP3 ringtones for Android and iPhone. AI-generated music for calls, notifications and alarms. New tones added regularly.',
    keywords: 'free ringtones, MP3 ringtones, iPhone ringtones, Android ringtones, free phone ringtones, notification sounds, call ringtones, AI music ringtones',
    route: '/ringtones',
  },
  'ai-wallpapers': {
    title: 'AI Wallpapers - Artificial Intelligence Generated Art | BestFreeWallpapers',
    description: 'Explore stunning AI-generated wallpapers created with artificial intelligence. Download unique futuristic, abstract, and creative wallpapers made by AI for desktop and mobile.',
    keywords: 'AI wallpapers, AI generated wallpapers, artificial intelligence art, AI art wallpapers, futuristic wallpapers, generated art wallpapers, machine learning art',
    route: '/ai-wallpapers',
  },
};

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getBaseHtml(): string {
  try {
    const p = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  } catch (e) { console.error('[SEO Static] index.html error:', e); }
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>BestFreeWallpapers</title></head><body><div id="root"></div></body></html>`;
}

function injectHead(html: string, tags: string): string {
  let m = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']keywords["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']googlebot["'][^>]*>/gi, '')
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Determină pagina din query param ?page=
  const page = typeof req.query.page === 'string' ? req.query.page : 'free-wallpapers';
  const meta = PAGES[page] || PAGES['free-wallpapers'];
  const canonicalUrl = `${SITE_URL}${meta.route}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': canonicalUrl,
      name: meta.title,
      description: meta.description,
      url: canonicalUrl,
      isPartOf: { '@id': SITE_URL },
      publisher: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: meta.title.split(' -')[0], item: canonicalUrl },
      ],
    },
  ];

  const seoTags = `
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  <meta name="keywords" content="${escapeHtml(meta.keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLd.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
  `;

  try {
    let html = getBaseHtml();
    html = injectHead(html, seoTags);
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.send(html);
  } catch (error) {
    console.error('[SEO Static] Error:', error);
    const html = getBaseHtml();
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
