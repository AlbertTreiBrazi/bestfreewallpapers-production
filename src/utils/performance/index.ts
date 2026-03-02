/**
 * Performance utilities for optimization and monitoring
 * Core Web Vitals, image optimization, bundle analysis, and performance APIs
 */

// Core Web Vitals thresholds
export const CORE_WEB_VITALS = {
  LCP: {
    GOOD: 2500,
    POOR: 4000
  },
  FID: {
    GOOD: 100,
    POOR: 300
  },
  CLS: {
    GOOD: 0.1,
    POOR: 0.25
  },
  FCP: {
    GOOD: 1800,
    POOR: 3000
  },
  TTFB: {
    GOOD: 800,
    POOR: 1800
  },
  INP: {
    GOOD: 200,
    POOR: 500
  }
} as const

// Performance score calculation
export const calculatePerformanceScore = (metrics: Record<string, number>): number => {
  let score = 0
  let maxScore = 0

  Object.entries(metrics).forEach(([metric, value]) => {
    const thresholds = CORE_WEB_VITALS[metric as keyof typeof CORE_WEB_VITALS]
    if (!thresholds) return

    const { GOOD: good, POOR: poor } = thresholds
    let metricScore = 0

    if (value <= good) {
      metricScore = 100
    } else if (value >= poor) {
      metricScore = 0
    } else {
      // Linear interpolation between good and poor
      metricScore = 100 - ((value - good) / (poor - good)) * 100
    }

    score += Math.max(0, metricScore)
    maxScore += 100
  })

  return maxScore > 0 ? Math.round(score / maxScore * 100) : 0
}

// Web Vitals rating
export const getWebVitalsRating = (metric: keyof typeof CORE_WEB_VITALS, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = CORE_WEB_VITALS[metric]
  if (!thresholds) return 'good' // Default fallback
  
  const { GOOD: good, POOR: poor } = thresholds

  if (value <= good) return 'good'
  if (value >= poor) return 'poor'
  return 'needs-improvement'
}

// Image optimization utilities
export const imageOptimization = {
  // Generate optimized image URLs
  generateOptimizedUrl: (
    baseUrl: string,
    options: {
      width?: number
      height?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
      crop?: { x: number, y: number, width: number, height: number }
    } = {}
  ): string => {
    const { width, height, quality = 75, format = 'webp', crop } = options
    const hasQueryParams = baseUrl.includes('?')
    const baseQuery = `auto=format&fit=crop&q=${quality}`
    
    let url = baseUrl + (hasQueryParams ? '&' : '?') + `format=${format}&${baseQuery}`
    
    if (width) url += `&w=${width}`
    if (height) url += `&h=${height}`
    if (crop) {
      url += `&x=${crop.x}&y=${crop.y}&width=${crop.width}&height=${crop.height}`
    }
    
    return url
  },

  // Generate srcset for responsive images
  generateSrcSet: (
    baseUrl: string,
    widths: number[] = [400, 600, 800, 1200, 1600],
    format: 'webp' | 'jpeg' = 'webp',
    quality: number = 75
  ): string => {
    return widths.map(width => {
      const optimizedUrl = imageOptimization.generateOptimizedUrl(baseUrl, {
        width,
        format,
        quality
      })
      return `${optimizedUrl} ${width}w`
    }).join(', ')
  },

  // Check WebP support
  checkWebPSupport: (): boolean => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return false

      canvas.width = 1
      canvas.height = 1
      ctx.fillRect(0, 0, 1, 1)
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    } catch {
      return false
    }
  },

  // Generate low quality placeholder
  generateLowQualitySrc: (
    baseUrl: string,
    quality: number = 20,
    width: number = 50
  ): string => {
    return imageOptimization.generateOptimizedUrl(baseUrl, {
      width,
      quality,
      format: 'jpeg'
    })
  }
}

