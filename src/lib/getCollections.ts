// Optimized data fetching for collections with caching

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
  wallpapers?: Array<{
    thumbnail_url?: string
    image_url?: string
  }>
  metadata?: {
    cover_image?: string
    [key: string]: any
  }
}

// Cache for collections data
let collectionsCache: Collection[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Helper function to get cover image with fallback hierarchy
// PRIORITY: wallpaper thumbnails FIRST (for performance), then cover_image_url as fallback
export function getCollectionCoverImage(collection: Collection, wallpapers?: any[]): string {
  console.log('[getCollectionCoverImage] Input collection:', {
    id: collection.id,
    name: collection.name,
    cover_image_url: collection.cover_image_url,
    has_wallpapers_embedded: !!collection.wallpapers,
    wallpapers_embedded_count: collection.wallpapers?.length || 0
  })
  
  // Priority 1: Wallpapers embedded (small thumbnails for performance)
  if (collection.wallpapers && collection.wallpapers.length > 0) {
    const firstWallpaper = collection.wallpapers[0]
    if (firstWallpaper.thumbnail_url) {
      console.log('[getCollectionCoverImage] Using embedded wallpapers thumbnail_url:', firstWallpaper.thumbnail_url)
      return firstWallpaper.thumbnail_url
    }
    if (firstWallpaper.image_url) {
      console.log('[getCollectionCoverImage] Using embedded wallpapers image_url:', firstWallpaper.image_url)
      return firstWallpaper.image_url
    }
  }
  
  // Priority 2: wallpapers parameter
  if (wallpapers && wallpapers.length > 0) {
    const firstWallpaper = wallpapers[0]
    if (firstWallpaper.thumbnail_url) {
      console.log('[getCollectionCoverImage] Using wallpapers param thumbnail_url:', firstWallpaper.thumbnail_url)
      return firstWallpaper.thumbnail_url
    }
    if (firstWallpaper.image_url) {
      console.log('[getCollectionCoverImage] Using wallpapers param image_url:', firstWallpaper.image_url)
      return firstWallpaper.image_url
    }
  }
  
  // Priority 3: collection.cover_image_url (large cover as fallback)
  if (collection.cover_image_url) {
    console.log('[getCollectionCoverImage] Using cover_image_url:', collection.cover_image_url)
    return collection.cover_image_url
  }
  
  // Priority 4: collection.metadata.cover_image
  if (collection.metadata && collection.metadata.cover_image) {
    console.log('[getCollectionCoverImage] Using metadata cover_image:', collection.metadata.cover_image)
    return collection.metadata.cover_image
  }
  
  // Priority 5: Final fallback
  console.log('[getCollectionCoverImage] FALLBACK TO PLACEHOLDER')
  return '/images/placeholders/collection.svg'
}

// Health check for image URLs
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

// MAIN EXPORT - This is what CollectionsPage, HelpPage, and HomePage need
export async function getCollections(): Promise<Collection[]> {
  // Return cached data if still valid
  if (collectionsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return collectionsCache
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collections-api`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.status}`)
    }

    const data = await response.json()
    const collections = data.data || []
    
    console.log('[getCollections] API Response:', {
      status: response.status,
      collections_count: collections.length,
      first_collection: collections[0] ? {
        id: collections[0].id,
        name: collections[0].name,
        cover_image_url: collections[0].cover_image_url,
        has_wallpapers: !!collections[0].wallpapers,
        wallpapers_count: collections[0].wallpapers?.length || 0
      } : null
    })

    // Update cache
    collectionsCache = collections
    cacheTimestamp = Date.now()

    return collections
  } catch (error) {
    console.error('Error fetching collections:', error)
    
    // Return cached data if available, even if stale
    if (collectionsCache) {
      return collectionsCache
    }
    
    throw error
  }
}

// Clear cache when needed
export function clearCollectionsCache(): void {
  collectionsCache = null
  cacheTimestamp = 0
}
