// ============================================================================
// 🎵 useRingtoneDownload.ts — Hook pentru descărcare ringtone cu modal+ad
// ============================================================================
// Versiune simplificată din useUnifiedDownload pentru wallpapere.
// Diferențe: fără rezoluții, fără tokens, descărcare directă prin Edge Function
// ringtone-download. Premium users sar peste timer.
// ============================================================================

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { timerService } from '@/services/timerService'
import toast from 'react-hot-toast'

interface RingtoneData {
  id: number
  title: string
  slug: string
  audio_url: string
  is_premium?: boolean
}

interface UseRingtoneDownloadReturn {
  isDownloadModalOpen: boolean
  isDownloading: boolean
  showAdTimer: boolean
  timerDuration: number
  openDownloadModal: (ringtone: RingtoneData) => Promise<void>
  closeDownloadModal: () => void
  startDownload: () => Promise<void>
  handleTimerComplete: () => void
  currentRingtone: RingtoneData | null
  userType: 'guest' | 'free' | 'premium'
}

interface UseRingtoneDownloadParams {
  onAuthRequired?: () => void
}

export function useRingtoneDownload(
  params: UseRingtoneDownloadParams = {}
): UseRingtoneDownloadReturn {
  const { onAuthRequired } = params
  const { user, profile } = useAuth()
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showAdTimer, setShowAdTimer] = useState(false)
  const [timerDuration, setTimerDuration] = useState(0)
  const [currentRingtone, setCurrentRingtone] = useState<RingtoneData | null>(null)

  // Determinăm tipul utilizatorului folosind același timerService ca wallpaperele
  const userType = timerService.getUserType(user, profile)

  // Deschide modalul de download
  const openDownloadModal = useCallback(
    async (ringtone: RingtoneData) => {
      setCurrentRingtone(ringtone)
      setIsDownloadModalOpen(true)
      setIsDownloading(false)
      setShowAdTimer(false)

      // Premium ringtones cer autentificare pentru guest
      if (ringtone.is_premium && userType === 'guest') {
        toast.error('Please sign in to download premium ringtones.')
        setIsDownloadModalOpen(false)
        if (onAuthRequired) onAuthRequired()
        return
      }

      try {
        const duration = await timerService.getTimerDuration(userType)
        setTimerDuration(duration)

        if (userType === 'premium') {
          // Premium — descărcare instant, fără timer
          await initiateDownload(ringtone)
        } else {
          // Guest / Free — afișăm timer cu reclamă
          setShowAdTimer(true)
        }
      } catch (error) {
        console.error('[useRingtoneDownload] Failed to prepare:', error)
        toast.error('Failed to prepare download. Please try again.')
      }
    },
    [userType, onAuthRequired] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Închidem modalul
  const closeDownloadModal = useCallback(() => {
    setIsDownloadModalOpen(false)
    setShowAdTimer(false)
    setCurrentRingtone(null)
    setIsDownloading(false)
  }, [])

  // Timer-ul s-a terminat — afișăm butonul Download
  const handleTimerComplete = useCallback(() => {
    setShowAdTimer(false)
  }, [])

  // Descărcare efectivă — apelează Edge Function ringtone-download
  const initiateDownload = useCallback(
    async (ringtone: RingtoneData) => {
      setIsDownloading(true)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const response = await fetch(
          `${supabaseUrl}/functions/v1/ringtone-download?slug=${encodeURIComponent(
            ringtone.slug
          )}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${supabaseAnonKey}` },
          }
        )

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `HTTP ${response.status}`)
        }

        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `${ringtone.slug}.mp3`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

        toast.success(`Download started: ${ringtone.title}`)
        setTimeout(() => closeDownloadModal(), 1500)
      } catch (error: any) {
        console.error('[useRingtoneDownload] Download failed:', error)
        toast.error(error.message || 'Download failed. Please try again.')
      } finally {
        setIsDownloading(false)
      }
    },
    [closeDownloadModal]
  )

  // Apelat când userul apasă „Download" după timer
  const startDownload = useCallback(async () => {
    if (!currentRingtone) return
    await initiateDownload(currentRingtone)
  }, [currentRingtone, initiateDownload])

  return {
    isDownloadModalOpen,
    isDownloading,
    showAdTimer,
    timerDuration,
    openDownloadModal,
    closeDownloadModal,
    startDownload,
    handleTimerComplete,
    currentRingtone,
    userType,
  }
}
