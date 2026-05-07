import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// api/seo.ts — Handler SEO unificat
// ============================================================================
// Înlocuiește 6 fișiere separate:
//   seo-static.ts, seo-wallpaper.ts, seo-category.ts,
//   seo-ringtone.ts, seo-ringtone-category.ts, seo-live.ts
//
// Rutare prin query param ?route=
//   static            → /free-wallpapers, /premium, etc.  (?route=static&page=free-wallpapers)
//   wallpaper         → /wallpaper/:slug                   (?route=wallpaper&slug=...)
//   category          → /category/:slug                    (?route=category&slug=...)
//   ringtone          → /ringtone/:slug                    (?route=ringtone&slug=...)
//   ringtone-category → /ringtones/category/:slug          (?route=ringtone-category&slug=...)
//   live              → /live-wallpapers sau /live-wallpaper/:slug (?route=live&slug=...)
// ============================================================================

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://cdn.bestfreewallpapers.com/thumbnails/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

// ── Utilitare comune ─────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getBaseHtml(): string {
  try {
    const p = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  } catch (e) { /* ignore */ }
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
    .replace(/<meta[^>]+name=["']bingbot["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']theme-color["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']msapplication-TileColor["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']application-name["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']apple-mobile-web-app-.*?["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']mobile-web-app-capable["'][^>]*>/gi, '')
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
    .replace(/<meta[^>]+property=["']article:.*?["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:site["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:creator["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image:alt["'][^>]*>/gi, '')
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

function jsonLdScript(obj: object): string {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

function sendHtml(res: VercelResponse, html: string, status = 200, cache = 'public, s-maxage=3600, stale-while-revalidate=86400') {
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.send(html);
}

function supabaseFetch(supabaseUrl: string, supabaseKey: string, path: string) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
  });
}

// ── STATIC ───────────────────────────────────────────────────────────────────

const STATIC_PAGES: Record<string, { title: string; description: string; keywords: string; route: string }> = {
  'free-wallpapers': {
    title: 'Free Wallpapers - 10,000+ HD Mobile Backgrounds | BestFreeWallpapers',
    description: 'Browse and download over 10,000 free wallpapers in HD, 4K, and 8K quality. Perfect for desktop, mobile, and tablet devices. Updated daily with new designs.',
    keywords: 'free wallpapers, free desktop wallpapers, free mobile wallpapers, hd wallpapers, 4k wallpapers, free backgrounds, download wallpapers',
    route: '/free-wallpapers',
  },
  premium: {
    title: 'Premium Wallpapers - Exclusive HD & 4K Wallpapers | BestFreeWallpapers',
    description: 'Unlock exclusive premium wallpapers in 4K and 8K resolution. Get early access to new designs, ad-free experience, and high-resolution downloads with our premium membership.',
    keywords: 'premium wallpapers, 4K wallpapers, 8K wallpapers, exclusive wallpapers, premium membership, ad-free wallpapers, high resolution wallpapers',
    route: '/premium',
  },
  upgrade: {
    title: 'Upgrade to Premium - Exclusive HD & 4K Wallpapers | BestFreeWallpapers',
    description: 'Unlock exclusive premium wallpapers in 4K and 8K resolution. Get early access to new designs, ad-free experience, and high-resolution downloads.',
    keywords: 'premium wallpapers, upgrade, 4K wallpapers, 8K wallpapers, exclusive wallpapers, premium membership',
    route: '/upgrade',
  },
  collections: {
    title: 'Wallpaper Collections - Curated Sets for Every Device | BestFreeWallpapers',
    description: 'Browse our curated wallpaper collections for iPhone, Android, Samsung Galaxy, iPad, and desktop. Each collection features matching wallpapers designed for specific devices.',
    keywords: 'wallpaper collections, iPhone wallpapers, Android wallpapers, Samsung Galaxy wallpapers, iPad wallpapers, curated wallpapers, device wallpapers',
    route: '/collections',
  },
  categories: {
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
  ringtones: {
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

async function handleStatic(page: string, res: VercelResponse) {
  const meta = STATIC_PAGES[page] || STATIC_PAGES['free-wallpapers'];
  const canonicalUrl = `${SITE_URL}${meta.route}`;
  const tags = `
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
  <meta property="og:image" content="${OG_IMAGE_DEFAULT}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${OG_IMAGE_DEFAULT}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': canonicalUrl, name: meta.title, description: meta.description, url: canonicalUrl, isPartOf: { '@id': SITE_URL }, publisher: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL } })}
  `;
  sendHtml(res, injectHead(getBaseHtml(), tags));
}

// ── WALLPAPER ────────────────────────────────────────────────────────────────

async function handleWallpaper(slug: string, supabaseUrl: string, supabaseKey: string, res: VercelResponse) {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const canonicalUrl = `${SITE_URL}/wallpaper/${safeSlug}`;

  let wallpaper: any = null;
  try {
    const r = await fetch(`${supabaseUrl}/functions/v1/wallpaper-detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
      body: JSON.stringify({ slug: safeSlug }),
    });
    if (r.ok) {
      const result = await r.json();
      wallpaper = result.data?.wallpaper || null;
    }
  } catch (e) { /* fall through to 404 */ }

  if (!wallpaper) {
    const tags = `
  <title>Wallpaper Not Found | BestFreeWallpapers</title>
  <meta name="description" content="The wallpaper you're looking for could not be found. Browse thousands of free HD wallpapers on BestFreeWallpapers." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${canonicalUrl}" />`;
    return sendHtml(res, injectHead(getBaseHtml(), tags), 404, 'no-store');
  }

  const imageUrl = wallpaper.thumbnail_url || wallpaper.image_url || OG_IMAGE_DEFAULT;
  const description = wallpaper.description || `Download ${wallpaper.title} in high quality. Free HD wallpaper for desktop and mobile.`;
  const keywords = wallpaper.tags?.length ? wallpaper.tags.join(', ') : wallpaper.title;

  const tags = `
  <title>${escapeHtml(wallpaper.title)} - Free HD Wallpaper Download | BestFreeWallpapers</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta property="og:title" content="${escapeHtml(wallpaper.title)} - Free HD Wallpaper" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="${wallpaper.width || 1920}" />
  <meta property="og:image:height" content="${wallpaper.height || 1080}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(wallpaper.title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'ImageObject', '@id': `${canonicalUrl}#image`, name: wallpaper.title, description, contentUrl: imageUrl, url: canonicalUrl, width: wallpaper.width || 1920, height: wallpaper.height || 1080, encodingFormat: 'image/jpeg', license: 'https://creativecommons.org/licenses/by/4.0/', creditText: 'BestFreeWallpapers', creator: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL }, keywords: wallpaper.tags?.length ? wallpaper.tags.join(', ') : wallpaper.title, datePublished: wallpaper.created_at ? new Date(wallpaper.created_at).toISOString().split('T')[0] : undefined })}
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Free Wallpapers', item: `${SITE_URL}/free-wallpapers` }, { '@type': 'ListItem', position: 3, name: wallpaper.title, item: canonicalUrl }] })}
  `;
  sendHtml(res, injectHead(getBaseHtml(), tags));
}

// ── CATEGORY ─────────────────────────────────────────────────────────────────

async function handleCategory(slug: string, supabaseUrl: string, supabaseKey: string, res: VercelResponse) {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const canonicalUrl = `${SITE_URL}/category/${safeSlug}`;

  let category: any = null;
  try {
    const r = await supabaseFetch(supabaseUrl, supabaseKey,
      `categories?select=id,name,slug,description,preview_image,seo_title,seo_description,meta_keywords,is_active&slug=eq.${encodeURIComponent(safeSlug)}&is_active=eq.true&limit=1`);
    if (r.ok) { const rows = await r.json(); category = rows?.[0] || null; }
  } catch (e) { /* fall through */ }

  if (!category) {
    const tags = `
  <title>Category Not Found | BestFreeWallpapers</title>
  <meta name="description" content="The category you're looking for could not be found. Browse all categories on BestFreeWallpapers." />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${canonicalUrl}" />`;
    return sendHtml(res, injectHead(getBaseHtml(), tags), 404, 'no-store');
  }

  const title = category.seo_title?.trim() || `Best Free ${category.name} Wallpapers - HD Downloads | BestFreeWallpapers`;
  const description = category.seo_description?.trim() || category.description?.trim() || `Browse and download free ${category.name} wallpapers in HD quality.`;
  const keywords = (Array.isArray(category.meta_keywords) && category.meta_keywords.length > 0)
    ? category.meta_keywords.join(', ')
    : `${category.name.toLowerCase()} wallpapers, ${category.name.toLowerCase()} backgrounds, free ${category.name.toLowerCase()} wallpapers`;
  const ogImage = category.preview_image?.startsWith('http') ? category.preview_image : OG_IMAGE_DEFAULT;

  const tags = `
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
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="${escapeHtml(category.name)} wallpapers preview" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': canonicalUrl, name: `${category.name} Wallpapers`, description, url: canonicalUrl, isPartOf: { '@id': SITE_URL }, about: { '@type': 'Thing', name: category.name }, image: ogImage, provider: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL } })}
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Categories', item: `${SITE_URL}/categories` }, { '@type': 'ListItem', position: 3, name: category.name, item: canonicalUrl }] })}
  `;
  sendHtml(res, injectHead(getBaseHtml(), tags));
}

// ── RINGTONE ─────────────────────────────────────────────────────────────────

function formatIsoDuration(seconds: number): string {
  if (!seconds) return 'PT30S';
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m > 0 ? `PT${m}M${s}S` : `PT${s}S`;
}

async function handleRingtone(slug: string, supabaseUrl: string, supabaseKey: string, res: VercelResponse) {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const canonicalUrl = `${SITE_URL}/ringtone/${safeSlug}`;

  let ringtone: any = null;
  try {
    const r = await supabaseFetch(supabaseUrl, supabaseKey,
      `ringtones?select=id,title,slug,description,audio_url,duration_seconds,tags,is_premium,seo_title,seo_description,creator_name,genre_id,mood_id&slug=eq.${encodeURIComponent(safeSlug)}&is_active=eq.true&is_published=eq.true&limit=1`);
    if (r.ok) {
      const rows = await r.json();
      ringtone = rows?.[0] || null;
      if (ringtone) {
        const catIds = [ringtone.genre_id, ringtone.mood_id].filter(Boolean);
        if (catIds.length > 0) {
          const cr = await supabaseFetch(supabaseUrl, supabaseKey, `ringtone_categories?select=id,name,slug,category_type&id=in.(${catIds.join(',')})`);
          if (cr.ok) {
            const cats = await cr.json();
            const m: Record<number, any> = {};
            for (const c of cats) m[c.id] = c;
            ringtone.genre = ringtone.genre_id ? m[ringtone.genre_id] || null : null;
            ringtone.mood = ringtone.mood_id ? m[ringtone.mood_id] || null : null;
          }
        }
      }
    }
  } catch (e) { /* fall through */ }

  if (!ringtone) {
    const tags = `
  <title>Free Ringtone Download | BestFreeWallpapers</title>
  <meta name="description" content="Download free high-quality MP3 ringtones for your phone." />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${canonicalUrl}" />`;
    return sendHtml(res, injectHead(getBaseHtml(), tags), 200, 'no-store');
  }

  const title = ringtone.seo_title || `${ringtone.title} - Free Ringtone Download | BestFreeWallpapers`;
  const description = ringtone.seo_description || ringtone.description || `Download ${ringtone.title} ringtone for free. ${ringtone.duration_seconds}-second MP3, perfect for calls and notifications.`;
  const keywords = ['free ringtone', ringtone.title.toLowerCase(), ...(ringtone.tags || []), ringtone.genre?.name?.toLowerCase() || '', 'mp3 ringtone'].filter(Boolean).join(', ');

  const tags = `
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
  <meta property="og:image" content="${OG_IMAGE_DEFAULT}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE_DEFAULT}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'AudioObject', '@id': canonicalUrl, name: ringtone.title, description, contentUrl: ringtone.audio_url, encodingFormat: 'audio/mpeg', duration: formatIsoDuration(ringtone.duration_seconds), url: canonicalUrl, creator: { '@type': 'Organization', name: ringtone.creator_name || 'BestFreeWallpapers', url: SITE_URL }, ...(ringtone.genre ? { genre: ringtone.genre.name } : {}), ...(ringtone.tags?.length ? { keywords: ringtone.tags.join(', ') } : {}) })}
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Ringtones', item: `${SITE_URL}/ringtones` }, ...(ringtone.genre ? [{ '@type': 'ListItem', position: 3, name: ringtone.genre.name, item: `${SITE_URL}/ringtones/category/${ringtone.genre.slug}` }] : []), { '@type': 'ListItem', position: ringtone.genre ? 4 : 3, name: ringtone.title, item: canonicalUrl }] })}
  `;
  sendHtml(res, injectHead(getBaseHtml(), tags));
}

// ── RINGTONE CATEGORY ─────────────────────────────────────────────────────────

async function handleRingtoneCategory(slug: string, supabaseUrl: string, supabaseKey: string, res: VercelResponse) {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const canonicalUrl = `${SITE_URL}/ringtones/category/${safeSlug}`;

  let category: any = null;
  try {
    const r = await supabaseFetch(supabaseUrl, supabaseKey,
      `ringtone_categories?select=id,name,slug,description,category_type,preview_image,seo_title,seo_description&slug=eq.${encodeURIComponent(safeSlug)}&is_active=eq.true&limit=1`);
    if (r.ok) { const rows = await r.json(); category = rows?.[0] || null; }
  } catch (e) { /* fall through */ }

  if (!category) {
    const tags = `
  <title>Ringtone Category | BestFreeWallpapers</title>
  <meta name="description" content="Browse free ringtones by category on BestFreeWallpapers." />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${canonicalUrl}" />`;
    return sendHtml(res, injectHead(getBaseHtml(), tags), 200, 'no-store');
  }

  const ogImage = category.preview_image?.startsWith('http') ? category.preview_image : OG_IMAGE_DEFAULT;
  const title = category.seo_title || `${category.name} Ringtones - Free MP3 Downloads | BestFreeWallpapers`;
  const description = category.seo_description || category.description || `Download free ${category.name.toLowerCase()} ringtones in MP3 format. High-quality audio, perfect for calls and notifications.`;
  const keywords = `${category.name.toLowerCase()} ringtones, ${category.name.toLowerCase()} mp3, free ${category.name.toLowerCase()} ringtones, phone ringtones`;

  const tags = `
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
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': canonicalUrl, name: `${category.name} Ringtones`, description, url: canonicalUrl, isPartOf: { '@id': `${SITE_URL}/ringtones` }, about: { '@type': 'Thing', name: category.name }, provider: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL } })}
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Ringtones', item: `${SITE_URL}/ringtones` }, { '@type': 'ListItem', position: 3, name: category.name, item: canonicalUrl }] })}
  `;
  sendHtml(res, injectHead(getBaseHtml(), tags));
}

// ── LIVE WALLPAPERS ───────────────────────────────────────────────────────────

async function handleLiveList(res: VercelResponse) {
  const canonicalUrl = `${SITE_URL}/live-wallpapers`;
  const title = 'Free Live Wallpapers — Animated HD Video Wallpapers | BestFreeWallpapers';
  const description = 'Download free animated live wallpapers for your phone. AI-generated HD video wallpapers in MP4 format — nature, fantasy, cars, abstract and more. Updated weekly.';
  const keywords = 'free live wallpapers, animated wallpapers, video wallpapers, mobile live wallpapers, HD animated backgrounds, AI wallpapers, phone live wallpapers, free MP4 wallpapers';

  const tags = `
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
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE_DEFAULT}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': canonicalUrl, name: title, description, url: canonicalUrl, isPartOf: { '@id': SITE_URL }, publisher: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL } })}
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Live Wallpapers', item: canonicalUrl }] })}
  `;
  sendHtml(res, injectHead(getBaseHtml(), tags));
}

async function handleLiveDetail(slug: string, supabaseUrl: string, supabaseKey: string, res: VercelResponse) {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const canonicalUrl = `${SITE_URL}/live-wallpaper/${safeSlug}`;

  let wallpaper: any = null;
  try {
    const r = await supabaseFetch(supabaseUrl, supabaseKey,
      `live_wallpapers?select=id,title,slug,description,video_url,thumbnail_url,tags,category,is_premium,downloads_count,views_count,created_at&slug=eq.${encodeURIComponent(safeSlug)}&is_active=eq.true&is_published=eq.true&limit=1`);
    if (r.ok) { const rows = await r.json(); wallpaper = rows?.[0] || null; }
  } catch (e) { /* fall through */ }

  if (!wallpaper) {
    const tags = `
  <title>Live Wallpaper | BestFreeWallpapers</title>
  <meta name="description" content="Download free animated live wallpapers for your phone." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${canonicalUrl}" />`;
    return sendHtml(res, injectHead(getBaseHtml(), tags), 200, 'no-store');
  }

  const title = `${wallpaper.title} — Free Live Wallpaper | BestFreeWallpapers`;
  const description = wallpaper.description || `Download ${wallpaper.title} free animated live wallpaper for your phone. High-quality MP4 video wallpaper, no watermark, no signup required.`;
  const keywords = ['free live wallpaper', wallpaper.title.toLowerCase(), ...(wallpaper.tags || []), wallpaper.category || '', 'animated wallpaper', 'video wallpaper'].filter(Boolean).join(', ');
  const ogImage = wallpaper.thumbnail_url || OG_IMAGE_DEFAULT;

  const tags = `
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
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'VideoObject', '@id': canonicalUrl, name: wallpaper.title, description, contentUrl: wallpaper.video_url, thumbnailUrl: wallpaper.thumbnail_url || OG_IMAGE_DEFAULT, uploadDate: wallpaper.created_at, url: canonicalUrl, interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: wallpaper.views_count || 0 }, publisher: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.webp` } }, isFamilyFriendly: true, inLanguage: 'en', ...(wallpaper.tags?.length ? { keywords: wallpaper.tags.join(', ') } : {}) })}
  ${jsonLdScript({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Live Wallpapers', item: `${SITE_URL}/live-wallpapers` }, ...(wallpaper.category ? [{ '@type': 'ListItem', position: 3, name: wallpaper.category, item: `${SITE_URL}/live-wallpapers?cat=${wallpaper.category}` }] : []), { '@type': 'ListItem', position: wallpaper.category ? 4 : 3, name: wallpaper.title, item: canonicalUrl }] })}
  `;
  sendHtml(res, injectHead(getBaseHtml(), tags));
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send('ok');
    return;
  }

  const route = typeof req.query.route === 'string' ? req.query.route : '';
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
  const page = typeof req.query.page === 'string' ? req.query.page : 'free-wallpapers';

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) ?? '';
  const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) ?? '';

  try {
    switch (route) {
      case 'static':
        return await handleStatic(page, res);
      case 'wallpaper':
        return await handleWallpaper(slug, supabaseUrl, supabaseKey, res);
      case 'category':
        return await handleCategory(slug, supabaseUrl, supabaseKey, res);
      case 'ringtone':
        return await handleRingtone(slug, supabaseUrl, supabaseKey, res);
      case 'ringtone-category':
        return await handleRingtoneCategory(slug, supabaseUrl, supabaseKey, res);
      case 'live':
        return slug
          ? await handleLiveDetail(slug, supabaseUrl, supabaseKey, res)
          : await handleLiveList(res);
      default:
        // Fallback — returnează base HTML fără SEO în loc de 400
        return sendHtml(res, getBaseHtml());
    }
  } catch (error) {
    console.error(`[SEO] Error route=${route} slug=${slug}:`, error);
    return sendHtml(res, getBaseHtml());
  }
}
