// ============================================================================
// 🎵 RingtoneDownloadModal.tsx — Modal de download cu reclamă pentru ringtone
// ============================================================================
// Versiune simplificată din UnifiedDownloadModal (fără rezoluții, fără tokens).
// Folosește același sistem AdContent (ad-settings Edge Function) ca wallpaperele.
// ============================================================================

import React, { useState, useEffect } from 'react'
import { X, Download, Clock, Crown, Music2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface RingtoneDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  ringtone: {
    id: number
    title: string
    slug: string
    audio_url: string
    is_premium?: boolean
  } | null
  userType: 'guest' | 'free' | 'premium'
  timerDuration: number
  showAdTimer: boolean
  isDownloading: boolean
  onDownload: () => void
  onTimerComplete: () => void
}

// ============ Ad Content Component ============
// Identic cu cel din UnifiedDownloadModal — încarcă din ad-settings.
function AdContent({ userType }: { userType: string }) {
  const { theme } = useTheme()
  const [adSettings, setAdSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdSettings()
  }, [userType])

  const loadAdSettings = async () => {
    try {
      const action = userType === 'guest' ? 'get_guest' : 'get_logged_in'
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-settings`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        }
      )

      if (response.ok) {
        const result = await response.json()
        setAdSettings(result.data)
      }
    } catch (error) {
      console.error('Failed to load ad settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-6 flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading ad...</p>
        </div>
      </div>
    )
  }

  const getAdImageUrl = () => {
    if (!adSettings) return null
    if (userType === 'guest') {
      if (adSettings.guest_ad_content_type === 'image_upload') return adSettings.guest_ad_image_url
      if (adSettings.guest_ad_content_type === 'external_url') return adSettings.guest_ad_external_url
    } else {
      if (adSettings.logged_in_ad_content_type === 'image_upload') return adSettings.logged_in_ad_image_url
      if (adSettings.logged_in_ad_content_type === 'external_url') return adSettings.logged_in_ad_external_url
    }
    return null
  }

  const adImageUrl = getAdImageUrl()
  const isHtmlContent =
    userType === 'guest'
      ? adSettings?.guest_ad_content_type === 'html_adsense'
      : adSettings?.logged_in_ad_content_type === 'html_adsense'

  const htmlContent =
    userType === 'guest' ? adSettings?.guest_ad_html_content : adSettings?.logged_in_ad_html_content

  return (
    <div className="mb-6">
      <div
        className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        style={{ minHeight: '200px' }}
      >
        {isHtmlContent && htmlContent ? (
          <div
            className="w-full h-full p-4 bg-white dark:bg-gray-800"
            dangerouslySetInnerHTML={{ __html: sanitizeAdHtml(htmlContent) }}
          />
        ) : adImageUrl ? (
          <div className="relative w-full h-48">
            <img
              src={adImageUrl}
              alt="Advertisement"
              className="w-full h-full object-contain bg-gray-50 dark:bg-gray-800"
              onError={(e) => {
                console.error('Ad image failed to load:', adImageUrl)
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">Ad image unavailable</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="text-center text-white p-4">
              <h3 className="text-base font-bold mb-1">Free Ringtones</h3>
              <p className="text-xs opacity-90">Supported by ads</p>
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2 bg-black/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          Advertisement
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
        Please wait for the timer
      </p>
    </div>
  )
}

// Basic HTML sanitization
function sanitizeAdHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-blocked=')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
}

// ============ Main Modal ============

export function RingtoneDownloadModal({
  isOpen,
  onClose,
  ringtone,
  userType,
  timerDuration,
  showAdTimer,
  isDownloading,
  onDownload,
  onTimerComplete,
}: RingtoneDownloadModalProps) {
  const { theme } = useTheme()
  const [timeLeft, setTimeLeft] = useState(timerDuration)
  const [isCountdownComplete, setIsCountdownComplete] = useState(false)

  // Reset countdown la deschidere modal
  useEffect(() => {
    if (isOpen && showAdTimer) {
      setTimeLeft(timerDuration)
      setIsCountdownComplete(false)
    }
  }, [isOpen, showAdTimer, timerDuration])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !showAdTimer || isCountdownComplete) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsCountdownComplete(true)
          onTimerComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, showAdTimer, isCountdownComplete, onTimerComplete])

  if (!isOpen || !ringtone) return null

  const isDark = theme === 'dark'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden',
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            'absolute top-3 right-3 p-1.5 rounded-lg transition z-10',
            isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
          )}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
              ringtone.is_premium
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                : 'bg-blue-600'
            )}>
              {ringtone.is_premium ? (
                <Crown className="w-6 h-6 text-white" />
              ) : (
                <Music2 className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={cn('text-lg font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>
                {ringtone.title}
              </h3>
              <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {userType === 'premium' ? 'Premium download' : 'Free MP3 download'}
              </p>
            </div>
          </div>

          {/* Ad content (doar pentru guest/free când timer-ul rulează) */}
          {showAdTimer && userType !== 'premium' && <AdContent userType={userType} />}

          {/* Timer countdown sau buton Download */}
          {showAdTimer && !isCountdownComplete ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-3 mb-3">
                <Clock className={cn('w-6 h-6', isDark ? 'text-blue-400' : 'text-blue-600')} />
                <span className={cn('text-3xl font-bold tabular-nums', isDark ? 'text-white' : 'text-gray-900')}>
                  {timeLeft}s
                </span>
              </div>
              <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                Your download will be ready in a moment
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold transition shadow-lg',
                isDownloading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl'
              )}
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download MP3</span>
                </>
              )}
            </button>
          )}

          {/* Premium info */}
          {userType === 'premium' && (
            <p className={cn('text-xs text-center mt-4', isDark ? 'text-gray-500' : 'text-gray-500')}>
              ✨ Premium users skip the timer
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default RingtoneDownloadModal
