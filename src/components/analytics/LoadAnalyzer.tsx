import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

interface LoadingPhase {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  description: string
  performance: PerformanceNavigationTiming
}

interface ResourceTiming {
  name: string
  url: string
  startTime: number
  duration: number
  size: number
  type: 'script' | 'style' | 'image' | 'font' | 'fetch' | 'other'
  cached: boolean
  compressed: boolean
  domain: string
}

interface LoadingAnalysis {
  phases: LoadingPhase[]
  resources: ResourceTiming[]
  criticalResources: ResourceTiming[]
  slowResources: ResourceTiming[]
  cachedResources: ResourceTiming[]
  totalLoadTime: number
  domContentLoaded: number
  firstPaint: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  timeToInteractive: number
  speedIndex: number
  visualProgress: Array<{ time: number, progress: number }>
}

interface LoadAnalyzerProps {
  enabled?: boolean
  trackPhases?: boolean
  trackResources?: boolean
  trackUserTiming?: boolean
  analyzeCriticalPath?: boolean
  detectSlowResources?: boolean
  threshold?: number
  maxResources?: number
  debugMode?: boolean
  onPhaseComplete?: (phase: LoadingPhase) => void
  onResourceSlow?: (resource: ResourceTiming) => void
  onLoadComplete?: (analysis: LoadingAnalysis) => void
  className?: string
}

/**
 * Comprehensive loading performance analyzer
 * Analyzes page load phases, resource timings, and critical path optimization
 */
