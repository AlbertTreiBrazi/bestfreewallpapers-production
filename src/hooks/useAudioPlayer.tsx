// ============================================================================
// 🎵 useAudioPlayer.tsx — Singleton audio player
// ============================================================================
// Asigură că UN SINGUR ringtone redă la un moment dat în toată pagina.
// Când userul apasă play pe alt ringtone, primul se oprește automat.
//
// Usage într-un component:
//   const { play, pause, isPlaying, currentTrackId, progress, duration } = useAudioPlayer();
//
//   <button onClick={() => play(ringtone.id, ringtone.audio_url)}>
//     {isPlaying && currentTrackId === ringtone.id ? 'Pause' : 'Play'}
//   </button>
// ============================================================================

import { useEffect, useState, useCallback } from 'react'

// Singleton state — shared across all components
let globalAudio: HTMLAudioElement | null = null
let globalCurrentId: number | null = null
let globalIsPlaying = false
let globalProgress = 0 // seconds
let globalDuration = 0 // seconds

// Subscribers pattern: every component using the hook subscribes
type Subscriber = () => void
const subscribers = new Set<Subscriber>()

function notifyAll() {
  subscribers.forEach((cb) => {
    try { cb() } catch (e) { console.error('[useAudioPlayer] subscriber error:', e) }
  })
}

function setupAudioElement(audio: HTMLAudioElement) {
  audio.addEventListener('timeupdate', () => {
    globalProgress = audio.currentTime || 0
    globalDuration = audio.duration || 0
    notifyAll()
  })

  audio.addEventListener('play', () => {
    globalIsPlaying = true
    notifyAll()
  })

  audio.addEventListener('pause', () => {
    globalIsPlaying = false
    notifyAll()
  })

  audio.addEventListener('ended', () => {
    globalIsPlaying = false
    globalProgress = 0
    notifyAll()
  })

  audio.addEventListener('error', (e) => {
    console.error('[useAudioPlayer] audio error:', e)
    globalIsPlaying = false
    notifyAll()
  })
}

export function useAudioPlayer() {
  // Local re-render trigger; we read from global vars
  const [, setTick] = useState(0)

  useEffect(() => {
    const sub = () => setTick((n) => n + 1)
    subscribers.add(sub)
    return () => {
      subscribers.delete(sub)
    }
  }, [])

  const play = useCallback((trackId: number, audioUrl: string) => {
    // If clicking the same track that is currently loaded, just resume
    if (globalAudio && globalCurrentId === trackId) {
      globalAudio.play().catch((e) => {
        console.error('[useAudioPlayer] play() failed:', e)
      })
      return
    }

    // Different track: stop current, start new
    if (globalAudio) {
      try { globalAudio.pause() } catch { /* ignore */ }
      try { globalAudio.removeAttribute('src'); globalAudio.load() } catch { /* ignore */ }
    }

    globalAudio = new Audio(audioUrl)
    globalAudio.preload = 'auto'
    globalAudio.crossOrigin = 'anonymous'
    setupAudioElement(globalAudio)

    globalCurrentId = trackId
    globalProgress = 0
    globalDuration = 0
    notifyAll()

    globalAudio.play().catch((e) => {
      console.error('[useAudioPlayer] play() failed:', e)
      globalIsPlaying = false
      notifyAll()
    })
  }, [])

  const pause = useCallback(() => {
    if (globalAudio) {
      try { globalAudio.pause() } catch { /* ignore */ }
    }
  }, [])

  const stop = useCallback(() => {
    if (globalAudio) {
      try {
        globalAudio.pause()
        globalAudio.currentTime = 0
      } catch { /* ignore */ }
    }
    globalCurrentId = null
    globalIsPlaying = false
    globalProgress = 0
    notifyAll()
  }, [])

  const seek = useCallback((seconds: number) => {
    if (globalAudio) {
      try {
        globalAudio.currentTime = Math.max(0, Math.min(seconds, globalAudio.duration || 0))
      } catch { /* ignore */ }
    }
  }, [])

  const togglePlayPause = useCallback(
    (trackId: number, audioUrl: string) => {
      if (globalCurrentId === trackId && globalIsPlaying) {
        pause()
      } else {
        play(trackId, audioUrl)
      }
    },
    [play, pause]
  )

  return {
    play,
    pause,
    stop,
    seek,
    togglePlayPause,
    isPlaying: globalIsPlaying,
    currentTrackId: globalCurrentId,
    progress: globalProgress,
    duration: globalDuration,
  }
}
