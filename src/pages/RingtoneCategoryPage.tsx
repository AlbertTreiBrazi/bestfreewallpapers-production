// ============================================================================
// 🎵 RingtoneCategoryPage.tsx — Pagina categorie /ringtones/category/:slug
// ============================================================================
// Pagina dedicată unei categorii (gen, mood sau use case).
// Conține:
//   - Hero cu numele categoriei + descriere din DB
//   - Grid filtrat doar pe acea categorie
//   - Breadcrumb: Home > Ringtones > [Category]
// ============================================================================

import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Music2, ArrowLeft, Sparkles } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { useRingtones } from '@/hooks/useRingtones'
import { useRingtoneCategories, type RingtoneCategory } from '@/hooks/useRingtoneCategories'
import { RingtoneGrid } from '@/components/ringtones/RingtoneGrid'

type SortOption = 'newest' | 'popular' | 'downloads'

export function RingtoneCategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [sort, setSort] = useState<SortOption>('newest')

  const { all: allCategories, loading: loadingCategories } = useRingtoneCategories()

  // Find the category in the loaded list (by slug)
  const category: RingtoneCategory | undefined = allCategories.find(
    (c) => c.slug === slug
  )

  // Build filter based on category type
  const filters = category
    ? {
        genre: category.category_type === 'genre' ? category.slug : undefined,
        mood: category.category_type === 'mood' ? category.slug : undefined,
        useCase: category.category_type === 'use_case' ? category.slug : undefined,
        sort,
      }
    : { sort }

  const {
    ringtones,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    total,
  } = useRingtones(filters)

  // Show "not found" if categories are loaded but this slug doesn't exist
  const isNotFound = !loadingCategories && !category

  // ---- Loading initial categories ----
  if (loadingCategories) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className={`h-12 rounded mb-4 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
          <div className={`h-4 w-2/3 rounded animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
        </div>
      </div>
    )
  }

  // ---- Not found ----
  if (isNotFound) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Music2 className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
          <h1 className={`text-3xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Category not found
          </h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            The category "{slug}" doesn't exist or is no longer available.
          </p>
          <Link
            to="/ringtones"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse all ringtones
          </Link>
        </div>
      </div>
    )
  }

  // ---- SEO ----
  const seoConfig = {
    title:
      category?.seo_title ||
      `${category?.name} Ringtones - Free MP3 Downloads | BestFreeWallpapers`,
    description:
      category?.seo_description ||
      category?.description ||
      `Download free ${category?.name?.toLowerCase()} ringtones in MP3 format. High-quality audio, max 30 seconds, perfect for calls and notifications.`,
    keywords: [
      `${category?.name?.toLowerCase()} ringtones`,
      `${category?.name?.toLowerCase()} mp3`,
      'free ringtones',
      'phone ringtones',
      'mobile ringtones',
    ],
    image: '/images/og-ringtones.jpg',
  }

  // ---- Type label for hero ----
  const typeLabel = {
    genre: 'Genre',
    mood: 'Mood',
    use_case: 'Use For',
  }[category!.category_type]

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
      <SEOHead config={seoConfig} />

      {/* Hero */}
      <div
        className={`${
          isDark
            ? 'bg-gradient-to-b from-purple-950 to-dark-primary'
            : 'bg-gradient-to-b from-blue-50 to-gray-50'
        } border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Breadcrumb */}
          <nav className={`flex items-center gap-2 text-sm mb-4 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <Link to="/" className="hover:text-blue-500">Home</Link>
            <span>/</span>
            <Link to="/ringtones" className="hover:text-blue-500">Ringtones</Link>
            <span>/</span>
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {category!.name}
            </span>
          </nav>

          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{typeLabel}</span>
            </div>

            <h1
              className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {category!.name} Ringtones
            </h1>

            {category?.description && (
              <p
                className={`text-base sm:text-lg ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header: count + sort */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {loading && ringtones.length === 0
              ? 'Loading…'
              : total > 0
                ? `${total} ringtone${total === 1 ? '' : 's'} in ${category!.name}`
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
          emptyMessage={`No ${category!.name.toLowerCase()} ringtones yet. New tones added regularly!`}
        />

        {/* Browse other categories */}
        <div className="mt-12 text-center">
          <Link
            to="/ringtones"
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Browse all ringtones
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RingtoneCategoryPage
