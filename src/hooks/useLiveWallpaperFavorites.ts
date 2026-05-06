// ============================================================================
// 🎬 useLiveWallpaperFavorites.ts — Hook pentru favorite live wallpapers
// ============================================================================
// Pattern identic cu useRingtoneFavorites.ts
// Folosește tabela live_wallpaper_favorites din Supabase
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function useLiveWallpaperFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  // ── Load favorites ───────────────────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('live_wallpaper_favorites')
        .select('live_wallpaper_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[useLiveWallpaperFavorites] load error:', error)
        return
      }

      setFavorites(data?.map(item => item.live_wallpaper_id) || [])
    } catch (err) {
      console.error('[useLiveWallpaperFavorites] unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // ── Check if favorite ────────────────────────────────────────────────────
  const isFavorite = useCallback(
    (wallpaperId: number) => favorites.includes(wallpaperId),
    [favorites]
  )

  // ── Toggle favorite ──────────────────────────────────────────────────────
  const toggleFavorite = useCallback(
    async (wallpaperId: number, wallpaperTitle: string) => {
      if (!user) {
        toast.error('Please sign in to add favorites')
        return false
      }

      const isCurrentlyFavorite = favorites.includes(wallpaperId)

      try {
        if (isCurrentlyFavorite) {
          const { error } = await supabase
            .from('live_wallpaper_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('live_wallpaper_id', wallpaperId)

          if (error) throw error

          setFavorites(prev => prev.filter(id => id !== wallpaperId))
          toast.success('Removed from favorites')
        } else {
          const { error } = await supabase
            .from('live_wallpaper_favorites')
            .insert({ user_id: user.id, live_wallpaper_id: wallpaperId })

          if (error) {
            if (error.code === '23505') {
              setFavorites(prev =>
                prev.includes(wallpaperId) ? prev : [...prev, wallpaperId]
              )
              return true
            }
            throw error
          }

          setFavorites(prev => [...prev, wallpaperId])
          toast.success(`"${wallpaperTitle}" added to favorites!`)
        }

        return true
      } catch (err: any) {
        console.error('[useLiveWallpaperFavorites] toggle error:', err)
        toast.error(err.message || 'Failed to update favorites')
        return false
      }
    },
    [user, favorites]
  )

  return { favorites, loading, isFavorite, toggleFavorite, loadFavorites }
}
