// ============================================================================
// 🎵 useRingtoneDetail.tsx — Hook pentru fetch detalii unui ringtone
// ============================================================================
// Folosește Supabase Edge Function `ringtone-detail`.
// Returnează ringtone-ul + categoria + ringtone-uri similare.
// ============================================================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ringtone } from '@/hooks/useRingtones'

export interface RingtoneCategoryInfo {
  id: number
  name: string
  slug: string
  description: string | null
  category_type: 'genre' | 'mood' | 'use_case'
}

export interface RingtoneDetail extends Ringtone {
  m4r_url?: string | null
  file_size_bytes?: number | null
  bitrate_kbps?: number | null
  is_active?: boolean
  is_published?: boolean
  visibility?: string
  likes_count?: number
  creator_url?: string
  seo_title?: string | null
  seo_description?: string | null
  meta_keywords?: string[] | null
  ai_generated?: boolean
  ai_tool?: string | null
  updated_at?: string
  published_at?: string | null

  genre?: RingtoneCategoryInfo | null
  mood?: RingtoneCategoryInfo | null
  use_case?: RingtoneCategoryInfo | null
}

export function useRingtoneDetail(slug: string | undefined) {
  const [ringtone, setRingtone] = useState<RingtoneDetail | null>(null)
  const [related, setRelated] = useState<Ringtone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchDetail() {
      if (!slug) {
        setLoading(false)
        setError('No slug provided')
        return
      }

      try {
        setLoading(true)
        setError(null)
        setNotFound(false)

        const { data, error: fnError } = await supabase.functions.invoke('ringtone-detail', {
          body: { slug },
        })

        if (cancelled) return

        if (fnError) {
          // Treat 404 as "not found" rather than an error
          const msg = fnError.message?.toLowerCase() || ''
          if (msg.includes('not_found') || msg.includes('404')) {
            setNotFound(true)
            return
          }
          throw new Error(fnError.message || 'Failed to load ringtone')
        }

        if (data?.success === false || data?.error === 'not_found') {
          setNotFound(true)
          return
        }

        const payload = data?.data
        if (!payload?.ringtone) {
          setNotFound(true)
          return
        }

        setRingtone(payload.ringtone as RingtoneDetail)
        setRelated(Array.isArray(payload.related) ? payload.related : [])
      } catch (e: any) {
        if (cancelled) return
        console.error('[useRingtoneDetail] error:', e)
        setError(e?.message || 'Failed to load ringtone')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetail()

    return () => {
      cancelled = true
    }
  }, [slug])

  return { ringtone, related, loading, error, notFound }
}
