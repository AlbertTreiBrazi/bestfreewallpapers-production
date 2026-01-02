import React, { createContext, useContext, useEffect, useMemo } from 'react'

interface SEOMetadata {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  imageWidth?: number
  imageHeight?: number
  imageAlt?: string
  url?: string
  type?: 'website' | 'article' | 'product' | 'profile'
  siteName?: string
  locale?: string
  siteUrl?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
  section?: string
  readingTime?: number
  canonical?: string
  noIndex?: boolean
  noFollow?: boolean
  ogType?: string
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitterSite?: string
  twitterCreator?: string
  robots?: string
  googlebot?: string
  viewport?: string
  themeColor?: string
  msapplicationTileColor?: string
  appleMobileWebAppTitle?: string
  alternateLanguage?: string
  alternateLanguageUrl?: string
}

interface SEOMetadataContextValue {
  metadata: SEOMetadata
  updateMetadata: (newMetadata: Partial<SEOMetadata>) => void
  resetMetadata: () => void
}

const defaultMetadata: SEOMetadata = {
  title: 'BestFreeWallpapers - Free HD Wallpapers & Desktop Backgrounds',
  description: 'Download thousands of free high-definition wallpapers and desktop backgrounds. 4K, HD, and mobile wallpapers in categories like nature, abstract, space, and more.',
  keywords: [
    'free wallpapers',
    'desktop wallpapers',
    'HD wallpapers',
    '4K wallpapers',
    'background images',
    'wallpaper download',
    'free desktop backgrounds'
  ],
  type: 'website',
  siteName: 'BestFreeWallpapers',
  locale: 'en_US',
  siteUrl: 'https://bestfreewallpapers.com',
  image: '/images/og-default.jpg',
  imageWidth: 1200,
  imageHeight: 630,
  imageAlt: 'BestFreeWallpapers - Free HD Wallpapers',
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
  googlebot: 'index, follow',
  viewport: 'width=device-width, initial-scale=1.0',
  themeColor: '#7c3aed',
  msapplicationTileColor: '#7c3aed',
  appleMobileWebAppTitle: 'BestFreeWallpapers'
}

const SEOMetadataContext = createContext<SEOMetadataContextValue | null>(null)

export const useSEOMetadata = () => {
  const context = useContext(SEOMetadataContext)
  if (!context) {
    throw new Error('useSEOMetadata must be used within a SEOMetadataProvider')
  }
  return context
}

interface SEOMetadataProviderProps {
  children: React.ReactNode
  defaultMetadata?: Partial<SEOMetadata>
}

export const SEOMetadataProvider: React.FC<SEOMetadataProviderProps> = ({
  children,
  defaultMetadata: customDefaultMetadata
}) => {
  const [metadata, setMetadata] = React.useState<SEOMetadata>({
    ...defaultMetadata,
    ...customDefaultMetadata
  })

  const updateMetadata = (newMetadata: Partial<SEOMetadata>) => {
    setMetadata(prev => ({ ...prev, ...newMetadata }))
  }

  const resetMetadata = () => {
    setMetadata(defaultMetadata)
  }

  const contextValue = useMemo(() => ({
    metadata,
    updateMetadata,
    resetMetadata
  }), [metadata])

  return (
    <SEOMetadataContext.Provider value={contextValue}>
      {children}
    </SEOMetadataContext.Provider>
  )
}

// SEO Head component for managing document head
interface SEOHeadProps {
  metadata?: Partial<SEOMetadata>
  children?: React.ReactNode
}

