import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const SITE_URL = 'https://bestfreewallpapers.com';
const OG_IMAGE_DEFAULT = 'https://cdn.bestfreewallpapers.com/thumbnails/1777130170914-wallpaper-1777130170286-golden_white_bloom___elegant_3d_floral_wallpaper.jpg';

interface RingtoneData {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number;
  tags: string[] | null;
  is_premium: boolean;
  seo_title: string | null;
  seo_description: string | null;
  creator_name: string;
  genre?: { name: string; slug: string } | null;
  mood?: { name: string; slug: string } | null;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getBaseHtml(): string {
  try {
    const p = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  } catch (e) { console.error('[SEO Ringtone] index.html error:', e); }
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>BestFreeWallpapers</title></head><body><div id="root"></div></body></html>`;
}

function injectHead(html: string, tags: string): string {
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
    m = m.replace(/(<meta\s+charset[^>]*>)/i, `$1${tags}`);
  } else {
    m = m.replace(/(<head[^>]*>)/i, `$1${tags}`);
  }
  return m;
}

// Format duration as ISO 8601 (PT30S)
function formatIsoDuration(seconds: number): string {
  if (!seconds) return 'PT30S';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `PT${m}M${s}S` : `PT${s}S`;
}

async function fetchRingtone(slug: string): Promise<RingtoneData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    // Fetch ringtone by slug
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ringtones?select=id,title,slug,description,audio_url,duration_seconds,tags,is_premium,seo_title,seo_description,creator_name,genre_id,mood_id&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&is_published=eq.true&limit=1`,
      { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const ringtone = rows[0];

    // Fetch category names if IDs exist
    const categoryIds = [ringtone.genre_id, ringtone.mood_id].filter(Boolean);
    if (categoryIds.length > 0) {
      const catRes = await fetch(
        `${supabaseUrl}/rest/v1/ringtone_categories?select=id,name,slug,category_type&id=in.(${categoryIds.join(',')})`,
        { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
      );
      if (catRes.ok) {
        const cats = await catRes.json();
        const catMap: Record<number, any> = {};
        for (const c of cats) catMap[c.id] = c;
        ringtone.genre = ringtone.genre_id ? catMap[ringtone.genre_id] || null : null;
        ringtone.mood = ringtone.mood_id ? catMap[ringtone.mood_id] || null : null;
      }
    }
    return ringtone as RingtoneData;
  } catch (e) {
    console.error('[SEO Ringtone] fetch error:', e);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = req.query.slug as string;
  if (!slug) { res.status(400).send('Missing slug'); return; }

  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  const canonicalUrl = `${SITE_URL}/ringtone/${safeSlug}`;

  // Try to fetch real data — fall back to generic if not found
  const ringtone = await fetchRingtone(safeSlug);

  let title: string;
  let description: string;
  let keywords: string;
  let seoTags: string;

  if (!ringtone) {
    // Generic fallback for not-found / loading
    title = 'Free Ringtone Download | BestFreeWallpapers';
    description = 'Download free high-quality MP3 ringtones for your phone. AI-generated music for calls, notifications, and alarms.';
    keywords = 'free ringtone, mp3 ringtone, phone ringtone, download ringtone';

    seoTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${canonicalUrl}" />
  `;
  } else {
    title = ringtone.seo_title || `${ringtone.title} - Free Ringtone Download | BestFreeWallpapers`;
    description = ringtone.seo_description
      || ringtone.description
      || `Download ${ringtone.title} ringtone for free. ${ringtone.duration_seconds}-second MP3, perfect for calls and notifications.`;
    keywords = [
      'free ringtone',
      ringtone.title.toLowerCase(),
      ...(ringtone.tags || []),
      ringtone.genre?.name.toLowerCase() || '',
      'mp3 ringtone',
      'phone ringtone',
    ].filter(Boolean).join(', ');

    // JSON-LD: AudioObject + BreadcrumbList
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'AudioObject',
        '@id': canonicalUrl,
        name: ringtone.title,
        description: description,
        contentUrl: ringtone.audio_url,
        encodingFormat: 'audio/mpeg',
        duration: formatIsoDuration(ringtone.duration_seconds),
        url: canonicalUrl,
        creator: { '@type': 'Organization', name: ringtone.creator_name || 'BestFreeWallpapers', url: SITE_URL },
        isPartOf: { '@id': `${SITE_URL}/ringtones` },
        ...(ringtone.genre ? { genre: ringtone.genre.name } : {}),
        ...(ringtone.tags && ringtone.tags.length > 0 ? { keywords: ringtone.tags.join(', ') } : {}),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Ringtones', item: `${SITE_URL}/ringtones` },
          ...(ringtone.genre ? [{ '@type': 'ListItem', position: 3, name: ringtone.genre.name, item: `${SITE_URL}/ringtones/category/${ringtone.genre.slug}` }] : []),
          { '@type': 'ListItem', position: ringtone.genre ? 4 : 3, name: ringtone.title, item: canonicalUrl },
        ],
      },
    ];

    seoTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="BestFreeWallpapers" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${OG_IMAGE_DEFAULT}" />
  <meta property="og:image:width" content="1920" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:image:alt" content="${escapeHtml(ringtone.title)} ringtone" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@bestfreewallpapers" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE_DEFAULT}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${jsonLd.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n')}
  `;
  }

  let html = getBaseHtml();
  html = injectHead(html, seoTags);

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', ringtone
    ? 'public, s-maxage=3600, stale-while-revalidate=86400'
    : 'no-store');
  res.send(html);
}