export const LoadAnalyzer: React.FC<LoadAnalyzerProps> = ({
  enabled = true,
  trackPhases = true,
  trackResources = true,
  trackUserTiming = true,
  analyzeCriticalPath = true,
  detectSlowResources = true,
  threshold = 1000,
  maxResources = 100,
  debugMode = false,
  onPhaseComplete,
  onResourceSlow,
  onLoadComplete,
  className
}) => {
  const [analysis, setAnalysis] = useState<LoadingAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const phasesRef = useRef<LoadingPhase[]>([])
  const resourcesRef = useRef<ResourceTiming[]>([])
  const observerRef = useRef<PerformanceObserver | null>(null)

  // Define loading phases
  const loadingPhases: Array<Omit<LoadingPhase, 'startTime' | 'endTime' | 'duration' | 'performance'>> = [
    {
      name: 'Navigation Start',
      description: 'Page navigation begins'
    },
    {
      name: 'DNS Lookup',
      description: 'Domain name resolution'
    },
    {
      name: 'TCP Connection',
      description: 'Connection establishment'
    },
    {
      name: 'Request',
      description: 'HTTP request sent'
    },
    {
      name: 'Response',
      description: 'HTTP response received'
    },
    {
      name: 'DOM Processing',
      description: 'HTML parsing and DOM construction'
    },
    {
      name: 'DOM Content Loaded',
      description: 'DOM is fully loaded and parsed'
    },
    {
      name: 'Resource Loading',
      description: 'Additional resources loading'
    },
    {
      name: 'DOM Interactive',
      description: 'DOM is interactive'
    },
    {
      name: 'Page Load',
      description: 'Complete page load'
    }
  ]

  // Analyze loading phases
  const analyzePhases = useCallback((): LoadingPhase[] => {
    if (!trackPhases || !enabled) return []

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (!navigation) return []

      const phases: LoadingPhase[] = []
      let currentTime = navigation.startTime

      // Navigation timing phases
      const phaseMappings = [
        { name: 'Navigation Start', start: navigation.startTime, end: navigation.startTime, performance: navigation },
        { name: 'DNS Lookup', start: navigation.domainLookupStart, end: navigation.domainLookupEnd, performance: navigation },
        { name: 'TCP Connection', start: navigation.connectStart, end: navigation.connectEnd, performance: navigation },
        { name: 'Request', start: navigation.requestStart, end: navigation.responseStart, performance: navigation },
        { name: 'Response', start: navigation.responseStart, end: navigation.responseEnd, performance: navigation },
        { name: 'DOM Processing', start: navigation.responseEnd, end: navigation.domContentLoadedEventStart, performance: navigation },
        { name: 'DOM Content Loaded', start: navigation.domContentLoadedEventStart, end: navigation.domContentLoadedEventEnd, performance: navigation },
        { name: 'Resource Loading', start: navigation.domContentLoadedEventEnd, end: navigation.loadEventStart, performance: navigation },
        { name: 'DOM Interactive', start: navigation.domInteractive, end: navigation.domInteractive, performance: navigation },
        { name: 'Page Load', start: navigation.loadEventStart, end: navigation.loadEventEnd, performance: navigation }
      ]

      phaseMappings.forEach((phaseMapping) => {
        if (phaseMapping.start !== 0 && phaseMapping.end !== 0) {
          phases.push({
            ...loadingPhases.find(p => p.name === phaseMapping.name)!,
            startTime: phaseMapping.start,
            endTime: phaseMapping.end,
            duration: phaseMapping.end - phaseMapping.start,
            performance: phaseMapping.performance
          })
        }
      })

      phasesRef.current = phases
      phases.forEach(phase => onPhaseComplete?.(phase))

      return phases
    } catch (error) {
      if (debugMode) {
        console.warn('Phase analysis failed:', error)
      }
      return []
    }
  }, [trackPhases, enabled, debugMode, onPhaseComplete])

  // Analyze resource timing
  const analyzeResources = useCallback((): ResourceTiming[] => {
    if (!trackResources || !enabled) return []

    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const typedResources: ResourceTiming[] = []

      // Limit resources for performance
      const limitedResources = resources.slice(0, maxResources)

      limitedResources.forEach((resource) => {
        try {
          const url = new URL(resource.name)
          const pathParts = url.pathname.split('/')
          const fileName = pathParts[pathParts.length - 1]
          const extension = fileName.split('.').pop()?.toLowerCase() || ''
          
          let type: ResourceTiming['type'] = 'other'
          if (['js', 'mjs', 'cjs'].includes(extension)) type = 'script'
          else if (['css', 'scss', 'less'].includes(extension)) type = 'style'
          else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(extension)) type = 'image'
          else if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) type = 'font'
          else if (['json', 'xml', 'txt'].includes(extension)) type = 'fetch'

          const resourceTiming: ResourceTiming = {
            name: fileName || resource.name,
            url: resource.name,
            startTime: resource.startTime,
            duration: resource.duration,
            size: resource.transferSize || 0,
            type,
            cached: resource.transferSize === 0,
            compressed: (resource.encodedBodySize || 0) < (resource.decodedBodySize || 0),
            domain: url.hostname
          }

          typedResources.push(resourceTiming)

          // Detect slow resources
          if (detectSlowResources && resource.duration > threshold) {
            onResourceSlow?.(resourceTiming)
            if (debugMode) {
              console.warn(`Slow resource detected: ${resourceTiming.name} took ${resourceTiming.duration.toFixed(2)}ms`)
            }
          }
        } catch (error) {
          if (debugMode) {
            console.warn('Resource analysis error:', error)
          }
        }
      })

      resourcesRef.current = typedResources
      return typedResources
    } catch (error) {
      if (debugMode) {
        console.warn('Resource analysis failed:', error)
      }
      return []
    }
  }, [trackResources, enabled, maxResources, detectSlowResources, threshold, debugMode, onResourceSlow])

  // Calculate critical path analysis
  const calculateCriticalPath = useCallback((): ResourceTiming[] => {
    if (!analyzeCriticalPath || !enabled) return []

    const resources = resourcesRef.current
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (!navigation) return []

    // Critical resources are those that load before DOM content loaded
    const domContentLoaded = navigation.domContentLoadedEventStart
    const criticalPathResources = resources.filter(resource => 
      resource.startTime < domContentLoaded
    ).sort((a, b) => a.startTime - b.startTime)

    return criticalPathResources
  }, [analyzeCriticalPath, enabled])

  // Calculate performance metrics
  const calculateMetrics = useCallback((): {
    totalLoadTime: number
    domContentLoaded: number
    firstPaint: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    timeToInteractive: number
    speedIndex: number
    visualProgress: Array<{ time: number, progress: number }>
  } => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paintEntries = performance.getEntriesByType('paint') as PerformanceEntry[]

    let totalLoadTime = 0
    let domContentLoaded = 0
    let firstPaint = 0
    let firstContentfulPaint = 0
    let largestContentfulPaint = 0

    if (navigation) {
      totalLoadTime = navigation.loadEventEnd - navigation.startTime
      domContentLoaded = navigation.domContentLoadedEventStart - navigation.startTime
    }

    // Get paint timings
    paintEntries.forEach(entry => {
      if (entry.name === 'first-paint') {
        firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        firstContentfulPaint = entry.startTime
      }
    })

    // Estimate largest contentful paint (simplified)
    if (resourcesRef.current.length > 0) {
      const largestImage = resourcesRef.current
        .filter(r => r.type === 'image')
        .sort((a, b) => b.size - a.size)[0]
      if (largestImage) {
        largestContentfulPaint = largestImage.startTime + largestImage.duration
      }
    }

    // Estimate time to interactive (simplified)
    const timeToInteractive = navigation ? 
      navigation.loadEventStart - navigation.startTime : 0

    // Calculate speed index (simplified)
    const speedIndex = Math.round((firstContentfulPaint + timeToInteractive) / 2)

    // Visual progress (simplified)
    const visualProgress = [
      { time: firstPaint, progress: 10 },
      { time: firstContentfulPaint, progress: 25 },
      { time: domContentLoaded, progress: 60 },
      { time: timeToInteractive, progress: 90 },
      { time: totalLoadTime, progress: 100 }
    ]

    return {
      totalLoadTime,
      domContentLoaded,
      firstPaint,
      firstContentfulPaint,
      largestContentfulPaint,
      timeToInteractive,
      speedIndex,
      visualProgress
    }
  }, [])

  // Perform complete analysis
  const performAnalysis = useCallback(async (): Promise<LoadingAnalysis> => {
    if (!enabled || isAnalyzing) {
      return {
        phases: [],
        resources: [],
        criticalResources: [],
        slowResources: [],
        cachedResources: [],
        totalLoadTime: 0,
        domContentLoaded: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        timeToInteractive: 0,
        speedIndex: 0,
        visualProgress: []
      }
    }

    setIsAnalyzing(true)

    try {
      // Wait a bit for all resources to be captured
      await new Promise(resolve => setTimeout(resolve, 100))

      const phases = analyzePhases()
      const resources = analyzeResources()
      const criticalResources = calculateCriticalPath()
      const slowResources = resources.filter(r => r.duration > threshold)
      const cachedResources = resources.filter(r => r.cached)
      const metrics = calculateMetrics()

      const result: LoadingAnalysis = {
        phases,
        resources,
        criticalResources,
        slowResources,
        cachedResources,
        ...metrics
      }

      setAnalysis(result)
      onLoadComplete?.(result)

      if (debugMode) {
        console.log('Load Analysis:', result)
      }

      return result
    } finally {
      setIsAnalyzing(false)
    }
  }, [
    enabled,
    isAnalyzing,
    analyzePhases,
    analyzeResources,
    analyzeCriticalPath,
    threshold,
    calculateMetrics,
    onLoadComplete,
    debugMode
  ])

  // Monitor user timing
  useEffect(() => {
    if (!trackUserTiming || !enabled) return

    const observeUserTiming = () => {
      if (!('PerformanceObserver' in window)) return

      try {
        observerRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              console.log(`User timing: ${entry.name} took ${entry.duration}ms`)
            }
          })
        })
        observerRef.current.observe({ entryTypes: ['measure', 'mark'] })
        return () => observerRef.current?.disconnect()
      } catch (error) {
        if (debugMode) {
          console.warn('User timing observation failed:', error)
        }
      }
    }

    const cleanup = observeUserTiming()
    return cleanup
  }, [trackUserTiming, enabled, debugMode])

  // Auto-analyze when page loads
  useEffect(() => {
    if (enabled) {
      const analyzeOnLoad = () => {
        if (document.readyState === 'complete') {
          performAnalysis()
        } else {
          window.addEventListener('load', performAnalysis)
        }
      }
      
      analyzeOnLoad()
    }
  }, [enabled, performAnalysis])

  // Performance recommendations
  const recommendations = useMemo(() => {
    if (!analysis) return []

    const recommendations: Array<{ type: 'error' | 'warning' | 'info', message: string, metric?: string }> = []

    // Slow total load time
    if (analysis.totalLoadTime > 3000) {
      recommendations.push({
        type: 'error',
        message: 'Total load time exceeds 3 seconds. Optimize critical resources.',
        metric: 'totalLoadTime'
      })
    }

    // Slow DOM content loaded
    if (analysis.domContentLoaded > 2000) {
      recommendations.push({
        type: 'warning',
        message: 'DOM content loaded time is slow. Optimize HTML parsing and CSS.',
        metric: 'domContentLoaded'
      })
    }

    // Slow first contentful paint
    if (analysis.firstContentfulPaint > 1500) {
      recommendations.push({
        type: 'warning',
        message: 'First contentful paint is slow. Optimize critical CSS and JavaScript.',
        metric: 'firstContentfulPaint'
      })
    }

    // Too many slow resources
    if (analysis.slowResources.length > 3) {
      recommendations.push({
        type: 'warning',
        message: `${analysis.slowResources.length} slow resources detected. Optimize or preload critical resources.`,
        metric: 'slowResources'
      })
    }

    // Low cache utilization
    const cacheRate = analysis.resources.length > 0 ? 
      (analysis.cachedResources.length / analysis.resources.length) * 100 : 0
    if (cacheRate < 30) {
      recommendations.push({
        type: 'info',
        message: 'Low cache utilization. Implement proper caching strategies.',
        metric: 'cachedResources'
      })
    }

    return recommendations
  }, [analysis])

  if (debugMode && process.env.NODE_ENV === 'development') {
    return (
      <div className={`fixed top-4 right-4 bg-green-900 text-white p-4 rounded-lg text-sm ${className}`}>
        <h3 className="font-bold mb-2">Load Analyzer</h3>
        {analysis ? (
          <>
            <div>Load Time: {analysis.totalLoadTime.toFixed(0)}ms</div>
            <div>DOM Ready: {analysis.domContentLoaded.toFixed(0)}ms</div>
            <div>FCP: {analysis.firstContentfulPaint.toFixed(0)}ms</div>
            <div>Resources: {analysis.resources.length}</div>
            <div>Critical: {analysis.criticalResources.length}</div>
            <div>Slow: {analysis.slowResources.length}</div>
            {recommendations.length > 0 && (
              <div className="mt-2">
                <div className="font-bold">Issues:</div>
                {recommendations.slice(0, 2).map((rec, index) => (
                  <div key={index} className={`text-xs ${
                    rec.type === 'error' ? 'text-red-300' : 
                    rec.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'
                  }`}>
                    • {rec.message}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>Analyzing...</div>
        )}
      </div>
    )
  }

  return null
}

// Hook for load analysis
export const useLoadAnalyzer = () => {
  const [analysis, setAnalysis] = useState<LoadingAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runAnalysis = useCallback(async () => {
    setIsLoading(true)
    try {
      // This would implement the same logic as the component
      // For now, return placeholder data
      const mockAnalysis: LoadingAnalysis = {
        phases: [],
        resources: [],
        criticalResources: [],
        slowResources: [],
        cachedResources: [],
        totalLoadTime: 0,
        domContentLoaded: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        timeToInteractive: 0,
        speedIndex: 0,
        visualProgress: []
      }
      setAnalysis(mockAnalysis)
      return mockAnalysis
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getResourceByType = useCallback((type: ResourceTiming['type']) => {
    if (!analysis) return []
    return analysis.resources.filter(r => r.type === type)
  }, [analysis])

  const getSlowResources = useCallback(() => {
    return analysis?.slowResources || []
  }, [analysis])

  return {
    analysis,
    isLoading,
    runAnalysis,
    getResourceByType,
    getSlowResources
  }
}

// Export component and types
export default LoadAnalyzer

export type { LoadingAnalysis, LoadingPhase, ResourceTiming, LoadAnalyzerProps }
