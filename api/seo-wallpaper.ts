import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://cdn.bestfreewallpapers.com/thumbnails/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

// ============================================================================
// TYPES
// ============================================================================

interface WallpaperData {
  id: number;
  title: string;
  description: string;
  slug: string;
  image_url: string;
  thumbnail_url: string | null;
  width: number;
  height: number;
  tags: string[];
  created_at: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getBaseHtml(): string {
  try {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      return fs.readFileSync(indexPath, 'utf-8');
    }
  } catch (error) {
    console.error('[SEO Wallpaper] Error reading dist/index.html:', error);
  }
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BestFreeWallpapers</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
}

function generateFallbackDescription(title: string): string {
  return `Download ${title} in high quality. Free HD wallpaper for desktop and mobile. High-resolution background available for download on BestFreeWallpapers.`;
}

// ============================================================================
// JSON-LD GENERATION — ImageObject + BreadcrumbList
// ============================================================================

function generateJsonLd(wallpaper: WallpaperData, canonicalUrl: string): string {
  const imageUrl = wallpaper.thumbnail_url || wallpaper.image_url || OG_IMAGE_DEFAULT;
  const description = wallpaper.description || generateFallbackDescription(wallpaper.title);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      '@id': `${canonicalUrl}#image`,
      name: wallpaper.title,
      description: description,
      contentUrl: imageUrl,
      url: canonicalUrl,
      width: wallpaper.width || 1920,
      height: wallpaper.height || 1080,
      encodingFormat: 'image/jpeg',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      acquireLicensePage: canonicalUrl,
      creditText: 'BestFreeWallpapers',
      creator: {
        '@type': 'Organization',
        name: 'BestFreeWallpapers',
        url: SITE_URL
      },
      copyrightNotice: `© ${new Date().getFullYear()} BestFreeWallpapers`,
      keywords: wallpaper.tags?.length ? wallpaper.tags.join(', ') : wallpaper.title,
      datePublished: wallpaper.created_at
        ? new Date(wallpaper.created_at).toISOString().split('T')[0]
        : undefined,
      thumbnail: {
        '@type': 'ImageObject',
        url: wallpaper.thumbnail_url || imageUrl,
        width: 400,
        height: 225
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': canonicalUrl,
      url: canonicalUrl,
      name: `${wallpaper.title} - Free HD Wallpaper`,
      description: description,
      isPartOf: { '@id': SITE_URL },
      primaryImageOfPage: { '@id': `${canonicalUrl}#image` },
      datePublished: wallpaper.created_at
        ? new Date(wallpaper.created_at).toISOString().split('T')[0]
        : undefined
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Free Wallpapers',
          item: `${SITE_URL}/free-wallpapers`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: wallpaper.title,
          item: canonicalUrl
        }
      ]
    }
  ];

  return jsonLd.map(schema =>
    `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
  ).join('\n');
}

// ============================================================================
// INJECT HEAD
// ============================================================================

function injectHead(html: string, seoTags: string): string {
  let modified = html
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
    .replace(/<meta[^>]+property=["']article:.*?["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:site["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:creator["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image:alt["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/gi, '');

  if (modified.includes('<meta charset=')) {
    modified = modified.replace(/(<meta\s+charset[^>]*>)/i, `$1${seoTags}`);
  } else {
    modified = modified.replace(/(<head[^>]*>)/i, `$1${seoTags}`);
  }
  return modified;
}

// ============================================================================
// SEO TAG GENERATION
// ============================================================================

function generateSeoTags(wallpaper: WallpaperData, baseUrl: string, is404 = false): string {
  const canonicalUrl = `${baseUrl}/wallpaper/${wallpaper.slug}`;

  if (is404) {
    return `
  <title>Wallpaper Not Found | BestFreeWallpapers</title>
  <meta name="description" content="The wallpaper you're looking for could not be found. Browse thousands of free HD wallpapers on BestFreeWallpapers." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${canonicalUrl}" />
  `;
  }

  const imageUrl = wallpaper.thumbnail_url || wallpaper.image_url || OG_IMAGE_DEFAULT;
  const description = wallpaper.description || generateFallbackDescription(wallpaper.title);
  const keywords = wallpaper.tags?.length ? wallpaper.tags.join(', ') : wallpaper.title;

  return `
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
  <meta name="twitter:creator" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(wallpaper.title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${generateJsonLd(wallpaper, canonicalUrl)}
  `;
}

// ============================================================================
// SUPABASE FETCHING
// ============================================================================

async function fetchWallpaper(slug: string): Promise<WallpaperData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[SEO Wallpaper] Missing Supabase credentials');
    return null;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/wallpaper-detail`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ slug })
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (result.data?.wallpaper) {
      return result.data.wallpaper;
    }

    return null;
  } catch (error) {
    console.error('[SEO Wallpaper] Fetch error:', error);
    return null;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const slug = request.query.slug as string;

  if (!slug) {
    response.status(400).send('Missing slug parameter');
    return;
  }

  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'bestfreewallpapers.com';
  const baseUrl = `${protocol}://${host}`;

  console.log(`[SEO Wallpaper] Processing slug: ${slug}`);

  try {
    const wallpaper = await fetchWallpaper(slug);

    if (!wallpaper) {
      console.log(`[SEO Wallpaper] Wallpaper not found: ${slug}`);
      const sanitizedSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');

      let html = getBaseHtml();
      const seoTags = generateSeoTags({
        slug: sanitizedSlug,
        title: '',
        description: '',
        image_url: '',
        thumbnail_url: null,
        width: 0,
        height: 0,
        tags: [],
        created_at: ''
      } as WallpaperData, baseUrl, true);
      html = injectHead(html, seoTags);

      response.status(404);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.send(html);
      return;
    }

    console.log(`[SEO Wallpaper] Found wallpaper: ${wallpaper.title}`);

    let html = getBaseHtml();
    const seoTags = generateSeoTags(wallpaper, baseUrl);
    html = injectHead(html, seoTags);

    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(html);

  } catch (error) {
    console.error('[SEO Wallpaper] Error:', error);

    try {
      const html = getBaseHtml();
      response.status(200);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.send(html);
    } catch {
      response.status(200);
      response.setHeader('Content-Type', 'text/html');
      response.send('<!doctype html><html><head><title>BestFreeWallpapers</title></head><body><div id="root"></div></body></html>');
    }
  }
}
