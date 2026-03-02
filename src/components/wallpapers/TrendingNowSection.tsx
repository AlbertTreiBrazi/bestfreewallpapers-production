import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Eye, Download, Clock, ArrowRight } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'

interface Wallpaper {
  id: number
  title: string
  description: string | null
  image_url: string
  width: number
  height: number
  premium: boolean
  downloads_count: number | null
  slug?: string
  trending_score?: number
  created_at?: string
  updated_at?: string
}

interface TrendingNowSectionProps {
  wallpapers: Wallpaper[]
  loading?: boolean
}

export function TrendingNowSection({ wallpapers, loading = false }: TrendingNowSectionProps) {
  const { theme } = useTheme()

  // Transform Wallpaper to WallpaperData format
  const transformWallpaper = (wallpaper: Wallpaper) => ({
    id: wallpaper.id,
    title: wallpaper.title,
    slug: wallpaper.slug,
    thumbnail_url: wallpaper.image_url, // Use image_url as thumbnail
    image_url: wallpaper.image_url,
    download_url: wallpaper.image_url, // Use image_url as download_url
    resolution_1080p: `${wallpaper.width}x${wallpaper.height}`,
    download_count: wallpaper.downloads_count || 0,
    is_premium: wallpaper.premium,
    width: wallpaper.width,
    height: wallpaper.height,
    created_at: wallpaper.created_at
  })

  if (loading) {
    return (
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-4" />
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg aspect-[3/4] animate-pulse`}>
                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!wallpapers || wallpapers.length === 0) {
    return null
  }

  // Sort wallpapers by trending score (highest first) and take top 5
  const trendingWallpapers = wallpapers
    .filter(wallpaper => wallpaper.trending_score && wallpaper.trending_score > 0)
    .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
    .slice(0, 5)

  if (trendingWallpapers.length === 0) {
    return null
  }

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-red-500 mr-3" />
            <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Trending Now
            </h2>
          </div>
          <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto px-4`}>
            The hottest wallpapers everyone's downloading right now
          </p>
        </div>

        {/* Trending Wallpapers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {trendingWallpapers.map((wallpaper, index) => (
            <div key={wallpaper.id} className="relative group">
              {/* Trending Rank Badge */}
              <div className="absolute top-2 left-2 z-10">
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                    : index === 1 
                    ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  {index === 0 && '🥇 #1'}
                  {index === 1 && '🥈 #2'}
                  {index === 2 && '🥉 #3'}
                  {index > 2 && `#${index + 1}`}
                </div>
              </div>

              {/* Hot Badge */}
              <div className="absolute top-2 right-2 z-10">
                <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  HOT
                </div>
              </div>

              {/* Wallpaper Card */}
              <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
                <div className="relative aspect-[3/4] overflow-hidden">
                  <EnhancedWallpaperCardAdapter
                    wallpaper={transformWallpaper(wallpaper)}
                    variant="compact"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center">
                            <Eye className="w-3 h-3 mr-1" />
                            <span>{wallpaper.downloads_count || 0}</span>
                          </div>
                          {wallpaper.created_at && (
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{getTimeAgo(wallpaper.created_at)}</span>
                            </div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-8 rounded-2xl max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="w-12 h-12 mr-4" />
              <div>
                <h3 className="text-2xl font-bold mb-2">Don't Miss Out!</h3>
                <p className="text-red-100">Join thousands downloading these trending wallpapers</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/free-wallpapers?sort=trending"
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                <span>View All Trending</span>
              </Link>
              <Link
                to="/ai-wallpapers"
                className="hidden sm:inline-flex border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition duration-200 items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <span>Try AI Wallpapers</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}