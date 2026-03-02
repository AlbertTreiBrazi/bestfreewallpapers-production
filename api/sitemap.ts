import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRootSitemapXml, getSitemapResponseHeaders, sitemapHeaders } from './_sitemap.js';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const xml = await getRootSitemapXml();
    const headers = getSitemapResponseHeaders();
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    res.status(200).send(xml);
  } catch (error) {
    console.error('Failed to build root sitemap:', error);
    res.status(500).setHeader('Content-Type', sitemapHeaders['Content-Type']);
    res.setHeader('X-Sitemap-Origin', 'api');
    res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