// Bundle size utilities
export const bundleAnalysis = {
  // Analyze bundle size
  analyzeBundle: async (): Promise<{
    totalSize: number
    compressedSize: number
    files: Array<{
      name: string
      size: number
      type: 'script' | 'style' | 'image' | 'font' | 'other'
    }>
  }> => {
    if (typeof window === 'undefined') {
      return { totalSize: 0, compressedSize: 0, files: [] }
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const files: Array<{ name: string, size: number, type: any }> = []

    resources.forEach(resource => {
      const url = new URL(resource.name)
      const fileName = url.pathname.split('/').pop() || ''
      const extension = fileName.split('.').pop()?.toLowerCase() || ''

      let type: 'script' | 'style' | 'image' | 'font' | 'other' = 'other'
      if (['js', 'mjs', 'cjs'].includes(extension)) type = 'script'
      else if (['css', 'scss', 'less'].includes(extension)) type = 'style'
      else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(extension)) type = 'image'
      else if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) type = 'font'

      files.push({
        name: fileName,
        size: resource.transferSize || 0,
        type
      })
    })

    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const compressedSize = files.reduce((sum, file) => sum + (file.size * 0.6), 0) // Rough compression estimate

    return { totalSize, compressedSize, files }
  },

  // Get largest files
  getLargestFiles: (files: any[], limit: number = 5): any[] => {
    return files
      .sort((a, b) => b.size - a.size)
      .slice(0, limit)
  },

  // Get files by type
  getFilesByType: (files: any[], type: string): any[] => {
    return files.filter(file => file.type === type)
  }
}

// Performance monitoring utilities
export const performanceMonitoring = {
  // Record custom metric
  recordMetric: (name: string, value: number, tags?: Record<string, string>) => {
    if (typeof window === 'undefined') return

    // Send to analytics (if configured)
    try {
      const payload = {
        name,
        value,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        tags: tags || {}
      }

      // Store in localStorage for development
      if (process.env.NODE_ENV === 'development') {
        const existingMetrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]')
        existingMetrics.push(payload)
        localStorage.setItem('performance_metrics', JSON.stringify(existingMetrics))
      }
    } catch (error) {
      console.warn('Failed to record performance metric:', error)
    }
  },

  // Measure function execution time
  measureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    tags?: Record<string, string>
  ): T => {
    return ((...args: any[]) => {
      const start = performance.now()
      const result = fn(...args)
      
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          const duration = performance.now() - start
          performanceMonitoring.recordMetric(`function_${name}`, duration, tags)
        })
      } else {
        const duration = performance.now() - start
        performanceMonitoring.recordMetric(`function_${name}`, duration, tags)
        return result
      }
    }) as T
  },

  // Measure React component render
  measureRender: (componentName: string) => {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      performanceMonitoring.recordMetric(`react_render_${componentName}`, duration)
    }
  }
}

// Resource timing utilities
export const resourceTiming = {
  // Get slow resources
  getSlowResources: (threshold: number = 1000): any[] => {
    if (typeof window === 'undefined') return []

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return resources.filter(resource => resource.duration > threshold)
  },

  // Get cached resources
  getCachedResources: (): any[] => {
    if (typeof window === 'undefined') return []

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return resources.filter(resource => resource.transferSize === 0)
  },

  // Get critical path resources
  getCriticalPathResources: (): any[] => {
    if (typeof window === 'undefined') return []

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!navigation) return []

    const domContentLoaded = navigation.domContentLoadedEventStart
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    
    return resources.filter(resource => 
      resource.startTime < domContentLoaded
    ).sort((a, b) => a.startTime - b.startTime)
  }
}

// Memory usage utilities
export const memoryUsage = {
  // Get memory usage (if available)
  getMemoryUsage: (): {
    used: number
    total: number
    percentage: number
  } | null => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return null
    }

    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    }
  },

  // Check if memory is low
  isMemoryLow: (threshold: number = 80): boolean => {
    const usage = memoryUsage.getMemoryUsage()
    return usage ? usage.percentage > threshold : false
  }
}

