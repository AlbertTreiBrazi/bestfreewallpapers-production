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
import { LazyImage } from '@/components/common/LazyImage'

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
      return <div>Sorry, something went wrong loading wallpapers.</div>
    }
    return this.props.children
  }
}

// Lazy load heavy components - All enhanced components are loaded lazily
const BestFreeWallpapersTabCategories = lazy(() => import('@/components/category/BestFreeWallpapersTabCategories'))
const BestFreeWallpapersFAQ = lazy(() => import('@/components/faq/BestFreeWallpapersFAQ'))

interface Collection {
  id: string
  name: string
  description?: string
  slug: string
  wallpaper_count?: number
  cover_image?: string | null
  is_featured?: boolean
  display_order?: number
  created_at?: string
}

interface CollectionCardProps {
  collection: Collection
}

// Collection Card Component (same as in CollectionPage)
const CollectionCard: React.FC<CollectionCardProps> = ({ collection }) => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [imageLoaded, setImageLoaded] = React.useState(false)

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleClick = () => {
    navigate(`/collection/${collection.slug}`)
  }

  const coverImage = collection.cover_image
    ? (collection.cover_image.startsWith('http') 
        ? collection.cover_image 
        : getApiImageUrl(collection.cover_image))
    : null

  return (
    <button
      onClick={handleClick}
      className="v-group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
      aria-label={`View ${collection.name} collection`}
    >
      <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-900 overflow-hidden">
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
          width={384}
          height={216}
          loading="lazy"
          priority={false}
          onLoad={handleImageLoad}
        />
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 text-left">{collection.name}</h3>
        {collection.description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4 text-left">
            {collection.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Eye className="w-4 h-4" />
            <span>{collection.wallpaper_count || 0} wallpapers</span>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 v-group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  )
}

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [collections, setCollections] = React.useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = React.useState(true)
  const [collectionsError, setCollectionsError] = React.useState<string | null>(null)
  const cancellableRequest = useCancellableRequest()

  // Update metadata for home page
  const updateMetadata = useUpdateMetadata()
  
  React.useEffect(() => {
    updateMetadata({
      title: 'Best Free Wallpapers - HD Desktop & Mobile Backgrounds 2026',
      description: 'Discover thousands of high-quality free wallpapers in HD, 4K, and 8K. Download stunning desktop and mobile wallpapers featuring nature, abstract art, minimalism, and more.',
      keywords: 'free wallpapers, HD wallpapers, 4K wallpapers, desktop backgrounds, mobile wallpapers, nature wallpapers, abstract wallpapers, minimalist wallpapers, best wallpapers 2026',
      ogType: 'website',
      twitterCard: 'summary_large_image'
    })
  }, [updateMetadata])

  // Fetch collections on mount
  React.useEffect(() => {
    const fetchCollections = async () => {
      try {
        setCollectionsLoading(true)
        const result = await cancellableRequest(
          getCollections({ 
            limit: 4,
            is_featured: true 
          })
        )
        if (result?.data?.collections) {
          setCollections(result.data.collections)
        }
        setCollectionsError(null)
      } catch (error) {
        if (error instanceof ApiError) {
          logError('Failed to fetch collections', error, { 
            context: 'HomePage',
            statusCode: error.statusCode
          })
          setCollectionsError(error.message)
        } else {
          logError('Unexpected error fetching collections', error as Error, { 
            context: 'HomePage' 
          })
          setCollectionsError('An unexpected error occurred')
        }
      } finally {
        setCollectionsLoading(false)
      }
    }

    fetchCollections()
  }, [cancellableRequest])

  const websiteShare = React.useMemo(
    () => createWebsiteSocialShare({
      title: 'Best Free Wallpapers - HD Desktop & Mobile Backgrounds 2026',
      description: 'Discover thousands of stunning free wallpapers in HD, 4K, and 8K resolution.',
      url: 'https://bestfreewallpapers.com',
      image: 'https://bestfreewallpapers.com/og-image.jpg'
    }),
    []
  )

  return (
    <SEOMetadataProvider
      title="Best Free Wallpapers - HD Desktop & Mobile Backgrounds 2026"
      description="Discover thousands of high-quality free wallpapers in HD, 4K, and 8K. Download stunning desktop and mobile wallpapers featuring nature, abstract art, minimalism, and more."
      keywords="free wallpapers, HD wallpapers, 4K wallpapers, desktop backgrounds, mobile wallpapers, nature wallpapers, abstract wallpapers, minimalist wallpapers, best wallpapers 2026"
      canonicalUrl="https://bestfreewallpapers.com"
      ogType="website"
      twitterCard="summary_large_image"
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Structured Data for SEO */}
        <StructuredData
          type="Organization"
          data={{
            name: 'Best Free Wallpapers',
            url: 'https://bestfreewallpapers.com',
            logo: 'https://bestfreewallpapers.com/logo.png',
            sameAs: [
              'https://twitter.com/bestfreewalls',
              'https://facebook.com/bestfreewallpapers'
            ]
          }}
        />

        {/* Social Share Buttons */}
        <SocialShare data={websiteShare} />

        {/* Performance Monitoring */}
        <PerformanceMonitor />
        <BundleAnalyzer />
        <LoadAnalyzer />

        {/* Sitemap Generator */}
        <SitemapGenerator />

        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20" />
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Best Free Wallpapers
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Discover thousands of stunning HD, 4K, and 8K wallpapers for your desktop and mobile devices
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/free-wallpapers"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  Browse Free Wallpapers
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <Link
                  to="/premium"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-purple-600 dark:hover:border-purple-500 hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Go Premium
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Categories
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Browse wallpapers by category
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              }
            >
              <BestFreeWallpapersTabCategories />
            </Suspense>
          </div>
        </section>

        {/* Popular Wallpapers Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Popular Wallpapers
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Discover the most downloaded and loved wallpapers
              </p>
            </div>

            <WallpaperErrorBoundary>
              <TrendingNowSection />
            </WallpaperErrorBoundary>

            <div className="text-center mt-12">
              <Link
                to="/free-wallpapers"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
              >
                View All Wallpapers
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Collections Section */}
        {collections.length > 0 && (
          <section className="py-16 bg-white dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Featured Collections
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Curated wallpaper collections for every style and mood
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>

              <div className="text-center mt-12">
                <Link
                  to="/collections"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
                >
                  View All Collections
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Specialized Collections Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Specialized Collections
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                AI-generated and mobile-optimized wallpapers for modern devices
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Wallpapers Card */}
              <Link
                to="/ai-wallpapers"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                    🤖 AI Wallpapers
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Generated with artificial intelligence</h3>
                  <p className="text-white/90 mb-6">
                    🆕 New Collection<br />
                    Discover stunning wallpapers created by AI, featuring abstract art, futuristic landscapes, and unique designs that push the boundaries of digital creativity.
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    🔥 Cutting-edge
                    <span className="mx-2">•</span>
                    4K • 8K
                  </div>
                </div>
                <ArrowRight className="absolute bottom-8 right-8 w-8 h-8 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
              </Link>

              {/* Mobile Wallpapers Card */}
              <Link
                to="/mobile-wallpapers"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 to-orange-600 p-8 text-white hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4">
                    📱 Mobile Wallpapers
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Optimized for all mobile devices</h3>
                  <p className="text-white/90 mb-6">
                    ✅ iPhone & Android<br />
                    Perfectly sized wallpapers for iPhone, Samsung Galaxy, Google Pixel, and all Android devices. Portrait orientation, sharp and vibrant.
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    📲 All Devices
                    <span className="mx-2">•</span>
                    Mobile • Portrait
                  </div>
                </div>
                <ArrowRight className="absolute bottom-8 right-8 w-8 h-8 opacity-50 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
              </Link>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose Our Best Free Wallpapers?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                We provide the highest quality free wallpapers that transform your screens into works of art
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <Download className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Free HD Downloads</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Download the best free wallpapers instantly with just one click. No cost, no registration required.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                  <Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Best Quality Wallpapers</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  All wallpapers are carefully selected and available in HD, 4K, and 8K resolutions for crystal-clear quality.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full mb-4">
                  <Crown className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Premium Collection</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Access exclusive premium wallpapers with our subscription for the ultimate experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Explore Categories Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Explore Categories
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Discover wallpapers that match your style and interests
              </p>
            </div>

            <WallpaperErrorBoundary>
              <EnhancedCategorySection />
            </WallpaperErrorBoundary>

            <div className="text-center mt-12">
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full font-semibold hover:border-blue-600 dark:hover:border-blue-500 transition-colors"
              >
                All Categories
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Browse Wallpapers CTA */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Link
              to="/free-wallpapers"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Browse Wallpapers
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Best Free Wallpapers FAQ
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Everything you need to know about downloading the best free wallpapers
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              }
            >
              <BestFreeWallpapersFAQ />
            </Suspense>
          </div>
        </section>
      </div>
    </SEOMetadataProvider>
  )
}

export default HomePage
