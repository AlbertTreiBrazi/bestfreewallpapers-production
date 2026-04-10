import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers-thumbnails/wallpaper-1772192337504-Golden_White_Bloom___Elegant_3D_Floral_Wallpaper.jpg';

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
// ROBUST HEAD CLEANING
// ============================================================================

function cleanHead(html: string): string {
  // Remove ALL conflicting SEO meta tags from head
  // Use simple, direct patterns that match regardless of attribute order/formatting
  
  const patterns = [
    // Title tag
    { regex: /<title[^>]*>[\s\S]*?<\/title>/gi, name: 'title' },
    // Meta name attributes
    { regex: /<meta[^>]+name=["']description["'][^>]*>/gi, name: 'description' },
    { regex: /<meta[^>]+name=["']keywords["'][^>]*>/gi, name: 'keywords' },
    { regex: /<meta[^>]+name=["']robots["'][^>]*>/gi, name: 'robots' },
    { regex: /<meta[^>]+name=["']author["'][^>]*>/gi, name: 'author' },
    { regex: /<meta[^>]+name=["']googlebot["'][^>]*>/gi, name: 'googlebot' },
    { regex: /<meta[^>]+name=["']bingbot["'][^>]*>/gi, name: 'bingbot' },
    { regex: /<meta[^>]+name=["']theme-color["'][^>]*>/gi, name: 'theme-color' },
    { regex: /<meta[^>]+name=["']msapplication-TileColor["'][^>]*>/gi, name: 'msapplication-TileColor' },
    { regex: /<meta[^>]+name=["']application-name["'][^>]*>/gi, name: 'application-name' },
    { regex: /<meta[^>]+name=["']apple-mobile-web-app-title["'][^>]*>/gi, name: 'apple-mobile-web-app-title' },
    { regex: /<meta[^>]+name=["']mobile-web-app-capable["'][^>]*>/gi, name: 'mobile-web-app-capable' },
    // Open Graph - property attribute
    { regex: /<meta[^>]+property=["']og:title["'][^>]*>/gi, name: 'og:title' },
    { regex: /<meta[^>]+property=["']og:description["'][^>]*>/gi, name: 'og:description' },
    { regex: /<meta[^>]+property=["']og:type["'][^>]*>/gi, name: 'og:type' },
    { regex: /<meta[^>]+property=["']og:url["'][^>]*>/gi, name: 'og:url' },
    { regex: /<meta[^>]+property=["']og:site_name["'][^>]*>/gi, name: 'og:site_name' },
    { regex: /<meta[^>]+property=["']og:locale["'][^>]*>/gi, name: 'og:locale' },
    { regex: /<meta[^>]+property=["']og:image["'][^>]*>/gi, name: 'og:image' },
    { regex: /<meta[^>]+property=["']og:image:width["'][^>]*>/gi, name: 'og:image:width' },
    { regex: /<meta[^>]+property=["']og:image:height["'][^>]*>/gi, name: 'og:image:height' },
    { regex: /<meta[^>]+property=["']og:image:alt["'][^>]*>/gi, name: 'og:image:alt' },
    { regex: /<meta[^>]+property=["']article:published_time["'][^>]*>/gi, name: 'article:published_time' },
    { regex: /<meta[^>]+property=["']article:modified_time["'][^>]*>/gi, name: 'article:modified_time' },
    { regex: /<meta[^>]+property=["']article:section["'][^>]*>/gi, name: 'article:section' },
    // Twitter - name attribute
    { regex: /<meta[^>]+name=["']twitter:card["'][^>]*>/gi, name: 'twitter:card' },
    { regex: /<meta[^>]+name=["']twitter:site["'][^>]*>/gi, name: 'twitter:site' },
    { regex: /<meta[^>]+name=["']twitter:creator["'][^>]*>/gi, name: 'twitter:creator' },
    { regex: /<meta[^>]+name=["']twitter:title["'][^>]*>/gi, name: 'twitter:title' },
    { regex: /<meta[^>]+name=["']twitter:description["'][^>]*>/gi, name: 'twitter:description' },
    { regex: /<meta[^>]+name=["']twitter:image["'][^>]*>/gi, name: 'twitter:image' },
    { regex: /<meta[^>]+name=["']twitter:image:alt["'][^>]*>/gi, name: 'twitter:image:alt' },
    // Canonical
    { regex: /<link[^>]+rel=["']canonical["'][^>]*>/gi, name: 'canonical' },
    // Structured data
    { regex: /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, name: 'structured-data' },
  ];

  let cleaned = html;
  
  for (const { regex, name } of patterns) {
    const before = cleaned;
    cleaned = cleaned.replace(regex, '');
    if (before !== cleaned) {
      console.log(`[SEO Wallpaper] Removed: ${name}`);
    }
  }

  return cleaned;
}

function injectHead(html: string, seoTags: string): string {
  // First clean all conflicting tags
  let modified = cleanHead(html);
  
  // Try multiple injection strategies
  
  // Strategy 1: After charset meta tag
  const charsetMatch = modified.match(/<meta\s+charset[^>]*[\s\S]*?>/i);
  if (charsetMatch) {
    modified = modified.replace(charsetMatch[0], charsetMatch[0] + '\n  ' + seoTags);
    console.log('[SEO Wallpaper] Injected after charset meta');
    return modified;
  }
  
  // Strategy 2: After <head> opening tag
  const headMatch = modified.match(/<head[^>]*>/i);
  if (headMatch) {
    modified = modified.replace(headMatch[0], headMatch[0] + '\n  ' + seoTags);
    console.log('[SEO Wallpaper] Injected after <head> tag');
    return modified;
  }
  
  // Strategy 3: After viewport meta tag
  const viewportMatch = modified.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
  if (viewportMatch) {
    modified = modified.replace(viewportMatch[0], viewportMatch[0] + '\n  ' + seoTags);
    console.log('[SEO Wallpaper] Injected after viewport meta');
    return modified;
  }
  
  // Strategy 4: Before </head>
  modified = modified.replace(/<\/head>/i, '\n  ' + seoTags + '\n</head>');
  console.log('[SEO Wallpaper] Injected before </head>');
  
  return modified;
}

// ============================================================================
// SEO TAG GENERATION
// ============================================================================

function generateSeoTags(wallpaper: WallpaperData, is404 = false): string {
  if (is404) {
    const canonicalUrl = `${SITE_URL}/wallpaper/${wallpaper.slug}`;
    return `<title>Wallpaper Not Found | BestFreeWallpapers</title>
  <meta name="description" content="The wallpaper you're looking for could not be found. Browse thousands of free HD wallpapers on BestFreeWallpapers." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${canonicalUrl}" />`;
  }

  const canonicalUrl = `${SITE_URL}/wallpaper/${wallpaper.slug}`;
  const imageUrl = wallpaper.thumbnail_url || wallpaper.image_url || OG_IMAGE_DEFAULT;
  const description = wallpaper.description || generateFallbackDescription(wallpaper.title);
  const keywords = wallpaper.tags?.length ? wallpaper.tags.join(', ') : wallpaper.title;

  return `<title>${escapeHtml(wallpaper.title)} - Free HD Wallpaper Download | BestFreeWallpapers</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta property="og:title" content="${escapeHtml(wallpaper.title)} - Free HD Wallpaper" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="${wallpaper.width || 1920}" />
  <meta property="og:image:height" content="${wallpaper.height || 1080}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(wallpaper.title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <link rel="canonical" href="${canonicalUrl}" />`;
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

  console.log(`[SEO Wallpaper] Processing slug: ${slug}`);

  try {
    const wallpaper = await fetchWallpaper(slug);

    if (!wallpaper) {
      console.log(`[SEO Wallpaper] Wallpaper not found: ${slug}`);
      // 404: Wallpaper not found
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
      } as WallpaperData, true);
      html = injectHead(html, seoTags);
      
      response.status(404);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.send(html);
      return;
    }

    console.log(`[SEO Wallpaper] Found wallpaper: ${wallpaper.title}`);
    
    // Success: Inject SEO tags
    let html = getBaseHtml();
    const seoTags = generateSeoTags(wallpaper);
    html = injectHead(html, seoTags);

    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(html);

  } catch (error) {
    console.error('[SEO Wallpaper] Error:', error);
    
    // Fail safe: return base HTML
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