// Preload utilities
export const preload = {
  // Preload critical resources
  preloadResource: (href: string, as: string = 'fetch', type?: string) => {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    if (type) link.type = type
    document.head.appendChild(link)
  },

  // Prefetch resources
  prefetchResource: (href: string) => {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    document.head.appendChild(link)
  },

  // DNS prefetch
  dnsPrefetch: (domain: string) => {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = domain
    document.head.appendChild(link)
  }
}

// Intersection Observer utilities
export const intersectionObserver = {
  // Create optimized observer
  createObserver: (
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver => {
    const defaultOptions: IntersectionObserverInit = {
      rootMargin: '50px 0px',
      threshold: 0.1,
      ...options
    }
    return new IntersectionObserver(callback, defaultOptions)
  },

  // Observe element
  observe: (
    observer: IntersectionObserver,
    element: Element,
    callback: (entry: IntersectionObserverEntry) => void
  ) => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => callback(entry))
    }
    observer.observe(element)
    return () => observer.unobserve(element)
  }
}

// Performance optimization recommendations
export const getOptimizationRecommendations = (metrics: Record<string, number>): Array<{
  type: 'error' | 'warning' | 'info'
  title: string
  description: string
  metric: string
  action: string
}> => {
  const recommendations: Array<{
    type: 'error' | 'warning' | 'info'
    title: string
    description: string
    metric: string
    action: string
  }> = []

  // LCP recommendations
  if (metrics.lcp > CORE_WEB_VITALS.LCP.POOR) {
    recommendations.push({
      type: 'error',
      title: 'Large Contentful Paint too slow',
      description: 'LCP is above 4s, indicating poor user experience.',
      metric: 'lcp',
      action: 'Optimize critical resources, compress images, and use CDN.'
    })
  } else if (metrics.lcp > CORE_WEB_VITALS.LCP.GOOD) {
    recommendations.push({
      type: 'warning',
      title: 'Large Contentful Paint needs improvement',
      description: 'LCP is above 2.5s, but below 4s.',
      metric: 'lcp',
      action: 'Optimize hero images and critical CSS.'
    })
  }

  // FID recommendations
  if (metrics.fid > CORE_WEB_VITALS.FID.POOR) {
    recommendations.push({
      type: 'error',
      title: 'First Input Delay too high',
      description: 'FID is above 300ms, indicating poor interactivity.',
      metric: 'fid',
      action: 'Reduce JavaScript execution time and avoid long tasks.'
    })
  } else if (metrics.fid > CORE_WEB_VITALS.FID.GOOD) {
    recommendations.push({
      type: 'warning',
      title: 'First Input Delay needs improvement',
      description: 'FID is above 100ms, but below 300ms.',
      metric: 'fid',
      action: 'Split long JavaScript and optimize event handlers.'
    })
  }

  // CLS recommendations
  if (metrics.cls > CORE_WEB_VITALS.CLS.POOR) {
    recommendations.push({
      type: 'error',
      title: 'Cumulative Layout Shift too high',
      description: 'CLS is above 0.25, indicating poor layout stability.',
      metric: 'cls',
      action: 'Add size attributes to images and ads, avoid inserting content above existing content.'
    })
  } else if (metrics.cls > CORE_WEB_VITALS.CLS.GOOD) {
    recommendations.push({
      type: 'warning',
      title: 'Cumulative Layout Shift needs improvement',
      description: 'CLS is above 0.1, but below 0.25.',
      metric: 'cls',
      action: 'Reserve space for dynamic content and optimize fonts.'
    })
  }

  return recommendations
}

export default {
  CORE_WEB_VITALS,
  calculatePerformanceScore,
  getWebVitalsRating,
  imageOptimization,
  bundleAnalysis,
  performanceMonitoring,
  resourceTiming,
  memoryUsage,
  preload,
  intersectionObserver,
  getOptimizationRecommendations
}
