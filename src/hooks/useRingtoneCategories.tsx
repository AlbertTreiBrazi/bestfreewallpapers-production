// ============================================================================
// 🎵 useRingtoneCategories.tsx — Hook pentru fetch categorii ringtones
// ============================================================================
// Returnează genuri (8), mood-uri (6) și use cases (4), grupate.
// Cache-uit timp de 5 minute (categoriile se schimbă rar).
// ============================================================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface RingtoneCategory {
  id: number
  name: string
  slug: string
  description: string | null
  category_type: 'genre' | 'mood' | 'use_case'
  sort_order: number
  preview_image: string | null
  seo_title: string | null
  seo_description: string | null
  ringtones_count: number
}

export interface RingtoneCategoriesData {
  genres: RingtoneCategory[]
  moods: RingtoneCategory[]
  use_cases: RingtoneCategory[]
  all: RingtoneCategory[]
}

// Simple in-memory cache (5 min TTL)
let cachedData: RingtoneCategoriesData | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

export function useRingtoneCategories() {
  const [data, setData] = useState<RingtoneCategoriesData>(
    cachedData || { genres: [], moods: [], use_cases: [], all: [] }
  )
  const [loading, setLoading] = useState(!cachedData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCategories() {
      // Return cached if fresh
      const isCacheFresh = cachedData && Date.now() - cachedAt < CACHE_TTL_MS
      if (isCacheFresh) {
        setData(cachedData!)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data: response, error: fnError } = await supabase.functions.invoke(
          'ringtone-categories-api',
          { body: {} }
        )

        if (cancelled) return

        if (fnError) {
          throw new Error(fnError.message || 'Failed to load categories')
        }

        const payload = response?.data
        if (!payload) {
          throw new Error('Invalid response from ringtone-categories-api')
        }

        const result: RingtoneCategoriesData = {
          genres: payload.genres || [],
          moods: payload.moods || [],
          use_cases: payload.use_cases || [],
          all: payload.all || [],
        }

        cachedData = result
        cachedAt = Date.now()
        setData(result)
      } catch (e: any) {
        if (cancelled) return
        console.error('[useRingtoneCategories] error:', e)
        setError(e?.message || 'Failed to load categories')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCategories()

    return () => {
      cancelled = true
    }
  }, [])

  return { ...data, loading, error }
}
