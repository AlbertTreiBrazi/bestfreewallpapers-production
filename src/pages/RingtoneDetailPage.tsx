// ============================================================================
// 🎵 RingtoneDetailPage.tsx — Pagina detaliu /ringtone/:slug
// ============================================================================
// Conține:
//   - Audio player MARE cu progress bar
//   - Title, descriere, info (durată, gen, mood, use case)
//   - Buton Download MP3 (TODO Sesiunea 7: cu reclame)
//   - Buton Add to Favorites (pentru utilizatori autentificați)
//   - Tags & creator info
//   - Secțiune "How to set as ringtone" (accordion)
//   - Ringtones similare (4 din același gen)
// ============================================================================

import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Heart,
  Crown,
  Music2,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { SEOHead } from '@/components/seo/SEOHead'
import { useRingtoneDetail } from '@/hooks/useRingtoneDetail'
import { useRingtoneDownload } from '@/hooks/useRingtoneDownload'
import { useRingtoneFavorites } from '@/hooks/useRingtoneFavorites'
import { AudioPlayer } from '@/components/ringtones/AudioPlayer'
import { RingtoneCard } from '@/components/ringtones/RingtoneCard'
import { RingtoneDownloadModal } from '@/components/ringtones/RingtoneDownloadModal'

export function RingtoneDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const { ringtone, related, loading, error, notFound } = useRingtoneDetail(slug)

  const [howToOpen, setHowToOpen] = useState<'android' | 'iphone' | null>(null)

  // Hook download cu modal + reclamă (Sesiunea 7 Task 2)
  const {
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
  } = useRingtoneDownload()

  // Hook favorites
  const { isFavorite, toggleFavorite } = useRingtoneFavorites()

  // ---- Loading ----
  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className={`h-8 w-32 mb-6 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
            <div className={`h-12 rounded mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
            <div className={`h-4 w-2/3 rounded mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
            <div className={`h-24 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    )
  }

  // ---- Not found / Error ----
  if (notFound || !ringtone) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Music2 className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
          <h1 className={`text-3xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ringtone not found
          </h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {error || "We couldn't find the ringtone you're looking for. It may have been removed or the URL is incorrect."}
          </p>
          <Link
            to="/ringtones"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse all ringtones
          </Link>
        </div>
      </div>
    )
  }

  // ---- SEO ----
  const seoConfig = {
    title:
      ringtone.seo_title ||
      `${ringtone.title} - Free Ringtone Download | BestFreeWallpapers`,
    description:
      ringtone.seo_description ||
      ringtone.description ||
      `Download ${ringtone.title} ringtone for free. ${ringtone.duration_seconds}-second MP3 ringtone, perfect for calls and notifications.`,
    keywords:
      ringtone.meta_keywords && ringtone.meta_keywords.length > 0
        ? ringtone.meta_keywords
        : [
            'free ringtone',
            ringtone.title.toLowerCase(),
            ...(ringtone.tags || []),
            'mp3 ringtone',
            'phone ringtone',
          ],
    image: '/images/og-ringtone.jpg',
  }

  // ---- Download handler — deschide modal cu reclamă ----
  // Hook-ul useRingtoneDownload se ocupă de tot:
  //   - Determină tipul utilizatorului (guest/free/premium)
  //   - Aplică timer-ul corespunzător din admin Ad Settings
  //   - Afișează reclamă în timpul timer-ului
  //   - Apelează Edge Function ringtone-download la final
  function handleDownload() {
    if (!ringtone) return
    openDownloadModal({
      id: ringtone.id,
      title: ringtone.title,
      slug: ringtone.slug,
      audio_url: ringtone.audio_url,
      is_premium: ringtone.is_premium,
    })
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-primary' : 'bg-gray-50'}`}>
      <SEOHead config={seoConfig} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Breadcrumb */}
        <nav className={`flex items-center gap-2 text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Link to="/" className="hover:text-blue-500">Home</Link>
          <span>/</span>
          <Link to="/ringtones" className="hover:text-blue-500">Ringtones</Link>
          {ringtone.genre && (
            <>
              <span>/</span>
              <Link
                to={`/ringtones/category/${ringtone.genre.slug}`}
                className="hover:text-blue-500"
              >
                {ringtone.genre.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            {ringtone.title}
          </span>
        </nav>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors ${
            isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Main card */}
        <div
          className={`rounded-2xl p-6 sm:p-8 ${
            isDark
              ? 'bg-gray-900 border border-gray-800'
              : 'bg-white border border-gray-200 shadow-md'
          }`}
        >
          {/* Premium badge top-right */}
          {ringtone.is_premium && (
            <div className="float-right">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
                <Crown className="w-4 h-4" />
                <span>PREMIUM</span>
              </div>
            </div>
          )}

          {/* Title */}
          <h1
            className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-3 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {ringtone.title}
          </h1>

          {/* Meta row */}
          <div className={`flex flex-wrap items-center gap-4 mb-6 text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatDuration(ringtone.duration_seconds)}
            </span>
            {ringtone.downloads_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                {formatNumber(ringtone.downloads_count)} downloads
              </span>
            )}
            {ringtone.creator_name && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                by {ringtone.creator_name}
              </span>
            )}
          </div>

          {/* Description */}
          {ringtone.description && (
            <p className={`text-base mb-8 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {ringtone.description}
            </p>
          )}

          {/* Big audio player */}
          <div className={`rounded-xl p-6 mb-6 flex flex-col items-center gap-4 ${
            isDark ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <AudioPlayer
              trackId={ringtone.id}
              audioUrl={ringtone.audio_url}
              duration={ringtone.duration_seconds}
              size="lg"
              showProgress={true}
              className="w-full"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
            >
              <Download className="w-5 h-5" />
              Download MP3
            </button>
            <button
              type="button"
              onClick={() => ringtone && toggleFavorite(ringtone.id, ringtone.title)}
              title={isFavorite(ringtone?.id || 0) ? 'Remove from favorites' : 'Add to favorites'}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border transition ${
                ringtone && isFavorite(ringtone.id)
                  ? isDark
                    ? 'border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                    : 'border-red-400 text-red-500 bg-red-50 hover:bg-red-100'
                  : isDark
                  ? 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${ringtone && isFavorite(ringtone.id) ? 'fill-current' : ''}`}
              />
              {ringtone && isFavorite(ringtone.id) ? 'Saved' : 'Add to Favorites'}
            </button>
          </div>

          {/* Categories chips */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 ${isDark ? '' : ''}`}>
            {ringtone.genre && (
              <CategoryChip
                label="Genre"
                value={ringtone.genre.name}
                slug={ringtone.genre.slug}
                isDark={isDark}
              />
            )}
            {ringtone.mood && (
              <CategoryChip
                label="Mood"
                value={ringtone.mood.name}
                slug={ringtone.mood.slug}
                isDark={isDark}
              />
            )}
            {ringtone.use_case && (
              <CategoryChip
                label="Use For"
                value={ringtone.use_case.name}
                slug={ringtone.use_case.slug}
                isDark={isDark}
              />
            )}
          </div>

          {/* Tags */}
          {ringtone.tags && ringtone.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Tag className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              {ringtone.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* How to set as ringtone */}
        <div
          className={`mt-8 rounded-2xl p-6 sm:p-8 ${
            isDark
              ? 'bg-gray-900 border border-gray-800'
              : 'bg-white border border-gray-200 shadow-md'
          }`}
        >
          <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            How to set as ringtone
          </h2>

          <Accordion
            isDark={isDark}
            title="📱 On Android"
            isOpen={howToOpen === 'android'}
            onToggle={() => setHowToOpen(howToOpen === 'android' ? null : 'android')}
          >
            <ol className={`list-decimal list-inside space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Tap the <strong>Download MP3</strong> button above and save the file to your phone.</li>
              <li>Open <strong>Settings</strong> → <strong>Sound &amp; vibration</strong> → <strong>Ringtone</strong>.</li>
              <li>Choose <strong>"Add ringtone"</strong> (or similar) and select the downloaded file.</li>
              <li>Done! Your new ringtone is set.</li>
            </ol>
          </Accordion>

          <Accordion
            isDark={isDark}
            title="🍎 On iPhone"
            isOpen={howToOpen === 'iphone'}
            onToggle={() => setHowToOpen(howToOpen === 'iphone' ? null : 'iphone')}
          >
            <ol className={`list-decimal list-inside space-y-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Tap the <strong>Download MP3</strong> button above. The file will save to <strong>Files app</strong>.</li>
              <li>Open the <strong>GarageBand</strong> app (free from App Store if you don't have it).</li>
              <li>Create a new project, tap the <strong>loop icon</strong> → <strong>Files</strong>, then select the downloaded MP3.</li>
              <li>Long-press the audio in your project → <strong>Share</strong> → <strong>Ringtone</strong>.</li>
              <li>Set a name and tap <strong>Use sound as...</strong> → <strong>Standard Ringtone</strong>. Done!</li>
            </ol>
            <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              💡 Tip: We're working on M4R format support to make this even easier on iPhone.
            </p>
          </Accordion>

          <div className="mt-4 text-center">
            <Link
              to="/ringtones/how-to-set"
              className={`text-sm font-medium ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Need more help? Read the full guide →
            </Link>
          </div>
        </div>

        {/* Related ringtones */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              You might also like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r) => (
                <RingtoneCard key={r.id} ringtone={r} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Download modal cu reclamă (Sesiunea 7 Task 2) */}
      <RingtoneDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={closeDownloadModal}
        ringtone={currentRingtone}
        userType={userType}
        timerDuration={timerDuration}
        showAdTimer={showAdTimer}
        isDownloading={isDownloading}
        onDownload={startDownload}
        onTimerComplete={handleTimerComplete}
      />
    </div>
  )
}

// ===== Helper components =====

function CategoryChip({
  label,
  value,
  slug,
  isDark,
}: {
  label: string
  value: string
  slug: string
  isDark: boolean
}) {
  return (
    <Link
      to={`/ringtones/category/${slug}`}
      className={`block rounded-lg p-3 transition ${
        isDark
          ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      <div className={`text-xs uppercase tracking-wider mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
    </Link>
  )
}

function Accordion({
  title,
  isOpen,
  onToggle,
  children,
  isDark,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  isDark: boolean
}) {
  return (
    <div className={`border rounded-lg mb-3 overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 text-left font-medium transition ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-750 text-white'
            : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
        }`}
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className={`p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          {children}
        </div>
      )}
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

export default RingtoneDetailPage
