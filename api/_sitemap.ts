import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const MAX_URLS_PER_SITEMAP = 50000;
const SITE_URL = 'https://bestfreewallpapers.com';

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: string;
};

export type SitemapSection = 'wallpapers' | 'categories' | 'collections';

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
};

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables for sitemap generation');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function toIsoDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderUrlSet(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const lines = ['  <url>', `    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority) lines.push(`    <priority>${entry.priority}</priority>`);
      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

function renderSitemapIndex(urls: string[]): string {
  const now = new Date().toISOString();
  const body = urls
    .map(
      (url) => `  <sitemap>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

export async function fetchSitemapEntries(section: SitemapSection): Promise<SitemapEntry[]> {
  const supabase = getSupabaseClient();

  if (section === 'wallpapers') {
    const { data, error } = await supabase
      .from('wallpapers')
      .select('slug, updated_at')
      .eq('is_published', true)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(200000);

    if (error) throw error;

    return (data ?? [])
      .filter((row) => row.slug)
      .map((row) => ({
        loc: `${SITE_URL}/wallpaper/${row.slug}`,
        lastmod: toIsoDate(row.updated_at),
        changefreq: 'monthly',
        priority: '0.7'
      }));
  }

  if (section === 'categories') {
    const { data, error } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50000);

    if (error) throw error;

    return (data ?? [])
      .filter((row) => row.slug)
      .map((row) => ({
        loc: `${SITE_URL}/category/${row.slug}`,
        lastmod: toIsoDate(row.updated_at),
        changefreq: 'weekly',
        priority: '0.8'
      }));
  }

  const { data, error } = await supabase
    .from('collections')
    .select('slug, updated_at')
    .eq('is_published', true)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(50000);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.slug)
    .map((row) => ({
      loc: `${SITE_URL}/collections/${row.slug}`,
      lastmod: toIsoDate(row.updated_at),
      changefreq: 'weekly',
      priority: '0.8'
    }));
}

export async function getRootSitemapXml(): Promise<string> {
  const staticEntries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/free-wallpapers`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/categories`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/collections`, changefreq: 'weekly', priority: '0.8' }
  ];

  const [wallpapers, categories, collections] = await Promise.all([
    fetchSitemapEntries('wallpapers'),
    fetchSitemapEntries('categories'),
    fetchSitemapEntries('collections')
  ]);

  const allEntries = [...staticEntries, ...wallpapers, ...categories, ...collections];

  if (allEntries.length <= MAX_URLS_PER_SITEMAP) {
    return renderUrlSet(allEntries);
  }

  const wallpaperChunks = Math.ceil(wallpapers.length / MAX_URLS_PER_SITEMAP);
  const categoryChunks = Math.ceil(categories.length / MAX_URLS_PER_SITEMAP);
  const collectionChunks = Math.ceil(collections.length / MAX_URLS_PER_SITEMAP);

  const sitemapUrls = [
    `${SITE_URL}/sitemaps/static.xml`,
    ...Array.from({ length: wallpaperChunks }, (_, index) => `${SITE_URL}/sitemaps/wallpapers-${index + 1}.xml`),
    ...Array.from({ length: categoryChunks }, (_, index) => `${SITE_URL}/sitemaps/categories-${index + 1}.xml`),
    ...Array.from({ length: collectionChunks }, (_, index) => `${SITE_URL}/sitemaps/collections-${index + 1}.xml`)
  ];

  return renderSitemapIndex(sitemapUrls);
}

export async function getSectionSitemapXml(section: SitemapSection, page: number): Promise<string> {
  if (section === 'wallpapers' || section === 'categories' || section === 'collections') {
    const entries = await fetchSitemapEntries(section);
    const start = (page - 1) * MAX_URLS_PER_SITEMAP;
    const chunk = entries.slice(start, start + MAX_URLS_PER_SITEMAP);
    return renderUrlSet(chunk);
  }

  return renderUrlSet([]);
}

export function getStaticSitemapXml(): string {
  const entries: SitemapEntry[] = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/free-wallpapers`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/categories`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/collections`, changefreq: 'weekly', priority: '0.8' }
  ];

  return renderUrlSet(entries);
}

export const sitemapHeaders = XML_HEADERS;
