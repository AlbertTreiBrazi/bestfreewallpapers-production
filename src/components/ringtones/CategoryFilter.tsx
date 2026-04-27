// ============================================================================
// 🎵 CategoryFilter.tsx — Dropdown-uri pentru filtrare ringtones
// ============================================================================
// Afișează 3 dropdown-uri: Genre, Mood, Use Case
// + checkbox "Free only"
// + buton "Clear all"
// ============================================================================

import React from 'react'
import { X } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useRingtoneCategories } from '@/hooks/useRingtoneCategories'

export interface FilterState {
  genre?: string
  mood?: string
  useCase?: string
  onlyFree: boolean
}

interface CategoryFilterProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

export function CategoryFilter({ filters, onChange }: CategoryFilterProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { genres, moods, use_cases, loading } = useRingtoneCategories()

  const hasAnyFilter = Boolean(filters.genre || filters.mood || filters.useCase || filters.onlyFree)

  function clearAll() {
    onChange({ genre: undefined, mood: undefined, useCase: undefined, onlyFree: false })
  }

  const baseSelectClass = `text-sm rounded-lg px-3 py-2 border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark
      ? 'bg-gray-800 text-white border-gray-700 hover:border-gray-600'
      : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'
  }`

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Genre */}
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Genre
          </label>
          <select
            value={filters.genre || ''}
            onChange={(e) => onChange({ ...filters, genre: e.target.value || undefined })}
            disabled={loading}
            className={baseSelectClass}
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.name} {g.ringtones_count > 0 ? `(${g.ringtones_count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Mood */}
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Mood
          </label>
          <select
            value={filters.mood || ''}
            onChange={(e) => onChange({ ...filters, mood: e.target.value || undefined })}
            disabled={loading}
            className={baseSelectClass}
          >
            <option value="">All moods</option>
            {moods.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name} {m.ringtones_count > 0 ? `(${m.ringtones_count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Use case */}
        <div className="flex flex-col gap-1">
          <label className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Use For
          </label>
          <select
            value={filters.useCase || ''}
            onChange={(e) => onChange({ ...filters, useCase: e.target.value || undefined })}
            disabled={loading}
            className={baseSelectClass}
          >
            <option value="">Any</option>
            {use_cases.map((u) => (
              <option key={u.id} value={u.slug}>
                {u.name} {u.ringtones_count > 0 ? `(${u.ringtones_count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Free only */}
        <label
          className={`flex items-center gap-2 cursor-pointer mt-5 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          <input
            type="checkbox"
            checked={filters.onlyFree}
            onChange={(e) => onChange({ ...filters, onlyFree: e.target.checked })}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">Free only</span>
        </label>

        {/* Clear all */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className={`mt-5 flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-red-400 hover:bg-red-900/30'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

export default CategoryFilter
