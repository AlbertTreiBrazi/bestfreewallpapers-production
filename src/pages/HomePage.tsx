import React, { Suspense, lazy } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { Crown, Download, Eye, ArrowRight, Calendar } from 'lucide-react'

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
  const [coverImage, setCoverImage] = React.useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageError, setImageError] = React.useState(false)

  // Get cover image with fallback hierarchy
  React.useEffect(() => {
    const loadCoverImage = async () => {
      try {
        // Import the helper function dynamically
        const { getCollectionCoverImage } = await import('@/lib/getCollections')
        const imageUrl = getCollectionCoverImage(collection)
        
        
        // Set the image URL and reset states
        setCoverImage(imageUrl)
        setImageLoaded(false)
        setImageError(false)
      } catch (error) {
        console.error('Error loading collection cover image:', error)
        setCoverImage('/images/placeholders/collection.svg')
        setImageError(true)
      }
    }
    
    loadCoverImage()
  }, [collection])

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
      <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {!imageLoaded ? (
          // Skeleton loader
          <div className={`absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center animate-pulse z-10`}>
            <Calendar className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
        ) : null}
        
        <LazyImage
          src={coverImage || '/images/placeholders/collection.svg'}
          alt={`${collection.name} preview`}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          width={384} // 16:9 aspect ratio with reasonable width
          height={216}
          loading="lazy"
          priority={false}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
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

    // Load featured collections using the cached helper
    const collectionsPromise = getCollections().then(collections => 
      collections.filter(collection => collection.is_featured)
    )

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
        setCategories(allCategories.slice(0, 6))
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

  return (
    <>
      {/* Performance Monitoring Components - DISABLED to prevent 405 errors */}
      <PerformanceMonitor
        enabled={false}
        trackCoreWebVitals={false}
        trackCustomMetrics={false}
        sendToAnalytics={false}
        debugMode={false}
        onMetric={handlePerformanceMetric}
      />
      
      <BundleAnalyzer
        enabled={false}
        analyzeOnLoad={false}
        debugMode={false}
        onAnalysis={handleBundleAnalysis}
      />
      
      <LoadAnalyzer
        enabled={false}
        analyzeCriticalPath={false}
        detectSlowResources={false}
        debugMode={false}
        onLoadComplete={handleLoadAnalysis}
      />

      {/* SEO Components */}
      <SocialShare data={socialShareData} />
      <StructuredData type="custom" data={structuredDataConfig} />
      <SitemapGenerator urls={sitemapUrls} />

      <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        
        {/* Category Tabs - Lazy loaded */}
        <Suspense fallback={
          <div className={`${theme === 'dark' ? 'bg-dark-primary border-dark-border' : 'bg-white border-gray-100'} border-b h-16 flex items-center justify-center`}>
            <div className={`animate-pulse text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading navigation...
            </div>
          </div>
        }>
          <BestFreeWallpapersTabCategories
            onCategorySelect={(category) => {
              if (category === 'all') {
                navigate('/free-wallpapers')
              }
            }}
          />
        </Suspense>

        {/* Popular Wallpapers Section - Moved directly under Categories: All */}
        <section className={`py-16 mt-8 md:mt-10 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`} style={{ minHeight: '600px' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 md:mb-8">
              <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
                Popular Wallpapers
              </h2>
              <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} px-4`}>
                Discover the most downloaded and loved wallpapers
              </p>
            </div>
            
            {errors.wallpapers ? (
              <div className="text-center py-8">
                <p className={`mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  Failed to load wallpapers: {errors.wallpapers}
                </p>
                <button
                  onClick={retryLoad}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : wallpapers.length > 0 ? (
              <ErrorBoundary boundaryName="wallpapers-grid">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {wallpapers
                    .filter(wallpaper => wallpaper && wallpaper.id && wallpaper.title) // Filter out invalid wallpapers
                    .map((wallpaper, index) => (
                      <WallpaperErrorBoundary key={`wallpaper-${wallpaper.id}`}>
                        <EnhancedWallpaperCardAdapter
                          wallpaper={wallpaper}
                          variant="compact"
                          priority={index === 0}
                        />
                      </WallpaperErrorBoundary>
                    ))}
                </div>
              </ErrorBoundary>
            ) : (!isDataLoaded ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-100'} rounded-lg aspect-[3/4] animate-pulse`}></div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} mb-4`}>
                  <Eye className="w-16 h-16 mx-auto" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  No wallpapers found
                </h3>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Popular wallpapers will appear here as they become available.
                </p>
              </div>
            ))}
            
            <div className="text-center mt-12">
              <button
                onClick={() => {
                  navigate('/free-wallpapers');
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 100);
                }}
                className="inline-flex items-center space-x-2 bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition duration-200"
              >
                <span>View All Wallpapers</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Featured Collections Section - Moved to position 6 as per user requirements */}
{featuredCollections.length > 0 || !errors.collections ? (
  <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`} style={{ minHeight: '500px' }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
          Featured Collections
        </h2>
        <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} px-4`}>
          Curated wallpaper collections for every style and mood
        </p>
      </div>
      
      {errors.collections ? (
        <div className="text-center py-8">
          <p className={`mb-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
            Failed to load collections: {errors.collections}
          </p>
          <button
            onClick={retryLoad}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featuredCollections.length > 0 ? (
            featuredCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} theme={theme} />
            ))
          ) : (
            // Show skeleton placeholders while loading
            [...Array(4)].map((_, i) => (
              <div key={i} className={`${theme === 'dark' ? 'bg-dark-tertiary' : 'bg-gray-100'} rounded-xl overflow-hidden animate-pulse`}>
                <div className="relative aspect-[16/9] bg-gray-300"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="text-center mt-12">
        <Link
          to="/collections"
          className="inline-flex items-center space-x-2 bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition duration-200"
        >
          <span>View All Collections</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  </section>
) : null}


        {/* AI & Mobile Wallpapers Section */}
        <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`} style={{ minHeight: '400px' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
                Specialized Collections
              </h2>
              <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} px-4`}>
                AI-generated and mobile-optimized wallpapers for modern devices
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* AI Wallpapers Card */}
              <Link
                to="/ai-wallpapers"
                className={`group ${theme === 'dark' ? 'bg-dark-tertiary hover:bg-dark-secondary' : 'bg-white hover:bg-gray-50'} rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border ${theme === 'dark' ? 'border-dark-border' : 'border-gray-200'}`}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">🤖</div>
                      <h3 className="text-2xl font-bold mb-1">AI Wallpapers</h3>
                      <p className="text-sm opacity-90">Generated with artificial intelligence</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between text-white text-sm">
                      <span>🆕 New Collection</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                    Discover stunning wallpapers created by AI, featuring abstract art, futuristic landscapes, and unique designs that push the boundaries of digital creativity.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
                      🔥 Cutting-edge
                    </span>
                    <span className="text-gray-400 text-sm">4K • 8K</span>
                  </div>
                </div>
              </Link>

              {/* Mobile Wallpapers Card */}
              <Link
                to="/mobile-wallpapers"
                className={`group ${theme === 'dark' ? 'bg-dark-tertiary hover:bg-dark-secondary' : 'bg-white hover:bg-gray-50'} rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border ${theme === 'dark' ? 'border-dark-border' : 'border-gray-200'}`}
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">📱</div>
                      <h3 className="text-2xl font-bold mb-1">Mobile Wallpapers</h3>
                      <p className="text-sm opacity-90">Optimized for all mobile devices</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between text-white text-sm">
                      <span>✅ iPhone & Android</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                    Perfectly sized wallpapers for iPhone, Samsung Galaxy, Google Pixel, and all Android devices. Portrait orientation, sharp and vibrant.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}>
                      📲 All Devices
                    </span>
                    <span className="text-gray-400 text-sm">Mobile • Portrait</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>



        {/* Trending Now Section */}
        <TrendingNowSection 
          wallpapers={trendingWallpapers} 
          loading={loadingStates.trendingWallpapers}
        />

        {/* Why Choose Us Section - Static content, always render */}
        <section className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} transition-colors duration-200`} style={{ minHeight: '500px' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 px-2`}>
                Why Choose Our Best Free Wallpapers?
              </h2>
              <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-3xl mx-auto px-4`}>
                We provide the highest quality free wallpapers that transform your screens into works of art
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Download className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                </div>
                <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Free HD Downloads
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Download the best free wallpapers instantly with just one click. No cost, no registration required.
                </p>
              </div>
              
              <div className="text-center">
                <div className={`${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Eye className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`} />
                </div>
                <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Best Quality Wallpapers
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  All wallpapers are carefully selected and available in HD, 4K, and 8K resolutions for crystal-clear quality.
                </p>
              </div>
              
              <div className="text-center">
                <div className={`${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Crown className={`w-8 h-8 ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`} />
                </div>
                <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Premium Collection
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Access exclusive premium wallpapers with our subscription for the ultimate experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Categories Section */}
        <EnhancedCategorySection 
          categories={categories} 
          loading={loadingStates.categories}
        />

        {/* FAQ Section - Lazy loaded */}
        <Suspense fallback={
          <div className={`py-16 ${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} flex items-center justify-center`}>
            <div className={`animate-pulse text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading FAQ...
            </div>
          </div>
        }>
          <BestFreeWallpapersFAQ />
        </Suspense>
      </div>
    </>
  )
}

// Simplified error boundary to avoid React error handling issues
class HomePageErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Simple console log only - avoid complex error logging
    console.error('[HomePage] Error:', error?.message || 'Unknown error')
    console.error('[HomePage] Stack:', errorInfo?.componentStack?.substring(0, 200) || 'No stack')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Page Loading Issue
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Main exported component
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
