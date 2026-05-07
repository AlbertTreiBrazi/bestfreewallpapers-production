// ============================================================================
// 🎵 RingtoneCard.tsx — Design nou, card clickable, download mereu vizibil
// ============================================================================
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Crown, Download, Music2, Play } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import type { Ringtone } from '@/hooks/useRingtones'

interface RingtoneCardProps {
  ringtone: Ringtone
  onDownload?: (ringtone: Ringtone) => void
}

export function RingtoneCard({ ringtone, onDownload }: RingtoneCardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  const handleCardClick = () => {
    navigate(`/ringtone/${ringtone.slug}`)
  }

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDownload) onDownload(ringtone)
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Navigate to detail page where full player is available
    navigate(`/ringtone/${ringtone.slug}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
        isDark
          ? 'bg-gray-800/80 border border-gray-700 hover:border-blue-500/50'
          : 'bg-white border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top colored bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      <div className="p-4">
        {/* Header: Icon + Title + Premium */}
        <div className="flex items-start gap-3 mb-3">
          {/* Music icon circle */}
          <div
            onClick={handlePlayClick}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? 'bg-blue-500/20 hover:bg-blue-500/40'
                : 'bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <Play className="w-5 h-5 text-blue-500 ml-0.5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-bold text-sm leading-tight line-clamp-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {ringtone.title}
              </h3>
              {ringtone.is_premium && (
                <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
                  <Crown className="w-2.5 h-2.5" />PRO
                </span>
              )}
            </div>

            <div className={`flex items-center gap-3 mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="flex items-center gap-1">
                <Music2 className="w-3 h-3" />
                {formatDuration(ringtone.duration_seconds)}
              </span>
              {ringtone.downloads_count > 0 && (
                <span className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  {formatNumber(ringtone.downloads_count)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {ringtone.tags && ringtone.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {ringtone.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom: Download button — mereu vizibil */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {onDownload && (
            <button
              onClick={handleDownloadClick}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download MP3
            </button>
          )}
          <Link
            to={`/ringtone/${ringtone.slug}`}
            onClick={e => e.stopPropagation()}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              isDark
                ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details →
          </Link>
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default RingtoneCard
