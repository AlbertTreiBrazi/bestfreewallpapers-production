// ============================================================================
// 🎬 LiveWallpaperDetailPage.tsx — Pagina detaliu /live-wallpaper/:slug
// Cu sistem de reclame integrat (same as wallpapers + ringtones)
// ============================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, Crown, ArrowLeft, Play, Pause } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { supabase } from '@/lib/supabase'
import { timerService } from '@/services/timerService'
import { UnifiedDownloadModal } from '@/components/download/UnifiedDownloadModal'
import { AuthModal } from '@/components/auth/AuthModal'
import toast from 'react-hot-toast'
import type { LiveWallpaper } from '@/components/livewallpapers/LiveWallpaperCard'

export function LiveWallpaperDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { theme } = useTheme()
  const { user, profile } = useAuth()
  const isDark = theme === 'dark'
  const videoRef = useRef<HTMLVideoElement>(null)

  // Wallpaper state
  const [wallpaper, setWallpaper] = useState<LiveWallpaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)

  // Download / Ad state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showAdTimer, setShowAdTimer] = useState(false)
  const [timerDuration, setTimerDuration] = useState(0)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const userType = timerService.getUserType(user, profile)

  useEffect(() => {
    if (!slug) return
    loadWallpaper()
  }, [slug])

  const loadWallpaper = async () => {
    try {
      setLoading(true)
      const { data, error: fnError } = await supabase.functions.invoke('live-wallpapers-api', {
        body: { action: 'detail', slug },
      })
      if (fnError) throw fnError
      setWallpaper(data?.wallpaper || null)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  // ── Download cu sistem de reclame ────────────────────────────────────────
  const handleDownloadClick = useCallback(async () => {
    if (!wallpaper) return

    // Premium wallpaper — trebuie cont
    if (wallpaper.is_premium && userType === 'guest') {
      toast.error('Please sign in to download premium wallpapers.')
      setIsAuthModalOpen(true)
      return
    }

    if (wallpaper.is_premium && userType === 'free') {
      toast.error('Upgrade to Premium to download this wallpaper.')
      return
    }

    // Pregătește URL-ul de download
    setDownloadUrl(wallpaper.video_url)

    // Premium users — download direct fără reclamă
    if (userType === 'premium') {
      setIsDownloadModalOpen(true)
      setShowAdTimer(false)
      setTimerDuration(0)
      return
    }

    // Guest și Free users — arată timer cu reclamă
    const duration = await timerService.getTimerDuration(userType)
    setTimerDuration(duration)
    setShowAdTimer(true)
    setIsDownloadModalOpen(true)
  }, [wallpaper, userType])

  // ── Timer completat — download devine disponibil ─────────────────────────
  const handleTimerComplete = useCallback(() => {
    setShowAdTimer(false)
  }, [])

  // ── Download efectiv ─────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!wallpaper || !downloadUrl) return
    setIsDownloading(true)

    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${wallpaper.slug}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Track download în baza de date
      await supabase.functions.invoke('live-wallpapers-api', {
        body: { action: 'track_download', id: wallpaper.id },
      })

      toast.success('Download started!')
      setIsDownloadModalOpen(false)
    } catch {
      window.open(downloadUrl, '_blank')
      setIsDownloadModalOpen(false)
    } finally {
      setIsDownloading(false)
    }
  }, [wallpaper, downloadUrl])

  const closeDownloadModal = useCallback(() => {
    setIsDownloadModalOpen(false)
    setShowAdTimer(false)
    setDownloadUrl(null)
  }, [])

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !wallpaper) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-dark-primary text-white' : 'bg-gray-50 text-gray-900'}`}>
      <p className="text-lg mb-4">Live wallpaper not found</p>
      <Link to="/live-wallpapers" className="text-purple-500 hover:underline">← Back to Live Wallpapers</Link>
    </div>
  )

  return (
    <>
      <SEOHead
        config={{
          title: `${wallpaper.title} — Free Live Wallpaper | BestFreeWallpapers`,
          description: wallpaper.description || `Download ${wallpaper.title} free live wallpaper for your phone.`,
          url: `https://bestfreewallpapers.com/live-wallpaper/${wallpaper.slug}`,
          type: 'website',
        }}
      />

      <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Back button */}
          <Link
            to="/live-wallpapers"
            className={`inline-flex items-center gap-2 text-sm mb-6 hover:text-purple-500 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Wallpapers
          </Link>

          <div className="flex flex-col md:flex-row gap-8">

            {/* Video player */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="relative w-64 rounded-2xl overflow-hidden shadow-2xl bg-black">
                <video
                  ref={videoRef}
                  src={wallpaper.video_url}
                  className="w-full aspect-[9/16] object-cover"
                  loop
                  muted
                  playsInline
                  autoPlay
                />
                <button
                  onClick={togglePlay}
                  className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1">

              {/* Title */}
              <div className="flex items-start gap-3 mb-4">
                <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {wallpaper.title}
                </h1>
                {wallpaper.is_premium && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shrink-0 mt-1">
                    <Crown className="w-3 h-3" />PRO
                  </span>
                )}
              </div>

              {/* Description */}
              {wallpaper.description && (
                <p className={`text-base mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {wallpaper.description}
                </p>
              )}

              {/* Stats */}
              <div className={`flex gap-6 mb-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <div>
                  <span className={`block text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {wallpaper.downloads_count}
                  </span>
                  Downloads
                </div>
                <div>
                  <span className={`block text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    MP4
                  </span>
                  Format
                </div>
                <div>
                  <span className={`block text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {wallpaper.is_premium ? 'Premium' : 'Free'}
                  </span>
                  Price
                </div>
              </div>

              {/* Tags */}
              {wallpaper.tags && wallpaper.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {wallpaper.tags.map(tag => (
                    <span
                      key={tag}
                      className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Download button */}
              <button
                onClick={handleDownloadClick}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all text-lg shadow-lg"
              >
                <Download className="w-5 h-5" />
                {wallpaper.is_premium ? 'Download Premium' : 'Download Free'}
              </button>

              <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {wallpaper.is_premium
                  ? 'Premium content · No watermark · MP4 format'
                  : 'Free for personal use · No watermark · MP4 format'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Modal cu reclame */}
      <UnifiedDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={closeDownloadModal}
        wallpaper={wallpaper ? {
          id: wallpaper.id,
          title: wallpaper.title,
          image_url: wallpaper.thumbnail_url || wallpaper.video_url,
        } : null}
        resolution="video"
        userType={userType}
        timerDuration={timerDuration}
        showAdTimer={showAdTimer}
        isDownloading={isDownloading}
        onDownload={handleDownload}
        onTimerComplete={handleTimerComplete}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  )
}

export default LiveWallpaperDetailPage
