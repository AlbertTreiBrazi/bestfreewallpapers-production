/**
 * SEO utilities for meta tags, structured data, and optimization
 * Dynamic SEO management, sitemap generation, and search optimization
 */

// SEO defaults - must be declared first
export const SEO_DEFAULTS = {
  site: {
    name: 'BestFreeWallpapers',
    description: 'Download thousands of free high-definition wallpapers and desktop backgrounds. 4K, HD, and mobile wallpapers in categories like nature, abstract, space, and more.',
    url: 'https://bestfreewallpapers.com',
    logo: 'https://bestfreewallpapers.com/logo.png',
    image: 'https://bestfreewallpapers.com/images/og-default.jpg',
    twitter: '@bestfreewallpapers',
    language: 'en_US',
    timezone: 'UTC'
  },
  categories: {
    defaultTitle: 'Free {category} Wallpapers - BestFreeWallpapers',
    defaultDescription: 'Download free {category} wallpapers in high quality. Thousands of beautiful {category.toLowerCase()} backgrounds in HD and 4K resolution.'
  },
  wallpapers: {
    defaultTitle: 'Free {title} - BestFreeWallpapers',
    defaultDescription: 'Download this free {width}x{height} {category_name} wallpaper from BestFreeWallpapers. High-quality desktop background perfect for your screen.',
    defaultKeywords: 'wallpaper, free, desktop, background, {category_name.toLowerCase()}, HD, 4K'
  }
} as const

// Mock site config for SEO utilities
const siteConfig = {
  url: SEO_DEFAULTS.site.url,
  seo: {
    defaultTitle: SEO_DEFAULTS.site.name,
    defaultDescription: SEO_DEFAULTS.site.description,
    keywords: ['wallpapers', 'free', 'HD', '4K']
  },
  author: 'BestFreeWallpapers Team'
}

const getCanonicalUrl = (path: string) => `${SEO_DEFAULTS.site.url}${path}`
const getImageUrl = (path: string) => `${SEO_DEFAULTS.site.url}${path}`

// Meta tag management
export const metaTags = {
  // Update meta tag
  updateMeta: (name: string, content: string, property: boolean = false) => {
    if (typeof document === 'undefined') return

    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
    let meta = document.querySelector(selector) as HTMLMetaElement

    if (!meta) {
      meta = document.createElement('meta')
      if (property) {
        meta.setAttribute('property', name)
      } else {
        meta.setAttribute('name', name)
      }
      document.head.appendChild(meta)
    }

    meta.setAttribute('content', content)
  },

  // Update title
  updateTitle: (title: string) => {
    if (typeof document === 'undefined') return
    document.title = title
  },

  // Add link tag
  addLink: (rel: string, href: string, type?: string) => {
    if (typeof document === 'undefined') return

    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement

    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', rel)
      document.head.appendChild(link)
    }
    link.setAttribute('href', href)
    if (type) {
      link.setAttribute('type', type)
    }
  }
}

// Dynamic SEO management
export const dynamicSEO = {
  // Generate page title
  generateTitle: (type: 'home' | 'category' | 'wallpaper' | 'search', data: any): string => {
    switch (type) {
      case 'home':
        return SEO_DEFAULTS.site.name
      case 'category':
        return SEO_DEFAULTS.categories.defaultTitle
          .replace('{category}', data.name || data.slug || 'Wallpapers')
      case 'wallpaper':
        return SEO_DEFAULTS.wallpapers.defaultTitle
          .replace('{title}', data.title || 'Wallpaper')
      case 'search':
        return `Search Results for "${data.query}" - BestFreeWallpapers`
      default:
        return SEO_DEFAULTS.site.name
    }
  },

  // Generate meta description
  generateDescription: (type: 'home' | 'category' | 'wallpaper' | 'search', data: any): string => {
    switch (type) {
      case 'home':
        return SEO_DEFAULTS.site.description
      case 'category':
        return SEO_DEFAULTS.categories.defaultDescription
          .replace('{category}', data.name || data.slug || 'wallpapers')
      case 'wallpaper':
        return SEO_DEFAULTS.wallpapers.defaultDescription
          .replace('{width}', data.width || '1920')
          .replace('{height}', data.height || '1080')
          .replace('{category_name}', data.category || 'wallpaper')
      case 'search':
        return `Search results for "${data.query}" on BestFreeWallpapers. Find the perfect wallpaper for your desktop or mobile device.`
      default:
        return SEO_DEFAULTS.site.description
    }
  },

  // Generate keywords
  generateKeywords: (type: 'home' | 'category' | 'wallpaper' | 'search', data: any): string => {
    switch (type) {
      case 'home':
        return 'free wallpapers, HD wallpapers, desktop backgrounds, mobile wallpapers, 4K wallpapers, nature wallpapers, abstract wallpapers'
      case 'category':
        return `${data.name || 'wallpapers'}, free ${data.name || 'wallpapers'}, HD ${data.name || 'wallpapers'}, ${data.name || 'wallpapers'} backgrounds`
      case 'wallpaper':
        return SEO_DEFAULTS.wallpapers.defaultKeywords
          .replace('{category_name}', data.category || 'wallpaper')
      case 'search':
        return `wallpapers, ${data.query}, free wallpapers, HD wallpapers`
      default:
        return 'wallpapers, free, HD, 4K'
    }
  }
}

