// ============================================================================
// 🎵 useRingtones.tsx — Hook pentru fetch listing ringtones
// ============================================================================
// Folosește Supabase Edge Function `ringtones-api` cu paginare și filtre.
//
// Usage:
//   const { ringtones, loading, error, hasMore, loadMore } = useRingtones({
//     genre: 'rock',
//     mood: undefined,
//     useCase: undefined,
//     onlyFree: false,
//     search: '',
//     sort: 'newest'
//   });
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface RingtoneFilters {
  genre?: string
  mood?: string
  useCase?: string
  onlyFree?: boolean
  is_premium?: boolean
  search?: string
  sort?: 'newest' | 'popular' | 'downloads' | 'random'
  pageSize?: number
}

export interface Ringtone {
  id: number
  title: string
  slug: string
  description: string | null
  audio_url: string
  waveform_url: string | null
  duration_seconds: number
  genre_id: number | null
  mood_id: number | null
  use_case_id: number | null
  tags: string[] | null
  is_premium: boolean
  downloads_count: number
  plays_count: number
  created_at: string
  creator_name: string
}

export function useRingtones(filters: RingtoneFilters = {}) {
  const {
    genre,
    mood,
    useCase,
    onlyFree,
    is_premium,
    search,
    sort = 'newest',
    pageSize = 24,
  } = filters

  const [ringtones, setRingtones] = useState<Ringtone[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Track current request to allow cancellation on filter changes
  const abortRef = useRef<AbortController | null>(null)
  // Track filter signature to detect changes that should reset pagination
  const filterSig = JSON.stringify({ genre, mood, useCase, onlyFree, is_premium, search, sort })

  const fetchRingtones = useCallback(
    async (targetPage: number, append: boolean) => {
      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        if (append) {
          setLoadingMore(true)
        } else {
          setLoading(true)
        }
        setError(null)

        const { data, error: fnError } = await supabase.functions.invoke('ringtones-api', {
          body: {
            page: targetPage,
            limit: pageSize,
            genre: genre || undefined,
            mood: mood || undefined,
            use_case: useCase || undefined,
            onlyFree: onlyFree || undefined,
            is_premium: typeof is_premium === 'boolean' ? is_premium : undefined,
            search: search?.trim() || undefined,
            sort,
          },
        })

        if (controller.signal.aborted) return

        if (fnError) {
          throw new Error(fnError.message || 'Failed to load ringtones')
        }

        const payload = data?.data
        if (!payload || !Array.isArray(payload.ringtones)) {
          throw new Error('Invalid response from ringtones-api')
        }

        const newItems: Ringtone[] = payload.ringtones
        setTotal(payload.total || 0)
        setHasMore(targetPage < (payload.totalPages || 1))

        if (append) {
          // De-duplicate by id (avoid double entries on rapid scrolls)
          setRingtones((prev) => {
            const existingIds = new Set(prev.map((r) => r.id))
            const fresh = newItems.filter((r) => !existingIds.has(r.id))
            return [...prev, ...fresh]
          })
        } else {
          setRingtones(newItems)
        }
      } catch (e: any) {
        if (controller.signal.aborted) return
        console.error('[useRingtones] error:', e)
        setError(e?.message || 'Failed to load ringtones')
        if (!append) setRingtones([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [genre, mood, useCase, onlyFree, is_premium, search, sort, pageSize]
  )

  // Reset page to 1 and refetch when filters change
  useEffect(() => {
    setPage(1)
    fetchRingtones(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSig])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return
    const next = page + 1
    setPage(next)
    fetchRingtones(next, true)
  }, [loading, loadingMore, hasMore, page, fetchRingtones])

  const refresh = useCallback(() => {
    setPage(1)
    fetchRingtones(1, false)
  }, [fetchRingtones])

  return {
    ringtones,
    loading,
    loadingMore,
    error,
    page,
    total,
    hasMore,
    loadMore,
    refresh,
  }
}
