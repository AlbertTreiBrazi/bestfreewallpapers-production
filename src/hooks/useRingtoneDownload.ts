// ============================================================================
// 🎵 useRingtoneDownload.ts — Hook pentru descărcare ringtone cu modal+ad
// ============================================================================
// VERSIUNE NOUĂ: Descărcare directă din CDN (ca live wallpapers)
// Nu mai trece prin edge function ringtone-download ca intermediar.
//
// Avantaje față de versiunea veche:
//   - Mai rapid (fișierul nu mai face drum dublu prin Supabase)
//   - Fără limite de timeout Supabase (edge functions au 2min max)
//   - Fără costuri de compute Supabase pentru fiecare download
//
// Statisticile sunt păstrate: un request mic separat anunță Supabase
// că s-a făcut un download, fără să mai trimită fișierul prin el.
// ============================================================================

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
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

  const userType = timerService.getUserType(user, profile)

  // ── Deschide modalul de download ─────────────────────────────────────────
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
          // Premium — descărcare instant fără timer
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

  // ── Închide modalul ──────────────────────────────────────────────────────
  const closeDownloadModal = useCallback(() => {
    setIsDownloadModalOpen(false)
    setShowAdTimer(false)
    setCurrentRingtone(null)
    setIsDownloading(false)
  }, [])

  // ── Timer terminat ───────────────────────────────────────────────────────
  const handleTimerComplete = useCallback(() => {
    setShowAdTimer(false)
  }, [])

  // ── Track download în Supabase (request mic, fără fișier) ────────────────
  const trackDownload = useCallback(async (ringtone: RingtoneData) => {
    try {
      // Incrementează downloads_count direct în baza de date
      const { data: current } = await supabase
        .from('ringtones')
        .select('downloads_count')
        .eq('id', ringtone.id)
        .single()

      if (current) {
        await supabase
          .from('ringtones')
          .update({ downloads_count: (current.downloads_count || 0) + 1 })
          .eq('id', ringtone.id)
      }

      // Înregistrează în ringtone_downloads dacă userul e logat
      if (user) {
        await supabase.from('ringtone_downloads').insert({
          ringtone_id: ringtone.id,
          user_id: user.id,
        }).then(() => {}) // best-effort, nu blocăm
      }
    } catch {
      // Tracking-ul nu blochează descărcarea — ignorăm erorile
    }
  }, [user])

  // ── Descărcare directă din CDN (fără intermediar Supabase) ───────────────
  const initiateDownload = useCallback(
    async (ringtone: RingtoneData) => {
      setIsDownloading(true)
      try {
        // Track download în paralel (nu așteptăm să termine)
        trackDownload(ringtone)

        // Descarcă direct din CDN prin link — evită CORS
        const link = document.createElement('a')
        link.href = ringtone.audio_url
        link.download = `${ringtone.slug}.mp3`
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success(`Download started: ${ringtone.title}`)
        setTimeout(() => closeDownloadModal(), 1500)
      } catch (error: any) {
        console.error('[useRingtoneDownload] Download failed:', error)
        // Fallback: deschide în tab nou
        window.open(ringtone.audio_url, '_blank')
        toast.error('Opening in new tab.')
      } finally {
        setIsDownloading(false)
      }
    },
    [closeDownloadModal, trackDownload]
  )

  // ── Apelat când userul apasă „Download" după timer ───────────────────────
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
