/**
 * Enhanced Sitemap Generation Utility
 * Generates comprehensive XML sitemaps for better SEO with fresh dates
 */
import { supabase } from '@/lib/supabase';

interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{
    url: string;
    title?: string;
    caption?: string;
  }>;
}

export class SitemapGenerator {
  private baseUrl: string;
  private entries: SitemapEntry[] = [];

  constructor(baseUrl: string = 'https://bestfreewallpapers.com') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Add a URL to the sitemap
   */
  addUrl(entry: SitemapEntry): void {
    this.entries.push({
      ...entry,
      url: this.normalizeUrl(entry.url),
      lastmod: entry.lastmod || new Date().toISOString(), // Force fresh date fallback
    });
  }

  /**
   * Add multiple URLs to the sitemap
   */
  addUrls(entries: SitemapEntry[]): void {
    entries.forEach((entry) => this.addUrl(entry));
  }

  /**
   * Generate static pages for the sitemap (aligned to site URLs)
   */
  addStaticPages(): void {
    const today = new Date().toISOString();
    const staticPages: SitemapEntry[] = [
      { url: '/', changefreq: 'daily', priority: 1.0, lastmod: today },
      { url: '/free-wallpapers', changefreq: 'daily', priority: 0.9, lastmod: today }, // Fixed: site uses /free-wallpapers
      { url: '/categories', changefreq: 'weekly', priority: 0.8, lastmod: today },
      { url: '/collections', changefreq: 'weekly', priority: 0.8, lastmod: today }, // Added: for collections
      { url: '/ai-wallpapers', changefreq: 'daily', priority: 0.8, lastmod: today }, // Added: trending section
      { url: '/premium', changefreq: 'monthly', priority: 0.7, lastmod: today },
      { url: '/about', changefreq: 'monthly', priority: 0.5, lastmod: today },
      { url: '/contact', changefreq: 'monthly', priority: 0.5, lastmod: today },
      { url: '/privacy', changefreq: 'yearly', priority: 0.3, lastmod: today },
      { url: '/terms', changefreq: 'yearly', priority: 0.3, lastmod: today },
      { url: '/help', changefreq: 'monthly', priority: 0.4, lastmod: today },
    ];
    this.addUrls(staticPages);
  }

  /**
   * Add wallpaper pages from database (limited for performance)
   */
  async addWallpaperPages(): Promise<void> {
    try {
      const { data: wallpapers, error } = await supabase
        .from('wallpapers')
        .select('slug, updated_at, title, image_url, thumbnail_url')
        .eq('is_published', true)
        .eq('is_active', true)
        .order('updated_at', { ascending: false }) // Order by recent first
        .limit(1000); // Reduced: prevents timeouts, sitemaps max ~50k URLs anyway
      if (error) {
        console.error('Error fetching wallpapers for sitemap:', error);
        return;
      }
      if (wallpapers && wallpapers.length > 0) {
        const wallpaperEntries: SitemapEntry[] = wallpapers.map((wallpaper) => ({
          url: `/wallpaper/${wallpaper.slug}`,
          lastmod: wallpaper.updated_at || new Date().toISOString(), // Fresh fallback
          changefreq: 'weekly' as const,
          priority: 0.8,
          images: [
            {
              url: wallpaper.thumbnail_url || wallpaper.image_url || '',
              title: wallpaper.title,
              caption: `Free ${wallpaper.title} wallpaper download`,
            },
          ].filter((img) => img.url), // Strict filter for valid images
        }));
        this.addUrls(wallpaperEntries);
      }
    } catch (error) {
      console.error('Error adding wallpaper pages to sitemap:', error);
    }
  }

