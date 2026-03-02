import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSectionSitemapXml, getSitemapResponseHeaders, getStaticSitemapXml, sitemapHeaders, type SitemapSection } from './_sitemap.js';

function isValidSection(value: string): value is SitemapSection {
  return value === 'wallpapers' || value === 'categories' || value === 'collections';
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const kind = String(req.query.kind || '');

  try {
    if (kind === 'static') {
      const headers = getSitemapResponseHeaders();
      Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
      res.status(200).send(getStaticSitemapXml());
      return;
    }

    const section = kind as SitemapSection;
    const page = Number(req.query.page || '1');

    if (!isValidSection(section) || Number.isNaN(page) || page < 1) {
      res.status(400).json({ error: 'Invalid sitemap section or page' });
      return;
    }

    const xml = await getSectionSitemapXml(section, page);
    const headers = getSitemapResponseHeaders();
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    res.status(200).send(xml);
  } catch (error) {
    console.error('Failed to build segmented sitemap:', error);
    res.status(500).setHeader('Content-Type', sitemapHeaders['Content-Type']);
    res.setHeader('X-Sitemap-Origin', 'api');
    res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
