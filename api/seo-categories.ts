import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ASSETS, OG_IMAGE, escapeHtml, getBaseUrl, getCommonMetaTags, CRITICAL_CSS, FONT_CSS, getErrorHtml } from './seo-utils';

// Categories page metadata
const METADATA = {
  title: 'Wallpaper Categories - Browse by Style & Theme | BestFreeWallpapers',
  description: 'Browse wallpapers by category. From nature and abstract to gaming and anime, find the perfect wallpaper organized by style, theme, and aesthetic.',
  route: '/categories',
  keywords: 'wallpaper categories, nature wallpapers, abstract wallpapers, gaming wallpapers, anime wallpapers, minimalist wallpapers, space wallpapers, 4K categories'
};

function generateHtml(baseUrl: string): string {
  const canonicalUrl = `${baseUrl}${METADATA.route}`;

  // Structured data for Category page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Wallpaper Categories",
    "description": METADATA.description,
    "url": canonicalUrl
  };

  return `<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="author" content="BestFreeWallpapers Team" />
  
  <!-- Categories Page SEO -->
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
    console.error('Categories SEO handler error:', error);
    response.status(500);
    response.setHeader('Content-Type', 'text/html');
    response.send(getErrorHtml(500));
  }
}