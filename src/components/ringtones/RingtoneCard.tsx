// ============================================================================
// 🎵 RingtoneCard.tsx — Design nou cu cover image + player audio + favorite
// ============================================================================
import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Download, Heart, Play, Pause, Music2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRingtoneFavorites } from '@/hooks/useRingtoneFavorites'
import toast from 'react-hot-toast'
import type { Ringtone } from '@/hooks/useRingtones'

interface RingtoneCardProps {
  ringtone: Ringtone & { cover_image_url?: string | null }
  onDownload?: (ringtone: Ringtone) => void
}

export function RingtoneCard({ ringtone, onDownload }: RingtoneCardProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const { isFavorite, toggleFavorite } = useRingtoneFavorites()

  const favorited = isFavorite(ringtone.id)

  const handleCardClick = () => navigate(`/ringtone/${ringtone.slug}`)

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100
    setProgress(isNaN(pct) ? 0 : pct)
  }

  const handleEnded = () => { setIsPlaying(false); setProgress(0) }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDownload) onDownload(ringtone)
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.error('Please sign in to add favorites'); return }
    toggleFavorite(ringtone.id, ringtone.title)
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
        isDark ? 'bg-gray-800 border border-gray-700 hover:border-blue-500/50' : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm'
      }`}
    >
      {/* Cover Image sau gradient fallback */}
      <div className="relative overflow-hidden" style={{aspectRatio: "1/1"}}>
        {ringtone.cover_image_url ? (
          <img
            src={ringtone.cover_image_url}
            alt={ringtone.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradient(ringtone.id)}`}>
            <Music2 className="w-12 h-12 text-white/40" />
          </div>
        )}

        {/* Dark overlay pentru text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Premium badge */}
        {ringtone.is_premium && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
              <Crown className="w-2.5 h-2.5" />PRO
            </span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            favorited ? 'bg-red-500 text-white' : 'bg-black/60 backdrop-blur-sm text-white hover:bg-red-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
        </button>

        {/* Play button centrat pe imagine */}
        <button
          onClick={handlePlay}
          className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        {/* Duration */}
        <span className="absolute bottom-3 right-3 text-white/80 text-xs font-medium">
          {formatDuration(ringtone.duration_seconds)}
        </span>

        {/* Audio element */}
        <audio
          ref={audioRef}
          src={ringtone.audio_url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="none"
        />
      </div>

      {/* Progress bar */}
      <div className={`h-1 w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card body */}
      <div className="p-3">
        <h3 className={`font-bold text-sm leading-tight line-clamp-1 mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {ringtone.title}
        </h3>

        {/* Tags */}
        {ringtone.tags && ringtone.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {ringtone.tags.slice(0, 2).map(tag => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Download button — mereu vizibil */}
        {onDownload && (
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Download MP3
          </button>
        )}
      </div>
    </div>
  )
}

// Gradient diferit per ID — face cardurile colorate frumos când nu e cover image
function getGradient(id: number): string {
  const gradients = [
    'from-blue-600 to-purple-700',
    'from-purple-600 to-pink-700',
    'from-green-500 to-teal-700',
    'from-orange-500 to-red-700',
    'from-indigo-600 to-blue-700',
    'from-pink-500 to-rose-700',
    'from-teal-500 to-cyan-700',
    'from-yellow-500 to-orange-700',
  ]
  return gradients[id % gradients.length]
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default RingtoneCard
