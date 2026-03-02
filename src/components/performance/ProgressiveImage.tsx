import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  lowQualitySrc: string
  placeholderWidth?: number
  placeholderHeight?: number
  onLoad?: () => void
  onError?: () => void
  blurAmount?: number
  transitionDuration?: number
  priority?: boolean
  sizes?: string
  quality?: number
  aspectRatio?: string
  backgroundColor?: string
}

/**
 * Progressive image loading component with blur-to-sharp transition
 * Shows a low-quality image first, then transitions to high-quality image
 */
export const ProgressiveImage = React.memo<ProgressiveImageProps>(({
  src,
  alt,
  className,
  lowQualitySrc,
  placeholderWidth = 400,
  placeholderHeight = 300,
  onLoad,
  onError,
  blurAmount = 20,
  transitionDuration = 300,
  priority = false,
  sizes = '100vw',
  quality = 75,
  aspectRatio,
  backgroundColor = '#f3f4f6'
}) => {
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [inView, setInView] = useState(priority)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const highQualityImgRef = useRef<HTMLImageElement>(null)
  const lowQualityImgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer setup
  useEffect(() => {
    if (priority || inView) return

    const img = highQualityImgRef.current
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
        rootMargin: '100px 0px',
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

  const handleHighQualityLoad = useCallback(() => {
    setIsHighQualityLoaded(true)
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // Preload high quality image when in view
  useEffect(() => {
    if (!inView || isHighQualityLoaded || hasError) return

    const img = highQualityImgRef.current
    if (!img) return

    // Create new image for preloading
    const preloader = new Image()
    preloader.onload = () => {
      setIsHighQualityLoaded(true)
    }
    preloader.onerror = handleError
    preloader.src = src
  }, [inView, isHighQualityLoaded, hasError, src, handleError])

  // Style calculations
  const containerStyle = useMemo(() => {
    const style: React.CSSProperties = {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor
    }

    if (aspectRatio) {
      style.aspectRatio = aspectRatio
    } else if (placeholderWidth && placeholderHeight) {
      style.aspectRatio = `${placeholderWidth} / ${placeholderHeight}`
    }

    return style
  }, [aspectRatio, placeholderWidth, placeholderHeight, backgroundColor])

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    transition: `filter ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`,
    filter: isHighQualityLoaded ? 'blur(0px)' : `blur(${blurAmount}px)`,
    opacity: isHighQualityLoaded ? 1 : 0.8
  }

  if (hasError) {
    return (
      <div 
        className={cn('flex items-center justify-center text-gray-400', className)}
        style={containerStyle}
      >
        <span className="text-2xl">📷</span>
      </div>
    )
  }

  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={containerStyle}
    >
      {/* Low Quality Image (Background) */}
      {inView && (
        <img
          ref={lowQualityImgRef}
          src={lowQualitySrc}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{
            ...imageStyle,
            filter: `blur(${blurAmount}px)`,
            opacity: isHighQualityLoaded ? 0 : 0.8,
            zIndex: 1
          }}
          aria-hidden="true"
        />
      )}

      {/* High Quality Image (Foreground) */}
      <img
        ref={highQualityImgRef}
        src={inView ? src : ''}
        alt={alt}
        className={cn(
          'absolute inset-0 w-full h-full',
          isHighQualityLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={imageStyle}
        sizes={sizes}
        onLoad={handleHighQualityLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
      />

      {/* Loading overlay for smooth transition */}
      {!isHighQualityLoaded && inView && (
        <div className="absolute inset-0 bg-gray-200/50 animate-pulse" />
      )}

      {/* High Quality Image indicator */}
      {isHighQualityLoaded && (
        <div className="absolute top-2 right-2 bg-black/20 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          HD
        </div>
      )}
    </div>
  )
})

ProgressiveImage.displayName = 'ProgressiveImage'

// Utility function to generate low quality versions
export const generateLowQualitySrc = (
  originalSrc: string, 
  quality: number = 20, 
  width?: number
): string => {
  if (!originalSrc) return ''
  
  const hasQueryParams = originalSrc.includes('?')
  const baseQuery = `?q=${quality}&auto=format&fit=crop`
  const sizeQuery = width ? `&w=${width}` : ''
  
  return `${originalSrc}${hasQueryParams ? '&' : '?'}format=jpg${baseQuery}${sizeQuery}`
}

// Utility function to generate aspect ratio based on dimensions
export const generateAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(width, height)
  return `${width / divisor} / ${height / divisor}`
}
