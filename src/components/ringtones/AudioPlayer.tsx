// ============================================================================
// 🎵 AudioPlayer.tsx — Component reutilizabil play button cu progress bar
// ============================================================================
// Afișează un buton circular play/pause + un progress bar opțional.
// Folosește useAudioPlayer (singleton) ca să pauzeze automat alt audio activ.
// ============================================================================

import React from 'react'
import { Play, Pause } from 'lucide-react'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'

interface AudioPlayerProps {
  trackId: number
  audioUrl: string
  duration?: number          // seconds, optional — falls back to runtime duration
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  className?: string
}

export function AudioPlayer({
  trackId,
  audioUrl,
  duration,
  size = 'md',
  showProgress = false,
  className = '',
}: AudioPlayerProps) {
  const {
    togglePlayPause,
    isPlaying,
    currentTrackId,
    progress,
    duration: runtimeDuration,
  } = useAudioPlayer()

  const isThisTrackActive = currentTrackId === trackId
  const isThisTrackPlaying = isThisTrackActive && isPlaying

  const totalDuration = duration && duration > 0 ? duration : runtimeDuration || 0
  const percent = isThisTrackActive && totalDuration > 0
    ? Math.min(100, (progress / totalDuration) * 100)
    : 0

  // Size classes
  const sizeMap = {
    sm: { btn: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { btn: 'w-12 h-12', icon: 'w-5 h-5' },
    lg: { btn: 'w-16 h-16', icon: 'w-7 h-7' },
  }
  const sz = sizeMap[size]

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    togglePlayPause(trackId, audioUrl)
  }

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isThisTrackPlaying ? 'Pause ringtone' : 'Play ringtone'}
        className={`${sz.btn} rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      >
        {isThisTrackPlaying ? (
          <Pause className={sz.icon} fill="currentColor" />
        ) : (
          <Play className={`${sz.icon} ml-0.5`} fill="currentColor" />
        )}
      </button>

      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-100"
              style={{ width: `${percent}%` }}
            />
          </div>
          {totalDuration > 0 && (
            <div className="flex justify-between text-xs mt-1 text-gray-500 dark:text-gray-400 font-mono">
              <span>{formatTime(isThisTrackActive ? progress : 0)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default AudioPlayer
