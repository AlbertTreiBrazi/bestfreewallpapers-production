// ============================================================================
// 🎬 useLiveWallpaperDownload.ts — Hook pentru descărcare live wallpaper cu modal+ad
// ============================================================================
// Pattern identic cu useRingtoneDownload.ts
// Diferențe: descarcă MP4 în loc de MP3, folosește live-wallpapers-api
// ============================================================================

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { timerService } from '@/services/timerService'
import toast from 'react-hot-toast'

interface LiveWallpaperData {
  id: number
  title: string
  slug: string
  video_url: string
  thumbnail_url?: string | null
  is_premium?: boolean
}

interface UseLiveWallpaperDownloadReturn {
  isDownloadModalOpen: boolean
  isDownloading: boolean
  showAdTimer: boolean
  timerDuration: number
  openDownloadModal: (wallpaper: LiveWallpaperData) => Promise<void>
  closeDownloadModal: () => void
  startDownload: () => Promise<void>
  handleTimerComplete: () => void
  currentWallpaper: LiveWallpaperData | null
  userType: 'guest' | 'free' | 'premium'
}

interface UseLiveWallpaperDownloadParams {
  onAuthRequired?: () => void
}

export function useLiveWallpaperDownload(
  params: UseLiveWallpaperDownloadParams = {}
): UseLiveWallpaperDownloadReturn {
  const { onAuthRequired } = params
  const { user, profile } = useAuth()
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showAdTimer, setShowAdTimer] = useState(false)
  const [timerDuration, setTimerDuration] = useState(0)
  const [currentWallpaper, setCurrentWallpaper] = useState<LiveWallpaperData | null>(null)

  const userType = timerService.getUserType(user, profile)

  // ── Deschide modalul de download ─────────────────────────────────────────
  const openDownloadModal = useCallback(
    async (wallpaper: LiveWallpaperData) => {
      setCurrentWallpaper(wallpaper)
      setIsDownloadModalOpen(true)
      setIsDownloading(false)
      setShowAdTimer(false)

      // Premium wallpaper cere autentificare pentru guest
      if (wallpaper.is_premium && userType === 'guest') {
        toast.error('Please sign in to download premium wallpapers.')
        setIsDownloadModalOpen(false)
        if (onAuthRequired) onAuthRequired()
        return
      }

      if (wallpaper.is_premium && userType === 'free') {
        toast.error('Upgrade to Premium to download this wallpaper.')
        setIsDownloadModalOpen(false)
        return
      }

      try {
        const duration = await timerService.getTimerDuration(userType)
        setTimerDuration(duration)

        if (userType === 'premium') {
          // Premium — descărcare instant fără timer
          await initiateDownload(wallpaper)
        } else {
          // Guest / Free — afișăm timer cu reclamă
          setShowAdTimer(true)
        }
      } catch (error) {
        console.error('[useLiveWallpaperDownload] Failed to prepare:', error)
        toast.error('Failed to prepare download. Please try again.')
      }
    },
    [userType, onAuthRequired] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ── Închide modalul ──────────────────────────────────────────────────────
  const closeDownloadModal = useCallback(() => {
    setIsDownloadModalOpen(false)
    setShowAdTimer(false)
    setCurrentWallpaper(null)
    setIsDownloading(false)
  }, [])

  // ── Timer terminat — afișăm butonul Download ─────────────────────────────
  const handleTimerComplete = useCallback(() => {
    setShowAdTimer(false)
  }, [])

  // ── Download efectiv ─────────────────────────────────────────────────────
  // R2 are CORS configurat → descărcare directă prin <a href download>
  // Nu mai trece prin Edge Function sau fetch() din browser
  const initiateDownload = useCallback(
    async (wallpaper: LiveWallpaperData) => {
      setIsDownloading(true)
      try {
        // Download direct — browserul trimite request cu header Origin
        // R2 răspunde cu Access-Control-Allow-Origin → funcționează fără CORS error
        const link = document.createElement('a')
        link.href = wallpaper.video_url
        link.download = `${wallpaper.slug}.mp4`
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Track download în baza de date
        supabase.functions.invoke('live-wallpapers-api', {
          body: { action: 'track_download', id: wallpaper.id },
        }).catch(() => {})

        toast.success(`Download started: ${wallpaper.title}`)
        setTimeout(() => closeDownloadModal(), 1500)
      } catch (error: any) {
        console.error('[useLiveWallpaperDownload] Download failed:', error)
        window.open(wallpaper.video_url, '_blank')
        toast.error('Opening in new tab.')
      } finally {
        setIsDownloading(false)
      }
    },
    [closeDownloadModal]
  )

  // ── Apelat când userul apasă „Download" după timer ───────────────────────
  const startDownload = useCallback(async () => {
    if (!currentWallpaper) return
    await initiateDownload(currentWallpaper)
  }, [currentWallpaper, initiateDownload])

  return {
    isDownloadModalOpen,
    isDownloading,
    showAdTimer,
    timerDuration,
    openDownloadModal,
    closeDownloadModal,
    startDownload,
    handleTimerComplete,
    currentWallpaper,
    userType,
  }
}
