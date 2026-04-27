// ============================================================================
// 🎵 RingtoneCard.tsx — Card individual ringtone (folosit în grid)
// ============================================================================
// Afișează un ringtone cu:
//   - Play/Pause button (singleton)
//   - Title, durată, creator
//   - Premium badge (dacă e cazul)
//   - Click pe card duce la pagina detaliu /ringtone/:slug
// ============================================================================

import React from 'react'
import { Link } from 'react-router-dom'
import { Crown, Download, Music2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { AudioPlayer } from './AudioPlayer'
import type { Ringtone } from '@/hooks/useRingtones'

interface RingtoneCardProps {
  ringtone: Ringtone
}

export function RingtoneCard({ ringtone }: RingtoneCardProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
        isDark
          ? 'bg-gray-800 border border-gray-700 hover:border-blue-500'
          : 'bg-white border border-gray-200 hover:border-blue-400 shadow-md'
      }`}
    >
      {/* Premium badge */}
      {ringtone.is_premium && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            <Crown className="w-3 h-3" />
            <span>PRO</span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Top section: Play button + Title */}
        <div className="flex items-start gap-4 mb-3">
          {/* Play button */}
          <div className="shrink-0">
            <AudioPlayer
              trackId={ringtone.id}
              audioUrl={ringtone.audio_url}
              duration={ringtone.duration_seconds}
              size="md"
            />
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <Link
              to={`/ringtone/${ringtone.slug}`}
              className={`block font-semibold text-base leading-tight line-clamp-2 hover:text-blue-500 transition-colors ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {ringtone.title}
            </Link>

            <div className={`flex items-center gap-3 mt-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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

        {/* Description (optional, 2 lines) */}
        {ringtone.description && (
          <p className={`text-sm line-clamp-2 mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {ringtone.description}
          </p>
        )}

        {/* Footer: tags + creator */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-1">
            {ringtone.tags?.slice(0, 2).map((tag) => (
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
          <Link
            to={`/ringtone/${ringtone.slug}`}
            className={`text-xs font-medium transition-colors ${
              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            View →
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
