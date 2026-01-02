import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Star, Eye, Image as ImageIcon } from 'lucide-react'
import { getCollections } from '@/lib/getCollections'
import { handleAndLogError, serializeError } from '@/utils/errorFormatting'

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  icon_name: string | null
  cover_image_url: string | null
  color_theme: {
    primary: string
    secondary: string
    accent: string
  } | null
  is_seasonal: boolean
  season_start_month: number | null
  season_end_month: number | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  wallpaper_count: number
  view_count: number
  is_currently_seasonal?: boolean
  seasonal_priority?: number
}

const CollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  useEffect(() => {
    // Immediate data fetch without delay for instant loading
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const collectionsData = await getCollections()
      setCollections(collectionsData)
    } catch (err) {
      setError(handleAndLogError(err, 'collections fetch'))
      console.error('Error fetching collections:', err)
    } finally {
      setIsDataLoaded(true)
    }
  }

  const getSeasonBadge = (collection: Collection) => {
    if (!collection.is_seasonal) return null

    const currentMonth = new Date().getMonth() + 1
    const isInSeason = collection.is_currently_seasonal
    
    if (isInSeason) {
      return (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          <Calendar className="w-3 h-3 inline mr-1" />
          In Season
        </div>
      )
    }

    // Check if upcoming season (within 2 months)
    const startMonth = collection.season_start_month
    if (startMonth) {
      const monthsUntil = (startMonth - currentMonth + 12) % 12
      if (monthsUntil <= 2 && monthsUntil > 0) {
        return (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
            <Calendar className="w-3 h-3 inline mr-1" />
            Coming Soon
          </div>
        )
      }
    }

    return null
  }

  const getIconForCollection = (iconName: string | null) => {
    switch (iconName) {
      case 'halloween': return '🎃'
      case 'christmas': return '🎄'
      case 'winter': return '❄️'
      case 'summer': return '☀️'
      case 'spring': return '🌸'
      case 'autumn': return '🍂'
      case 'flag': return '🇺🇸'
      case 'thanksgiving': return '🦃'
      case 'memorial': return '🏛️'
      case 'labor': return '⚒️'
      case 'heart': return '💕'
      case 'flower': return '🌺'
      case 'tools': return '🔧'
      case 'celebration': return '🎊'
      default: return '📱'
    }
  }

  // Render content immediately without loading states

  const featuredCollections = collections.filter(c => c.is_featured)
  const regularCollections = collections.filter(c => !c.is_featured)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Holiday Collections
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto px-2">
            Discover curated wallpaper collections for American holidays and seasons.
            Perfect themes for every time of year.
          </p>
        </div>

        {/* Featured Collections */}
        {featuredCollections.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mr-2" />
              Featured Collections
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {featuredCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} getIconForCollection={getIconForCollection} getSeasonBadge={getSeasonBadge} />
              ))}
            </div>
          </div>
        )}

        {/* All Collections */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
            All Collections
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} getIconForCollection={getIconForCollection} getSeasonBadge={getSeasonBadge} />
            ))}
          </div>
        </div>

        {error ? (
          <div className="text-center py-20">
            <div className="text-red-400 text-lg mb-4">{serializeError(error)}</div>
            <button 
              onClick={fetchCollections}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors min-h-[44px]"
            >
              Try Again
            </button>
          </div>
        ) : collections.length === 0 && isDataLoaded ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No collections available</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface CollectionCardProps {
  collection: Collection
  getIconForCollection: (iconName: string | null) => string
  getSeasonBadge: (collection: Collection) => React.ReactNode
}

const CollectionCard: React.FC<CollectionCardProps> = ({ collection, getIconForCollection, getSeasonBadge }) => {
  const primaryColor = collection.color_theme?.primary || '#8B5CF6'
  const secondaryColor = collection.color_theme?.secondary || '#1F2937'
  const accentColor = collection.color_theme?.accent || '#F59E0B'

  return (
    <Link to={`/collections/${collection.slug}`}>
      <div className="group relative bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
        {getSeasonBadge(collection)}
        
        {/* Collection Header - Use actual uploaded image if available */}
        <div 
          className="h-40 sm:h-44 md:h-48 relative overflow-hidden flex items-center justify-center rounded-t-xl"
          style={{
            // Subtle gradient background for padding areas when image doesn't fill container
            background: `linear-gradient(135deg, ${primaryColor}15, ${accentColor}15)`
          }}
        >
          {collection.cover_image_url ? (
            <>
              <img 
                src={collection.cover_image_url} 
                alt={collection.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                style={{
                  // Show full image without cropping - ensure it fits properly
                  objectFit: 'contain',
                  objectPosition: 'center',
                  imageRendering: 'crisp-edges',
                  maxHeight: '100%',
                  maxWidth: '100%'
                }}
                loading="lazy"
                onError={(e) => {
                  // Fallback to gradient background with icon if image fails to load
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div 
                className="hidden w-full h-full items-center justify-center relative overflow-hidden rounded-t-xl"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}20, ${accentColor}20)`
                }}
              >
                <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
                  {getIconForCollection(collection.icon_name)}
                </div>
              </div>
            </>
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-t-xl"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}20, ${accentColor}20)`
              }}
            >
              <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
                {getIconForCollection(collection.icon_name)}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-xl" />
        </div>

        {/* Collection Info - Updated for better readability */}
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate flex-1 mr-2">
              {collection.name}
            </h3>
            <div className="flex items-center text-xs text-gray-300 bg-white/10 px-2 py-1 rounded-full">
              <ImageIcon className="w-3 h-3 mr-1" />
              <span className="font-medium">{collection.wallpaper_count}</span>
            </div>
          </div>
          
          {collection.description && (
            <p className="text-gray-300 text-xs line-clamp-1 mb-2">
              {collection.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-gray-400">
              <Eye className="w-3 h-3 mr-1" />
              <span>{collection.view_count}</span>
            </div>

            {collection.is_seasonal && (
              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: `${primaryColor}20` }}>
                <Calendar className="w-3 h-3 mr-1" style={{ color: primaryColor }} />
                <span style={{ color: primaryColor }}>Seasonal</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default CollectionsPage