// ============================================================================
// 🎬 useLiveWallpapers.tsx — Hook pentru fetch live wallpapers
// ============================================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { LiveWallpaper } from '@/components/livewallpapers/LiveWallpaperCard'

export interface LiveWallpaperFilters {
  search?: string
  sort?: 'newest' | 'popular' | 'downloads'
  onlyFree?: boolean
  pageSize?: number
}

export function useLiveWallpapers(filters: LiveWallpaperFilters = {}) {
  const { search = '', sort = 'newest', onlyFree = false, pageSize = 24 } = filters
  const [wallpapers, setWallpapers] = useState<LiveWallpaper[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const pageRef = useRef(0)

  const fetchWallpapers = useCallback(async (page: number, append: boolean) => {
    try {
      if (page === 0) setLoading(true)
      else setLoadingMore(true)

      const { data, error: fnError } = await supabase.functions.invoke('live-wallpapers-api', {
        body: {
          action: 'list',
          page,
          pageSize,
          search: search || undefined,
          sort,
          onlyFree,
        },
      })

      if (fnError) throw fnError

      const items: LiveWallpaper[] = data?.wallpapers || []
      const totalCount: number = data?.total || 0

      setTotal(totalCount)
      setHasMore((page + 1) * pageSize < totalCount)
      setWallpapers(prev => append ? [...prev, ...items] : items)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load live wallpapers')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search, sort, onlyFree, pageSize])

  useEffect(() => {
    pageRef.current = 0
    fetchWallpapers(0, false)
  }, [fetchWallpapers])

  const loadMore = useCallback(() => {
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage
    fetchWallpapers(nextPage, true)
  }, [fetchWallpapers])

  return { wallpapers, loading, loadingMore, error, hasMore, total, loadMore }
}
