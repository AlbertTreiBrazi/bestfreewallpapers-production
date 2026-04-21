import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const METADATA = {
  title: 'AI Wallpapers - Artificial Intelligence Generated Art | BestFreeWallpapers',
  description: 'Explore stunning AI-generated wallpapers created with artificial intelligence. Download unique futuristic, abstract, and creative wallpapers made by AI for desktop and mobile.',
  route: '/ai-wallpapers',
  keywords: 'AI wallpapers, AI generated wallpapers, artificial intelligence art, AI art wallpapers, futuristic wallpapers, generated art wallpapers, machine learning art'
};

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE = 'https://eocgtrggcalfptqhgxer.supabase.co/storage/v1/object/public/wallpapers-thumbnails/wallpaper-1772192337504-Golden_White_Bloom___Elegant_3D_Floral_Wallpaper.jpg';

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
    console.error('[SEO AI] Error reading dist/index.html:', error);
  }
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

function generateJsonLd(canonicalUrl: string): string {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': canonicalUrl,
      name: 'AI Generated Wallpapers',
      description: METADATA.description,
      url: canonicalUrl,
      isPartOf: { '@id': SITE_URL },
      about: {
        '@type': 'Thing',
        name: 'Artificial Intelligence Art Wallpapers'
      },
      provider: {
        '@type': 'Organization',
        name: 'BestFreeWallpapers',
        url: SITE_URL
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'AI Wallpapers',
          item: canonicalUrl
        }
      ]
    }
  ];
  return jsonLd.map(schema =>
    `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
  ).join('\n');
}

function generateSeoTags(baseUrl: string): string {
  const canonicalUrl = `${baseUrl}${METADATA.route}`;
  return `
<title>${escapeHtml(METADATA.title)}</title>
<meta name="description" content="${escapeHtml(METADATA.description)}" />
<meta name="keywords" content="${escapeHtml(METADATA.keywords)}" />
<meta name="author" content="BestFreeWallpapers Team" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
<meta property="og:title" content="${escapeHtml(METADATA.title)}" />
<meta property="og:description" content="${escapeHtml(METADATA.description)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${canonicalUrl}" />
<meta property="og:site_name" content="BestFreeWallpapers" />
<meta property="og:locale" content="en_US" />
<meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />
<meta property="og:image:width" content="1920" />
<meta property="og:image:height" content="1080" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@bestfreewallpapers" />
<meta name="twitter:creator" content="@bestfreewallpapers" />
<meta name="twitter:title" content="${escapeHtml(METADATA.title)}" />
<meta name="twitter:description" content="${escapeHtml(METADATA.description)}" />
<meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />
<link rel="canonical" href="${canonicalUrl}" />
${generateJsonLd(canonicalUrl)}
`;
}

function injectHead(html: string, seoTags: string): string {
  let modified = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']keywords["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']googlebot["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']bingbot["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']theme-color["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']msapplication-TileColor["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']application-name["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']apple-mobile-web-app-.*?["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']mobile-web-app-capable["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:title["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:type["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:url["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:site_name["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:locale["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image:width["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image:height["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image:alt["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:site["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:creator["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image:alt["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/gi, '');

  if (modified.includes('<meta charset=')) {
    modified = modified.replace(/(<meta\s+charset[^>]*>)/i, `$1${seoTags}`);
  } else {
    modified = modified.replace(/(<head[^>]*>)/i, `$1${seoTags}`);
  }
  return modified;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'bestfreewallpapers.com';
  const baseUrl = `${protocol}://${host}`;

  try {
    let html = getBaseHtml();
    const seoTags = generateSeoTags(baseUrl);
    html = injectHead(html, seoTags);

    response.status(200);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.send(html);
  } catch (error) {
    console.error('[SEO AI] Error:', error);
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
