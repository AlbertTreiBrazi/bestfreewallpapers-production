import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRootSitemapXml, getSitemapRuntimeDebugInfo, sitemapHeaders } from './_sitemap.js';

function setRuntimeDebugHeaders(res: VercelResponse): void {
  const { supabaseHost, supabaseSource } = getSitemapRuntimeDebugInfo();
  res.setHeader('X-Sitemap-Supabase-Host', supabaseHost);
  res.setHeader('X-Sitemap-Supabase-Source', supabaseSource);
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    setRuntimeDebugHeaders(res);
    const xml = await getRootSitemapXml();
    res.status(200).setHeader('Content-Type', sitemapHeaders['Content-Type']);
    res.setHeader('Cache-Control', sitemapHeaders['Cache-Control']);
    res.send(xml);
  } catch (error) {
    console.error('Failed to build root sitemap:', error);
    res.status(500).setHeader('Content-Type', sitemapHeaders['Content-Type']);
    res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
