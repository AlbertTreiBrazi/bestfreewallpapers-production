import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'

import { useFavorites } from '@/hooks/useFavorites'
import { Heart, Loader2, Star, Music2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'
import { handleAndLogError, serializeError } from '@/utils/errorFormatting'
import { useRingtoneFavorites } from '@/hooks/useRingtoneFavorites'

export function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { favorites: favoriteIds, loading: favoritesLoading } = useFavorites()
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'ringtones'>('wallpapers')
  const [favoriteWallpapers, setFavoriteWallpapers] = useState<any[]>([])

  // Ringtone favorites
  const { favorites: ringtoneFavIds, loading: ringtonesLoading } = useRingtoneFavorites()
  const [favoriteRingtones, setFavoriteRingtones] = useState<any[]>([])

  // Load favorite ringtones details
  useEffect(() => {
    async function loadFavoriteRingtones() {
      if (!user || ringtoneFavIds.length === 0) {
        setFavoriteRingtones([])
        return
      }
      const { data } = await supabase
        .from('ringtones')
        .select('id, title, slug, duration_seconds, downloads_count')
        .in('id', ringtoneFavIds)
        .eq('is_published', true)
      if (data) {
        const sorted = ringtoneFavIds
          .map(id => data.find(r => r.id === id))
          .filter(Boolean)
        setFavoriteRingtones(sorted)
      }
    }
    if (!authLoading && !ringtonesLoading) loadFavoriteRingtones()
  }, [user, ringtoneFavIds, authLoading, ringtonesLoading])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)



  // Load favorite wallpapers when favorite IDs change
  useEffect(() => {
    async function loadFavoriteWallpapers() {
      if (!user) {
        setFavoriteWallpapers([])
        setLoading(false)
        return
      }

      if (favoriteIds.length === 0) {
        setFavoriteWallpapers([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Fetch wallpaper details for each favorite ID
        const { data: wallpapers, error: wallpapersError } = await supabase
          .from('wallpapers')
          .select(`
            id,
            title,
            slug,
            thumbnail_url,
            image_url,
            download_url,
            resolution_1080p,
            resolution_4k,
            resolution_8k,
            download_count,
            is_premium,
            width,
            height,
            device_type,
            created_at,
            tags
          `)
          .in('id', favoriteIds)
          .eq('is_published', true)
          .order('id', { ascending: false })

        if (wallpapersError) {
          throw wallpapersError
        }

        // Sort wallpapers by the order they appear in favoriteIds (most recent first)
        const sortedWallpapers = favoriteIds
          .map(id => wallpapers?.find(w => w.id === id))
          .filter(Boolean)

        setFavoriteWallpapers(sortedWallpapers)
      } catch (error: any) {
        console.error('Failed to load favorite wallpapers:', error)
        const errorMessage = handleAndLogError(error, 'favorite wallpapers fetch')
        setError(errorMessage)
        toast.error('Failed to load favorites')
      } finally {
        setLoading(false)
      }
    }

    // Only load when auth loading is done and we have user status
    if (!authLoading && !favoritesLoading) {
      loadFavoriteWallpapers()
    }
  }, [user, favoriteIds, authLoading, favoritesLoading])

  // Show auth modal for guest users
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
            <p className="text-gray-600 mb-6">Sign in to view and manage your favorite wallpapers</p>
            <div className="space-y-3">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In to View Favorites
              </button>
              <div>
                <button
                  onClick={() => window.location.href = '/free-wallpapers'}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Browse Wallpapers
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    )
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your favorites...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <Heart className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
            <p className="text-red-600 mb-6">{serializeError(error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center space-x-3 mb-6">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('wallpapers')}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition -mb-px ${
                activeTab === 'wallpapers'
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${activeTab === 'wallpapers' ? 'fill-current' : ''}`} />
              Wallpapers
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {favoriteWallpapers.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ringtones')}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition -mb-px ${
                activeTab === 'ringtones'
                  ? 'border-red-500 text-red-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Music2 className="w-4 h-4" />
              Ringtones
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {favoriteRingtones.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Wallpapers Tab */}
        {activeTab === 'wallpapers' && (
          favoriteWallpapers.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Heart className="w-16 h-16 text-gray-300" />
                  <Star className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No wallpapers yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Click the ❤️ icon on any wallpaper to save it here
              </p>
              <Link to="/free-wallpapers" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block">
                Browse Wallpapers
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {favoriteWallpapers.map((wallpaper) => (
                <EnhancedWallpaperCardAdapter
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  variant="compact"
                />
              ))}
            </div>
          )
        )}

        {/* Ringtones Tab */}
        {activeTab === 'ringtones' && (
          favoriteRingtones.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No ringtones yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Click ❤️ Add to Favorites on any ringtone page to save it here
              </p>
              <Link to="/ringtones" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block">
                Browse Ringtones
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {favoriteRingtones.map((ringtone) => (
                <Link
                  key={ringtone.id}
                  to={`/ringtone/${ringtone.slug}`}
                  className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-100 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Music2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-blue-600 transition">{ringtone.title}</p>
                      <p className="text-xs text-gray-500">{ringtone.duration_seconds}s · {ringtone.downloads_count || 0} downloads</p>
                    </div>
                  </div>
                  <span className="text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition">View →</span>
                </Link>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  )
}

export default FavoritesPage
