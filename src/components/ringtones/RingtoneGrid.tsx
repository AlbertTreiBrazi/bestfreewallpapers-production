// ============================================================================
// 🎵 RingtoneGrid.tsx — Grid responsive pentru ringtones
// ============================================================================
// Afișează ringtones-urile într-un grid responsive cu:
//   - Loading skeleton la primul fetch
//   - Empty state când nu există rezultate
//   - Loading more spinner pentru paginare
// ============================================================================

import React from 'react'
import { Loader2, Music } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { RingtoneCard } from './RingtoneCard'
import type { Ringtone } from '@/hooks/useRingtones'

interface RingtoneGridProps {
  ringtones: Ringtone[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  emptyMessage?: string
}

export function RingtoneGrid({
  ringtones,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  emptyMessage = 'No ringtones yet. Check back soon!',
}: RingtoneGridProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Initial loading: show skeleton grid
  if (loading && ringtones.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 animate-pulse ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4 mb-3">
              <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className="flex-1">
                <div className={`h-4 rounded mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-3 w-2/3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              </div>
            </div>
            <div className={`h-3 rounded mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-3 w-3/4 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error && ringtones.length === 0) {
    return (
      <div className={`text-center py-16 rounded-xl ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
        <p className={`text-lg font-medium mb-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
          Could not load ringtones
        </p>
        <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </p>
      </div>
    )
  }

  // Empty state
  if (!loading && ringtones.length === 0) {
    return (
      <div className={`text-center py-16 rounded-xl ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'}`}>
        <Music className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {emptyMessage}
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          New ringtones are added regularly. Stay tuned!
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ringtones.map((r) => (
          <RingtoneCard key={r.id} ringtone={r} />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              loadingMore
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Load more ringtones'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default RingtoneGrid
