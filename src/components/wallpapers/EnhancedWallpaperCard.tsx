// Enhanced Wallpaper Card with optimized image loading and performance tracking
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Download, Heart, Eye, Crown, Calendar, Tag } from 'lucide-react'
import { SafeImage } from '@/components/ui/safe-image'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useUnifiedDownload } from '@/hooks/useUnifiedDownload'
import { UnifiedDownloadModal } from '@/components/download/UnifiedDownloadModal'
import { cn } from '@/lib/utils'
import { toSupabaseRenderImageUrl } from '@/utils/supabaseImage'

interface WallpaperCardProps {
  id: number
  title: string
  slug: string
  image_url: string
  thumbnail_url?: string
  download_count: number
  is_premium: boolean
  created_at: string
  tags?: string[]
  category?: {
    name: string
    slug: string
  }
  width?: number
  height?: number
  device_type?: string
  is_mobile?: boolean
  className?: string
  priority?: boolean
  onDownload?: (wallpaper: any) => void
  onFavorite?: (wallpaper: any) => void
  variant?: 'compact' | 'detailed'
}

export function EnhancedWallpaperCard({
  id,
  title,
  slug,
  image_url,
  thumbnail_url,
  download_count,
  is_premium,
  created_at,
  tags = [],
  category,
  width,
  height,
  device_type,
  is_mobile,
  className,
  priority = false,
  onDownload,
  onFavorite,
  variant = 'detailed'
}: WallpaperCardProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { onOpenAuthModal } = useAuthModal()

  const {
    isDownloadModalOpen,
    isDownloading,
    showAdTimer,
    timerDuration,
    openDownloadModal,
    closeDownloadModal,
    startDownload,
    handleTimerComplete,
    currentWallpaper: downloadWallpaper,
    currentResolution,
    userType
  } = useUnifiedDownload({
    onAuthRequired: onOpenAuthModal
  })

  const isFaved = user ? isFavorite(id) : false

  // Base image: prefer thumbnail_url if present, otherwise use image_url.
  const baseImage = thumbnail_url || image_url

  // Thumbnail width based on card variant.
  const thumbWidth = variant === 'compact' ? 420 : 640

  // ✅ NU transforma thumbnails deja generate (bucket wallpapers-thumbnails)
  const isGeneratedThumb =
    typeof baseImage === 'string' &&
    (baseImage.includes('/wallpapers-thumbnails/') || baseImage.includes('wallpapers-thumbnails'))

  const canTransform =
    typeof baseImage === 'string' &&
    !isGeneratedThumb &&
    baseImage.includes('/storage/v1/object/public/') &&
    baseImage.match(/\.(jpe?g)(\?.*)?$/i)

  const transformedImage = canTransform
    ? toSupabaseRenderImageUrl(baseImage, { width: thumbWidth, quality: 70, format: 'webp' })
    : baseImage

  // Start with transformed URL (when safe). If it fails, fall back to baseImage.
  const [imgSrc, setImgSrc] = useState<string>(transformedImage)

  useEffect(() => {
    setImgSrc(transformedImage)
  }, [transformedImage])

  // Determine if this is a mobile wallpaper for thumbnail aspect ratio
  const isMobileWallpaper = is_mobile || device_type === 'mobile' || (width && height && height > width)

  // Set dynamic aspect ratio based on wallpaper type
  const thumbnailAspectRatio = isMobileWallpaper ? '9/16' : '16/9'

  // Handle favorite toggle
  const handleFavoriteClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!user) return

      const wallpaperData = {
        id,
        title,
        slug,
        image_url,
        thumbnail_url,
        is_premium
      }

      await toggleFavorite(wallpaperData)
      onFavorite?.(wallpaperData)
    },
    [user, id, title, slug, image_url, thumbnail_url, is_premium, toggleFavorite, onFavorite]
  )

  // Handle download with unified logic
  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const wallpaperData = { id, title, slug, image_url, is_premium }
      await openDownloadModal(wallpaperData, '1080p')
      onDownload?.(wallpaperData)
    },
    [id, title, slug, image_url, is_premium, openDownloadModal, onDownload]
  )

  // ✅ IMPORTANT:
  // For the LCP image (priority=true), remove hover transforms/animations/spinner.
  // This reduces "animated elements" and prevents LCP being delayed by effects.
  const imageClassName = priority
    ? 'object-cover w-full h-full' // no transitions for LCP
    : 'object-cover w-full h-full transition-transform duration-300 group-hover:scale-110'

  return (
    <>
      <Link
        to={`/wallpaper/${slug}`}
        className={cn(
          'group relative block overflow-hidden rounded-xl transition-all duration-300',
          // Keep hover scale on the card. It's not part of CLS (CLS is during load).
          'hover:scale-105 hover:shadow-xl',
          theme === 'dark' ? 'bg-dark-secondary hover:shadow-black/20' : 'bg-white hover:shadow-black/10',
          className
        )}
      >
        {/* Image Container - Dynamic Aspect Ratio */}
        <div className="relative overflow-hidden" style={{ aspectRatio: thumbnailAspectRatio }}>
          <div
            className="w-full h-full"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            onTouchStart={(e) => {
              // Prevent long-press context menu on mobile
              let timer: NodeJS.Timeout
              const preventDefault = () => e.preventDefault()
              timer = setTimeout(preventDefault, 500)
              const cleanup = () => clearTimeout(timer)
              e.currentTarget.addEventListener('touchend', cleanup, { once: true })
              e.currentTarget.addEventListener('touchcancel', cleanup, { once: true })
            }}
            draggable={false}
            style={{ userSelect: 'none' }}
          >
            <SafeImage
              src={imgSrc}
              alt={title}
              className={imageClassName}
              aspectRatio=""
              showLoadingSpinner={!priority}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              decoding="async"
              draggable={false}
              onError={() => {
                if (imgSrc !== baseImage) setImgSrc(baseImage)
              }}
            />
          </div>

          {/* Premium Badge */}
          {is_premium && (
            <div className="absolute top-2 left-2">
              <div
                className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                  'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
                )}
              >
                <Crown className="w-3 h-3" />
                <span>Premium</span>
              </div>
            </div>
          )}

          {/* Mobile Badge */}
          {isMobileWallpaper && (
            <div className={`absolute ${is_premium ? 'top-12' : 'top-2'} left-2`}>
              <div
                className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                  'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                )}
              >
                <span>📱</span>
                <span>Mobile</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex space-x-2">
            {user && (
              <button
                onClick={handleFavoriteClick}
                className={cn(
                  'p-2 rounded-full backdrop-blur-sm transition-all duration-200 shadow-lg ring-2 ring-white/20',
                  isFaved
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                    : 'bg-black/40 text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600'
                )}
                title={isFaved ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={cn('w-4 h-4', isFaved && 'fill-current')} />
              </button>
            )}

            <button
              onClick={handleDownload}
              className="p-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg backdrop-blur-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 ring-2 ring-white/20"
              title="Download wallpaper"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SEO-safe title for compact variant */}
        {variant === 'compact' && <h3 className="sr-only">{title}</h3>}

        {/* Content - Only render in detailed variant */}
        {variant === 'detailed' && (
          <div className="p-4">
            <h3
              className={cn(
                'font-semibold text-lg mb-2 line-clamp-2 transition-colors',
                theme === 'dark' ? 'text-white group-hover:text-purple-300' : 'text-gray-900 group-hover:text-gray-600'
              )}
            >
              {title}
            </h3>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4 text-sm">
                <div className={cn('flex items-center space-x-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
                  <Download className="w-3 h-3" />
                  <span>{download_count.toLocaleString()}</span>
                </div>

                <div className={cn('flex items-center space-x-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className={cn('flex items-center space-x-1 text-sm font-medium', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
                <Eye className="w-3 h-3" />
                <span>View</span>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex items-center space-x-2 mb-3">
                <Tag className={cn('w-3 h-3', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        theme === 'dark' ? 'bg-dark-tertiary text-gray-300' : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className={cn('px-2 py-1 text-xs rounded-full', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {category && (
              <div className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
                in <span className="font-medium">{category.name}</span>
              </div>
            )}
          </div>
        )}
      </Link>

      <UnifiedDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={closeDownloadModal}
        wallpaper={downloadWallpaper}
        resolution={currentResolution}
        userType={userType}
        timerDuration={timerDuration}
        showAdTimer={showAdTimer}
        isDownloading={isDownloading}
        onDownload={startDownload}
        onTimerComplete={handleTimerComplete}
        isGuestLiveVideoDownload={false}
        onOpenAuthModal={onOpenAuthModal}
      />
    </>
  )
}

export default EnhancedWallpaperCard
