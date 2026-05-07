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
  // Folosește Edge Function live-wallpaper-download (server-side fetch)
  // pentru a ocoli problema CORS la fetch direct din browser spre CDN.
  const initiateDownload = useCallback(
    async (wallpaper: LiveWallpaperData) => {
      setIsDownloading(true)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        // Strategie 1: fetch prin Edge Function (evită CORS pentru browsere stricte)
        // Strategie 2: fallback la link direct (funcționează dacă R2 CORS e configurat)
        let downloadedViaFetch = false

        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/live-wallpaper-download?slug=${encodeURIComponent(wallpaper.slug)}`,
            {
              method: 'GET',
              headers: { Authorization: `Bearer ${supabaseAnonKey}` },
            }
          )

          if (response.ok) {
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `${wallpaper.slug}.mp4`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
            downloadedViaFetch = true
          }
        } catch {
          // Edge function indisponibilă — continuăm cu fallback
        }

        if (!downloadedViaFetch) {
          // Fallback: link direct cu atribut download
          // Funcționează când CORS e configurat corect pe R2
          const link = document.createElement('a')
          link.href = wallpaper.video_url
          link.download = `${wallpaper.slug}.mp4`
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }

        toast.success(`Download started: ${wallpaper.title}`)
        setTimeout(() => closeDownloadModal(), 1500)
      } catch (error: any) {
        console.error('[useLiveWallpaperDownload] Download failed:', error)
        // Fallback: deschide direct URL-ul în tab nou
        window.open(wallpaper.video_url, '_blank')
        toast.error('Download failed, opening in new tab.')
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
