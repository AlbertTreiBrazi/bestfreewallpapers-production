// ============================================================================
// 🎬 LiveWallpaperDetailPage.tsx — Pagina detaliu /live-wallpaper/:slug
// ============================================================================
import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Download, Crown, ArrowLeft, Play, Pause, Share2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { supabase } from '@/lib/supabase'
import type { LiveWallpaper } from '@/components/livewallpapers/LiveWallpaperCard'

export function LiveWallpaperDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const videoRef = useRef<HTMLVideoElement>(null)

  const [wallpaper, setWallpaper] = useState<LiveWallpaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [downloading, setDownloading] = useState(false)

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

  const handleDownload = async () => {
    if (!wallpaper) return
    setDownloading(true)
    try {
      const response = await fetch(wallpaper.video_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${wallpaper.slug}.mp4`
      a.click()
      URL.revokeObjectURL(url)

      // Track download
      await supabase.functions.invoke('live-wallpapers-api', {
        body: { action: 'track_download', id: wallpaper.id },
      })
    } catch {
      // fallback: open in new tab
      window.open(wallpaper.video_url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

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
                {/* Play/Pause overlay */}
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
                    Free
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
                onClick={handleDownload}
                disabled={downloading}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all text-lg shadow-lg disabled:opacity-60"
              >
                <Download className="w-5 h-5" />
                {downloading ? 'Downloading...' : 'Download Free'}
              </button>

              <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Free for personal use · No watermark · MP4 format
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default LiveWallpaperDetailPage
