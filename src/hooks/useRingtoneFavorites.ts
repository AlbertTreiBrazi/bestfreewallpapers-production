// ============================================================================
// 🎵 useRingtoneFavorites.ts — Hook pentru favorite ringtones
// ============================================================================
// Folosește direct Supabase DB (tabela ringtone_favorites).
// Pattern identic cu useFavorites.ts de la wallpapere.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function useRingtoneFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  // ---- Load user's ringtone favorites ----
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ringtone_favorites')
        .select('ringtone_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[useRingtoneFavorites] load error:', error)
        return
      }

      setFavorites(data?.map(item => item.ringtone_id) || [])
    } catch (err) {
      console.error('[useRingtoneFavorites] unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // ---- Check if ringtone is favorite ----
  const isFavorite = useCallback(
    (ringtoneId: number) => favorites.includes(ringtoneId),
    [favorites]
  )

  // ---- Toggle favorite ----
  const toggleFavorite = useCallback(
    async (ringtoneId: number, ringtoneTitle: string) => {
      if (!user) {
        toast.error('Please sign in to add favorites')
        return false
      }

      const isCurrentlyFavorite = favorites.includes(ringtoneId)

      try {
        if (isCurrentlyFavorite) {
          // Remove
          const { error } = await supabase
            .from('ringtone_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('ringtone_id', ringtoneId)

          if (error) throw error

          setFavorites(prev => prev.filter(id => id !== ringtoneId))
          toast.success('Removed from favorites')
        } else {
          // Add
          const { error } = await supabase
            .from('ringtone_favorites')
            .insert({ user_id: user.id, ringtone_id: ringtoneId })

          if (error) {
            // 23505 = unique violation (already exists) — ignorăm silențios
            if (error.code === '23505') {
              setFavorites(prev =>
                prev.includes(ringtoneId) ? prev : [...prev, ringtoneId]
              )
              return true
            }
            throw error
          }

          setFavorites(prev => [...prev, ringtoneId])
          toast.success(`"${ringtoneTitle}" added to favorites!`)
        }

        return true
      } catch (err: any) {
        console.error('[useRingtoneFavorites] toggle error:', err)
        toast.error(err.message || 'Failed to update favorites')
        return false
      }
    },
    [user, favorites]
  )

  return { favorites, loading, isFavorite, toggleFavorite, loadFavorites }
}
