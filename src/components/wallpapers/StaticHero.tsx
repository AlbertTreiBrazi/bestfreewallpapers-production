import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, Download } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface StaticHeroProps {
  // Optional: First wallpaper from featured list for content, or use static content
  wallpaper?: any
}

export function StaticHero({ wallpaper }: StaticHeroProps) {
  const { theme } = useTheme()

  // Use wallpaper content if available, otherwise use static content
  const title = wallpaper?.title || "Best Free HD Wallpapers"
  const description = wallpaper?.description || "Download thousands of stunning HD, 4K, and 8K wallpapers for desktop, laptop, and mobile devices. Free, high-quality, and no registration required."

  // Use wallpaper image if available, otherwise use default hero image
  const imageUrl = wallpaper?.image_url || '/images/hero-default.jpg'

  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden bg-black">
      {/* Background Image with object-fit: contain to prevent cropping */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-contain bg-gradient-to-br from-gray-900 to-black transition-all duration-300"
          style={{ 
            objectFit: 'contain',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/images/hero-default.jpg'
          }}
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
        {/* Bottom gradient for better readability */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              {title}
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed max-w-lg">
              {description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/wallpapers"
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <Eye className="w-4 h-4 mr-2" />
                <span>View Wallpapers</span>
              </Link>
              <Link
                to="/free-wallpapers"
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200 inline-flex items-center justify-center min-h-[44px] whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                <span>Browse All</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
