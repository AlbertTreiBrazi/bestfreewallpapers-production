import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { LazyImage } from './LazyImage'
import { ProgressiveImage } from './ProgressiveImage'

interface ImageOptimizerProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  quality?: number
  sizes?: string
  loading?: 'lazy' | 'eager'
  priority?: boolean
  enableWebP?: boolean
  enableProgressive?: boolean
  enableLazyLoading?: boolean
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
  aspectRatio?: string
  backgroundColor?: string
  lowQualitySrc?: string
  format?: 'webp' | 'jpeg' | 'png' | 'auto'
  dpr?: number | number[]
  cropping?: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Advanced image optimizer that combines multiple image optimization techniques
 * - WebP support with JPEG/PNG fallbacks
 * - Progressive image loading
 * - Device pixel ratio optimization
 * - Intelligent format selection
 * - Responsive image serving
 */
export const ImageOptimizer = React.memo<ImageOptimizerProps>(({
  src,
  alt,
  className,
  width,
  height,
  quality = 75,
  sizes = '100vw',
  loading = 'lazy',
  priority = false,
  enableWebP = true,
  enableProgressive = true,
  enableLazyLoading = true,
  placeholder,
  onLoad,
  onError,
  aspectRatio,
  backgroundColor = '#f3f4f6',
  lowQualitySrc,
  format = 'auto',
  dpr = [1, 2],
  cropping
}) => {
  const [webpSupport, setWebpSupport] = useState(true)
  const [currentFormat, setCurrentFormat] = useState<'webp' | 'jpeg' | 'png'>('jpeg')
  const [devicePixelRatio, setDevicePixelRatio] = useState(1)

  // WebP support detection
  useEffect(() => {
    const checkWebPSupport = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return false
        
        canvas.width = 1
        canvas.height = 1
        ctx.fillRect(0, 0, 1, 1)
        const dataURL = canvas.toDataURL('image/webp')
        return dataURL.indexOf('data:image/webp') === 0
      } catch {
        return false
      }
    }

    if (enableWebP) {
      setWebpSupport(checkWebPSupport())
    } else {
      setWebpSupport(false)
    }
  }, [enableWebP])

  // Device pixel ratio detection
  useEffect(() => {
    const updateDpr = () => {
      setDevicePixelRatio(window.devicePixelRatio || 1)
    }

    updateDpr()
    window.addEventListener('resize', updateDpr)
    return () => window.removeEventListener('resize', updateDpr)
  }, [])

  // Generate optimized image URLs
  const optimizedImageData = useMemo(() => {
    if (!src) return null

    const originalUrl = src
    const hasQueryParams = originalUrl.includes('?')
    const baseQuery = `?q=${quality}&auto=format&fit=crop`
    
    // Base width calculation
    const getBaseWidth = () => {
      if (width) return width
      if (sizes === '100vw') return 1200 // Default for full-width images
      if (sizes.includes('vw')) {
        const vwValue = parseInt(sizes.match(/(\d+)vw/)?.[1] || '100')
        return (vwValue * window.innerWidth) / 100
      }
      return 400
    }

    const baseWidth = getBaseWidth()
    const aspectRatio = width && height ? width / height : null
    const optimizedHeight = aspectRatio ? Math.round(baseWidth / aspectRatio) : height

    // Generate URLs for different device pixel ratios
    const generateDprUrls = (dprValue: number) => {
      const scaledWidth = Math.round(baseWidth * dprValue)
      const scaledHeight = aspectRatio ? Math.round(optimizedHeight * dprValue) : Math.round((height || 300) * dprValue)
      
      const queryParams = `&w=${scaledWidth}&h=${scaledHeight || ''}`
      
      if (format === 'webp' || (format === 'auto' && webpSupport)) {
        return {
          webp: `${originalUrl}${hasQueryParams ? '&' : '?'}format=webp${baseQuery}${queryParams}`,
          jpeg: `${originalUrl}${hasQueryParams ? '&' : '?'}format=jpeg${baseQuery}${queryParams}`,
          png: `${originalUrl}${hasQueryParams ? '&' : '?'}format=png${baseQuery}${queryParams}`
        }
      }
      
      return {
        webp: null,
        jpeg: `${originalUrl}${hasQueryParams ? '&' : '?'}format=jpeg${baseQuery}${queryParams}`,
        png: `${originalUrl}${hasQueryParams ? '&' : '?'}format=png${baseQuery}${queryParams}`
      }
    }

    // Handle cropping
    if (cropping) {
      const cropQuery = `&x=${cropping.x}&y=${cropping.y}&width=${cropping.width}&height=${cropping.height}`
      
      const dprUrls = Array.isArray(dpr) 
        ? dpr.map(dprValue => ({
            dpr: dprValue,
            ...generateDprUrls(dprValue)
          }))
        : [{ dpr, ...generateDprUrls(dpr) }]

      return {
        original: originalUrl,
        optimizedWidth: baseWidth,
        optimizedHeight: optimizedHeight,
        aspectRatio,
        dprUrls,
        lowQualitySrc: lowQualitySrc || generateDprUrls(1).jpeg?.replace('q=75', 'q=20') || originalUrl
      }
    }

    const dprUrls = Array.isArray(dpr) 
      ? dpr.map(dprValue => ({
          dpr: dprValue,
          ...generateDprUrls(dprValue)
        }))
      : [{ dpr, ...generateDprUrls(dpr) }]

    return {
      original: originalUrl,
      optimizedWidth: baseWidth,
      optimizedHeight: optimizedHeight,
      aspectRatio,
      dprUrls,
      lowQualitySrc: lowQualitySrc || generateDprUrls(1).jpeg?.replace('q=75', 'q=20') || originalUrl
    }
  }, [src, width, height, quality, sizes, format, webpSupport, dpr, cropping, lowQualitySrc])

  // Determine best format to use
  useEffect(() => {
    if (!optimizedImageData) return

    if (format === 'webp') {
      setCurrentFormat('webp')
    } else if (format === 'jpeg') {
      setCurrentFormat('jpeg')
    } else if (format === 'png') {
      setCurrentFormat('png')
    } else {
      // Auto format selection
      setCurrentFormat(webpSupport ? 'webp' : 'jpeg')
    }
  }, [format, webpSupport, optimizedImageData])

  // Generate srcset for responsive images
  const srcSet = useMemo(() => {
    if (!optimizedImageData) return ''

    return optimizedImageData.dprUrls
      .map(({ dpr, webp, jpeg, png }) => {
        const url = currentFormat === 'webp' ? (webp || jpeg) : currentFormat === 'jpeg' ? (jpeg || webp) : png
        return url ? `${url} ${dpr}x` : ''
      })
      .filter(Boolean)
      .join(', ')
  }, [optimizedImageData, currentFormat])

  // Main optimized src
  const mainSrc = useMemo(() => {
    if (!optimizedImageData) return src

    const bestDpr = devicePixelRatio > 1.5 ? 2 : 1
    const dprData = optimizedImageData.dprUrls.find(d => d.dpr === bestDpr)
    
    if (dprData) {
      switch (currentFormat) {
        case 'webp':
          return dprData.webp || dprData.jpeg
        case 'jpeg':
          return dprData.jpeg || dprData.webp
        case 'png':
          return dprData.png || dprData.jpeg
        default:
          return dprData.webp || dprData.jpeg
      }
    }

    return optimizedImageData.original
  }, [optimizedImageData, currentFormat, devicePixelRatio])

  const handleError = useCallback((errorEvent: any) => {
    console.warn('Image optimization error:', errorEvent)
    onError?.()
  }, [onError])

  const handleLoad = useCallback(() => {
    onLoad?.()
  }, [onLoad])

  if (!optimizedImageData) {
    return (
      <div 
        className={cn('flex items-center justify-center', className)}
        style={{ width, height }}
      >
        <span className="text-2xl">📷</span>
      </div>
    )
  }

  // Choose component based on features enabled
  const imageComponent = (
    <LazyImage
      src={mainSrc}
      alt={alt}
      className={className}
      width={optimizedImageData.optimizedWidth}
      height={optimizedImageData.optimizedHeight}
      quality={quality}
      priority={priority}
      sizes={sizes}
      loading={enableLazyLoading ? loading : 'eager'}
      onLoad={handleLoad}
      onError={() => onError?.()}
      placeholder={placeholder}
      enableWebP={enableWebP}
      progressive={enableProgressive}
      placeholderClassName={`bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800`}
    />
  )

  return (
    <div
      className="relative"
      style={{
        aspectRatio: aspectRatio,
        backgroundColor
      }}
    >
      {/* Original img tag for browsers that don't support optimized components */}
      <picture>
        {enableWebP && webpSupport && (
          <source
            srcSet={srcSet}
            type="image/webp"
            sizes={sizes}
          />
        )}
        <source
          srcSet={srcSet}
          type={currentFormat === 'png' ? 'image/png' : 'image/jpeg'}
          sizes={sizes}
        />
        <img
          src={mainSrc}
          alt={alt}
          className={cn('w-full h-full object-cover', className)}
          width={optimizedImageData.optimizedWidth}
          height={optimizedImageData.optimizedHeight}
          loading={enableLazyLoading ? loading : 'eager'}
          onLoad={handleLoad}
          onError={() => onError?.()}
        />
      </picture>
    </div>
  )
})

ImageOptimizer.displayName = 'ImageOptimizer'

// Export utility functions
export { generateLowQualitySrc, generateAspectRatio } from './ProgressiveImage'
