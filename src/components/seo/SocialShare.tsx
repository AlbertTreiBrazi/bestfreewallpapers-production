import React, { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

interface SocialShareData {
  url: string
  title: string
  description?: string
  image?: string
  imageWidth?: number
  imageHeight?: number
  imageAlt?: string
  siteName?: string
  type?: 'website' | 'article' | 'video' | 'music' | 'book'
  locale?: string
  localeAlternate?: Array<{
    locale: string
    url: string
  }>
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
  price?: {
    currency: string
    amount: number
  }
  availability?: 'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued'
  brand?: string
  category?: string
  isbn?: string
  mpn?: string
  gtin8?: string
  gtin13?: string
  gtin14?: string
  runtime?: string
  uploadDate?: string
  duration?: string
}

interface TwitterData {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player'
  title?: string
  description?: string
  image?: string
  imageAlt?: string
  site?: string
  creator?: string
  player?: {
    url: string
    width?: number
    height?: number
  }
  label1?: {
    name: string
    data: string
  }
  label2?: {
    name: string
    data: string
  }
  data1?: {
    name: string
    data: string
  }
  data2?: {
    name: string
    data: string
  }
}

interface SocialShareProps {
  data: SocialShareData
  twitter?: TwitterData
  className?: string
  theme?: 'light' | 'dark'
}

/**
 * Comprehensive social sharing meta tags component
 * Supports Open Graph, Twitter Cards, and various social platforms
 */
export const SocialShare: React.FC<SocialShareProps> = ({
  data,
  twitter,
  className,
  theme = 'light'
}) => {
  const socialTags = useMemo(() => {
    const baseTags: Record<string, string> = {}
    
    // Open Graph tags
    if (data.url) {
      baseTags['og:url'] = data.url
      baseTags['og:updated_time'] = new Date().toISOString()
    }
    
    if (data.title) {
      baseTags['og:title'] = data.title
    }
    
    if (data.description) {
      baseTags['og:description'] = data.description
    }
    
    if (data.image) {
      baseTags['og:image'] = data.image
      if (data.imageWidth) baseTags['og:image:width'] = data.imageWidth.toString()
      if (data.imageHeight) baseTags['og:image:height'] = data.imageHeight.toString()
      if (data.imageAlt) baseTags['og:image:alt'] = data.imageAlt
      if (data.image.includes('secure.gravatar.com')) {
        baseTags['og:image:type'] = 'image/jpeg'
      } else if (data.image.includes('twimg.com')) {
        baseTags['og:image:type'] = 'image/jpeg'
      } else if (data.image.includes('unsplash.com')) {
        baseTags['og:image:type'] = 'image/jpeg'
      }
    }
    
    if (data.type) {
      baseTags['og:type'] = data.type
    }
    
    if (data.siteName) {
      baseTags['og:site_name'] = data.siteName
    }
    
    if (data.locale) {
      baseTags['og:locale'] = data.locale
    }
    
    // Article specific tags
    if (data.type === 'article') {
      if (data.publishedTime) {
        baseTags['article:published_time'] = data.publishedTime
      }
      if (data.modifiedTime) {
        baseTags['article:modified_time'] = data.modifiedTime
      }
      if (data.author) {
        baseTags['article:author'] = data.author
      }
      if (data.section) {
        baseTags['article:section'] = data.section
      }
      if (data.tags && data.tags.length > 0) {
        data.tags.forEach(tag => {
          baseTags[`article:tag:${tag}`] = tag
        })
      }
    }
    
    // Locale alternates
    if (data.localeAlternate && data.localeAlternate.length > 0) {
      data.localeAlternate.forEach(alt => {
        baseTags[`og:locale:alternate:${alt.locale}`] = alt.url
      })
    }
    
    // Book specific tags
    if (data.type === 'book' && data.isbn) {
      baseTags['book:isbn'] = data.isbn
    }
    
    // Video specific tags
    if (data.type === 'video' && data.runtime) {
      baseTags['video:duration'] = data.runtime
    }
    if (data.type === 'video' && data.uploadDate) {
      baseTags['video:release_date'] = data.uploadDate
    }
    
    // Twitter Card tags
    if (twitter) {
      baseTags['twitter:card'] = twitter.card || (data.image ? 'summary_large_image' : 'summary')
      
      if (twitter.title || data.title) {
        baseTags['twitter:title'] = twitter.title || data.title
      }
      
      if (twitter.description || data.description) {
        baseTags['twitter:description'] = twitter.description || data.description
      }
      
      if (twitter.image || data.image) {
        baseTags['twitter:image'] = twitter.image || data.image
      }
      
      if (twitter.imageAlt) {
        baseTags['twitter:image:alt'] = twitter.imageAlt
      }
      
      if (twitter.site) {
        baseTags['twitter:site'] = twitter.site
      }
      
      if (twitter.creator) {
        baseTags['twitter:creator'] = twitter.creator
      }
      
      if (twitter.player) {
        baseTags['twitter:player'] = twitter.player.url
        if (twitter.player.width) {
          baseTags['twitter:player:width'] = twitter.player.width.toString()
        }
        if (twitter.player.height) {
          baseTags['twitter:player:height'] = twitter.player.height.toString()
        }
      }
      
      if (twitter.label1) {
        baseTags['twitter:label1'] = twitter.label1.name
        baseTags['twitter:data1'] = twitter.label1.data
      }
      
      if (twitter.label2) {
        baseTags['twitter:label2'] = twitter.label2.name
        baseTags['twitter:data2'] = twitter.label2.data
      }
      
      if (twitter.data1) {
        baseTags['twitter:data1'] = twitter.data1.data
      }
      
      if (twitter.data2) {
        baseTags['twitter:data2'] = twitter.data2.data
      }
    }
    
    return baseTags
  }, [data, twitter])

  return (
    <Helmet>
      {Object.entries(socialTags).map(([property, content]) => (
        <meta
          key={property}
          property={property}
          content={content}
          className={className}
        />
      ))}
    </Helmet>
  )
}

// Predefined social share configurations
export const createWebsiteSocialShare = (baseUrl: string, data: Partial<SocialShareData> = {}): SocialShareData => ({
  url: baseUrl,
  title: 'BestFreeWallpapers - Free HD Wallpapers & Desktop Backgrounds',
  description: 'Download thousands of free high-definition wallpapers and desktop backgrounds. 4K, HD, and mobile wallpapers in categories like nature, abstract, space, and more.',
  image: `${baseUrl}/images/og-default.jpg`,
  imageWidth: 1200,
  imageHeight: 630,
  imageAlt: 'BestFreeWallpapers - Free HD Wallpapers',
  siteName: 'BestFreeWallpapers',
  type: 'website',
  locale: 'en_US',
  ...data
})

export const createWallpaperSocialShare = (wallpaper: any, baseUrl: string): SocialShareData => ({
  url: `${baseUrl}/wallpaper/${wallpaper.slug || wallpaper.id}`,
  title: `Free ${wallpaper.title} - BestFreeWallpapers`,
  description: wallpaper.description || `Download this free ${wallpaper.width}x${wallpaper.height} ${wallpaper.category_name || 'wallpaper'} from BestFreeWallpapers`,
  image: wallpaper.image_url,
  imageWidth: wallpaper.width,
  imageHeight: wallpaper.height,
  imageAlt: wallpaper.title,
  siteName: 'BestFreeWallpapers',
  type: 'article',
  tags: [wallpaper.category_name || 'wallpaper', 'free', 'desktop', 'background'],
  ...(wallpaper.category_name && { section: wallpaper.category_name })
})

export const createCategorySocialShare = (category: any, baseUrl: string): SocialShareData => ({
  url: `${baseUrl}/category/${category.id}`,
  title: `Free ${category.name} Wallpapers - BestFreeWallpapers`,
  description: `Download free ${category.name.toLowerCase()} wallpapers in high quality. ${category.description || 'Thousands of beautiful wallpapers in this category.'}`,
  image: category.image_url,
  imageWidth: 1200,
  imageHeight: 630,
  imageAlt: `${category.name} wallpapers`,
  siteName: 'BestFreeWallpapers',
  type: 'website',
  tags: [category.name.toLowerCase(), 'wallpapers', 'free'],
  section: 'Categories'
})

export const createTwitterCardForWallpaper = (wallpaper: any, baseUrl: string): TwitterData => ({
  card: 'summary_large_image',
  title: wallpaper.title,
  description: wallpaper.description || `Free ${wallpaper.width}x${wallpaper.height} wallpaper`,
  image: wallpaper.image_url,
  imageAlt: wallpaper.title,
  label1: {
    name: 'Dimensions',
    data: `${wallpaper.width} x ${wallpaper.height}`
  },
  label2: {
    name: 'Downloads',
    data: (wallpaper.downloads_count || 0).toString()
  }
})

// Export component and utilities
export default SocialShare

// Export types
export type { SocialShareData, TwitterData }
