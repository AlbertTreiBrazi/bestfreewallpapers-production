import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface WallpaperData {
  id: number;
  title: string;
  description: string;
  slug: string;
  image_url: string;
  thumbnail_url: string | null;
  width: number;
  height: number;
  device_type: string;
  tags: string[];
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

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

// Fetch wallpaper data from Supabase
async function fetchWallpaperData(slug: string): Promise<WallpaperData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing');
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/wallpaper-detail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({ slug })
    });

    if (!response.ok) {
      console.error(`Wallpaper fetch failed: ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (result.data?.wallpaper) {
      return result.data.wallpaper;
    }

    return null;
  } catch (error) {
    console.error('Error fetching wallpaper:', error);
    return null;
  }
}

// Dynamic bundle resolver using Vite manifest
interface ViteManifest {
  [key: string]: {
    file: string;
    src?: string;
    isEntry?: boolean;
    isDynamicEntry?: boolean;
    imports?: string[];
    css?: string[];
  };
}

interface ResolvedAssets {
  mainJs: string;
  mainCss: string;
  preloadScripts: string[];
}

function getResolvedAssets(): ResolvedAssets {
  // Try multiple possible manifest locations
  const possiblePaths = [
    join(process.cwd(), 'dist', 'manifest.json'),
    join(__dirname, '..', 'dist', 'manifest.json'),
    join(__dirname, '..', '..', 'dist', 'manifest.json'),
  ];

  let manifest: ViteManifest = {};

  for (const manifestPath of possiblePaths) {
    if (existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        console.log(`[seo-wallpaper] Loaded manifest from: ${manifestPath}`);
        break;
      } catch (e) {
        console.error(`[seo-wallpaper] Failed to parse manifest at ${manifestPath}:`, e);
      }
    }
  }

  // Find the main entry point (src/main.tsx)
  const mainEntryKey = Object.keys(manifest).find(
    key => manifest[key].isEntry && manifest[key].src?.includes('main.tsx')
  );

  const mainEntry = mainEntryKey ? manifest[mainEntryKey] : null;

  if (!mainEntry) {
    // Fallback: try to find any entry with .tsx extension
    const anyEntry = Object.values(manifest).find(m => m.isEntry && m.file.endsWith('.js'));
    if (anyEntry) {
      console.warn('[seo-wallpaper] Using fallback entry detection');
    } else {
      console.error('[seo-wallpaper] No main entry found in manifest!');
    }
  }

  const mainJs = mainEntry?.file || 'assets/js/index-[HASH].js';

  // Collect preload scripts from imports
  const preloadScripts: string[] = [];
  if (mainEntry?.imports) {
    for (const importKey of mainEntry.imports) {
      const importModule = manifest[importKey];
      if (importModule?.file) {
        preloadScripts.push(`<link rel="modulepreload" crossorigin href="/${importModule.file}" />`);
      }
    }
  }

  // Find main CSS file
  let mainCss = '';
  for (const key of Object.keys(manifest)) {
    const entry = manifest[key];
    if (entry.isEntry && entry.css && entry.css.length > 0) {
      mainCss = entry.css[0];
      break;
    }
  }

  // If no CSS found via entry, look for any CSS file
  if (!mainCss) {
    for (const key of Object.keys(manifest)) {
      if (manifest[key].file.endsWith('.css')) {
        mainCss = manifest[key].file;
        break;
      }
    }
  }

  return {
    mainJs: `/${mainJs}`,
    mainCss: mainCss ? `/${mainCss}` : '',
    preloadScripts
  };
}

// Generate the full HTML document with SEO tags
function generateHtml(wallpaper: WallpaperData, slug: string, baseUrl: string, assets: ResolvedAssets): string {
  const title = escapeHtml(`${wallpaper.title} - Free HD Wallpaper Download | BestFreeWallpapers`);
  const description = escapeHtml(
    wallpaper.description ||
    `Download ${wallpaper.title} in high quality. Free ${wallpaper.device_type || 'desktop'} wallpaper in ${wallpaper.width}x${wallpaper.height} resolution.`
  );
  const canonicalUrl = `${baseUrl}/wallpaper/${slug}`;
  const imageUrl = wallpaper.thumbnail_url || wallpaper.image_url;

  // Generate keywords from tags and title
  const keywords = [
    wallpaper.title,
    ...(wallpaper.tags || []),
    `${wallpaper.device_type || 'desktop'} wallpaper`,
    'free wallpaper',
    'HD wallpaper',
    'download wallpaper'
  ].filter(Boolean).join(', ');

  // Generate structured data for ImageObject
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "name": wallpaper.title,
    "description": wallpaper.description || `Free HD wallpaper: ${wallpaper.title}`,
    "contentUrl": wallpaper.image_url,
    "thumbnailUrl": wallpaper.thumbnail_url || wallpaper.image_url,
    "width": wallpaper.width,
    "height": wallpaper.height,
    "author": {
      "@type": "Organization",
      "name": "BestFreeWallpapers"
    },
    "copyrightHolder": {
      "@type": "Organization",
      "name": "BestFreeWallpapers"
    }
  };

  // Build preload tags dynamically from manifest
  const preloadTags = assets.preloadScripts.join('\n  ');

  // Build CSS link tag dynamically
  const cssLink = assets.mainCss ? `\n  <link rel="stylesheet" crossorigin href="${assets.mainCss}" />` : '';

  return `<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO Meta Tags - Wallpaper Specific -->
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="author" content="BestFreeWallpapers Team" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="googlebot" content="index, follow" />
  <meta name="bingbot" content="index, follow" />

  <!-- Theme and Visual Meta Tags -->
  <meta name="theme-color" content="#374151" />
  <meta name="msapplication-TileColor" content="#7c3aed" />
  <meta name="application-name" content="BestFreeWallpapers" />
  <meta name="apple-mobile-web-app-title" content="BestFreeWallpapers" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />

  <!-- Open Graph Meta Tags - Wallpaper Specific -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="${wallpaper.width || 1920}" />
  <meta property="og:image:height" content="${wallpaper.height || 1080}" />
  <meta property="og:image:alt" content="${escapeHtml(wallpaper.title)}" />

  <!-- Twitter Card Meta Tags - Wallpaper Specific -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:creator" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(wallpaper.title)}" />

  <!-- Canonical URL - Self-referencing -->
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Favicons and Icons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="manifest" href="/manifest.json" />

  <!-- Critical Resource Hints for LCP Optimization -->
  <link rel="preconnect" href="https://eocgtrggcalfptqhgxer.supabase.co" crossorigin />
  <link rel="dns-prefetch" href="https://eocgtrggcalfptqhgxer.supabase.co" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- Preload the wallpaper image for LCP -->
  <link rel="preload" href="${escapeHtml(imageUrl)}" as="image" fetchpriority="high" />

  <!-- Font Loading Optimization -->
  <link rel="preload" href="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2" as="font" type="font/woff2" crossorigin />
  <style>
    @font-face {
      font-family: 'Inter';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: local('Inter'), local('Inter-Regular'),
           url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2) format('woff2');
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
  </style>

  <!-- Critical CSS -->
  <style>
    html{background-color:#111827;color:#f9fafb;overflow-x:hidden}
    body{margin:0;padding:0;background-color:#111827;color:#f9fafb;font-family:system-ui,-apple-system,sans-serif;overflow-x:hidden;transition:background-color .3s ease,color .3s ease}
    #root{min-height:100vh;background-color:inherit;overflow-x:hidden;width:100%}
    .light{background-color:#fff;color:#1f2937}
    .light body,.light #root{background-color:#fff;color:#1f2937}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    .loading-skeleton{background:linear-gradient(90deg,#1f2937 25%,#374151 50%,#1f2937 75%);background-size:200% 100%;animation:loading 1.5s infinite}
    @keyframes loading{0%%{background-position:200% 0}100%{background-position:-200% 0}}
    @media(max-width:768px){html,body{overflow-x:hidden!important;max-width:100vw}*,*::before,*::after{max-width:100vw}}
  </style>

  <!-- Structured Data - Wallpaper -->
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
</head>

<body style="background-color: #ffffff; color: #1f2937; margin: 0; padding: 0;">
  <div id="root" style="min-height: 100vh; background-color: inherit;"></div>
  <script type="module" crossorigin src="${assets.mainJs}"></script>
  ${preloadTags}
  ${cssLink}
</body>

</html>`;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Extract slug from query parameter
  const slug = request.query.slug as string;

  if (!slug || typeof slug !== 'string') {
    response.status(404);
    response.send('Not found');
    return;
  }

  // Determine base URL
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'bestfreewallpapers.com';
  const baseUrl = `${protocol}://${host}`;

  try {
    // Fetch wallpaper data
    const wallpaper = await fetchWallpaperData(slug);

    if (!wallpaper) {
      response.status(404);
      response.setHeader('Content-Type', 'text/html');
      response.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Wallpaper Not Found | BestFreeWallpapers</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${baseUrl}/free-wallpapers" />
</head>
<body>
  <h1>Wallpaper Not Found</h1>
  <p>The requested wallpaper could not be found.</p>
  <a href="/free-wallpapers">Browse Wallpapers</a>
</body>
</html>`);
      return;
    }

    // Resolve assets dynamically from manifest (no more hardcoded hashes!)
    const assets = getResolvedAssets();
    console.log(`[seo-wallpaper] Resolved assets - mainJs: ${assets.mainJs}, css: ${assets.mainCss}`);

    // Generate and return HTML with wallpaper-specific SEO
    const html = generateHtml(wallpaper, slug, baseUrl, assets);

    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(html);

  } catch (error) {
    console.error('SEO handler error:', error);
    response.status(500);
    response.setHeader('Content-Type', 'text/html');
    response.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Error | BestFreeWallpapers</title>
  <meta name="robots" content="noindex, nofollow" />
</head>
<body>
  <h1>Something went wrong</h1>
  <p>Please try again later.</p>
  <a href="/">Go Home</a>
</body>
</html>`);
  }
}