export const SEOHead: React.FC<SEOHeadProps> = ({ metadata, children }) => {
  const { metadata: contextMetadata } = useSEOMetadata()
  const finalMetadata = useMemo(() => ({
    ...contextMetadata,
    ...metadata
  }), [contextMetadata, metadata])

  useEffect(() => {
    const updateHead = () => {
      // Update title
      if (finalMetadata.title) {
        document.title = finalMetadata.title
      }

      // Update meta tags
      const updateMetaTag = (name: string, content: string | undefined, property?: boolean) => {
        if (!content) return
        
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
      }

      // Basic meta tags
      updateMetaTag('description', finalMetadata.description)
      updateMetaTag('keywords', finalMetadata.keywords?.join(', '))
      updateMetaTag('author', finalMetadata.author)
      updateMetaTag('robots', finalMetadata.noIndex ? 'noindex, nofollow' : finalMetadata.robots)
      updateMetaTag('googlebot', finalMetadata.googlebot)
      updateMetaTag('viewport', finalMetadata.viewport)
      updateMetaTag('theme-color', finalMetadata.themeColor)
      updateMetaTag('msapplication-TileColor', finalMetadata.msapplicationTileColor)
      updateMetaTag('apple-mobile-web-app-title', finalMetadata.appleMobileWebAppTitle)

      // Open Graph tags
      updateMetaTag('og:title', finalMetadata.title, true)
      updateMetaTag('og:description', finalMetadata.description, true)
      updateMetaTag('og:image', finalMetadata.image, true)
      updateMetaTag('og:url', finalMetadata.url || finalMetadata.canonical || window.location.href, true)
      updateMetaTag('og:type', finalMetadata.ogType || finalMetadata.type, true)
      updateMetaTag('og:site_name', finalMetadata.siteName, true)
      updateMetaTag('og:locale', finalMetadata.locale, true)
      
      if (finalMetadata.imageWidth) {
        updateMetaTag('og:image:width', finalMetadata.imageWidth.toString(), true)
      }
      if (finalMetadata.imageHeight) {
        updateMetaTag('og:image:height', finalMetadata.imageHeight.toString(), true)
      }
      if (finalMetadata.imageAlt) {
        updateMetaTag('og:image:alt', finalMetadata.imageAlt, true)
      }
      if (finalMetadata.publishedTime) {
        updateMetaTag('article:published_time', finalMetadata.publishedTime, true)
      }
      if (finalMetadata.modifiedTime) {
        updateMetaTag('article:modified_time', finalMetadata.modifiedTime, true)
      }
      if (finalMetadata.section) {
        updateMetaTag('article:section', finalMetadata.section, true)
      }
      if (finalMetadata.tags) {
        finalMetadata.tags.forEach(tag => {
          updateMetaTag('article:tag', tag, true)
        })
      }

      // Twitter Card tags
      updateMetaTag('twitter:card', finalMetadata.twitterCard)
      updateMetaTag('twitter:title', finalMetadata.title)
      updateMetaTag('twitter:description', finalMetadata.description)
      updateMetaTag('twitter:image', finalMetadata.image)
      updateMetaTag('twitter:site', finalMetadata.twitterSite)
      updateMetaTag('twitter:creator', finalMetadata.twitterCreator)

      // Canonical URL
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      const canonicalUrl = finalMetadata.canonical || finalMetadata.url || window.location.href
      canonical.setAttribute('href', canonicalUrl)

      // Alternate language
      if (finalMetadata.alternateLanguage && finalMetadata.alternateLanguageUrl) {
        let alternate = document.querySelector(`link[rel="alternate"][hreflang="${finalMetadata.alternateLanguage}"]`) as HTMLLinkElement
        if (!alternate) {
          alternate = document.createElement('link')
          alternate.setAttribute('rel', 'alternate')
          alternate.setAttribute('hreflang', finalMetadata.alternateLanguage)
          document.head.appendChild(alternate)
        }
        alternate.setAttribute('href', finalMetadata.alternateLanguageUrl)
      }

      // Update JSON-LD structured data
      updateStructuredData(finalMetadata)
    }

    updateHead()
  }, [finalMetadata])

  return <>{children}</>
}

// JSON-LD structured data management
const updateStructuredData = (metadata: SEOMetadata) => {
  // Remove existing structured data
  const existingSchema = document.querySelector('script[type="application/ld+json"]')
  if (existingSchema) {
    existingSchema.remove()
  }

  // Generate structured data
  const structuredData = generateStructuredData(metadata)
  
  if (structuredData) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)
  }
}

const generateStructuredData = (metadata: SEOMetadata) => {
  const baseData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": metadata.siteName || "BestFreeWallpapers",
    "url": metadata.siteUrl || "https://bestfreewallpapers.com",
    "description": metadata.description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${metadata.siteUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  if (metadata.type === 'article') {
    return {
      ...baseData,
      "@type": "Article",
      "headline": metadata.title,
      "description": metadata.description,
      "image": metadata.image,
      "author": {
        "@type": "Person",
        "name": metadata.author || "BestFreeWallpapers"
      },
      "publisher": {
        "@type": "Organization",
        "name": metadata.siteName || "BestFreeWallpapers",
        "logo": {
          "@type": "ImageObject",
          "url": `${metadata.siteUrl}/logo.png`
        }
      },
      "datePublished": metadata.publishedTime,
      "dateModified": metadata.modifiedTime,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": metadata.url || metadata.canonical
      }
    }
  }

  return baseData
}

// Utility function to update metadata from anywhere in the app
export const updatePageMetadata = (newMetadata: Partial<SEOMetadata>) => {
  // This function can be used to update metadata from any component
  const event = new CustomEvent('update-seo-metadata', { detail: newMetadata })
  window.dispatchEvent(event)
}

// Hook for easy metadata updates
export const useUpdateMetadata = () => {
  const { updateMetadata } = useSEOMetadata()
  return updateMetadata
}
