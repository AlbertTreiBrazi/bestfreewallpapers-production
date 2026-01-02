import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Grid, BarChart3 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  wallpaper_count?: number
  preview_wallpaper_image_url?: string | null
  preview_image?: string | null
  preview_wallpaper_id?: string | number
  is_featured?: boolean
  created_at?: string
  updated_at?: string
}

interface EnhancedCategorySectionProps {
  categories: Category[]
  loading?: boolean
}

export function EnhancedCategorySection({ categories, loading = false }: EnhancedCategorySectionProps) {
  const { theme } = useTheme()
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  if (loading) {
    return (
      <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-4" />
            <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
                <div className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!categories || categories.length === 0) {
    return null
  }

  const handleImageError = (categoryId: number) => {
    setImageErrors(prev => new Set(prev).add(categoryId))
  }

  // Get image source for category
  const getCategoryImage = (category: Category) => {
    if (imageErrors.has(category.id)) {
      return null
    }
    
    return category.preview_wallpaper_image_url || 
           category.preview_image ||
           null
  }

  // Format wallpaper count
  const formatWallpaperCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  // Calculate category popularity score (based on wallpaper count)
  const getPopularityScore = (count: number) => {
    if (count >= 100) return '🔥 Very Popular'
    if (count >= 50) return '⭐ Popular'
    if (count >= 20) return '✅ Active'
    return '🆕 New'
  }

  return (
    <section className={`py-16 ${theme === 'dark' ? 'bg-dark-primary' : 'bg-gray-50'} transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Grid className="w-8 h-8 text-purple-600 mr-3" />
            <h2 className={`text-2xl sm:text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Explore Categories
            </h2>
          </div>
          <p className={`text-base sm:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto px-4`}>
            Discover wallpapers that match your style and interests
          </p>
        </div>
        
        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => {
            const imageSource = getCategoryImage(category)
            const wallpaperCount = category.wallpaper_count || 0
            const isHovered = hoveredCategory === category.id
            
            return (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className="group relative"
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className={`${theme === 'dark' ? 'bg-dark-secondary' : 'bg-white'} rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${isHovered ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}>
                  
                  {/* Category Image */}
                  <div className="aspect-square overflow-hidden relative">
                    {imageSource ? (
                      <img
                        src={imageSource}
                        alt={category.name}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        onError={() => handleImageError(category.id)}
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${theme === 'dark' ? 'from-purple-900 to-blue-900' : 'from-purple-100 to-blue-100'} flex items-center justify-center`}>
                        <span className={`text-3xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>📷</span>
                      </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Hover Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="text-white text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <BarChart3 className="w-4 h-4 mr-1" />
                            <span>{wallpaperCount} wallpapers</span>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Popularity Badge */}
                    {wallpaperCount > 0 && (
                      <div className="absolute top-2 right-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                          wallpaperCount >= 100 
                            ? 'bg-red-500 text-white'
                            : wallpaperCount >= 50
                            ? 'bg-orange-500 text-white'
                            : 'bg-green-500 text-white'
                        }`}>
                          {formatWallpaperCount(wallpaperCount)}
                        </div>
                      </div>
                    )}
                    
                    {/* Featured Badge */}
                    {category.is_featured && (
                      <div className="absolute top-2 left-2">
                        <div className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                          ⭐ Featured
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Category Info */}
                  <div className="p-4">
                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-center text-sm mb-2 group-hover:text-purple-600 transition-colors`}>
                      {category.name}
                    </h3>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {wallpaperCount > 0 ? `${wallpaperCount} images` : 'Coming soon'}
                      </span>
                      {wallpaperCount > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          wallpaperCount >= 100 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : wallpaperCount >= 50
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {wallpaperCount >= 100 ? 'Popular' : wallpaperCount >= 50 ? 'Active' : 'New'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        
        {/* Enhanced Call to Action */}
        <div className="text-center mt-12">
          <div className={`inline-flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            <span className="text-sm">Find more categories and wallpapers</span>
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Link
              to="/categories"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
            >
              <Grid className="w-4 h-4 mr-2" />
              <span>All Categories</span>
            </Link>
            <Link
              to="/free-wallpapers"
              className={`${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} px-6 py-3 rounded-lg font-semibold transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap`}
            >
              <span>Browse Wallpapers</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}