import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ASSETS, OG_IMAGE, escapeHtml, getBaseUrl, getCommonMetaTags, CRITICAL_CSS, FONT_CSS, getErrorHtml } from './seo-utils';

// Premium page metadata
const METADATA = {
  title: 'Premium Wallpapers - Exclusive HD & 4K Wallpapers | BestFreeWallpapers',
  description: 'Unlock exclusive premium wallpapers in 4K and 8K resolution. Get early access to new designs, ad-free experience, and high-resolution downloads with our premium membership.',
  route: '/premium',
  keywords: 'premium wallpapers, 4K wallpapers, 8K wallpapers, exclusive wallpapers, premium membership, ad-free wallpapers, high resolution wallpapers'
};

// OG image for premium page
const PREMIUM_OG_IMAGE = 'https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers-thumbnails/wallpaper-1772192337504-Golden_White_Bloom___Elegant_3D_Floral_Wallpaper.jpg';

function generateHtml(baseUrl: string): string {
  const canonicalUrl = `${baseUrl}${METADATA.route}`;

  // Structured data for Product
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Premium Membership",
    "description": METADATA.description,
    "brand": {
      "@type": "Brand",
      "name": "BestFreeWallpapers"
    },
    "offers": {
      "@type": "Offer",
      "price": "4.99",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  // FAQ structured data
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is included in Premium membership?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Premium membership includes unlimited access to 4K and 8K wallpapers, ad-free browsing, early access to new designs, and exclusive collections not available to free users."
        }
      },
      {
        "@type": "Question",
        "name": "Can I cancel my premium membership anytime?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can cancel your premium membership at any time. Your access will continue until the end of your current billing period."
        }
      },
      {
        "@type": "Question",
        "name": "What payment methods are accepted?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We accept all major credit cards, PayPal, and Apple Pay for premium subscriptions."
        }
      }
    ]
  };

  return `<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="author" content="BestFreeWallpapers Team" />
  
  <!-- Premium Page SEO -->
  <title>${escapeHtml(METADATA.title)}</title>
  <meta name="description" content="${escapeHtml(METADATA.description)}" />
  <meta name="keywords" content="${escapeHtml(METADATA.keywords)}" />
  
  ${getCommonMetaTags(baseUrl, METADATA.route, METADATA.title, METADATA.description, METADATA.keywords)}
  
  ${FONT_CSS}
  
  ${CRITICAL_CSS}
  
  <!-- Structured Data - Product -->
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  
  <!-- Structured Data - FAQ -->
  <script type="application/ld+json">${JSON.stringify(faqData)}</script>
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
    console.error('Premium SEO handler error:', error);
    response.status(500);
    response.setHeader('Content-Type', 'text/html');
    response.send(getErrorHtml(500));
  }
}