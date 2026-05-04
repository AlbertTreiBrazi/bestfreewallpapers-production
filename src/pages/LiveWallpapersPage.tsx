// ============================================================================
// 🎬 LiveWallpapersPage.tsx — Pagina principală /live-wallpapers
// ============================================================================
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Video, Search, Sparkles } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { useLiveWallpapers } from '@/hooks/useLiveWallpapers'
import { LiveWallpaperCard } from '@/components/livewallpapers/LiveWallpaperCard'

type SortOption = 'newest' | 'popular' | 'downloads'

export function LiveWallpapersPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput)
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  )

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (sort !== 'newest') params.set('sort', sort)
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, sort, setSearchParams])

  const { wallpapers, loading, loadingMore, error, hasMore, total, loadMore } = useLiveWallpapers({
    search: debouncedSearch,
    sort,
  })

  return (
    <>
      <SEOHead
        config={{
          title: 'Live Wallpapers — Animated HD Wallpapers | BestFreeWallpapers',
          description: 'Download stunning free live wallpapers and animated backgrounds for your phone. AI-generated HD video wallpapers, updated weekly.',
          url: 'https://bestfreewallpapers.com/live-wallpapers',
          type: 'website',
        }}
      />

      <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>

        {/* Hero */}
        <div className="bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 text-white py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Video className="w-8 h-8" />
              <h1 className="text-3xl md:text-4xl font-bold">Live Wallpapers</h1>
              <Sparkles className="w-8 h-8" />
            </div>
            <p className="text-purple-200 text-lg mb-2">
              Animated HD wallpapers for your phone — free download
            </p>
            <p className={`text-sm ${total > 0 ? 'text-purple-300' : 'hidden'}`}>
              {total} live wallpapers available
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Search + Sort bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {/* Search */}
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search live wallpapers..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-400'
                }`}
              />
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className={`px-4 py-2.5 rounded-xl border text-sm outline-none ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="downloads">Most Downloaded</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="text-center py-12 text-red-400">
              <p>Failed to load live wallpapers. Please try again.</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <div className="aspect-[9/16] animate-pulse bg-gray-300 dark:bg-gray-700" />
                  <div className="p-3 space-y-2">
                    <div className={`h-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-300'} w-3/4 animate-pulse`} />
                    <div className={`h-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-300'} w-1/2 animate-pulse`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && wallpapers.length === 0 && (
            <div className="text-center py-20">
              <Video className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                No live wallpapers yet
              </h2>
              <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Check back soon — new live wallpapers are added weekly!
              </p>
            </div>
          )}

          {/* Grid */}
          {!loading && wallpapers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {wallpapers.map(w => (
                <LiveWallpaperCard key={w.id} wallpaper={w} />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <div className="text-center mt-10">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-60"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default LiveWallpapersPage
