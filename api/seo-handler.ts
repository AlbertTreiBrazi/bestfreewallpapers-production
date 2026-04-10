/**
 * Self-contained SEO Handler for BestFreeWallpapers
 * 
 * Handles: /, /homepage, /premium, /upgrade, /collections, /categories, 
 *         /mobile-wallpapers, /ai-wallpapers
 * 
 * Features:
 * - No external imports (except @vercel/node types)
 * - Reads base HTML from dist/index.html
 * - Injects SEO meta tags into <head>
 * - Injects simple H1 + intro content before <div id="root">
 * - Fails safely - returns base HTML on any error
 * 
 * Author: MiniMax Agent
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// ROUTE METADATA
// ============================================================================

interface RouteConfig {
  title: string;
  description: string;
  keywords: string;
  canonicalPath: string;
  h1: string;
  intro: string;
}

const ROUTES: Record<string, RouteConfig> = {
  home: {
    title: 'Best Free Wallpapers - HD Desktop & Mobile Backgrounds 2025',
    description: 'Download the best free wallpapers in HD quality. 10,000+ desktop and mobile backgrounds including nature, abstract, gaming, AI art, and more. Updated daily with trending wallpapers.',
    keywords: 'best free wallpapers, free wallpapers, wallpapers free download, high quality wallpapers, HD wallpapers, desktop wallpapers, mobile wallpapers, free desktop backgrounds, 4K wallpapers, wallpaper download',
    canonicalPath: '/',
    h1: 'Best Free Wallpapers',
    intro: 'Discover over 10,000 stunning HD, 4K and 8K wallpapers for desktop and mobile. Download free high-quality backgrounds updated daily.'
  },
  premium: {
    title: 'Premium Wallpapers - Exclusive HD & 4K Wallpapers | BestFreeWallpapers',
    description: 'Unlock exclusive premium wallpapers in 4K and 8K resolution. Get early access to new designs, ad-free experience, and high-resolution downloads with our premium membership.',
    keywords: 'premium wallpapers, 4K wallpapers, 8K wallpapers, exclusive wallpapers, premium membership, ad-free wallpapers, high resolution wallpapers',
    canonicalPath: '/premium',
    h1: 'Premium Wallpapers',
    intro: 'Access exclusive premium wallpapers in stunning 4K and 8K resolution. Premium membership includes ad-free browsing and early access to new designs.'
  },
  collections: {
    title: 'Wallpaper Collections - Curated Sets for Every Device | BestFreeWallpapers',
    description: 'Browse our curated wallpaper collections for iPhone, Android, Samsung Galaxy, iPad, and desktop. Each collection features matching wallpapers designed for specific devices.',
    keywords: 'wallpaper collections, iPhone wallpapers, Android wallpapers, Samsung Galaxy wallpapers, iPad wallpapers, curated wallpapers, device wallpapers',
    canonicalPath: '/collections',
    h1: 'Wallpaper Collections',
    intro: 'Explore curated wallpaper collections for iPhone, Android, Samsung Galaxy, iPad and desktop. Perfectly sized wallpapers for every device.'
  },
  categories: {
    title: 'Wallpaper Categories - Browse by Style & Theme | BestFreeWallpapers',
    description: 'Browse wallpapers by category. From nature and abstract to gaming and anime, find the perfect wallpaper organized by style, theme, and aesthetic.',
    keywords: 'wallpaper categories, nature wallpapers, abstract wallpapers, gaming wallpapers, anime wallpapers, minimalist wallpapers, space wallpapers, 4K categories',
    canonicalPath: '/categories',
    h1: 'Wallpaper Categories',
    intro: 'Find the perfect wallpaper by category. From nature and abstract to gaming and anime - organized by style, theme and aesthetic.'
  },
  mobile: {
    title: 'Mobile Wallpapers - HD & 4K Phone Backgrounds | BestFreeWallpapers',
    description: 'Download free mobile wallpapers in HD and 4K resolution. Perfect wallpapers for iPhone, Samsung Galaxy, Google Pixel, OnePlus, Xiaomi, and all Android devices.',
    keywords: 'mobile wallpapers, phone wallpapers, iPhone wallpapers, Android wallpapers, HD phone wallpapers, 4K mobile wallpapers, smartphone backgrounds, Samsung Galaxy wallpapers',
    canonicalPath: '/mobile-wallpapers',
    h1: 'Mobile Wallpapers',
    intro: 'Download free mobile wallpapers in HD and 4K. Perfect wallpapers for iPhone, Samsung Galaxy, Google Pixel, OnePlus, Xiaomi and all Android devices.'
  },
  ai: {
    title: 'AI Wallpapers - Artificial Intelligence Generated Art | BestFreeWallpapers',
    description: 'Explore stunning AI-generated wallpapers created with artificial intelligence. Download unique futuristic, abstract, and creative wallpapers made by AI for desktop and mobile.',
    keywords: 'AI wallpapers, AI generated wallpapers, artificial intelligence art, AI art wallpapers, futuristic wallpapers, generated art wallpapers, machine learning art',
    canonicalPath: '/ai-wallpapers',
    h1: 'AI Wallpapers',
    intro: 'Explore stunning AI-generated wallpapers created with artificial intelligence. Unique futuristic and abstract wallpapers for desktop and mobile devices.'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// OG Image (site-wide)
const OG_IMAGE = 'https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers-thumbnails/wallpaper-1772192337504-Golden_White_Bloom___Elegant_3D_Floral_Wallpaper.jpg';
const SITE_NAME = 'BestFreeWallpapers';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get base URL from request headers
 */
