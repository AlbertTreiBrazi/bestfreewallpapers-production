import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// Generate the full HTML document with SEO tags
function generateHtml(baseUrl: string): string {
  const canonicalUrl = `${baseUrl}${METADATA.route}`;

  // Structured data for WebSite
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "BestFreeWallpapers",
    "url": baseUrl,
    "description": METADATA.description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return `<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO Meta Tags - Free Wallpapers Page -->
  <title>${escapeHtml(METADATA.title)}</title>
  <meta name="description" content="${escapeHtml(METADATA.description)}" />
  <meta name="keywords" content="${escapeHtml(METADATA.keywords)}" />
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

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${escapeHtml(METADATA.title)}" />
  <meta property="og:description" content="${escapeHtml(METADATA.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="BestFreeWallpapers - Free HD Wallpapers" />

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:creator" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(METADATA.title)}" />
  <meta name="twitter:description" content="${escapeHtml(METADATA.description)}" />
  <meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta name="twitter:image:alt" content="BestFreeWallpapers - Free HD Wallpapers" />

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

  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
</head>

<body style="background-color: #ffffff; color: #1f2937; margin: 0; padding: 0;">
  <div id="root" style="min-height: 100vh; background-color: inherit;"></div>
  <script type="module" crossorigin src="/assets/js/index-bcHdVQt0.js"></script>
  <link rel="modulepreload" crossorigin href="/assets/js/vendor-react-DC3DwPnX.js" />
  <link rel="modulepreload" crossorigin href="/assets/js/vendor-supabase-BtoFnF3b.js" />
  <link rel="modulepreload" crossorigin href="/assets/js/vendor-utils-AO2GNn-M.js" />
  <link rel="stylesheet" crossorigin href="/assets/css/index-CCA2Xx-e.css" />
</body>

</html>`;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Determine base URL
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'bestfreewallpapers.com';
  const baseUrl = `${protocol}://${host}`;

  try {
    // Generate HTML with route-specific SEO
    const html = generateHtml(baseUrl);

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
