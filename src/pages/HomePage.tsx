import React, { Suspense, lazy } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { Crown, Download, Eye, ArrowRight, Calendar, Search, Music, Play, Smartphone, Zap, Video, Tag, Layers, Image as ImageIcon } from 'lucide-react'

// SEO and Performance Components
import { SEOMetadataProvider, useSEOMetadata, useUpdateMetadata } from '@/components/seo/SEOMetadata'
import { StructuredData } from '@/components/seo/StructuredData'
import { SitemapGenerator } from '@/components/seo/SitemapGenerator'
import { SocialShare, createWebsiteSocialShare } from '@/components/seo/SocialShare'
import { PerformanceMonitor } from '@/components/analytics/PerformanceMonitor'
import { BundleAnalyzer } from '@/components/analytics/BundleAnalyzer'
import { LoadAnalyzer } from '@/components/analytics/LoadAnalyzer'

// Original Components (Enhanced with new image components)
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { TrendingNowSection } from '@/components/wallpapers/TrendingNowSection'
import { EnhancedCategorySection } from '@/components/category/EnhancedCategorySection'

// Performance Components
import LazyImage from '@/components/common/LazyImage'

// Existing utilities
import { getApiImageUrl } from '@/config/api'
import { getCollections } from '@/lib/getCollections'
import { useCancellableRequest } from '@/hooks/useCancellableRequest'
import { ApiError } from '@/utils/api-helpers'
import { logError, logWarn } from '@/utils/errorLogger'

// Local Error Boundary components to prevent entire page failure
class WallpaperErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    logError('WallpaperErrorBoundary caught error', error, { 
      context: 'HomePage', 
      component: 'WallpaperErrorBoundary',
      errorInfo 
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm">Failed to load wallpaper</p>
        </div>
      )
    }
    return this.props.children
  }
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    logError(`${this.props.boundaryName} ErrorBoundary caught error`, error, { 
      context: 'HomePage', 
      component: this.props.boundaryName,
      errorInfo 
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-2">Unable to load {this.props.boundaryName}</p>
          <p className="text-gray-500 text-sm">Please try refreshing the page</p>
        </div>
      )
    }
    return this.props.children
  }
}

// SEO and Performance utilities
// import { dynamicSEO, structuredData, sitemap } from '@/utils/seo'
// Temporary mock exports to get build working
const dynamicSEO = {
  generateTitle: (type: string, data: any) => 'Best Free Wallpapers - HD Desktop & Mobile Backgrounds',
  generateDescription: (type: string, data: any) => 'Download thousands of free high-definition wallpapers and desktop backgrounds.',
  generateKeywords: (type: string, data: any) => 'wallpapers, free, HD, 4K'
}
const structuredData = {
  generateOrganization: () => ({ '@context': 'https://schema.org', '@type': 'Organization' }),
  generateWebsite: () => ({ '@context': 'https://schema.org', '@type': 'WebSite' }),
  generateWebPage: (data: any) => ({ '@context': 'https://schema.org', '@type': 'WebPage' })
}
const sitemap = {
  generateUrl: (path: string) => ({ loc: path }),
  generateStaticPages: () => [{
    loc: '/',
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily' as const,
    priority: '1.0'
  }]
}
import { performanceMonitoring, preload, CORE_WEB_VITALS } from '@/utils/performance'

// Lazy load heavy components for better initial load performance
const BestFreeWallpapersTabCategories = lazy(() => 
  import('@/components/category/BestFreeWallpapersTabCategories').then(module => ({
    default: module.BestFreeWallpapersTabCategories
  }))
)

const BestFreeWallpapersFAQ = lazy(() => 
  import('@/components/faq/BestFreeWallpapersFAQ').then(module => ({
    default: module.BestFreeWallpapersFAQ
  }))
)

