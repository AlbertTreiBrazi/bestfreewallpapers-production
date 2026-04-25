import React, { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: string
  mobile?: {
    mobile: 'mobile' | 'not_mobile' | 'true' | 'false'
  }
  alternates?: Array<{
    hreflang: string
    href: string
  }>
  images?: Array<{
    loc: string
    caption?: string
    title?: string
    geo_location?: string
    license?: string
  }>
  news?: {
    publication: {
      name: string
      language: string
    }
    publication_date: string
    title: string
    keywords?: string[]
  }
}

interface SitemapProps {
  urls: SitemapUrl[]
  lastmod?: string
  indexSitemap?: string[]
  className?: string
  compressed?: boolean
}

/**
 * XML Sitemap generator component
 * Generates dynamic sitemaps for better SEO
 */
export const SitemapGenerator: React.FC<SitemapProps> = ({
  urls,
  lastmod,
  indexSitemap = [],
  className,
  compressed = false
}) => {
  const sitemapXml = useMemo(() => {
    const generateUrlXml = (url: SitemapUrl) => {
      let urlXml = `  <url>\n`
      urlXml += `    <loc>${url.loc}</loc>\n`
      
      if (url.lastmod) {
        urlXml += `    <lastmod>${url.lastmod}</lastmod>\n`
      } else if (lastmod) {
        urlXml += `    <lastmod>${lastmod}</lastmod>\n`
      }
      
      if (url.changefreq) {
        urlXml += `    <changefreq>${url.changefreq}</changefreq>\n`
      }
      
      if (url.priority) {
        urlXml += `    <priority>${url.priority}</priority>\n`
      }
      
      if (url.mobile) {
        urlXml += `    <mobile:mobile>${url.mobile.mobile}</mobile:mobile>\n`
      }
      
      if (url.alternates && url.alternates.length > 0) {
        url.alternates.forEach(alt => {
          urlXml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />\n`
        })
      }
      
      if (url.images && url.images.length > 0) {
        url.images.forEach(image => {
          urlXml += `    <image:image>\n`
          urlXml += `      <image:loc>${image.loc}</image:loc>\n`
          if (image.caption) {
            urlXml += `      <image:caption>${image.caption}</image:caption>\n`
          }
          if (image.title) {
            urlXml += `      <image:title>${image.title}</image:title>\n`
          }
          if (image.geo_location) {
            urlXml += `      <image:geo_location>${image.geo_location}</image:geo_location>\n`
          }
          if (image.license) {
            urlXml += `      <image:license>${image.license}</image:license>\n`
          }
          urlXml += `    </image:image>\n`
        })
      }
      
      if (url.news) {
        urlXml += `    <news:news>\n`
        urlXml += `      <news:publication>\n`
        urlXml += `        <news:name>${url.news.publication.name}</news:name>\n`
        urlXml += `        <news:language>${url.news.publication.language}</news:language>\n`
        urlXml += `      </news:publication>\n`
        urlXml += `      <news:publication_date>${url.news.publication_date}</news:publication_date>\n`
        urlXml += `      <news:title>${url.news.title}</news:title>\n`
        if (url.news.keywords) {
          urlXml += `      <news:keywords>${url.news.keywords.join(', ')}</news:keywords>\n`
        }
        urlXml += `    </news:news>\n`
      }
      
      urlXml += `  </url>\n`
      return urlXml
    }

    if (indexSitemap.length > 0) {
      // Sitemap Index format
      let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n`
      sitemapIndex += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
      
      indexSitemap.forEach(sitemap => {
        sitemapIndex += `  <sitemap>\n`
        sitemapIndex += `    <loc>${sitemap}</loc>\n`
        if (lastmod) {
          sitemapIndex += `    <lastmod>${lastmod}</lastmod>\n`
        }
        sitemapIndex += `  </sitemap>\n`
      })
      
      sitemapIndex += `</sitemapindex>\n`
      return sitemapIndex
    }

    // Regular sitemap format
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`
    sitemap += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`
    sitemap += `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n`
    sitemap += `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n`
    sitemap += `        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">\n`
    
    urls.forEach(url => {
      sitemap += generateUrlXml(url)
    })
    
    sitemap += `</urlset>\n`
    return sitemap
  }, [urls, lastmod, indexSitemap])

  return (
    <Helmet>
      <link
        rel="sitemap"
        type="application/xml"
        href="data:application/xml;charset=utf-8," 
        className={className}
        data-sitemap-content={typeof btoa !== 'undefined' ? btoa(sitemapXml) : sitemapXml}
      />
    </Helmet>
  )
}

// Utility functions for generating sitemaps
export const generateWallpaperUrls = (wallpapers: any[], baseUrl: string): SitemapUrl[] => {
  return wallpapers.map(wallpaper => ({
    loc: `${baseUrl}/wallpaper/${wallpaper.slug || wallpaper.id}`,
    lastmod: wallpaper.updated_at || wallpaper.created_at,
    changefreq: 'weekly',
    priority: '0.8',
    alternates: [
      { hreflang: 'en', href: `${baseUrl}/wallpaper/${wallpaper.slug || wallpaper.id}?lang=en` }
    ]
  }))
}

export const generateCategoryUrls = (categories: any[], baseUrl: string): SitemapUrl[] => {
  return categories.map(category => ({
    loc: `${baseUrl}/category/${category.slug || category.id}`,
    lastmod: category.updated_at,
    changefreq: 'weekly',
    priority: '0.7',
    alternates: [
      { hreflang: 'en', href: `${baseUrl}/category/${category.slug || category.id}?lang=en` }
    ]
  }))
}

export const generateCollectionUrls = (collections: any[], baseUrl: string): SitemapUrl[] => {
  return collections.map(collection => ({
    loc: `${baseUrl}/collections/${collection.slug || collection.id}`,
    lastmod: collection.updated_at,
    changefreq: 'weekly',
    priority: '0.6',
    alternates: [
      { hreflang: 'en', href: `${baseUrl}/collections/${collection.slug || collection.id}?lang=en` }
    ]
  }))
}

export const generateStaticPageUrls = (baseUrl: string): SitemapUrl[] => {
  return [
    {
      loc: baseUrl,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '1.0'
    },
    {
      loc: `${baseUrl}/about`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.5'
    },
    {
      loc: `${baseUrl}/privacy`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'yearly',
      priority: '0.3'
    },
    {
      loc: `${baseUrl}/terms`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'yearly',
      priority: '0.3'
    },
    {
      loc: `${baseUrl}/contact`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.4'
    },
    {
      loc: `${baseUrl}/free-wallpapers`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.9'
    },
    {
      loc: `${baseUrl}/4k-wallpapers`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.8'
    },
    {
      loc: `${baseUrl}/ai-wallpapers`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.8'
    }
  ]
}

export const generateMobileSitemapUrls = (urls: SitemapUrl[]): SitemapUrl[] => {
  return urls.map(url => ({
    ...url,
    mobile: { mobile: 'mobile' }
  }))
}

export const generateImageSitemapUrls = (images: any[], baseUrl: string): SitemapUrl[] => {
  return images.map(image => ({
    loc: `${baseUrl}/image/${image.id}`,
    lastmod: image.updated_at,
    changefreq: 'weekly',
    priority: '0.7',
    images: [
      {
        loc: image.image_url,
        caption: image.alt || image.title,
        title: image.title,
        license: `${baseUrl}/license`
      }
    ]
  }))
}

// Export main component
export default SitemapGenerator

// Export utility functions
export type { SitemapUrl }
