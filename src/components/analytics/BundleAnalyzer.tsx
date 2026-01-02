import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

interface BundleEntry {
  name: string
  size: number
  compressedSize: number
  percentage: number
  type: 'script' | 'style' | 'image' | 'font' | 'other'
  chunks: string[]
}

interface BundleAnalysis {
  totalSize: number
  totalCompressedSize: number
  scripts: BundleEntry[]
  styles: BundleEntry[]
  images: BundleEntry[]
  fonts: BundleEntry[]
  other: BundleEntry[]
  chunks: BundleEntry[]
  gzipRatio: number
  brotliRatio: number
}

interface BundleAnalyzerProps {
  enabled?: boolean
  autoAnalyze?: boolean
  analyzeOnLoad?: boolean
  chunkAnalysis?: boolean
  gzipAnalysis?: boolean
  analyzeInterval?: number
  maxEntries?: number
  debugMode?: boolean
  onAnalysis?: (analysis: BundleAnalysis) => void
  onChunkLoad?: (chunkName: string, loadTime: number) => void
  className?: string
}

/**
 * Bundle size analyzer and optimizer
 * Monitors bundle sizes, chunk loading times, and compression ratios
 */
export const BundleAnalyzer: React.FC<BundleAnalyzerProps> = ({
  enabled = true,
  autoAnalyze = true,
  analyzeOnLoad = true,
  chunkAnalysis = true,
  gzipAnalysis = true,
  analyzeInterval = 5000,
  maxEntries = 50,
  debugMode = false,
  onAnalysis,
  onChunkLoad,
  className
}) => {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunkLoadTimes = useRef<Map<string, number>>(new Map())

  // Analyze bundle sizes
  const analyzeBundle = useCallback(async (): Promise<BundleAnalysis> => {
    if (typeof window === 'undefined' || !enabled) {
      return {
        totalSize: 0,
        totalCompressedSize: 0,
        scripts: [],
        styles: [],
        images: [],
        fonts: [],
        other: [],
        chunks: [],
        gzipRatio: 0,
        brotliRatio: 0
      }
    }

    try {
      setIsAnalyzing(true)

      // Get all resources from performance API
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      // Filter and categorize resources
      const categorizedResources = resources.slice(-maxEntries).map(resource => {
        const url = new URL(resource.name)
        const pathParts = url.pathname.split('/')
        const fileName = pathParts[pathParts.length - 1]
        const extension = fileName.split('.').pop()?.toLowerCase() || ''
        
        let type: BundleEntry['type'] = 'other'
        if (['js', 'mjs', 'cjs'].includes(extension)) type = 'script'
        else if (['css', 'scss', 'less'].includes(extension)) type = 'style'
        else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(extension)) type = 'image'
        else if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) type = 'font'

        return {
          name: fileName,
          size: resource.transferSize || 0,
          compressedSize: resource.decodedBodySize || resource.transferSize || 0,
          percentage: 0, // Will be calculated after total
          type,
          chunks: [fileName]
        }
      })

      // Group by type
      const scripts = categorizedResources.filter(r => r.type === 'script')
      const styles = categorizedResources.filter(r => r.type === 'style')
      const images = categorizedResources.filter(r => r.type === 'image')
      const fonts = categorizedResources.filter(r => r.type === 'font')
      const other = categorizedResources.filter(r => r.type === 'other')

      // Calculate total size
      const totalSize = categorizedResources.reduce((sum, r) => sum + r.size, 0)
      const totalCompressedSize = categorizedResources.reduce((sum, r) => sum + r.compressedSize, 0)

      // Calculate percentages
      scripts.forEach(r => r.percentage = totalSize > 0 ? (r.size / totalSize) * 100 : 0)
      styles.forEach(r => r.percentage = totalSize > 0 ? (r.size / totalSize) * 100 : 0)
      images.forEach(r => r.percentage = totalSize > 0 ? (r.size / totalSize) * 100 : 0)
      fonts.forEach(r => r.percentage = totalSize > 0 ? (r.size / totalSize) * 100 : 0)
      other.forEach(r => r.percentage = totalSize > 0 ? (r.size / totalSize) * 100 : 0)

      // Get chunks if chunk analysis is enabled
      const chunks: BundleEntry[] = []
      if (chunkAnalysis && 'getEntriesByType' in performance) {
        try {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            // Estimate chunks from transfer size
            const estimatedChunks = Math.ceil(totalSize / 500000) // Rough estimate
            for (let i = 1; i <= estimatedChunks; i++) {
              chunks.push({
                name: `chunk-${i}`,
                size: totalSize / estimatedChunks,
                compressedSize: totalCompressedSize / estimatedChunks,
                percentage: 100 / estimatedChunks,
                type: 'script',
                chunks: [`chunk-${i}`]
              })
            }
          }
        } catch (error) {
          if (debugMode) {
            console.warn('Chunk analysis failed:', error)
          }
        }
      }

      // Calculate compression ratios
      const gzipRatio = totalSize > 0 ? ((totalSize - totalCompressedSize) / totalSize) * 100 : 0
      const brotliRatio = totalSize > 0 ? ((totalSize - totalCompressedSize * 0.85) / totalSize) * 100 : 0 // Rough brotli estimate

      const result: BundleAnalysis = {
        totalSize,
        totalCompressedSize,
        scripts,
        styles,
        images,
        fonts,
        other,
        chunks,
        gzipRatio,
        brotliRatio
      }

      setAnalysis(result)
      onAnalysis?.(result)

      if (debugMode) {
        console.log('Bundle Analysis:', result)
      }

      return result
    } catch (error) {
      console.error('Bundle analysis failed:', error)
      return {
        totalSize: 0,
        totalCompressedSize: 0,
        scripts: [],
        styles: [],
        images: [],
        fonts: [],
        other: [],
        chunks: [],
        gzipRatio: 0,
        brotliRatio: 0
      }
    } finally {
      setIsAnalyzing(false)
    }
  }, [enabled, maxEntries, chunkAnalysis, gzipAnalysis, debugMode, onAnalysis])

  // Monitor chunk loading times
  useEffect(() => {
    if (!chunkAnalysis || !enabled) return

    const observeChunks = () => {
      if (!('PerformanceObserver' in window)) return

      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            const resource = entry as PerformanceResourceTiming
            const url = new URL(resource.name)
            const fileName = url.pathname.split('/').pop() || ''
            
            if (fileName.match(/\.(js|mjs|cjs)$/)) {
              const loadTime = entry.duration
              chunkLoadTimes.current.set(fileName, loadTime)
              onChunkLoad?.(fileName, loadTime)
              
              if (debugMode) {
                console.log(`Chunk loaded: ${fileName} in ${loadTime.toFixed(2)}ms`)
              }
            }
          })
        })
        
        observer.observe({ entryTypes: ['resource'] })
        return () => observer.disconnect()
      } catch (error) {
        if (debugMode) {
          console.warn('Chunk monitoring failed:', error)
        }
      }
    }

    const cleanup = observeChunks()
    return cleanup
  }, [chunkAnalysis, enabled, debugMode, onChunkLoad])

  // Auto-analyze on load
  useEffect(() => {
    if (analyzeOnLoad && enabled) {
      const analyzeOnPageLoad = () => {
        if (document.readyState === 'complete') {
          analyzeBundle()
        } else {
          window.addEventListener('load', analyzeBundle)
        }
      }
      
      analyzeOnPageLoad()
    }
  }, [analyzeOnLoad, enabled, analyzeBundle])

  // Auto-analyze interval
  useEffect(() => {
    if (!autoAnalyze || !enabled) return

    intervalRef.current = setInterval(() => {
      analyzeBundle()
    }, analyzeInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoAnalyze, enabled, analyzeInterval, analyzeBundle])

  // Bundle optimization suggestions
  const optimizationSuggestions = useMemo(() => {
    if (!analysis) return []

    const suggestions: Array<{ type: 'warning' | 'info' | 'error', message: string, metric?: string }> = []

    // Large bundle size
    if (analysis.totalSize > 1000000) { // 1MB
      suggestions.push({
        type: 'error',
        message: 'Bundle size exceeds 1MB. Consider code splitting and tree shaking.',
        metric: 'totalSize'
      })
    }

    // Large JavaScript bundles
    if (analysis.scripts.some(s => s.size > 250000)) { // 250KB
      suggestions.push({
        type: 'warning',
        message: 'Large JavaScript bundle detected. Implement code splitting.',
        metric: 'scripts'
      })
    }

    // Large CSS bundles
    if (analysis.styles.some(s => s.size > 50000)) { // 50KB
      suggestions.push({
        type: 'warning',
        message: 'Large CSS bundle detected. Consider purging unused CSS.',
        metric: 'styles'
      })
    }

    // Large images
    if (analysis.images.some(i => i.size > 100000)) { // 100KB
      suggestions.push({
        type: 'info',
        message: 'Large images detected. Consider image optimization and WebP format.',
        metric: 'images'
      })
    }

    // Poor compression
    if (analysis.gzipRatio < 50) {
      suggestions.push({
        type: 'warning',
        message: 'Low compression ratio. Enable gzip/brotli compression.',
        metric: 'gzipRatio'
      })
    }

    return suggestions
  }, [analysis])

  // Performance summary
  const performanceSummary = useMemo(() => {
    if (!analysis) return null

    const score = {
      total: 0,
      breakdown: {
        size: analysis.totalSize < 500000 ? 20 : analysis.totalSize < 1000000 ? 15 : 10,
        compression: analysis.gzipRatio > 70 ? 20 : analysis.gzipRatio > 50 ? 15 : 10,
        chunking: analysis.chunks.length > 0 ? 20 : 10,
        images: analysis.images.length < 10 ? 20 : 10,
        scripts: analysis.scripts.length < 5 ? 20 : 10
      }
    }
    score.total = Object.values(score.breakdown).reduce((sum, val) => sum + val, 0)

    return {
      score,
      grade: score.total >= 90 ? 'A' : score.total >= 80 ? 'B' : score.total >= 70 ? 'C' : 'D',
      isOptimized: score.total >= 80
    }
  }, [analysis])

  if (debugMode && process.env.NODE_ENV === 'development') {
    return (
      <div className={`fixed bottom-4 left-4 bg-blue-900 text-white p-4 rounded-lg text-sm ${className}`}>
        <h3 className="font-bold mb-2">Bundle Analyzer</h3>
        {analysis ? (
          <>
            <div>Total Size: {(analysis.totalSize / 1024).toFixed(1)}KB</div>
            <div>Compressed: {(analysis.totalCompressedSize / 1024).toFixed(1)}KB</div>
            <div>Compression: {analysis.gzipRatio.toFixed(1)}%</div>
            <div>Scripts: {analysis.scripts.length} files</div>
            <div>Chunks: {analysis.chunks.length}</div>
            {performanceSummary && (
              <div className="mt-2">
                <div>Score: {performanceSummary.score.total}/100 ({performanceSummary.grade})</div>
                <div>Optimized: {performanceSummary.isOptimized ? '✅' : '❌'}</div>
              </div>
            )}
            {optimizationSuggestions.length > 0 && (
              <div className="mt-2">
                <div className="font-bold">Suggestions:</div>
                {optimizationSuggestions.slice(0, 2).map((suggestion, index) => (
                  <div key={index} className={`text-xs ${
                    suggestion.type === 'error' ? 'text-red-300' : 
                    suggestion.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'
                  }`}>
                    • {suggestion.message}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>No analysis data</div>
        )}
      </div>
    )
  }

  return null
}

// Hook for bundle analysis
export const useBundleAnalyzer = () => {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runAnalysis = useCallback(async () => {
    setIsLoading(true)
    try {
      // This would implement the same logic as the component
      // For now, return placeholder data
      const mockAnalysis: BundleAnalysis = {
        totalSize: 0,
        totalCompressedSize: 0,
        scripts: [],
        styles: [],
        images: [],
        fonts: [],
        other: [],
        chunks: [],
        gzipRatio: 0,
        brotliRatio: 0
      }
      setAnalysis(mockAnalysis)
      return mockAnalysis
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getBundleSize = useCallback((type?: BundleEntry['type']) => {
    if (!analysis) return 0
    if (type) {
      return (analysis as any)[type].reduce((sum: number, entry: BundleEntry) => sum + entry.size, 0)
    }
    return analysis.totalSize
  }, [analysis])

  return {
    analysis,
    isLoading,
    runAnalysis,
    getBundleSize
  }
}

// Export component and types
export default BundleAnalyzer

export type { BundleAnalysis, BundleEntry, BundleAnalyzerProps }
