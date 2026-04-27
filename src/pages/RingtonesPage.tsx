// ============================================================================
// 🎵 RingtonesPage.tsx — Pagina principală /ringtones
// ============================================================================
// Listing principal cu:
//   - Hero section
//   - Search bar (debounced 300ms)
//   - Filtre categorii (genre, mood, use_case, free only)
//   - Sort dropdown (newest, popular, downloads)
//   - Grid responsive cu RingtoneCard
//   - Load more button
// ============================================================================

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Music2, Search, Sparkles } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { useRingtones } from '@/hooks/useRingtones'
import { RingtoneGrid } from '@/components/ringtones/RingtoneGrid'
import { CategoryFilter, type FilterState } from '@/components/ringtones/CategoryFilter'

type SortOption = 'newest' | 'popular' | 'downloads'

export function RingtonesPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()

  // Search state with debouncing
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    genre: searchParams.get('genre') || undefined,
    mood: searchParams.get('mood') || undefined,
    useCase: searchParams.get('use_case') || undefined,
    onlyFree: searchParams.get('free') === 'true',
  })

  // Sort state
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  )

  // Sync URL params when filters change (so users can share/bookmark)
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (filters.genre) params.set('genre', filters.genre)
    if (filters.mood) params.set('mood', filters.mood)
    if (filters.useCase) params.set('use_case', filters.useCase)
    if (filters.onlyFree) params.set('free', 'true')
    if (sort !== 'newest') params.set('sort', sort)
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, filters, sort, setSearchParams])

  // Fetch ringtones with current filters
  const {
    ringtones,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    total,
  } = useRingtones({
    genre: filters.genre,
    mood: filters.mood,
    useCase: filters.useCase,
    onlyFree: filters.onlyFree,
    search: debouncedSearch,
    sort,
    pageSize: 24,
  })

  // SEO
  const seoConfig = {
    title: 'Free Ringtones - HD MP3 Downloads | BestFreeWallpapers',
    description:
      'Download free high-quality ringtones for your phone. Choose from rock, pop, jazz, classical, electronic, and more genres. All ringtones max 30 seconds, perfect for calls, notifications, and alarms.',
    keywords: [
      'free ringtones',
      'ringtone download',
      'mp3 ringtones',
      'phone ringtones',
      'notification sounds',
      'alarm tones',
      'mobile ringtones',
      'AI ringtones',
    ],
    image: '/images/og-ringtones.jpg',
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <SEOHead config={seoConfig} />

      {/* Hero Section */}
      <div
        className={`${
          isDark ? 'bg-gradient-to-b from-purple-950 to-dark-primary' : 'bg-gradient-to-b from-blue-50 to-gray-50'
        } border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Generated Music</span>
            </div>

            <h1
              className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Free Ringtones for Your Phone
            </h1>

            <p
              className={`text-base sm:text-lg mb-6 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              High-quality MP3 ringtones, max 30 seconds. Perfect for calls,
              notifications, and alarms. New tones added regularly.
            </p>

            {/* Search bar */}
            <div className="relative max-w-xl mx-auto">
              <Search
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              />
              <input
                type="text"
                placeholder="Search ringtones by name, mood, or style..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  isDark
                    ? 'bg-gray-800 text-white border border-gray-700 placeholder-gray-500'
                    : 'bg-white text-gray-900 border border-gray-200 placeholder-gray-400 shadow-md'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters bar */}
        <div className="mb-6">
          <CategoryFilter filters={filters} onChange={setFilters} />
        </div>

        {/* Results header: count + sort */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {loading && ringtones.length === 0
              ? 'Loading…'
              : total > 0
                ? `${total} ringtone${total === 1 ? '' : 's'} available`
                : ''}
          </p>

          <div className="flex items-center gap-2">
            <Music2 className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className={`text-sm rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? 'bg-gray-800 text-white border-gray-700'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            >
              <option value="newest">Newest first</option>
              <option value="popular">Most popular</option>
              <option value="downloads">Most downloads</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <RingtoneGrid
          ringtones={ringtones}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          hasMore={hasMore}
          onLoadMore={loadMore}
          emptyMessage={
            debouncedSearch || filters.genre || filters.mood || filters.useCase
              ? 'No ringtones match your filters. Try adjusting them.'
              : 'No ringtones yet. Check back soon — new tones added regularly!'
          }
        />
      </div>
    </div>
  )
}

export default RingtonesPage