  /**
   * Add category pages from database
   */
  async addCategoryPages(): Promise<void> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('slug, updated_at, name, preview_image')
        .eq('is_active', true)
        .order('sort_order');
      if (error) {
        console.error('Error fetching categories for sitemap:', error);
        return;
      }
      if (categories && categories.length > 0) {
        const categoryEntries: SitemapEntry[] = categories.map((category) => ({
          url: `/categories/${category.slug}`, // Fixed: plural /categories/ for list views
          lastmod: category.updated_at || new Date().toISOString(), // Fresh fallback
          changefreq: 'weekly' as const,
          priority: 0.7,
          images: category.preview_image
            ? [
                {
                  url: category.preview_image,
                  title: `${category.name} wallpapers`,
                  caption: `Browse ${category.name} wallpapers collection`,
                },
              ]
            : undefined,
        }));
        this.addUrls(categoryEntries);
      }
    } catch (error) {
      console.error('Error adding category pages to sitemap:', error);
    }
  }

  /**
   * Add collection pages from database (if table exists)
   */
  async addCollectionPages(): Promise<void> {
    try {
      // Assume 'collections' table; adjust if different
      const { data: collections, error } = await supabase
        .from('collections')
        .select('slug, updated_at, name, preview_image')
        .eq('is_active', true)
        .order('sort_order');
      if (error) {
        console.error('Error fetching collections for sitemap:', error);
        return;
      }
      if (collections && collections.length > 0) {
        const collectionEntries: SitemapEntry[] = collections.map((collection) => ({
          url: `/collections/${collection.slug}`, // Plural for list views
          lastmod: collection.updated_at || new Date().toISOString(),
          changefreq: 'weekly' as const,
          priority: 0.6,
          images: collection.preview_image
            ? [
                {
                  url: collection.preview_image,
                  title: `${collection.name} collection`,
                  caption: `Explore ${collection.name} wallpaper collection`,
                },
              ]
            : undefined,
        }));
        this.addUrls(collectionEntries);
      }
    } catch (error) {
      console.error('Error adding collection pages to sitemap:', error);
    }
  }

  /**
   * Generate XML sitemap
   */
  generateXML(): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;
    const urls = this.entries
      .map((entry) => {
        let xml = ` <url>
    <loc>${this.escapeXml(entry.url)}</loc>`;
        if (entry.lastmod) xml += `\n    <lastmod>${entry.lastmod}</lastmod>`;
        if (entry.changefreq) xml += `\n    <changefreq>${entry.changefreq}</changefreq>`;
        if (entry.priority !== undefined) xml += `\n    <priority>${entry.priority.toFixed(1)}</priority>`;

        // Add image information
        if (entry.images && entry.images.length > 0) {
          entry.images.forEach((image) => {
            xml += `\n    <image:image>`;
            xml += `\n      <image:loc>${this.escapeXml(image.url)}</image:loc>`;
            if (image.title) xml += `\n      <image:title>${this.escapeXml(image.title)}</image:title>`;
            if (image.caption) xml += `\n      <image:caption>${this.escapeXml(image.caption)}</image:caption>`;
            xml += `\n    </image:image>`;
          });
        }

        xml += `\n  </url>`;
        return xml;
      })
      .join('\n');
    const footer = '\n</urlset>';
    return `${header}\n${urls}${footer}`;
  }

  /**
   * Generate sitemap index for large sites
   */
  generateSitemapIndex(sitemapUrls: string[]): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    const sitemaps = sitemapUrls
      .map(
        (url) => ` <sitemap>
    <loc>${this.escapeXml(url)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`,
      )
      .join('\n');
    const footer = '\n</sitemapindex>';
    return `${header}\n${sitemaps}${footer}`;
  }

  /**
   * Generate comprehensive sitemap with all content
   */
  async generateCompleteSitemap(): Promise<string> {
    // Clear existing entries
    this.entries = [];
    // Add all content types
    this.addStaticPages();
    await this.addWallpaperPages();
    await this.addCategoryPages();
    await this.addCollectionPages(); // Added for completeness
    // Sort entries by priority (descending) then by URL
    this.entries.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.url.localeCompare(b.url);
    });
    return this.generateXML();
  }

  /**
   * Get sitemap statistics (enhanced)
   */
  getStats(): { totalUrls: number; byType: Record<string, number>; lastUpdated: string } {
    const stats = {
      totalUrls: this.entries.length,
      byType: {} as Record<string, number>,
      lastUpdated: new Date().toISOString().split('T')[0], // Always fresh
    };
    this.entries.forEach((entry) => {
      const type = this.getUrlType(entry.url);
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    return stats;
  }

  /**
   * Normalize URL to full absolute URL
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${this.baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Determine URL type for statistics
   */
  private getUrlType(url: string): string {
    if (url.includes('/wallpaper/')) return 'wallpapers';
    if (url.includes('/categories/')) return 'categories';
    if (url.includes('/collections/')) return 'collections';
    if (url === this.baseUrl || url === `${this.baseUrl}/`) return 'homepage';
    return 'static';
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }
}

// Export singleton instance
export const sitemapGenerator = new SitemapGenerator();

// Utility function to generate and save sitemap (enhanced logging)
export async function generateAndSaveSitemap(): Promise<{ success: boolean; xml?: string; error?: string; stats?: any }> {
  try {
    const xml = await sitemapGenerator.generateCompleteSitemap();
    const stats = sitemapGenerator.getStats();
    console.log('Sitemap generated successfully:', stats);
    return { success: true, xml, stats };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
