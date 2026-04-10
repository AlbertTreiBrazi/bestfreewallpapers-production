import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// SHARED SEO UTILITIES
// ============================================================================
// This module provides shared utilities for all SEO serverless functions.
// Asset paths are resolved using Vite's standard output patterns.
//
// IMPORTANT: When Vite builds, it generates files with hashed names:
// - JS: assets/js/index-[hash].js, assets/js/vendor-[name]-[hash].js
// - CSS: assets/css/index-[hash].css
//
// The current production hashes are hardcoded below. After any build,
// you should update these values to match the new hash outputs.
// ============================================================================

// Asset configuration - Update these after each build
export const ASSETS = {
  // Main entry point (updates on any code change)
  mainJs: '/assets/js/index-bcHdVQt0.js',
  
  // Vendor chunks (updates when dependencies change)
  vendorReact: '/assets/js/vendor-react-DC3DwPnX.js',
  vendorSupabase: '/assets/js/vendor-supabase-BtoFnF3b.js',
  vendorUtils: '/assets/js/vendor-utils-AO2GNn-M.js',
  
  // CSS (updates on style changes)
  mainCss: '/assets/css/index-CCA2Xx-e.css',
} as const;

// Site-wide OG image
export const OG_IMAGE = 'https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers-thumbnails/wallpaper-1772192337504-Golden_White_Bloom___Elegant_3D_Floral_Wallpaper.jpg';

// Escape HTML to prevent XSS in meta tags
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Get base URL from request headers
export function getBaseUrl(request: VercelRequest): string {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'bestfreewallpapers.com';
  return `${protocol}://${host}`;
}

// Common meta tags for all pages
export function getCommonMetaTags(baseUrl: string, route: string, title: string, description: string, keywords?: string) {
  const canonicalUrl = `${baseUrl}${route}`;
  
  return `
  <!-- SEO Meta Tags -->
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
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="BestFreeWallpapers" />

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:creator" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta name="twitter:image:alt" content="BestFreeWallpapers" />

  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Favicons and Icons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="manifest" href="/manifest.json" />

  <!-- Critical Resource Hints -->
  <link rel="preconnect" href="https://eocgtrggcalfptqhgxer.supabase.co" crossorigin />
  <link rel="dns-prefetch" href="https://eocgtrggcalfptqhgxer.supabase.co" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  `;
}

// Critical CSS for above-the-fold content
export const CRITICAL_CSS = `
  <style>
    html{background-color:#111827;color:#f9fafb;overflow-x:hidden}
    body{margin:0;padding:0;background-color:#111827;color:#f9fafb;font-family:system-ui,-apple-system,sans-serif;overflow-x:hidden;transition:background-color .3s ease,color .3s ease}
    #root{min-height:100vh;background-color:inherit;overflow-x:hidden;width:100%}
    .light{background-color:#fff;color:#1f2937}
    .light body,.light #root{background-color:#fff;color:#1f2937}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    .loading-skeleton{background:linear-gradient(90deg,#1f2937 25%,#374151 50%,#1f2937 75%);background-size:200% 100%;animation:loading 1.5s infinite}
    @keyframes loading{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @media(max-width:768px){html,body{overflow-x:hidden!important;max-width:100vw}*,*::before,*::after{max-width:100vw}}
  </style>
`;

// Font loading optimization
export const FONT_CSS = `
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
`;

// Error page HTML for fallback
export function getErrorHtml(statusCode: number = 500): string {
  return `<!doctype html>
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
</html>`;
}