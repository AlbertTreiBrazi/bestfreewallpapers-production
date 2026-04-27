import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://cdn.bestfreewallpapers.com/wallpapers/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

// ============================================================================
// TYPES
// ============================================================================

interface CategoryData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  preview_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  meta_keywords: string[] | null;
  is_active: boolean;
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
    console.error('[SEO Category] Error reading dist/index.html:', error);
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

// ============================================================================
// SEO METADATA BUILDERS
// ============================================================================

function buildTitle(category: CategoryData): string {
  // Prefer seo_title if filled, otherwise build from name
  if (category.seo_title && category.seo_title.trim().length > 0) {
    return category.seo_title;
  }
  return `Best Free ${category.name} Wallpapers - HD Downloads | BestFreeWallpapers`;
}

function buildDescription(category: CategoryData): string {
  // Priority: seo_description > description > generic fallback
  if (category.seo_description && category.seo_description.trim().length > 0) {
    return category.seo_description;
  }
  if (category.description && category.description.trim().length > 0) {
    return category.description;
  }
  return `Browse and download free ${category.name} wallpapers in HD quality. High-resolution backgrounds for desktop and mobile devices.`;
}

function buildKeywords(category: CategoryData): string {
  // Use meta_keywords array if filled, otherwise build from category name
  if (Array.isArray(category.meta_keywords) && category.meta_keywords.length > 0) {
    return category.meta_keywords.join(', ');
  }
  const lower = category.name.toLowerCase();
  return `${lower} wallpapers, ${lower} backgrounds, free ${lower} wallpapers, HD ${lower} wallpapers, ${lower} mobile wallpapers, ${lower} desktop wallpapers`;
}

function buildOgImage(category: CategoryData): string {
  // Use preview_image if filled and valid URL, otherwise default
  if (category.preview_image && category.preview_image.startsWith('http')) {
    return category.preview_image;
  }
  return OG_IMAGE_DEFAULT;
}

// ============================================================================
// JSON-LD GENERATION — CollectionPage + BreadcrumbList
// ============================================================================

function generateJsonLd(category: CategoryData, canonicalUrl: string): string {
  const description = buildDescription(category);
  const ogImage = buildOgImage(category);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': canonicalUrl,
      name: `${category.name} Wallpapers`,
      description: description,
      url: canonicalUrl,
      isPartOf: { '@id': SITE_URL },
      about: {
        '@type': 'Thing',
        name: category.name
      },
      image: ogImage,
      provider: {
        '@type': 'Organization',
        name: 'BestFreeWallpapers',
        url: SITE_URL
      }
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
          name: 'Categories',
          item: `${SITE_URL}/categories`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: category.name,
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
// SEO TAG GENERATION
// ============================================================================

function generateSeoTags(category: CategoryData, baseUrl: string, is404 = false): string {
  const canonicalUrl = `${baseUrl}/category/${category.slug}`;

  if (is404) {
    return `
  <title>Category Not Found | BestFreeWallpapers</title>
  <meta name="description" content="The category you're looking for could not be found. Browse all categories on BestFreeWallpapers." />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${canonicalUrl}" />
  `;
  }

  const title = buildTitle(category);
  const description = buildDescription(category);
  const keywords = buildKeywords(category);
  const ogImage = buildOgImage(category);

  return `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="author" content="BestFreeWallpapers Team" />
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
  <meta name="twitter:creator" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${generateJsonLd(category, canonicalUrl)}
  `;
}

// ============================================================================
// INJECT HEAD — strip generic tags from base index.html and inject category-specific ones
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
// SUPABASE FETCH — directly query the categories table by slug
// ============================================================================

async function fetchCategory(slug: string): Promise<CategoryData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[SEO Category] Missing Supabase credentials');
    return null;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/categories?select=id,name,slug,description,preview_image,seo_title,seo_description,meta_keywords,is_active&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        }
      }
    );

    if (!response.ok) {
      console.error('[SEO Category] Supabase response not OK:', response.status);
      return null;
    }

    const result = await response.json();

    if (Array.isArray(result) && result.length > 0) {
      return result[0] as CategoryData;
    }

    return null;
  } catch (error) {
    console.error('[SEO Category] Fetch error:', error);
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

  console.log(`[SEO Category] Processing slug: ${slug}`);

  try {
    const category = await fetchCategory(slug);

    if (!category) {
      console.log(`[SEO Category] Category not found: ${slug}`);
      const sanitizedSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');

      let html = getBaseHtml();
      const seoTags = generateSeoTags({
        id: 0,
        name: '',
        slug: sanitizedSlug,
        description: null,
        preview_image: null,
        seo_title: null,
        seo_description: null,
        meta_keywords: null,
        is_active: false
      } as CategoryData, baseUrl, true);
      html = injectHead(html, seoTags);

      response.status(404);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.send(html);
      return;
    }

    console.log(`[SEO Category] Found category: ${category.name}`);

    let html = getBaseHtml();
    const seoTags = generateSeoTags(category, baseUrl);
    html = injectHead(html, seoTags);

    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(html);

  } catch (error) {
    console.error('[SEO Category] Error:', error);

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