// Enhanced OptimizedImage component with Phase 3 improvements
const EnhancedOptimizedImage = React.memo(({ 
  src, 
  alt, 
  className, 
  onError, 
  priority = false,
  width,
  height,
  quality = 75,
  enableWebP = true,
  enableProgressive = true
}: {
  src: string
  alt: string
  className: string
  onError?: () => void
  priority?: boolean
  width?: number
  height?: number
  quality?: number
  enableWebP?: boolean
  enableProgressive?: boolean
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const img = imgRef.current
    if (!img || priority) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = src
          observer.disconnect()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px 0px'
      }
    )

    observer.observe(img)
    return () => observer.disconnect()
  }, [src, priority])

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center`}>
        <span className="text-2xl text-gray-400">📷</span>
      </div>
    )
  }

  return (
    <>
      {!isLoaded && !priority && (
        <div className={`absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center animate-pulse`}>
          <span className="text-2xl text-gray-400">📷</span>
        </div>
      )}
      <img
        ref={imgRef}
        alt={alt}
        width={width || 384}
        height={height || 216}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ width, height }}
        onLoad={() => {
          setIsLoaded(true)
          onError?.()
        }}
        onError={() => {
          setHasError(true)
          onError?.()
        }}
        loading={priority ? 'eager' : 'lazy'}
      />
    </>
  )
})

EnhancedOptimizedImage.displayName = 'EnhancedOptimizedImage'

// Preload critical resources on component mount
const preloadCriticalResources = () => {
  // DNS prefetch for external domains
  preload.dnsPrefetch('fonts.googleapis.com')
  preload.dnsPrefetch('fonts.gstatic.com')
}

// Enhanced Collection Card Component with optimized image handling
const CollectionCard: React.FC<{collection: any, theme: string}> = React.memo(({ collection, theme }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageError, setImageError] = React.useState(false)

  // PRIORITY: Use cover_image_url (uploaded by admin) FIRST, then fallback
  const coverImage = collection.cover_image_url ||  // ← Cover uploadat de admin PRIMUL!
                    collection.wallpapers?.[0]?.thumbnail_url || 
                    collection.wallpapers?.[0]?.image_url || 
                    '/images/placeholders/collection.svg'

  // Handle image load and error events
  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    console.warn('Collection image failed to load:', coverImage)
    setImageError(true)
  }

  return (
    <Link
      to={`/collections/${collection.slug}`}
      className={`group ${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-50'} rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] block`}
    >
      {/* Square aspect ratio like Categories - perfect for uploaded covers */}
      <div className="aspect-square overflow-hidden relative">
        {/* Image - DIRECT IMG like Categories (no LazyImage wrapper) */}
        {!imageError ? (
          <img
            src={coverImage}
            alt={`${collection.name} preview`}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          // Fallback when image fails
          <div className={`w-full h-full bg-gradient-to-br ${theme === 'dark' ? 'from-purple-900 to-blue-900' : 'from-purple-100 to-blue-100'} flex items-center justify-center`}>
            <Calendar className={`w-12 h-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
        )}
        
        {/* Collection overlay info with proper opacity (≤20%) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity duration-300">
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-medium bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                {collection.wallpaper_count} wallpapers
              </span>
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1 group-hover:text-purple-600 transition-colors line-clamp-1`}>
          {collection.name}
        </h3>
        
        {collection.description && (
          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-sm leading-relaxed line-clamp-2`}>
            {collection.description}
          </p>
        )}
        
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {collection.wallpaper_count} images
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Featured
          </span>
        </div>
      </div>
    </Link>
  )
})

CollectionCard.displayName = 'CollectionCard'

// Main HomePage component with SEO Provider
function HomePageContent() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { fetch: fetchCancellable, cancelAll } = useCancellableRequest()
  const [categories, setCategories] = React.useState<any[]>([])
  const [wallpapers, setWallpapers] = React.useState<any[]>([])
  const [featuredCollections, setFeaturedCollections] = React.useState<any[]>([])
  const [featuredWallpapers, setFeaturedWallpapers] = React.useState<any[]>([])
  const [trendingWallpapers, setTrendingWallpapers] = React.useState<any[]>([])
  const [loadingStates, setLoadingStates] = React.useState({
    categories: false,
    wallpapers: false,
    collections: false,
    featuredWallpapers: false,
    trendingWallpapers: false,
    initial: false
  })
  const [errors, setErrors] = React.useState<{categories?: string, wallpapers?: string, collections?: string}>({})
  const [isDataLoaded, setIsDataLoaded] = React.useState(false)

  // SEO metadata update
  const updateMetadata = useUpdateMetadata()
  
  // Performance monitoring
  const [perfMetrics, setPerfMetrics] = React.useState<any>({})
  
  const handlePerformanceMetric = React.useCallback((metric: any) => {
    setPerfMetrics(prev => ({
      ...prev,
      [metric.name]: metric
    }))
    
    // Record custom performance metrics
    performanceMonitoring.recordMetric(`homepage_${metric.name}`, metric.value)
  }, [])

  // Bundle analysis
  const handleBundleAnalysis = React.useCallback((analysis: any) => {
    performanceMonitoring.recordMetric('bundle_total_size', analysis.totalSize)
    performanceMonitoring.recordMetric('bundle_compression_ratio', analysis.gzipRatio)
  }, [])

  // Load analysis
  const handleLoadAnalysis = React.useCallback((analysis: any) => {
    performanceMonitoring.recordMetric('page_load_time', analysis.totalLoadTime)
    performanceMonitoring.recordMetric('dom_content_loaded', analysis.domContentLoaded)
    performanceMonitoring.recordMetric('first_contentful_paint', analysis.firstContentfulPaint)
  }, [])

  // Preload critical resources
  React.useEffect(() => {
    preloadCriticalResources()
  }, [])

  // Update SEO metadata when component mounts
  React.useEffect(() => {
    const homeSEO = dynamicSEO.generateTitle('home', {})
    const description = dynamicSEO.generateDescription('home', {})
    const keywords = dynamicSEO.generateKeywords('home', {})
    
    updateMetadata({
      title: homeSEO,
      description,
      keywords: keywords.split(', '),
      image: '/images/og-default.jpg',
      imageWidth: 1200,
      imageHeight: 630,
      url: window.location.href,
      type: 'website'
    })
  }, [updateMetadata])

  // Load data in background after initial render
  React.useEffect(() => {
    // Small delay to ensure smooth initial render
    const timer = setTimeout(() => {
      loadDataParallel().catch(error => {
        console.error('[HomePage] Uncaught error in loadDataParallel:', error)
        logError('Uncaught loadDataParallel error', error, { context: 'HomePage' })
      })
    }, 50)
    return () => {
      clearTimeout(timer)
      cancelAll() // Cancel all pending requests on unmount
    }
  }, [])

  const loadDataParallel = async () => {
    
    const BASE_URL = import.meta.env.VITE_SUPABASE_URL
    const AUTH_HEADER = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    
    // Debug environment variables
    
    // Start all requests simultaneously for better performance with timeout protection
    const categoriesPromise = fetchCancellable(
      'homepage-categories',
      `${BASE_URL}/functions/v1/categories-api`,
      {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({}),
        timeout: 15000, // 15s timeout for categories
        retries: 1
      }
    )

    const wallpapersPromise = fetchCancellable(
      'homepage-wallpapers',
      `${BASE_URL}/functions/v1/wallpapers-api`,
      {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          sort: 'popular',
          limit: 8,
          page: 1
        }),
        timeout: 15000, // 15s timeout for wallpapers
        retries: 1
      }
    )

    // Load featured collections - DIRECT DB QUERY pentru cover_image_url
    const collectionsPromise = (async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        
        // Query DIRECT la DB pentru a include EXPLICIT cover_image_url
        const { data: collections, error } = await supabase
          .from('collections')
          .select(`
            *,
            wallpapers:collection_wallpapers(
              wallpaper:wallpapers(
                thumbnail_url,
                image_url
              )
            )
          `)
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('sort_order', { ascending: true })
          .limit(1, { foreignTable: 'collection_wallpapers' })
        
        if (error) {
          console.error('[HomePage] Collections fetch error:', error)
          return []
        }
        
        // Transform data pentru a extrage wallpapers din nested structure
        return (collections || []).map(c => ({
          ...c,
          wallpapers: c.wallpapers?.map((cw: any) => cw.wallpaper).filter(Boolean) || []
        }))
      } catch (error) {
        console.error('[HomePage] Collections fetch failed:', error)
        return []
      }
    })()

    // Load featured wallpapers for hero carousel
    const featuredWallpapersPromise = fetchCancellable(
      'homepage-featured-wallpapers',
      `${BASE_URL}/functions/v1/wallpapers-api`,
      {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          sort: 'featured',
          limit: 5,
          page: 1,
          featured: true
        }),
        timeout: 15000,
        retries: 1
      }
    )

    // Load trending wallpapers
    const trendingWallpapersPromise = fetchCancellable(
      'homepage-trending-wallpapers',
      `${BASE_URL}/functions/v1/wallpapers-api`,
      {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          sort: 'trending',
          limit: 5,
          page: 1
        }),
        timeout: 15000,
        retries: 1
      }
    )

    // Process categories
    try {
      const categoriesResponse = await categoriesPromise
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json()
        const allCategories = categoriesResult.data || []
        setCategories(allCategories.slice(0, 8))
      } else {
        throw new Error(`Failed to load categories (${categoriesResponse.status})`)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logWarn('Categories request cancelled', { context: 'HomePage' })
        return
      }
      
      if (err instanceof ApiError) {
        logError('Categories API timeout', err, { context: 'HomePage', action: 'loadCategories' })
        setErrors(prev => ({ ...prev, categories: 'Request timed out. Please try again.' }))
      } else {
        logError('Categories load failed', err, { context: 'HomePage', action: 'loadCategories' })
        setErrors(prev => ({ ...prev, categories: err.message }))
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, categories: false }))
    }

    // Process wallpapers
    try {
      const wallpapersResponse = await wallpapersPromise
      
      if (wallpapersResponse.ok) {
        const wallpapersResult = await wallpapersResponse.json()
        
        // Defensive programming: Validate wallpapers data structure
        const validWallpapers = wallpapersResult.data?.wallpapers || []
        
        if (validWallpapers.length === 0) {
          console.warn('[HomePage] No wallpapers data received from API')
          setErrors(prev => ({ ...prev, wallpapers: 'No wallpapers available at this time' }))
        }
        
        setWallpapers(validWallpapers)
      } else {
        const errorText = await wallpapersResponse.text()
        console.error('[HomePage] Wallpapers API error response:', errorText)
        throw new Error(`Failed to load wallpapers (${wallpapersResponse.status}): ${errorText}`)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logWarn('Wallpapers request cancelled', { context: 'HomePage' })
        return
      }
      
      if (err instanceof ApiError) {
        logError('Wallpapers API timeout', err, { context: 'HomePage', action: 'loadWallpapers' })
        setErrors(prev => ({ ...prev, wallpapers: 'Request timed out. Please try again.' }))
      } else {
        logError('Wallpapers load failed', err, { context: 'HomePage', action: 'loadWallpapers' })
        setErrors(prev => ({ ...prev, wallpapers: err.message }))
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, wallpapers: false }))
    }

    // Process featured collections
    try {
      const collections = await collectionsPromise
      setFeaturedCollections(collections)
    } catch (err: any) {
      logError('Collections load failed', err, { context: 'HomePage', action: 'loadCollections' })
      setErrors(prev => ({ ...prev, collections: err.message }))
    } finally {
      setLoadingStates(prev => ({ ...prev, collections: false }))
    }

    // Process featured wallpapers for hero carousel
    try {
      const featuredWallpapersResponse = await featuredWallpapersPromise
      if (featuredWallpapersResponse.ok) {
        const featuredResult = await featuredWallpapersResponse.json()
        setFeaturedWallpapers(featuredResult.data?.wallpapers || [])
      } else {
        throw new Error(`Failed to load featured wallpapers (${featuredWallpapersResponse.status})`)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logWarn('Featured wallpapers request cancelled', { context: 'HomePage' })
        return
      }
      
      if (err instanceof ApiError) {
        logError('Featured wallpapers API timeout', err, { context: 'HomePage', action: 'loadFeaturedWallpapers' })
        setErrors(prev => ({ ...prev, featuredWallpapers: 'Request timed out. Please try again.' }))
      } else {
        logError('Featured wallpapers load failed', err, { context: 'HomePage', action: 'loadFeaturedWallpapers' })
        setErrors(prev => ({ ...prev, featuredWallpapers: err.message }))
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, featuredWallpapers: false }))
    }

    // Process trending wallpapers
    try {
      const trendingWallpapersResponse = await trendingWallpapersPromise
      if (trendingWallpapersResponse.ok) {
        const trendingResult = await trendingWallpapersResponse.json()
        setTrendingWallpapers(trendingResult.data?.wallpapers || [])
      } else {
        throw new Error(`Failed to load trending wallpapers (${trendingWallpapersResponse.status})`)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logWarn('Trending wallpapers request cancelled', { context: 'HomePage' })
        return
      }
      
      if (err instanceof ApiError) {
        logError('Trending wallpapers API timeout', err, { context: 'HomePage', action: 'loadTrendingWallpapers' })
        setErrors(prev => ({ ...prev, trendingWallpapers: 'Request timed out. Please try again.' }))
      } else {
        logError('Trending wallpapers load failed', err, { context: 'HomePage', action: 'loadTrendingWallpapers' })
        setErrors(prev => ({ ...prev, trendingWallpapers: err.message }))
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, trendingWallpapers: false }))
    }

    // Mark data as loaded
    setIsDataLoaded(true)
  }

  const retryLoad = () => {
    setLoadingStates({ 
      categories: false, 
      wallpapers: false, 
      collections: false, 
      featuredWallpapers: false,
      trendingWallpapers: false,
      initial: false 
    })
    setErrors({})
    setIsDataLoaded(false)
    loadDataParallel()
  }

  // Generate social media meta data
  const socialShareData = createWebsiteSocialShare(window.location.origin, {
    title: 'BestFreeWallpapers - Free HD Wallpapers & Desktop Backgrounds',
    description: 'Download thousands of free high-definition wallpapers and desktop backgrounds. 4K, HD, and mobile wallpapers in categories like nature, abstract, space, and more.',
    image: '/images/og-default.jpg',
    imageWidth: 1200,
    imageHeight: 630
  })

  // Generate structured data
  const structuredDataConfig = [
    structuredData.generateOrganization(),
    structuredData.generateWebsite(),
    structuredData.generateWebPage({
      name: 'BestFreeWallpapers - Free HD Wallpapers & Desktop Backgrounds',
      description: 'Download thousands of free high-definition wallpapers and desktop backgrounds. 4K, HD, and mobile wallpapers in categories like nature, abstract, space, and more.',
      url: window.location.href
    })
  ]

  // Generate sitemap data
  const sitemapUrls = sitemap.generateStaticPages()

  // Live wallpapers si ringtones - FIX: POST + apikey header corect
  const [liveWallpapers, setLiveWallpapers] = React.useState<any[]>([])
  const [ringtones, setRingtones] = React.useState<any[]>([])

  React.useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return

    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }

    // Live wallpapers — POST cu action: 'list'
    fetch(`${supabaseUrl}/functions/v1/live-wallpapers-api`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'list', pageSize: 2 })
    })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.wallpapers)) setLiveWallpapers(d.wallpapers) })
      .catch(() => {})

    // Ringtones — REST API direct ca sa avem cover_image_url
    fetch(`${supabaseUrl}/rest/v1/ringtones?select=id,title,slug,audio_url,cover_image_url,duration_seconds,tags,is_premium&order=created_at.desc&limit=4`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setRingtones(d)
      })
      .catch(() => {})
  }, [])

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('')
  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) navigate(`/free-wallpapers?q=${encodeURIComponent(searchQuery.trim())}`)
    else navigate('/free-wallpapers')
  }

  return (
    <>
      <PerformanceMonitor enabled={false} trackCoreWebVitals={false} trackCustomMetrics={false} sendToAnalytics={false} debugMode={false} onMetric={handlePerformanceMetric} />
      <BundleAnalyzer enabled={false} analyzeOnLoad={false} debugMode={false} onAnalysis={handleBundleAnalysis} />
      <LoadAnalyzer enabled={false} analyzeCriticalPath={false} detectSlowResources={false} debugMode={false} onLoadComplete={handleLoadAnalysis} />
      <SocialShare data={socialShareData} />
      <StructuredData type="custom" data={structuredDataConfig} />
      <SitemapGenerator urls={sitemapUrls} />

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>

        {/* 1. CATEGORY TABS */}
        <Suspense fallback={
          <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-white border-gray-100'} border-b h-16 flex items-center justify-center`}>
            <div className={`animate-pulse text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading navigation...</div>
          </div>
        }>
          <BestFreeWallpapersTabCategories onCategorySelect={(category) => { if (category === 'all') navigate('/free-wallpapers') }} />
        </Suspense>

        {/* 2. HERO */}
        <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: '480px' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          {featuredWallpapers[0]?.thumbnail_url && (
            <img src={featuredWallpapers[0].thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10" loading="eager" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-14">
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 bg-purple-600/80 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full">✓ Free to Download</span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-white/20">👑 Premium = No Ads</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
              Best Free Wallpapers<br className="hidden sm:block" />
              <span className="text-purple-400"> for Every Screen</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Download HD wallpapers, live wallpapers and ringtones for free. Watch a short ad to download, or go Premium for an ad-free experience.
            </p>
            <form onSubmit={handleHeroSearch} className="flex max-w-xl mx-auto mb-8 gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search wallpapers, ringtones, categories..." className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
              </div>
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3.5 rounded-xl font-semibold transition-all hover:scale-105 flex-shrink-0">Search</button>
            </form>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                { to: '/free-wallpapers', icon: ImageIcon, label: 'Browse Free\nWallpapers' },
                { to: '/mobile-wallpapers', icon: Smartphone, label: 'Mobile\nWallpapers' },
                { to: '/live-wallpapers', icon: Video, label: 'Live\nWallpapers' },
                { to: '/ringtones', icon: Music, label: 'Free\nRingtones' },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="flex flex-col items-center gap-2 bg-white/8 hover:bg-white/15 backdrop-blur-sm border border-white/15 hover:border-purple-500/50 rounded-xl px-3 py-3.5 transition-all duration-200 group">
                  <item.icon className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                  <span className="text-white text-xs font-medium text-center whitespace-pre-line leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3. EXPLORE — 7 carduri */}
        <section className={`py-12 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className={`text-2xl font-bold text-center mb-8 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Explore <span className="text-purple-500">BestFreeWallpapers</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { to: '/free-wallpapers', icon: ImageIcon, label: 'Free Wallpapers', desc: 'Thousands of HD & 4K wallpapers', color: 'text-purple-400' },
                { to: '/mobile-wallpapers', icon: Smartphone, label: 'Mobile Wallpapers', desc: '9:16 mobile wallpapers', color: 'text-blue-400' },
                { to: '/live-wallpapers', icon: Video, label: 'Live Wallpapers', desc: 'Stunning live wallpapers', color: 'text-green-400' },
                { to: '/ringtones', icon: Music, label: 'Ringtones', desc: 'Free MP3 ringtones', color: 'text-pink-400' },
                { to: '/categories', icon: Tag, label: 'Categories', desc: 'Browse by theme', color: 'text-yellow-400' },
                { to: '/collections', icon: Layers, label: 'Collections', desc: 'Curated collections', color: 'text-orange-400' },
                { to: '/premium', icon: Crown, label: 'Premium', desc: 'No ads, 4K quality', color: 'text-amber-400' },
              ].map((item) => (
                <Link key={item.to} to={item.to} className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-200 group hover:scale-105 ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border hover:border-purple-500/50' : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}>
                  <item.icon className={`w-8 h-8 ${item.color} mb-3 group-hover:scale-110 transition-transform`} />
                  <span className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.label}</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} leading-tight hidden lg:block mb-2`}>{item.desc}</span>
                  <span className={`text-xs px-3 py-1 rounded-full border font-medium ${theme === 'dark' ? 'border-gray-600 text-gray-300 group-hover:border-purple-500 group-hover:text-purple-400' : 'border-gray-300 text-gray-600 group-hover:border-purple-400 group-hover:text-purple-600'}`}>Explore</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 4. 3 COLOANE — Popular | Live | Ringtones */}
        <section className={`py-12 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Popular Wallpapers — EnhancedWallpaperCardAdapter pentru URL CDN corect */}
              <div className={`rounded-xl p-5 border ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Popular Mobile Wallpapers</h3>
                {wallpapers.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {wallpapers.slice(0, 6).map((wallpaper: any, index: number) => (
                      <WallpaperErrorBoundary key={wallpaper.id}>
                        <div className="overflow-hidden rounded-lg">
                          <EnhancedWallpaperCardAdapter wallpaper={wallpaper} variant="compact" priority={index === 0} />
                        </div>
                      </WallpaperErrorBoundary>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[...Array(6)].map((_, i) => <div key={i} className={`rounded-lg animate-pulse ${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-100'}`} style={{ aspectRatio: '9/16' }} />)}
                  </div>
                )}
                <Link to="/free-wallpapers" className="block text-center text-sm font-medium text-purple-500 hover:text-purple-400 border border-purple-500/30 rounded-lg py-2 hover:bg-purple-500/10 transition-all">View All Wallpapers →</Link>
              </div>

              {/* Live Wallpapers — date reale cu POST corect */}
              <div className={`rounded-xl p-5 border ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Live Wallpapers</h3>
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Bring your screen to life with beautiful live wallpapers.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {liveWallpapers.length > 0 ? (
                    liveWallpapers.slice(0, 2).map((w: any, i: number) => (
                      <Link key={w.id || i} to="/live-wallpapers" className="relative rounded-xl overflow-hidden group block bg-black" style={{ aspectRatio: '9/16' }}>
                        {w.video_url ? (
                          <video
                            src={w.video_url}
                            className="w-full h-full object-cover opacity-90"
                            muted
                            playsInline
                            preload="metadata"
                            loop
                            onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}) }}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                          />
                        ) : (
                          <div style={{ background: i === 0 ? 'linear-gradient(135deg,#1a1a2e,#0f3460)' : 'linear-gradient(135deg,#2d1b69,#38ef7d)' }} className="w-full h-full" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity pointer-events-none">
                          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"><Play className="w-5 h-5 text-white ml-0.5" /></div>
                        </div>
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</div>
                        {w.title && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pointer-events-none">
                            <p className="text-white text-xs font-medium truncate">{w.title}</p>
                          </div>
                        )}
                      </Link>
                    ))
                  ) : (
                    [...Array(2)].map((_, i) => (
                      <Link key={i} to="/live-wallpapers" className="relative rounded-xl overflow-hidden group flex items-center justify-center" style={{ aspectRatio: '9/16', background: i === 0 ? 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)' : 'linear-gradient(135deg,#2d1b69,#11998e,#38ef7d)' }}>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"><Play className="w-5 h-5 text-white ml-0.5" /></div>
                          <span className="text-white text-xs opacity-70">Live</span>
                        </div>
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</div>
                      </Link>
                    ))
                  )}
                </div>
                <Link to="/live-wallpapers" className="block text-center text-sm font-medium text-purple-500 hover:text-purple-400 border border-purple-500/30 rounded-lg py-2 hover:bg-purple-500/10 transition-all">Explore Live Wallpapers →</Link>
              </div>

              {/* Ringtones — carduri cu imagine ca pe pagina de ringtones */}
              <div className={`rounded-xl p-5 border ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Free Ringtones</h3>
                <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Download free MP3 ringtones for your phone.</p>

                {/* Carduri cu imagine — layout ca pe pagina de ringtones */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {(ringtones.length > 0 ? ringtones : [
                    { title: 'Latin Trap Drop Ringtone', duration_seconds: 28, cover_image_url: null },
                    { title: 'Deep Pulse', duration_seconds: 30, cover_image_url: 'https://cdn2.suno.ai/image_large_5c790486-9b9d-4cdb-beb4-519a6a689e31.jpeg' },
                  ]).slice(0, 2).map((r: any, i: number) => {
                    const secs = r.duration_seconds || 0
                    const dur = secs ? `0:${String(secs).padStart(2, '0')}` : ''
                    return (
                      <Link key={r.id || i} to="/ringtones" className="relative group rounded-xl overflow-hidden block" style={{ aspectRatio: '1' }}>
                        {/* Background: imagine sau gradient */}
                        {r.cover_image_url ? (
                          <img src={r.cover_image_url} alt={r.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className={`absolute inset-0 ${i % 2 === 0 ? 'bg-gradient-to-br from-green-600 to-teal-700' : 'bg-gradient-to-br from-purple-700 to-indigo-800'}`}>
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-12 h-12 text-white/30" />
                            </div>
                          </div>
                        )}
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
                        {/* Play button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-purple-600/80 transition-all">
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          </div>
                        </div>
                        {/* Duration badge */}
                        {dur && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">{dur}</div>
                        )}
                        {/* MP3 badge */}
                        <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs font-bold px-2 py-0.5 rounded backdrop-blur-sm">MP3</div>
                        {/* Title */}
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-white text-xs font-semibold truncate leading-tight">{r.title}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {/* Lista pentru restul */}
                {ringtones.length > 2 && (
                  <div className="space-y-2 mb-3">
                    {ringtones.slice(2, 4).map((r: any, i: number) => {
                      const secs = r.duration_seconds || 0
                      const dur = secs ? `0:${String(secs).padStart(2, '0')}` : '—'
                      return (
                        <Link key={r.id || i} to="/ringtones" className={`flex items-center gap-3 p-2 rounded-lg border transition-all hover:border-purple-500/50 ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                            <Play className="w-3 h-3 text-purple-500 ml-0.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{r.title}</div>
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{dur}</div>
                          </div>
                          <span className="text-xs text-purple-400 font-bold flex-shrink-0">MP3</span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                <Link to="/ringtones" className="block text-center text-sm font-medium text-purple-500 hover:text-purple-400 border border-purple-500/30 rounded-lg py-2 hover:bg-purple-500/10 transition-all">Browse Ringtones →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 2 COLOANE — Categories | Collections */}
        <section className={`py-12 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Categorii — FIX: preview_wallpaper_image_url || preview_image */}
              <div>
                <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Explore Wallpaper Categories</h3>
                {categories.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {categories.slice(0, 8).map((cat: any) => {
                      const catImg = cat.preview_wallpaper_image_url || cat.preview_image || null
                      return (
                        <Link key={cat.id} to={`/category/${cat.slug}`} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border hover:border-purple-500/50' : 'bg-gray-50 border-gray-200 hover:border-purple-300'}`}>
                          {catImg ? (
                            <img src={catImg} alt={cat.name} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                          ) : (
                            <Tag className="w-6 h-6 text-purple-400" />
                          )}
                          <span className={`text-xs font-medium text-center leading-tight ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => <div key={i} className={`rounded-xl animate-pulse h-20 ${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-100'}`} />)}
                  </div>
                )}
                <Link to="/categories" className="mt-4 block text-center text-sm font-medium text-purple-500 hover:text-purple-400 border border-purple-500/30 rounded-lg py-2 hover:bg-purple-500/10 transition-all">All Categories →</Link>
              </div>

              {/* Colectii — cover_image_url din R2 */}
              <div>
                <h3 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Curated Wallpaper Collections</h3>
                {featuredCollections.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                    {featuredCollections.slice(0, 5).map((col: any) => (
                      <Link key={col.id} to={`/collections/${col.slug}`} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 text-center ${theme === 'dark' ? 'bg-dark-tertiary border-dark-border hover:border-purple-500/50' : 'bg-gray-50 border-gray-200 hover:border-purple-300'}`}>
                        {col.cover_image_url ? (
                          <img src={col.cover_image_url} alt={col.name} className="w-12 h-12 rounded-xl object-cover" loading="lazy" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center"><Layers className="w-6 h-6 text-purple-400" /></div>
                        )}
                        <span className={`text-xs font-medium leading-tight ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{col.name}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {[...Array(5)].map((_, i) => <div key={i} className={`rounded-xl animate-pulse h-24 ${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-100'}`} />)}
                  </div>
                )}
                <Link to="/collections" className="block text-center text-sm font-medium text-purple-500 hover:text-purple-400 border border-purple-500/30 rounded-lg py-2 hover:bg-purple-500/10 transition-all">View All Collections →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* 6. ABOUT + WHY CHOOSE US */}
        <section className={`py-12 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className={`text-xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>About <span className="text-purple-500">BestFreeWallpapers</span></h3>
                <p className={`text-sm leading-relaxed mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>BestFreeWallpapers offers free high-quality wallpapers for mobile phones, desktops, tablets, and 4K displays. Discover live wallpapers and free MP3 ringtones for calls, notifications, and alarms.</p>
                <div className="flex gap-8">
                  <div className="text-center"><div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{wallpapers.length > 0 ? `${wallpapers.length}+` : '17+'}</div><div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Wallpapers</div></div>
                  <div className="text-center"><div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{categories.length || '—'}+</div><div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Categories</div></div>
                  <div className="text-center"><div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Free</div><div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Always</div></div>
                </div>
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Why Choose Us</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Download, label: 'Download (watch ad)', color: 'text-green-400' },
                    { icon: Smartphone, label: 'Mobile 9:16', color: 'text-blue-400' },
                    { icon: Video, label: 'Live wallpapers', color: 'text-purple-400' },
                    { icon: Music, label: 'Free ringtones', color: 'text-pink-400' },
                    { icon: Zap, label: 'Fast browsing', color: 'text-yellow-400' },
                    { icon: Tag, label: 'Curated categories', color: 'text-orange-400' },
                  ].map((item, i) => (
                    <div key={i} className={`flex flex-col items-center gap-2 p-3 rounded-xl text-center border ${theme === 'dark' ? 'bg-dark-secondary border-dark-border' : 'bg-white border-gray-200'}`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                      <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. FAQ */}
        <Suspense fallback={<div className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} flex items-center justify-center`}><div className={`animate-pulse text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading FAQ...</div></div>}>
          <BestFreeWallpapersFAQ />
        </Suspense>

      </div>
    </>
  )
}

class HomePageErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: any) { console.error('[HomePage] Error:', error?.message || 'Unknown error') }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Page Loading Issue</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Please refresh the page to try again.</p>
            <button onClick={() => window.location.reload()} className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Refresh Page</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function HomePage() {
  return (
    <HomePageErrorBoundary>
      <SEOMetadataProvider>
        <HomePageContent />
      </SEOMetadataProvider>
    </HomePageErrorBoundary>
  )
}

export default HomePage
