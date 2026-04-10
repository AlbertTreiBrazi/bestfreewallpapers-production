import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ASSETS, OG_IMAGE, escapeHtml, getBaseUrl, getCommonMetaTags, CRITICAL_CSS, FONT_CSS, getErrorHtml } from './seo-utils';

// Mobile wallpapers page metadata
const METADATA = {
  title: 'Mobile Wallpapers - HD & 4K Phone Backgrounds | BestFreeWallpapers',
  description: 'Download free mobile wallpapers in HD and 4K resolution. Perfect wallpapers for iPhone, Samsung Galaxy, Google Pixel, OnePlus, Xiaomi, and all Android devices. Optimized for every screen.',
  route: '/mobile-wallpapers',
  keywords: 'mobile wallpapers, phone wallpapers, iPhone wallpapers, Android wallpapers, HD phone wallpapers, 4K mobile wallpapers, smartphone backgrounds, Samsung Galaxy wallpapers, Pixel wallpapers'
};

// Mobile-specific OG image
const MOBILE_OG_IMAGE = 'https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers-thumbnails/wallpaper-1772192337504-Golden_White_Bloom___Elegant_3D_Floral_Wallpaper.jpg';

function generateHtml(baseUrl: string): string {
  const canonicalUrl = `${baseUrl}${METADATA.route}`;

  // Structured data for CollectionPage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Mobile Wallpapers",
    "description": METADATA.description,
    "url": canonicalUrl,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "iPhone Wallpapers"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Samsung Galaxy Wallpapers"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Google Pixel Wallpapers"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "OnePlus Wallpapers"
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Xiaomi Wallpapers"
        }
      ]
    }
  };

  return `<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="author" content="BestFreeWallpapers Team" />
  
  <!-- Mobile Wallpapers Page SEO -->
  <title>${escapeHtml(METADATA.title)}</title>
  <meta name="description" content="${escapeHtml(METADATA.description)}" />
  <meta name="keywords" content="${escapeHtml(METADATA.keywords)}" />
  
  ${getCommonMetaTags(baseUrl, METADATA.route, METADATA.title, METADATA.description, METADATA.keywords)}
  
  ${FONT_CSS}
  
  ${CRITICAL_CSS}
  
  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
</head>

<body style="background-color: #ffffff; color: #1f2937; margin: 0; padding: 0;">
  <div id="root" style="min-height: 100vh; background-color: inherit;"></div>
  <script type="module" crossorigin src="${ASSETS.mainJs}"></script>
  <link rel="modulepreload" crossorigin href="${ASSETS.vendorReact}" />
  <link rel="modulepreload" crossorigin href="${ASSETS.vendorSupabase}" />
  <link rel="modulepreload" crossorigin href="${ASSETS.vendorUtils}" />
  <link rel="stylesheet" crossorigin href="${ASSETS.mainCss}" />
</body>

</html>`;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const baseUrl = getBaseUrl(request);

  try {
    const html = generateHtml(baseUrl);

    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(html);

  } catch (error) {
    console.error('Mobile Wallpapers SEO handler error:', error);
    response.status(500);
    response.setHeader('Content-Type', 'text/html');
    response.send(getErrorHtml(500));
  }
}