// Structured data generation
export const structuredData = {
  // Generate organization schema
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_DEFAULTS.site.name,
    url: SEO_DEFAULTS.site.url,
    logo: SEO_DEFAULTS.site.logo,
    description: SEO_DEFAULTS.site.description,
    sameAs: [`https://twitter.com/${SEO_DEFAULTS.site.twitter}`]
  }),

  // Generate website schema
  website: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_DEFAULTS.site.name,
    url: SEO_DEFAULTS.site.url,
    description: SEO_DEFAULTS.site.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SEO_DEFAULTS.site.url}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }),

  // Generate web page schema
  generateWebPage: (data: {
    name: string
    description: string
    url: string
    mainEntity?: any
    breadcrumb?: Array<{ name: string, url: string }>
  }) => {
    const webPage = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: data.name,
      description: data.description,
      url: data.url,
      isPartOf: {
        '@type': 'WebSite',
        name: SEO_DEFAULTS.site.name,
        url: SEO_DEFAULTS.site.url
      }
    }

    if (data.breadcrumb) {
      Object.assign(webPage, {
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: data.breadcrumb.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url
          }))
        }
      })
    }

    return webPage
  },

  // Generate breadcrumb schema
  breadcrumbs: (items: Array<{ name: string, url: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  })
}

// Sitemap generation
export const sitemap = {
  // Generate sitemap URL
  generateUrl: (path: string, lastmod?: string, changefreq: string = 'weekly', priority: string = '0.5') => ({
    loc: `${SEO_DEFAULTS.site.url}${path}`,
    lastmod: lastmod || new Date().toISOString().split('T')[0],
    changefreq,
    priority
  }),

  // Generate XML sitemap
  generateXml: (urls: Array<{ loc: string, lastmod?: string, changefreq?: string, priority?: string }>) => {
    const urlset = urls.map(url => `
    <url>
      <loc>${url.loc}</loc>
      ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
      ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
      ${url.priority ? `<priority>${url.priority}</priority>` : ''}
    </url>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlset}
</urlset>`
  }
}

// Social media meta tags
export const socialMeta = {
  // Generate Open Graph meta tags
  generateOpenGraph: (data: {
    title: string
    description: string
    url: string
    image?: string
    type?: string
    siteName?: string
  }) => {
    const tags: Record<string, string> = {
      'og:title': data.title,
      'og:description': data.description,
      'og:url': data.url,
      'og:type': data.type || 'website',
      'og:site_name': data.siteName || SEO_DEFAULTS.site.name
    }

    if (data.image) {
      tags['og:image'] = data.image
    }

    return tags
  },

  // Generate Twitter Card meta tags
  generateTwitter: (data: {
    title: string
    description: string
    image?: string
    site?: string
    creator?: string
  }) => {
    const tags: Record<string, string> = {
      'twitter:card': data.image ? 'summary_large_image' : 'summary',
      'twitter:title': data.title,
      'twitter:description': data.description
    }

    if (data.image) {
      tags['twitter:image'] = data.image
    }

    if (data.site) {
      tags['twitter:site'] = data.site
    }

    if (data.creator) {
      tags['twitter:creator'] = data.creator
    }

    return tags
  }
}

// SEO score calculation
export const calculateSEOScore = (data: {
  hasTitle: boolean
  hasDescription: boolean
  hasStructuredData: boolean
  hasOpenGraph: boolean
  hasTwitterCards: boolean
  titleLength: number
  descriptionLength: number
  imageAltCount: number
  totalImages: number
}): number => {
  let score = 100

  // Title checks
  if (!data.hasTitle) score -= 20
  if (data.titleLength < 30 || data.titleLength > 60) score -= 5

  // Description checks
  if (!data.hasDescription) score -= 20
  if (data.descriptionLength < 120 || data.descriptionLength > 160) score -= 5

  // Technical SEO
  if (!data.hasStructuredData) score -= 10
  if (!data.hasOpenGraph) score -= 5
  if (!data.hasTwitterCards) score -= 5

  // Image optimization
  if (data.totalImages > 0) {
    const altRatio = data.imageAltCount / data.totalImages
    if (altRatio < 0.8) score -= Math.round((1 - altRatio) * 10)
  }

  return Math.max(0, score)
}

// SEO recommendations
export const getSEORecommendations = (data: {
  hasTitle: boolean
  hasDescription: boolean
  titleLength: number
  descriptionLength: number
  hasStructuredData: boolean
  imageAltCount: number
}): Array<{
  type: 'error' | 'warning' | 'info'
  title: string
  description: string
  action: string
}> => {
  const recommendations = []

  if (!data.hasTitle) {
    recommendations.push({
      type: 'error' as const,
      title: 'Missing page title',
      description: 'Every page needs a unique and descriptive title.',
      action: 'Add a compelling title that includes your main keyword.'
    })
  }

  if (!data.hasDescription) {
    recommendations.push({
      type: 'error' as const,
      title: 'Missing meta description',
      description: 'Meta descriptions help search engines understand your content.',
      action: 'Write a unique meta description between 120-160 characters.'
    })
  }

  if (data.titleLength < 30 || data.titleLength > 60) {
    recommendations.push({
      type: 'warning' as const,
      title: 'Title length optimization',
      description: `Your title is ${data.titleLength} characters. Optimal length is 30-60 characters.`,
      action: 'Optimize your title length for better search results.'
    })
  }

  if (data.descriptionLength < 120 || data.descriptionLength > 160) {
    recommendations.push({
      type: 'warning' as const,
      title: 'Description length optimization',
      description: `Your description is ${data.descriptionLength} characters. Optimal length is 120-160 characters.`,
      action: 'Optimize your meta description length.'
    })
  }

  if (!data.hasStructuredData) {
    recommendations.push({
      type: 'info' as const,
      title: 'Add structured data',
      description: 'Structured data helps search engines understand your content better.',
      action: 'Implement JSON-LD structured data for better SEO.'
    })
  }

  if (data.imageAltCount === 0) {
    recommendations.push({
      type: 'info' as const,
      title: 'Add alt text to images',
      description: 'Alt text improves accessibility and SEO.',
      action: 'Add descriptive alt text to all images.'
    })
  }

  return recommendations
}