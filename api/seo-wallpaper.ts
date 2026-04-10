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
// COMPLETE HEAD REPLACEMENT
// ============================================================================

function replaceHead(html: string, newHeadContent: string): string {
  // Find body tag and everything after it
  const bodyStartIndex = html.indexOf('<body');
  const bodyEndIndex = html.indexOf('</body>');
  
  let bodyContent = '';
  if (bodyStartIndex !== -1 && bodyEndIndex !== -1) {
    // Extract from <body...> to </body> inclusive
    bodyContent = html.substring(bodyStartIndex, bodyEndIndex + 7);
  } else {
    // Fallback: just the minimal body
    bodyContent = '<body>\n  <div id="root"></div>\n</body>';
  }
  
  // Build completely new HTML document
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${newHeadContent}
</head>
${bodyContent}
</html>`;
}

// ============================================================================
// SEO TAG GENERATION
// ============================================================================

function generateSeoTags(wallpaper: WallpaperData, is404 = false): string {
  if (is404) {
    const canonicalUrl = `${SITE_URL}/wallpaper/${wallpaper.slug}`;
    return `  <title>Wallpaper Not Found | BestFreeWallpapers</title>
  <meta name="description" content="The wallpaper you're looking for could not be found. Browse thousands of free HD wallpapers on BestFreeWallpapers." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${canonicalUrl}" />`;
  }

  const canonicalUrl = `${SITE_URL}/wallpaper/${wallpaper.slug}`;
  const imageUrl = wallpaper.thumbnail_url || wallpaper.image_url || OG_IMAGE_DEFAULT;
  const description = wallpaper.description || generateFallbackDescription(wallpaper.title);
  const keywords = wallpaper.tags?.length ? wallpaper.tags.join(', ') : wallpaper.title;

  return `  <title>${escapeHtml(wallpaper.title)} - Free HD Wallpaper Download | BestFreeWallpapers</title>
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
      
      const html = replaceHead(getBaseHtml(), seoTags);
      
      response.status(404);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.send(html);
      return;
    }

    console.log(`[SEO Wallpaper] Found wallpaper: ${wallpaper.title}`);
    
    // Success: Generate HTML with clean head
    const seoTags = generateSeoTags(wallpaper);
    const html = replaceHead(getBaseHtml(), seoTags);

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
