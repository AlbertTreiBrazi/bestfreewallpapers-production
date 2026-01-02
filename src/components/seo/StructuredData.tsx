import React, { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

interface StructuredDataProps {
  schema?: object | object[]
  data?: object | object[]
  type?: string
}

interface OrganizationData {
  name: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[]
  address?: {
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  contactPoint?: {
    telephone?: string
    contactType?: string
    availableLanguage?: string[]
  }
  foundingDate?: string
  numberOfEmployees?: string
  slogan?: string
  founders?: Array<{
    name: string
    sameAs?: string[]
  }>
  awards?: string[]
  members?: string[]
}

interface WallpaperData {
  id: string
  name: string
  description: string
  image: string
  thumbnail?: string
  url: string
  downloadUrl: string
  category: string
  tags: string[]
  author?: string
  license?: string
  quality?: string
  resolution?: string
  fileSize?: number
  format?: string
  uploadDate?: string
  views?: number
  downloads?: number
  likes?: number
  isFree?: boolean
  isPremium?: boolean
  isHD?: boolean
  is4K?: boolean
  isTrending?: boolean
  colors?: string[]
  dominantColor?: string
  averageRating?: number
  ratingCount?: number
  comments?: Array<{
    id: string
    text: string
    author: string
    timestamp: string
    likes: number
  }>
}

interface CategoryData {
  name: string
  url: string
  description: string
  imageCount: number
  totalWallpapers?: number
  subcategories?: string[]
  featuredWallpapers?: WallpaperData[]
  popularityScore?: number
  trendDirection?: 'up' | 'down' | 'stable'
}

// Schema generation functions
const generateOrganizationSchema = (organization: OrganizationData) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organization.name,
    url: organization.url,
    logo: organization.logo,
    description: organization.description,
    sameAs: organization.sameAs,
    address: organization.address,
    contactPoint: organization.contactPoint,
    foundingDate: organization.foundingDate,
    numberOfEmployees: organization.numberOfEmployees,
    slogan: organization.slogan,
    founders: organization.founders,
    awards: organization.awards,
    members: organization.members
  }
}

const generateWallpaperSchema = (wallpaper: WallpaperData) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: wallpaper.name,
    description: wallpaper.description,
    contentUrl: wallpaper.url,
    thumbnailUrl: wallpaper.thumbnail || wallpaper.image,
    uploadDate: wallpaper.uploadDate,
    contentSize: wallpaper.fileSize,
    encodingFormat: wallpaper.format,
    width: wallpaper.resolution?.split('x')[0],
    height: wallpaper.resolution?.split('x')[1],
    keywords: wallpaper.tags.join(', '),
    category: wallpaper.category,
    author: {
      '@type': 'Person',
      name: wallpaper.author
    },
    license: wallpaper.license,
    isFamilyFriendly: true,
    isAccessibleForFree: wallpaper.isFree || false,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/DownloadAction',
      userInteractionCount: wallpaper.downloads || 0
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Views',
        value: wallpaper.views || 0
      },
      {
        '@type': 'PropertyValue',
        name: 'Quality',
        value: wallpaper.quality || 'HD'
      },
      {
        '@type': 'PropertyValue',
        name: 'Resolution',
        value: wallpaper.resolution || '1920x1080'
      }
    ]
  }
}

const generateCategorySchema = (category: CategoryData) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description,
    url: category.url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.totalWallpapers || category.imageCount,
      itemListElement: category.featuredWallpapers?.map((wallpaper, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ImageObject',
          name: wallpaper.name,
          description: wallpaper.description,
          url: wallpaper.url
        }
      }))
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Subcategories',
        value: category.subcategories?.join(', ') || ''
      },
      {
        '@type': 'PropertyValue',
        name: 'Popularity Score',
        value: category.popularityScore || 0
      }
    ]
  }
}

const StructuredData: React.FC<StructuredDataProps> = ({ 
  schema, 
  data, 
  type = 'default' 
}) => {
  // Support both schema and data props
  const schemaData = schema || data
  
  if (!schemaData) {
    return null
  }

  // Handle different data types
  const schemas = useMemo(() => {
    if (type === 'custom') {
      return Array.isArray(data) ? data : [data]
    }
    
    if (Array.isArray(schemaData)) {
      return schemaData
    }
    
    return [schemaData]
  }, [schemaData, data, type])

  // Process schemas based on type
  const processedSchemas = schemas.map((schemaItem: any) => {
    // Auto-detect schema type based on content
    if (schemaItem['@type'] === 'Organization' || schemaItem.organizationType === 'company') {
      return generateOrganizationSchema(schemaItem)
    }
    
    if (schemaItem.imageType === 'wallpaper' || schemaItem.wallpaperId) {
      return generateWallpaperSchema(schemaItem)
    }
    
    if (schemaItem.categoryType === 'collection' || schemaItem.collectionName) {
      return generateCategorySchema(schemaItem)
    }

    // Return as-is if type is unknown
    return schemaItem
  })

  return (
    <Helmet>
      {processedSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema, null, 2)
          }}
        />
      ))}
    </Helmet>
  )
}

export { StructuredData, generateOrganizationSchema, generateWallpaperSchema, generateCategorySchema }
export default StructuredData