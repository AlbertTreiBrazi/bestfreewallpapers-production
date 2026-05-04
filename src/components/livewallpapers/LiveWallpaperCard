// ============================================================================
// 🎬 LiveWallpaperCard.tsx — Card individual live wallpaper (grid)
// ============================================================================
import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Download, Play, Pause } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export interface LiveWallpaper {
  id: number
  title: string
  slug: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  tags: string[] | null
  is_premium: boolean
  is_published: boolean
  downloads_count: number
  views_count: number
  created_at: string
}

interface LiveWallpaperCardProps {
  wallpaper: LiveWallpaper
}

export function LiveWallpaperCard({ wallpaper }: LiveWallpaperCardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
        isDark
          ? 'bg-gray-800 border border-gray-700 hover:border-purple-500'
          : 'bg-white border border-gray-200 hover:border-purple-400 shadow-md'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Premium badge */}
      {wallpaper.is_premium && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            <Crown className="w-3 h-3" />
            <span>PRO</span>
          </div>
        </div>
      )}

      {/* Live badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg">
          <span>🎬 LIVE</span>
        </div>
      </div>

      {/* Video / Thumbnail */}
      <Link to={`/live-wallpaper/${wallpaper.slug}`}>
        <div className="relative aspect-[9/16] bg-black overflow-hidden">
          {/* Thumbnail (shown before hover) */}
          {wallpaper.thumbnail_url && (
            <img
              src={wallpaper.thumbnail_url}
              alt={wallpaper.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
            />
          )}

          {/* Video */}
          <video
            ref={videoRef}
            src={wallpaper.video_url}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="none"
          />

          {/* Play/Pause overlay button */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {isPlaying
                ? <Pause className="w-6 h-6 text-white" />
                : <Play className="w-6 h-6 text-white ml-1" />
              }
            </div>
          </button>
        </div>
      </Link>

      {/* Card body */}
      <div className="p-3">
        <Link
          to={`/live-wallpaper/${wallpaper.slug}`}
          className={`block font-semibold text-sm leading-tight line-clamp-2 hover:text-purple-500 transition-colors mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {wallpaper.title}
        </Link>

        <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {formatNumber(wallpaper.downloads_count)}
          </span>
          <div className="flex flex-wrap gap-1">
            {wallpaper.tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default LiveWallpaperCard