function getBaseUrl(request: VercelRequest): string {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'bestfreewallpapers.com';
  return `${protocol}://${host}`;
}

/**
 * Read base HTML from dist folder
 */
function getBaseHtml(): string {
  try {
    // Try dist/index.html first
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      return fs.readFileSync(indexPath, 'utf-8');
    }
  } catch (error) {
    console.error('[SEO] Error reading dist/index.html:', error);
  }

  // Fallback minimal HTML
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

/**
 * Generate SEO meta tags HTML
 */
function generateSeoTags(baseUrl: string, config: RouteConfig): string {
  const canonicalUrl = `${baseUrl}${config.canonicalPath}`;

  return `
  <title>${escapeHtml(config.title)}</title>
  <meta name="description" content="${escapeHtml(config.description)}" />
  <meta name="keywords" content="${escapeHtml(config.keywords)}" />
  <meta name="author" content="${SITE_NAME} Team" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(config.title)}" />
  <meta property="og:description" content="${escapeHtml(config.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:creator" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(config.title)}" />
  <meta name="twitter:description" content="${escapeHtml(config.description)}" />
  <meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />
  
  <!-- Canonical -->
  <link rel="canonical" href="${canonicalUrl}" />
  
  <!-- Favicons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="manifest" href="/manifest.json" />
  `;
}

/**
 * Generate simple SSR body content (H1 + intro, visible to crawlers)
 */
function generateBodyContent(config: RouteConfig): string {
  return `
  <section id="ssr-content" style="max-width:800px;margin:0 auto;padding:40px 20px;font-family:system-ui,sans-serif;color:#1f2937;">
    <h1 style="font-size:2rem;font-weight:700;margin-bottom:16px;color:#111827;">${escapeHtml(config.h1)}</h1>
    <p style="font-size:1.125rem;line-height:1.6;color:#4b5563;margin-bottom:24px;">${escapeHtml(config.intro)}</p>
    <nav style="font-size:0.875rem;color:#6b7280;">
      <a href="/" style="color:#2563eb;text-decoration:none;">Home</a> &raquo; <span>${escapeHtml(config.h1)}</span>
    </nav>
  </section>
  `;
}

/**
 * Inject SEO tags into <head>
 */
function injectHead(html: string, seoTags: string): string {
  // Remove existing title and description
  let modified = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '');

  // Inject after charset meta
  if (modified.includes('<meta charset=')) {
    modified = modified.replace(/(<meta\s+charset[^>]*>)/i, `$1${seoTags}`);
  } else {
    modified = modified.replace(/(<head[^>]*>)/i, `$1${seoTags}`);
  }

  return modified;
}

/**
 * Inject body content before <div id="root">
 */
function injectBody(html: string, bodyContent: string): string {
  return html.replace(
    /(<div\s+id=["']root["'][^>]*>)/i,
    `${bodyContent}\n  $1`
  );
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Get route from query parameter
  const route = (request.query.route as string) || 'home';
  
  // Validate route exists
  const config = ROUTES[route];
  if (!config) {
    response.status(404).send('Not Found');
    return;
  }

  try {
    // Get base HTML
    let html = getBaseHtml();
    
    // Get base URL
    const baseUrl = getBaseUrl(request);
    
    // Generate and inject SEO tags
    const seoTags = generateSeoTags(baseUrl, config);
    html = injectHead(html, seoTags);
    
    // Generate and inject body content
    const bodyContent = generateBodyContent(config);
    html = injectBody(html, bodyContent);
    
    // Return response
    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.setHeader('X-SEO-Injected', 'true');
    response.send(html);

  } catch (error) {
    // FAIL SAFE: Return base HTML on any error
    console.error('[SEO Handler] Error:', error);
    
    try {
      const html = getBaseHtml();
      response.status(200);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.send(html);
    } catch {
      // Absolute fallback
      response.status(200);
      response.setHeader('Content-Type', 'text/html');
      response.send('<!doctype html><html><head><title>BestFreeWallpapers</title></head><body><div id="root"></div></body></html>');
    }
  }
}