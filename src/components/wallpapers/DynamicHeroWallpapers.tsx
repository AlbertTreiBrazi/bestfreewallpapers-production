import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Pause, ChevronLeft, ChevronRight, Eye, Download, Crown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { getApiImageUrl } from '@/config/api'

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
  category_id: number
  category_name?: string
}

interface DynamicHeroWallpapersProps {
  wallpapers: Wallpaper[]
  onCategorySelect?: (categoryId: number) => void
}

export function DynamicHeroWallpapers({ wallpapers, onCategorySelect }: DynamicHeroWallpapersProps) {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  // Auto-advance through wallpapers
  useEffect(() => {
    if (!isPlaying || wallpapers.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % wallpapers.length)
    }, 6000) // Change every 6 seconds

    return () => clearInterval(interval)
  }, [isPlaying, wallpapers.length])

  if (!wallpapers || wallpapers.length === 0) {
    return null
  }

  const currentWallpaper = wallpapers[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + wallpapers.length) % wallpapers.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % wallpapers.length)
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleCategoryClick = (categoryId: number) => {
    onCategorySelect?.(categoryId)
    navigate(`/category/${categoryId}`)
  }

  const handleWallpaperClick = () => {
    if (currentWallpaper.slug) {
      navigate(`/wallpaper/${currentWallpaper.slug}`)
    }
  }

  // Fallback image URL in case API image fails
  const imageUrl = currentWallpaper.image_url || getApiImageUrl(currentWallpaper.id, {
    format: 'webp',
    quality: 90,
    width: 1920,
    height: 1080
  })

  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden bg-black">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={currentWallpaper.title}
          className="w-full h-full object-cover transition-all duration-700"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/images/hero-default.jpg'
          }}
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            {/* Category Badge */}
            {currentWallpaper.category_name && (
              <button
                onClick={() => handleCategoryClick(currentWallpaper.category_id)}
                className="inline-flex items-center px-3 py-1 mb-4 text-xs font-semibold rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                {currentWallpaper.category_name}
                <ChevronRight className="w-3 h-3 ml-1" />
              </button>
            )}

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              {currentWallpaper.title}
            </h1>

            {/* Description */}
            {currentWallpaper.description && (
              <p className="text-lg md:text-xl text-gray-200 mb-6 leading-relaxed max-w-lg">
                {currentWallpaper.description}
              </p>
            )}

            {/* Stats and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex items-center space-x-4 text-white/80 text-sm">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  <span>{currentWallpaper.downloads_count || 0} downloads</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 mr-1 rounded-full bg-green-400" />
                  <span>{currentWallpaper.width}×{currentWallpaper.height}</span>
                </div>
                {currentWallpaper.premium && (
                  <div className="flex items-center text-yellow-400">
                    <Crown className="w-4 h-4 mr-1" />
                    <span>Premium</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleWallpaperClick}
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <Eye className="w-4 h-4 mr-2" />
                <span>View Details</span>
              </button>
              <Link
                to="/free-wallpapers"
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                <span>Browse More</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
          title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        {/* Navigation Dots - Hidden on Mobile */}
        <div className="hidden md:flex space-x-2">
          {wallpapers.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Arrow Navigation */}
      <button
        onClick={handlePrevious}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </section>
  )
}