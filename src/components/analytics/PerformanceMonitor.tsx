import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

interface CoreWebVitals {
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte
  inp?: number // Interaction to Next Paint
}

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

interface PerformanceMonitoringProps {
  enabled?: boolean
  trackCoreWebVitals?: boolean
  trackCustomMetrics?: boolean
  sendToAnalytics?: boolean
  analyticsEndpoint?: string
  debugMode?: boolean
  sampleRate?: number
  projectId?: string
  environment?: 'development' | 'staging' | 'production'
  onMetric?: (metric: PerformanceMetric) => void
  onError?: (error: Error) => void
  className?: string
}

/**
 * Comprehensive performance monitoring component
 * Tracks Core Web Vitals, custom metrics, and performance analytics
 */
export const PerformanceMonitor: React.FC<PerformanceMonitoringProps> = ({
  enabled = true,
  trackCoreWebVitals = true,
  trackCustomMetrics = true,
  sendToAnalytics = true,
  analyticsEndpoint = '/api/analytics/performance',
  debugMode = false,
  sampleRate = 1.0,
  projectId = 'bestfreewallpapers',
  environment = 'production',
  onMetric,
  onError,
  className
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [isWebVitalsSupported, setIsWebVitalsSupported] = useState(false)
  const observerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Web Vitals ratings
  const getWebVitalsRating = useCallback((metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds: Record<string, [number, number]> = {
      lcp: [2500, 4000], // 2.5s good, 4s needs improvement
      fid: [100, 300],   // 100ms good, 300ms needs improvement
      cls: [0.1, 0.25],  // 0.1 good, 0.25 needs improvement
      fcp: [1800, 3000], // 1.8s good, 3s needs improvement
      ttfb: [800, 1800], // 0.8s good, 1.8s needs improvement
      inp: [200, 500]    // 200ms good, 500ms needs improvement
    }

    const [good, needsImprovement] = thresholds[metric] || [0, 0]
    if (value <= good) return 'good'
    if (value <= needsImprovement) return 'needs-improvement'
    return 'poor'
  }, [])

  // Record performance metric
  const recordMetric = useCallback((name: string, value: number) => {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: getWebVitalsRating(name, value),
      timestamp: Date.now()
    }

    setMetrics(prev => [...prev, metric])
    onMetric?.(metric)

    if (debugMode) {
      console.log(`Performance Metric: ${name} = ${value}ms (${metric.rating})`)
    }

    // Send to analytics if enabled
    if (sendToAnalytics) {
      sendToAnalyticsEndpoint(metric)
    }
  }, [getWebVitalsRating, onMetric, sendToAnalytics, debugMode])

  // Send metric to analytics endpoint
  const sendToAnalyticsEndpoint = useCallback(async (metric: PerformanceMetric) => {
    try {
      const payload = {
        projectId,
        environment,
        metric: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          timestamp: metric.timestamp
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      }

      // Sample data based on sampleRate
      if (Math.random() > sampleRate) return

      await fetch(analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      if (debugMode) {
        console.warn('Failed to send performance metric to analytics:', error)
      }
      onError?.(error as Error)
    }
  }, [projectId, environment, analyticsEndpoint, sampleRate, debugMode, onError])

  // Monitor Core Web Vitals
  useEffect(() => {
    if (!enabled || !trackCoreWebVitals) return

    // Check for Web Vitals support
    const checkWebVitalsSupport = () => {
      try {
        // Check if Web Vitals are supported
        if ('PerformanceObserver' in window) {
          setIsWebVitalsSupported(true)
          initWebVitalsTracking()
        } else {
          if (debugMode) {
            console.warn('PerformanceObserver not supported, using fallback metrics')
          }
          initFallbackMetrics()
        }
      } catch (error) {
        if (debugMode) {
          console.warn('Failed to initialize Web Vitals tracking:', error)
        }
        onError?.(error as Error)
      }
    }

    const initWebVitalsTracking = () => {
      try {
        // Largest Contentful Paint (LCP)
        observerRef.current = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            recordMetric('lcp', lastEntry.startTime)
          }
        })
        observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] })

        // First Input Delay (FID) and Interaction to Next Paint (INP)
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          entries.forEach((entry) => {
            const delay = (entry as any).processingStart - (entry as any).startTime
            if (delay > 0) {
              recordMetric('fid', delay)
            }
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((entryList) => {
          let clsValue = 0
          const entries = entryList.getEntries()
          entries.forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          })
          if (clsValue > 0) {
            recordMetric('cls', clsValue * 1000) // Convert to 0-1000 scale
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              recordMetric('fcp', entry.startTime)
            }
          })
        })
        fcpObserver.observe({ entryTypes: ['paint'] })

        // Time to First Byte (TTFB) - calculated from navigation timing
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          const ttfb = navigation.responseStart - navigation.requestStart
          if (ttfb > 0) {
            recordMetric('ttfb', ttfb)
          }
        }

      } catch (error) {
        if (debugMode) {
          console.warn('Web Vitals tracking error:', error)
        }
        onError?.(error as Error)
      }
    }

    const initFallbackMetrics = () => {
      // Use basic Performance API for basic metrics
      const measurePageLoad = () => {
        if (performance.timing) {
          const timing = performance.timing
          const loadTime = timing.loadEventEnd - timing.navigationStart
          const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
          const ttfb = timing.responseStart - timing.requestStart
          
          if (loadTime > 0) recordMetric('page-load-time', loadTime)
          if (domContentLoaded > 0) recordMetric('dom-content-loaded', domContentLoaded)
          if (ttfb > 0) recordMetric('ttfb', ttfb)
        }
      }

      // Measure when page is fully loaded
      if (document.readyState === 'complete') {
        measurePageLoad()
      } else {
        window.addEventListener('load', measurePageLoad)
      }
    }

    checkWebVitalsSupport()

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [enabled, trackCoreWebVitals, debugMode, onError])

  // Monitor custom metrics
  useEffect(() => {
    if (!enabled || !trackCustomMetrics) return

    // Page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordMetric('page-hidden', Date.now() - startTimeRef.current)
      } else {
        startTimeRef.current = Date.now()
      }
    }

    // Unload
    const handleBeforeUnload = () => {
      recordMetric('page-duration', Date.now() - startTimeRef.current)
    }

    // Errors
    const handleError = (event: ErrorEvent) => {
      recordMetric('javascript-error', 1)
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('error', handleError)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('error', handleError)
    }
  }, [enabled, trackCustomMetrics])

  // Performance summary
  const performanceSummary = useMemo(() => {
    const coreWebVitals: CoreWebVitals = {}
    
    metrics.forEach(metric => {
      if (['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'inp'].includes(metric.name)) {
        (coreWebVitals as any)[metric.name] = metric.value
      }
    })

    return {
      coreWebVitals,
      totalMetrics: metrics.length,
      goodMetrics: metrics.filter(m => m.rating === 'good').length,
      needsImprovement: metrics.filter(m => m.rating === 'needs-improvement').length,
      poorMetrics: metrics.filter(m => m.rating === 'poor').length
    }
  }, [metrics])

  // Debug info in development
  if (debugMode && process.env.NODE_ENV === 'development') {
    return (
      <div className={`fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-sm ${className}`}>
        <h3 className="font-bold mb-2">Performance Monitor</h3>
        <div>Web Vitals Supported: {isWebVitalsSupported ? '✅' : '❌'}</div>
        <div>Total Metrics: {metrics.length}</div>
        <div>Good: {performanceSummary.goodMetrics}</div>
        <div>Needs Improvement: {performanceSummary.needsImprovement}</div>
        <div>Poor: {performanceSummary.poorMetrics}</div>
        <div className="mt-2">
          <div>LCP: {performanceSummary.coreWebVitals.lcp || 'N/A'}</div>
          <div>FID: {performanceSummary.coreWebVitals.fid || 'N/A'}</div>
          <div>CLS: {performanceSummary.coreWebVitals.cls || 'N/A'}</div>
        </div>
      </div>
    )
  }

  return null
}

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])

  const recordMetric = useCallback((name: string, value: number) => {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: 'good',
      timestamp: Date.now()
    }
    setMetrics(prev => [...prev, metric])
  }, [])

  const getMetricsByName = useCallback((name: string) => {
    return metrics.filter(m => m.name === name)
  }, [metrics])

  const getAverageMetric = useCallback((name: string) => {
    const filteredMetrics = getMetricsByName(name)
    if (filteredMetrics.length === 0) return 0
    return filteredMetrics.reduce((sum, m) => sum + m.value, 0) / filteredMetrics.length
  }, [getMetricsByName])

  return {
    metrics,
    recordMetric,
    getMetricsByName,
    getAverageMetric
  }
}

// Export component and types
export default PerformanceMonitor

export type { CoreWebVitals, PerformanceMetric, PerformanceMonitoringProps }
