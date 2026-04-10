import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

// Route metadata - no database fetch needed
const METADATA = {
  title: 'Free Wallpapers - 10,000+ HD Desktop & Mobile Backgrounds | BestFreeWallpapers',
  description: 'Browse and download over 10,000 free wallpapers in HD, 4K, and 8K quality. Perfect for desktop, mobile, and tablet devices. Updated daily with new designs.',
  route: '/free-wallpapers',
  keywords: 'free wallpapers, free desktop wallpapers, free mobile wallpapers, hd wallpapers, 4k wallpapers, free backgrounds, download wallpapers'
};

// Site-wide OG image (hero banner)
const OG_IMAGE = 'https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers-thumbnails/wallpaper-1772192337504-Golden_White_Bloom___Elegant_3D_Floral_Wallpaper.jpg';

// Escape HTML to prevent XSS in meta tags
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Get base HTML from dist folder
function getBaseHtml(): string {
  try {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      return fs.readFileSync(indexPath, 'utf-8');
    }
  } catch (error) {
    console.error('[SEO Free] Error reading dist/index.html:', error);
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

// Generate SEO meta tags HTML
function generateSeoTags(baseUrl: string): string {
  const canonicalUrl = `${baseUrl}${METADATA.route}`;

  return `
  <title>${escapeHtml(METADATA.title)}</title>
  <meta name="description" content="${escapeHtml(METADATA.description)}" />
  <meta name="keywords" content="${escapeHtml(METADATA.keywords)}" />
  <meta name="author" content="BestFreeWallpapers Team" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(METADATA.title)}" />
  <meta property="og:description" content="${escapeHtml(METADATA.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:creator" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(METADATA.title)}" />
  <meta name="twitter:description" content="${escapeHtml(METADATA.description)}" />
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

// Inject SEO tags into <head>
function injectHead(html: string, seoTags: string): string {
  let modified = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '');

  if (modified.includes('<meta charset=')) {
    modified = modified.replace(/(<meta\s+charset[^>]*>)/i, `$1${seoTags}`);
  } else {
    modified = modified.replace(/(<head[^>]*>)/i, `$1${seoTags}`);
  }

  return modified;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'bestfreewallpapers.com';
  const baseUrl = `${protocol}://${host}`;

  try {
    // Get base HTML from dist
    let html = getBaseHtml();

    // Inject SEO tags only (no body content)
    const seoTags = generateSeoTags(baseUrl);
    html = injectHead(html, seoTags);

    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(html);

  } catch (error) {
    console.error('[SEO Free] Error:', error);

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
