import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://cdn.bestfreewallpapers.com/thumbnails/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

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
    if (fs.existsSync(indexPath)) return fs.readFileSync(indexPath, 'utf-8');
  } catch (e) { console.error('[SEO Ringtones] Error reading index.html:', e); }
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>BestFreeWallpapers</title></head><body><div id="root"></div></body></html>`;
}

function injectHead(html: string, seoTags: string): string {
  let m = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']keywords["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>/gi, '')
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
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/gi, '');
  if (m.includes('<meta charset=')) {
    m = m.replace(/(<meta\s+charset[^>]*>)/i, `$1${seoTags}`);
  } else {
    m = m.replace(/(<head[^>]*>)/i, `$1${seoTags}`);
  }
  return m;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const canonicalUrl = `${SITE_URL}/ringtones`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': canonicalUrl,
      name: 'Free Ringtones',
      description: 'Download free high-quality MP3 ringtones for Android and iPhone. AI-generated music for calls, notifications and alarms.',
      url: canonicalUrl,
      isPartOf: { '@id': SITE_URL },
      provider: { '@type': 'Organization', name: 'BestFreeWallpapers', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Ringtones', item: canonicalUrl },
      ],
    },
  ];

  const seoTags = `
  <title>Free Ringtones - HD MP3 Downloads | BestFreeWallpapers</title>
  <meta name="description" content="Download free high-quality ringtones for Android and iPhone. Choose from rock, pop, jazz, classical, electronic, and more. Max 30 seconds, perfect for calls, notifications, and alarms." />
  <meta name="keywords" content="free ringtones, ringtone download, mp3 ringtones, phone ringtones, notification sounds, alarm tones, mobile ringtones, AI ringtones, free music ringtones" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta property="og:title" content="Free Ringtones - HD MP3 Downloads | BestFreeWallpapers" />
  <meta property="og:description" content="Download free high-quality ringtones for Android and iPhone. Rock, pop, jazz, classical, and more. Max 30 seconds." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${OG_IMAGE_DEFAULT}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="Free Ringtones - HD MP3 Downloads | BestFreeWallpapers" />
  <meta name="twitter:description" content="Download free high-quality ringtones for Android and iPhone. Max 30 seconds." />
  <meta name="twitter:image" content="${OG_IMAGE_DEFAULT}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLd.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
  `;

  let html = getBaseHtml();
  html = injectHead(html, seoTags);

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.send(html);
}
