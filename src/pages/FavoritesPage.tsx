import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { EnhancedWallpaperCardAdapter } from '@/components/wallpapers/EnhancedWallpaperCardAdapter'
import { RingtoneCard } from '@/components/ringtones/RingtoneCard'
import { LiveWallpaperCard } from '@/components/livewallpapers/LiveWallpaperCard'
import { RingtoneDownloadModal } from '@/components/ringtones/RingtoneDownloadModal'
import { LiveWallpaperDownloadModal } from '@/components/livewallpapers/LiveWallpaperDownloadModal'
import { useRingtoneDownload } from '@/hooks/useRingtoneDownload'
import { useLiveWallpaperDownload } from '@/hooks/useLiveWallpaperDownload'
import { useFavorites } from '@/hooks/useFavorites'
import { Heart, Loader2, Star, Music2, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'
import { handleAndLogError, serializeError } from '@/utils/errorFormatting'
import { useRingtoneFavorites } from '@/hooks/useRingtoneFavorites'
import { useLiveWallpaperFavorites } from '@/hooks/useLiveWallpaperFavorites'

export function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { favorites: favoriteIds, loading: favoritesLoading } = useFavorites()
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'ringtones' | 'live'>('wallpapers')
  const [favoriteWallpapers, setFavoriteWallpapers] = useState<any[]>([])
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Ringtone favorites
  const { favorites: ringtoneFavIds, loading: ringtonesLoading } = useRingtoneFavorites()
  const [favoriteRingtones, setFavoriteRingtones] = useState<any[]>([])

  // Live wallpaper favorites
  const { favorites: liveFavIds, loading: liveLoading } = useLiveWallpaperFavorites()
  const [favoriteLiveWallpapers, setFavoriteLiveWallpapers] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ringtone download cu ads — identic cu RingtonesPage
  const {
    isDownloadModalOpen: isRingtoneModalOpen,
    isDownloading: isRingtoneDownloading,
    showAdTimer: showRingtoneAdTimer,
    timerDuration: ringtoneDuration,
    openDownloadModal: openRingtoneDownload,
    closeDownloadModal: closeRingtoneDownload,
    startDownload: startRingtoneDownload,
    handleTimerComplete: handleRingtoneTimerComplete,
    currentRingtone,
    userType: ringtoneUserType,
  } = useRingtoneDownload({ onAuthRequired: () => setIsAuthModalOpen(true) })

  // Live wallpaper download cu ads — identic cu LiveWallpapersPage
  const {
    isDownloadModalOpen: isLiveModalOpen,
    isDownloading: isLiveDownloading,
    showAdTimer: showLiveAdTimer,
    timerDuration: liveDuration,
    openDownloadModal: openLiveDownload,
    closeDownloadModal: closeLiveDownload,
    startDownload: startLiveDownload,
    handleTimerComplete: handleLiveTimerComplete,
    currentWallpaper: currentLiveWallpaper,
    userType: liveUserType,
  } = useLiveWallpaperDownload({ onAuthRequired: () => setIsAuthModalOpen(true) })

  // Load favorite ringtones — toate campurile pentru RingtoneCard
  useEffect(() => {
    async function loadFavoriteRingtones() {
      if (!user || ringtoneFavIds.length === 0) { setFavoriteRingtones([]); return }
      const { data } = await supabase
        .from('ringtones')
        .select('id, title, slug, description, audio_url, waveform_url, cover_image_url, duration_seconds, genre_id, mood_id, use_case_id, tags, is_premium, downloads_count, plays_count, created_at, creator_name')
        .in('id', ringtoneFavIds)
        .eq('is_published', true)
      if (data) {
        const sorted = ringtoneFavIds.map(id => data.find(r => r.id === id)).filter(Boolean)
        setFavoriteRingtones(sorted)
      }
    }
    if (!authLoading && !ringtonesLoading) loadFavoriteRingtones()
  }, [user, ringtoneFavIds, authLoading, ringtonesLoading])

  // Load favorite live wallpapers — toate campurile pentru LiveWallpaperCard
  useEffect(() => {
    async function loadFavoriteLiveWallpapers() {
      if (!user || liveFavIds.length === 0) { setFavoriteLiveWallpapers([]); return }
      const { data } = await supabase
        .from('live_wallpapers')
        .select('id, title, slug, description, video_url, thumbnail_url, duration_seconds, tags, category, is_premium, is_published, downloads_count, views_count, created_at')
        .in('id', liveFavIds)
        .eq('is_published', true)
        .eq('is_active', true)
      if (data) {
        const sorted = liveFavIds.map(id => data.find(w => w.id === id)).filter(Boolean)
        setFavoriteLiveWallpapers(sorted)
      }
    }
    if (!authLoading && !liveLoading) loadFavoriteLiveWallpapers()
  }, [user, liveFavIds, authLoading, liveLoading])

  // Load favorite wallpapers
  useEffect(() => {
    async function loadFavoriteWallpapers() {
      if (!user) { setFavoriteWallpapers([]); setLoading(false); return }
      if (favoriteIds.length === 0) { setFavoriteWallpapers([]); setLoading(false); return }
      try {
        setLoading(true)
        setError(null)
        const { data: wallpapers, error: wallpapersError } = await supabase
          .from('wallpapers')
          .select(`id, title, slug, thumbnail_url, image_url, download_url, resolution_1080p, resolution_4k, resolution_8k, download_count, is_premium, width, height, device_type, created_at, tags`)
          .in('id', favoriteIds)
          .eq('is_published', true)
          .order('id', { ascending: false })
        if (wallpapersError) throw wallpapersError
        const sortedWallpapers = favoriteIds.map(id => wallpapers?.find(w => w.id === id)).filter(Boolean)
        setFavoriteWallpapers(sortedWallpapers)
      } catch (error: any) {
        const errorMessage = handleAndLogError(error, 'favorite wallpapers fetch')
        setError(errorMessage)
        toast.error('Failed to load favorites')
      } finally {
        setLoading(false)
      }
    }
    if (!authLoading && !favoritesLoading) loadFavoriteWallpapers()
  }, [user, favoriteIds, authLoading, favoritesLoading])

  // Nu afisa nimic cat timp se verifica autentificarea — fix pentru flash
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
          <p className="text-gray-600 mb-6">Sign in to view and manage your favorites</p>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In to View Favorites
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Heart className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
          <p className="text-red-600 mb-6">{serializeError(error)}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Try Again
          </button>
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
                activeTab === 'wallpapers' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${activeTab === 'wallpapers' ? 'fill-current' : ''}`} />
              Wallpapers
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{favoriteWallpapers.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('ringtones')}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition -mb-px ${
                activeTab === 'ringtones' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Music2 className="w-4 h-4" />
              Ringtones
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{favoriteRingtones.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition -mb-px ${
                activeTab === 'live' ? 'border-purple-500 text-purple-500' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Video className="w-4 h-4" />
              Live Wallpapers
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{favoriteLiveWallpapers.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Wallpapers Tab */}
        {activeTab === 'wallpapers' && (
          loading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : favoriteWallpapers.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Heart className="w-16 h-16 text-gray-300" />
                  <Star className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No wallpapers yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Click the ❤️ icon on any wallpaper to save it here</p>
              <Link to="/free-wallpapers" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block">
                Browse Wallpapers
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {favoriteWallpapers.map((wallpaper) => (
                <EnhancedWallpaperCardAdapter key={wallpaper.id} wallpaper={wallpaper} variant="compact" />
              ))}
            </div>
          )
        )}

        {/* Ringtones Tab — RingtoneCard cu sistemul de ads */}
        {activeTab === 'ringtones' && (
          ringtonesLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : favoriteRingtones.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No ringtones yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Click ❤️ on any ringtone to save it here</p>
              <Link to="/ringtones" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block">
                Browse Ringtones
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {favoriteRingtones.map((ringtone) => (
                <RingtoneCard
                  key={ringtone.id}
                  ringtone={ringtone}
                  onDownload={openRingtoneDownload}
                />
              ))}
            </div>
          )
        )}

        {/* Live Wallpapers Tab — LiveWallpaperCard cu sistemul de ads */}
        {activeTab === 'live' && (
          liveLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : favoriteLiveWallpapers.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No live wallpapers yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Click ❤️ on any live wallpaper to save it here</p>
              <Link to="/live-wallpapers" className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium inline-block">
                Browse Live Wallpapers
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favoriteLiveWallpapers.map((wallpaper) => (
                <LiveWallpaperCard
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  onDownload={openLiveDownload}
                />
              ))}
            </div>
          )
        )}

      </div>

      {/* Ringtone Download Modal cu ads — identic cu RingtonesPage */}
      <RingtoneDownloadModal
        isOpen={isRingtoneModalOpen}
        onClose={closeRingtoneDownload}
        ringtone={currentRingtone}
        showAdTimer={showRingtoneAdTimer}
        timerDuration={ringtoneDuration}
        onTimerComplete={handleRingtoneTimerComplete}
        onDownload={startRingtoneDownload}
        isDownloading={isRingtoneDownloading}
        userType={ringtoneUserType}
      />

      {/* Live Wallpaper Download Modal cu ads — identic cu LiveWallpapersPage */}
      <LiveWallpaperDownloadModal
        isOpen={isLiveModalOpen}
        onClose={closeLiveDownload}
        wallpaper={currentLiveWallpaper}
        showAdTimer={showLiveAdTimer}
        timerDuration={liveDuration}
        onTimerComplete={handleLiveTimerComplete}
        onDownload={startLiveDownload}
        isDownloading={isLiveDownloading}
        userType={liveUserType}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  )
}

export default FavoritesPage
