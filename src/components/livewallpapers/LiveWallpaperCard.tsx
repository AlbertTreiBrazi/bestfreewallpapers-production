// ============================================================================
// 🎬 LiveWallpaperCard.tsx — Download button always on top, text below
// ============================================================================
import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Download, Play, Pause, Heart } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLiveWallpaperFavorites } from '@/hooks/useLiveWallpaperFavorites'
import toast from 'react-hot-toast'

export interface LiveWallpaper {
  id: number
  title: string
  slug: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  tags: string[] | null
  category?: string | null
  is_premium: boolean
  is_published: boolean
  downloads_count: number
  views_count: number
  created_at: string
}

interface LiveWallpaperCardProps {
  wallpaper: LiveWallpaper
  onFavoriteChange?: () => void
  onDownload?: (wallpaper: LiveWallpaper) => void
}

export function LiveWallpaperCard({ wallpaper, onFavoriteChange, onDownload }: LiveWallpaperCardProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { isFavorite, toggleFavorite } = useLiveWallpaperFavorites()

  const handleMouseEnter = () => {
    if (videoRef.current) { videoRef.current.play(); setIsPlaying(true) }
  }

  const handleMouseLeave = () => {
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; setIsPlaying(false) }
  }

  const handleCardClick = () => {
    navigate(`/live-wallpaper/${wallpaper.slug}`)
  }

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!videoRef.current) return
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false) }
    else { videoRef.current.play(); setIsPlaying(true) }
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.error('Please sign in to add favorites'); return }
    toggleFavorite(wallpaper.id, wallpaper.title)
    if (onFavoriteChange) onFavoriteChange()
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDownload) onDownload(wallpaper)
  }

  const favorited = isFavorite(wallpaper.id)

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
        isDark
          ? 'bg-gray-800 border border-gray-700 hover:border-purple-500'
          : 'bg-white border border-gray-200 hover:border-purple-400 shadow-md'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Premium badge */}
      {wallpaper.is_premium && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            <Crown className="w-3 h-3" /><span>PRO</span>
          </div>
        </div>
      )}

      {/* Live badge */}
      {!wallpaper.is_premium && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg">
            <span>🎬 LIVE</span>
          </div>
        </div>
      )}

      {/* Favorite button — absolute top-right, ca la RingtoneCard */}
      <button
        onClick={handleFavorite}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 20,
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: favorited ? 'rgb(239,68,68)' : 'rgba(0,0,0,0.60)',
          border: favorited ? '1px solid rgb(239,68,68)' : '1px solid rgba(255,255,255,0.40)',
          color: 'white', cursor: 'pointer', transition: 'all 0.2s'
        }}
        title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart style={{ width: 18, height: 18, fill: favorited ? 'currentColor' : 'none' }} />
      </button>

      {/* Video / Thumbnail */}
      <div className="relative aspect-[9/16] overflow-hidden" style={{background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'}}>

        {/* Thumbnail mereu vizibil — se ascunde când video rulează */}
        {wallpaper.thumbnail_url?.trim() && (
          <img
            src={wallpaper.thumbnail_url}
            alt={wallpaper.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isPlaying ? 0 : 1, transition: 'opacity 0.3s' }}
          />
        )}

        {/* Placeholder când nu există thumbnail */}
        {!wallpaper.thumbnail_url?.trim() && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: isPlaying ? 0 : 1, transition: 'opacity 0.3s' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.8)', marginLeft: 3 }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', padding: '0 16px' }}>{wallpaper.title}</span>
          </div>
        )}

        {/* Video — mereu vizibil (opacity 1), nu doar la hover */}
        <video
          ref={videoRef}
          src={wallpaper.video_url}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPlaying ? 1 : 0, transition: 'opacity 0.3s' }}
          loop
          muted
          playsInline
          preload="metadata"
          poster={wallpaper.thumbnail_url || undefined}
        />

        {/* Play/Pause overlay */}
        <button
          onClick={handlePlayToggle}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPlaying ? <Pause style={{ width: 22, height: 22, color: 'white' }} /> : <Play style={{ width: 22, height: 22, color: 'white', marginLeft: 2 }} />}
          </div>
        </button>
      </div>

      {/* Card body — Download button + title + tags */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {onDownload && (
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}
        </div>

        {/* Title below buttons */}
        <h3 className={`font-semibold text-sm leading-tight line-clamp-2 mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {wallpaper.title}
        </h3>

        {/* Tags at the bottom */}
        {wallpaper.tags && wallpaper.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {wallpaper.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveWallpaperCard
