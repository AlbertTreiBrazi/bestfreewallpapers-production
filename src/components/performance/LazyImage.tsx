import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  onLoad?: () => void
  onError?: () => void
  placeholder?: string
  quality?: number
  width?: number
  height?: number
  priority?: boolean
  sizes?: string
  loading?: 'lazy' | 'eager'
  placeholderClassName?: string
  blurDataURL?: string
  enableWebP?: boolean
  progressive?: boolean
  skeleton?: boolean
  fallbackIcon?: string
}

/**
 * Advanced lazy loading image component with IntersectionObserver
 * Supports WebP format, progressive loading, and skeleton screens
 */
export const LazyImage = React.memo<LazyImageProps>(({
  src,
  alt,
  className,
  onLoad,
  onError,
  placeholder,
  quality = 75,
  width,
  height,
  priority = false,
  sizes = '100vw',
  loading = 'lazy',
  placeholderClassName = 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800',
  blurDataURL,
  enableWebP = true,
  progressive = true,
  skeleton = true,
  fallbackIcon = '📷'
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [inView, setInView] = useState(priority) // Skip observer for priority images
  const [isProgressive, setIsProgressive] = useState(false)
  const [progressiveSrc, setProgressiveSrc] = useState<string | null>(null)
  const [currentSrc, setCurrentSrc] = useState<string | null>(null)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Create WebP and JPEG URLs for fallback
  const optimizedUrls = useMemo(() => {
    if (!src) return { webp: null, jpeg: null, original: null }
    
    const originalUrl = src
    const hasQueryParams = originalUrl.includes('?')
    const queryString = `?q=${quality}&w=${width || ''}&h=${height || ''}&auto=format&fit=crop`
    
    return {
      original: originalUrl,
      webp: enableWebP ? `${originalUrl}${hasQueryParams ? '&' : '?'}format=webp${queryString}` : null,
      jpeg: `${originalUrl}${hasQueryParams ? '&' : '?'}format=jpeg${queryString}`
    }
  }, [src, quality, width, height, enableWebP])

  // Progressive image URLs (low quality to high quality)
  const progressiveUrls = useMemo(() => {
    if (!progressive) return { low: null, high: null }
    
    const lowQuality = Math.max(20, Math.floor(quality * 0.3))
    const originalUrl = src
    const hasQueryParams = originalUrl.includes('?')
    const lowQueryString = `?q=${lowQuality}&w=${Math.floor((width || 400) * 0.3)}&auto=format&fit=crop`
    
    return {
      low: `${originalUrl}${hasQueryParams ? '&' : '?'}format=jpg${lowQueryString}`,
      high: optimizedUrls.webp || optimizedUrls.jpeg
    }
  }, [progressive, quality, width, height, src, optimizedUrls])

  // Intersection Observer setup
  useEffect(() => {
    if (priority || inView) return

    const img = imgRef.current
    if (!img) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (observerRef.current) {
            observerRef.current.disconnect()
          }
        }
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    )

    observerRef.current.observe(img)
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [priority, inView])

  // Handle image loading
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // Progressive image loading
  useEffect(() => {
    if (!inView || isLoaded) return

    if (progressive && progressiveUrls.low && progressiveUrls.high) {
      // Start with low quality image
      setIsProgressive(true)
      setProgressiveSrc(progressiveUrls.low)
      setCurrentSrc(progressiveUrls.low)
      
      // Preload high quality image
      const highQualityImg = new Image()
      highQualityImg.onload = () => {
        setProgressiveSrc(null)
        setCurrentSrc(progressiveUrls.high!)
        setIsProgressive(false)
        handleLoad()
      }
      highQualityImg.onerror = handleError
      highQualityImg.src = progressiveUrls.high
    } else {
      // Direct loading
      const finalSrc = optimizedUrls.webp || optimizedUrls.jpeg || optimizedUrls.original
      if (finalSrc) {
        setCurrentSrc(finalSrc)
      }
    }
  }, [inView, isLoaded, progressive, progressiveUrls, optimizedUrls, handleLoad, handleError])

  // WebP support detection
  const [supportsWebP, setSupportsWebP] = useState(true)
  
  useEffect(() => {
    if (!enableWebP) return

    const checkWebPSupport = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        canvas.width = 1
        canvas.height = 1
        ctx.fillRect(0, 0, 1, 1)
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
      } catch {
        return false
      }
    }

    setSupportsWebP(checkWebPSupport())
  }, [enableWebP])

  // Get best image format
  const getBestImageUrl = useCallback(() => {
    if (progressiveSrc) return progressiveSrc
    if (currentSrc) return currentSrc
    
    if (supportsWebP && optimizedUrls.webp) {
      return optimizedUrls.webp
    }
    return optimizedUrls.jpeg || optimizedUrls.original
  }, [progressiveSrc, currentSrc, supportsWebP, optimizedUrls])

  // Error state
  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center text-gray-400',
          placeholderClassName,
          className
        )}
        style={{ width, height }}
      >
        {fallbackIcon && <span className="text-2xl">{fallbackIcon}</span>}
      </div>
    )
  }

  const finalSrc = getBestImageUrl()
  const imageElement = (
    <img
      ref={imgRef}
      src={finalSrc || placeholder || ''}
      alt={alt}
      className={cn(
        'transition-all duration-300',
        {
          'opacity-0': !isLoaded,
          'opacity-100': isLoaded,
          'blur-sm': isProgressive
        },
        className
      )}
      style={{ width, height }}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      sizes={sizes}
    />
  )

  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {/* Skeleton/Placeholder */}
      {!isLoaded && skeleton && (
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            placeholderClassName,
            progressive ? 'animate-pulse' : ''
          )}
        >
          <span className="text-2xl text-gray-400">{fallbackIcon}</span>
        </div>
      )}
      
      {/* Blur data URL as additional placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          style={{ transform: 'scale(1.1)' }}
          aria-hidden="true"
        />
      )}
      
      {/* Main image */}
      {imageElement}
    </div>
  )
})

LazyImage.displayName = 'LazyImage'
