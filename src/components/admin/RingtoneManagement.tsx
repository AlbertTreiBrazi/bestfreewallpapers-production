// ============================================================================
// 🎵 RingtoneManagement.tsx — Admin panel pentru ringtones
// ============================================================================
// Tab în /admin → Content Management → Ringtones
//
// Funcționalități:
//   - Listare ringtone-uri (cu search, paginare)
//   - Upload MP3 nou (drag & drop sau click)
//   - Validare client-side durată ≤ 30s + format MP3
//   - Form creare/editare (titlu, categorii, tags, premium)
//   - Publish/Unpublish cu un click
//   - Delete (soft)
//   - Preview player inline
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Plus, Edit, Trash2, Upload, Music2, Search,
  Crown, Eye, EyeOff, Play, Pause, Loader2,
  ChevronLeft, ChevronRight, Check, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRingtoneCategories } from '@/hooks/useRingtoneCategories'

// ============ Types ============

interface Ringtone {
  id: number
  title: string
  slug: string
  description: string | null
  audio_url: string
  duration_seconds: number
  genre_id: number | null
  mood_id: number | null
  use_case_id: number | null
  tags: string[]
  is_premium: boolean
  is_published: boolean
  is_active: boolean
  downloads_count: number
  plays_count: number
  created_at: string
}

interface FormState {
  title: string
  slug: string
  description: string
  audio_url: string
  duration_seconds: number
  genre_id: string
  mood_id: string
  use_case_id: string
  tags: string
  is_premium: boolean
  is_published: boolean
  ai_prompt: string
}

const EMPTY_FORM: FormState = {
  title: '', slug: '', description: '', audio_url: '',
  duration_seconds: 0, genre_id: '', mood_id: '', use_case_id: '',
  tags: '', is_premium: false, is_published: false, ai_prompt: '',
}

// ============ Helpers ============

function slugify(str: string): string {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function formatDuration(secs: number): string {
  if (!secs) return '0s'
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

// Read duration from MP3 file via HTMLAudioElement
// Has a 5-second timeout in case browser blocks autoplay detection
async function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    
    const cleanup = (result: number | null) => {
      try { URL.revokeObjectURL(url) } catch { /* ignore */ }
      try { audio.removeAttribute('src'); audio.load() } catch { /* ignore */ }
      resolve(result)
    }

    // Timeout: if browser can't read in 5 seconds, return null (skip client validation)
    const timeout = setTimeout(() => cleanup(null), 5000)

    audio.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout)
      const dur = isFinite(audio.duration) ? Math.round(audio.duration) : null
      cleanup(dur)
    })

    audio.addEventListener('error', () => {
      clearTimeout(timeout)
      cleanup(null) // null = skip client validation, let server validate
    })

    audio.preload = 'metadata'
    audio.src = url
    audio.load()
  })
}

// ============ Main Component ============

export function RingtoneManagement() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { genres, moods, use_cases } = useRingtoneCategories()

  // List state
  const [ringtones, setRingtones] = useState<Ringtone[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const LIMIT = 20

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [uploadedDuration, setUploadedDuration] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form / modal state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Inline audio preview
  const [playingId, setPlayingId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch list
  const fetchRingtones = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ringtone-management', {
        body: { action: 'list', page, limit: LIMIT, search },
      })
      if (error) throw new Error(error.message)
      setRingtones(data?.data?.ringtones || [])
      setTotal(data?.data?.total || 0)
    } catch (e: any) {
      toast.error('Failed to load ringtones: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchRingtones() }, [fetchRingtones])

  // ---- File upload ----
  const handleFileSelect = async (file: File) => {
    if (!file) return

    // Validate type
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      toast.error('Only MP3 files allowed')
      return
    }

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum 5MB.')
      return
    }

    // Validate duration client-side (optional — server validates too)
    const toastId = toast.loading('Reading audio file…')
    const duration = await getAudioDuration(file)

    // If we got a duration and it exceeds 30s, block here
    if (duration !== null && duration > 30) {
      toast.dismiss(toastId)
      toast.error(`Ringtone is ${duration}s. Maximum allowed is 30 seconds.`)
      return
    }

    // If duration is null, browser couldn't detect it — continue anyway,
    // server will validate. We'll show a warning.
    if (duration === null) {
      toast.dismiss(toastId)
      toast('⚠️ Could not detect duration client-side. Server will validate (max 30s).', { icon: '⚠️' })
    } else {
      toast.dismiss(toastId)
    }

    const finalDuration = duration ?? 0

    // Convert to base64
    const reader = new FileReader()
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })

    setUploading(true)
    const uploadToast = toast.loading('Uploading to R2…')

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const { data, error } = await supabase.functions.invoke('ringtone-management', {
        body: {
          action: 'upload-audio',
          audioData: base64,
          fileName: safeName,
          duration_seconds: finalDuration,
        },
      })

      if (error) throw new Error(error.message)
      if (!data?.data?.url) throw new Error('No URL returned')

      const url = data.data.url
      setUploadedUrl(url)
      setUploadedDuration(finalDuration)
      setForm(f => ({
        ...f,
        audio_url: url,
        duration_seconds: finalDuration,
        // Auto-fill slug from filename if empty
        slug: f.slug || slugify(file.name.replace(/\.mp3$/i, '')),
        title: f.title || file.name.replace(/\.mp3$/i, '').replace(/[-_]/g, ' '),
      }))

      toast.dismiss(uploadToast)
      toast.success(`✅ Uploaded! ${duration}s MP3 → R2`)
    } catch (e: any) {
      toast.dismiss(uploadToast)
      toast.error('Upload failed: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // ---- Form save ----
  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.audio_url) { toast.error('Upload an MP3 first'); return }
    if (!form.slug.trim()) { toast.error('Slug is required'); return }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        slug: slugify(form.slug),
        description: form.description.trim() || null,
        audio_url: form.audio_url,
        duration_seconds: form.duration_seconds,
        genre_id: form.genre_id ? parseInt(form.genre_id) : null,
        mood_id: form.mood_id ? parseInt(form.mood_id) : null,
        use_case_id: form.use_case_id ? parseInt(form.use_case_id) : null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_premium: form.is_premium,
        is_published: form.is_published,
        ai_prompt: form.ai_prompt.trim() || null,
      }

      const action = editingId ? 'update' : 'create'
      const { data, error } = await supabase.functions.invoke('ringtone-management', {
        body: { action, ...(editingId ? { id: editingId } : {}), ...payload },
      })

      if (error) throw new Error(error.message)

      toast.success(editingId ? '✅ Ringtone updated!' : '✅ Ringtone created!')
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setUploadedUrl('')
      fetchRingtones()
    } catch (e: any) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (rt: Ringtone) => {
    setEditingId(rt.id)
    setUploadedUrl(rt.audio_url)
    setUploadedDuration(rt.duration_seconds)
    setForm({
      title: rt.title,
      slug: rt.slug,
      description: rt.description || '',
      audio_url: rt.audio_url,
      duration_seconds: rt.duration_seconds,
      genre_id: rt.genre_id?.toString() || '',
      mood_id: rt.mood_id?.toString() || '',
      use_case_id: rt.use_case_id?.toString() || '',
      tags: (rt.tags || []).join(', '),
      is_premium: rt.is_premium,
      is_published: rt.is_published,
      ai_prompt: '',
    })
    setShowForm(true)
  }

  const handleDelete = async (rt: Ringtone) => {
    if (!confirm(`Delete "${rt.title}"? This cannot be undone.`)) return
    try {
      const { error } = await supabase.functions.invoke('ringtone-management', {
        body: { action: 'delete', id: rt.id },
      })
      if (error) throw new Error(error.message)
      toast.success('Ringtone deleted')
      fetchRingtones()
    } catch (e: any) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  const handleTogglePublish = async (rt: Ringtone) => {
    try {
      const { error } = await supabase.functions.invoke('ringtone-management', {
        body: { action: 'toggle-publish', id: rt.id, is_published: !rt.is_published },
      })
      if (error) throw new Error(error.message)
      toast.success(rt.is_published ? 'Unpublished' : '✅ Published!')
      fetchRingtones()
    } catch (e: any) {
      toast.error('Toggle failed: ' + e.message)
    }
  }

  const handlePlayPause = (rt: Ringtone) => {
    if (playingId === rt.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      const audio = new Audio(rt.audio_url)
      audio.play().catch(() => toast.error('Cannot play audio'))
      audio.addEventListener('ended', () => setPlayingId(null))
      audioRef.current = audio
      setPlayingId(rt.id)
    }
  }

  // ---- RENDER ----
  const totalPages = Math.ceil(total / LIMIT)
  const card = isDark
    ? 'bg-gray-900 border border-gray-800'
    : 'bg-white border border-gray-200 shadow-sm'
  const input = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
  }`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ringtones Management
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {total} ringtones total
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); setUploadedUrl('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Add Ringtone
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6 max-w-sm">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        <input
          type="text"
          placeholder="Search ringtones..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className={`${input} pl-9`}
        />
      </div>

      {/* ---- ADD / EDIT FORM ---- */}
      {showForm && (
        <div className={`rounded-2xl p-6 mb-8 ${card}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingId ? 'Edit Ringtone' : 'Add New Ringtone'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Upload zone */}
          {!uploadedUrl && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer mb-6 transition ${
                isDark ? 'border-gray-700 hover:border-blue-500 bg-gray-800/50' : 'border-gray-300 hover:border-blue-500 bg-gray-50'
              }`}
            >
              {uploading ? (
                <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-blue-500" />
              ) : (
                <Upload className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              )}
              <p className={`font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {uploading ? 'Uploading...' : 'Drag & drop MP3 here, or click to browse'}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                MP3 only · Max 5MB · Max 30 seconds
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
            </div>
          )}

          {uploadedUrl && (
            <div className={`flex items-center gap-3 p-3 rounded-lg mb-6 ${
              isDark ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'
            }`}>
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                  Uploaded: {uploadedUrl.split('/').pop()}
                </p>
                <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  Duration: {formatDuration(uploadedDuration)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setUploadedUrl(''); setForm(f => ({ ...f, audio_url: '', duration_seconds: 0 })) }}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(f => ({
                  ...f,
                  title: e.target.value,
                  slug: f.slug || slugify(e.target.value),
                }))}
                placeholder="e.g. Rock Energy Call"
                className={input}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="rock-energy-call"
                className={input}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Short description of the ringtone..."
                className={input}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Duration (seconds) *</label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.duration_seconds || ''}
                onChange={(e) => setForm(f => ({ ...f, duration_seconds: parseInt(e.target.value) || 0 }))}
                placeholder="e.g. 28"
                className={input}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Max 30 seconds</p>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Genre</label>
              <select value={form.genre_id} onChange={(e) => setForm(f => ({ ...f, genre_id: e.target.value }))} className={input}>
                <option value="">None</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Mood</label>
              <select value={form.mood_id} onChange={(e) => setForm(f => ({ ...f, mood_id: e.target.value }))} className={input}>
                <option value="">None</option>
                {moods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Use For</label>
              <select value={form.use_case_id} onChange={(e) => setForm(f => ({ ...f, use_case_id: e.target.value }))} className={input}>
                <option value="">None</option>
                {use_cases.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Tags (comma separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="rock, energy, guitar"
                className={input}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 mb-6">
            <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={form.is_premium}
                onChange={(e) => setForm(f => ({ ...f, is_premium: e.target.checked }))}
                className="w-4 h-4 rounded text-yellow-500"
              />
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Premium</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm(f => ({ ...f, is_published: e.target.checked }))}
                className="w-4 h-4 rounded text-green-500"
              />
              <Eye className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Publish immediately</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.audio_url}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition ${
                saving || !form.audio_url
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? 'Save Changes' : 'Create Ringtone'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setUploadedUrl('') }}
              className={`px-5 py-2.5 rounded-lg font-medium transition ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- LIST ---- */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : ringtones.length === 0 ? (
        <div className={`text-center py-16 rounded-xl ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-200'}`}>
          <Music2 className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            {search ? `No results for "${search}"` : 'No ringtones yet. Click "Add Ringtone" to upload the first one!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ringtones.map((rt) => (
            <div key={rt.id} className={`flex items-center gap-4 rounded-xl p-4 ${card}`}>
              {/* Play button */}
              <button
                type="button"
                onClick={() => handlePlayPause(rt)}
                className="w-10 h-10 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition"
              >
                {playingId === rt.id
                  ? <Pause className="w-4 h-4" fill="currentColor" />
                  : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                }
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {rt.title}
                  </span>
                  {rt.is_premium && (
                    <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full font-medium">
                      <Crown className="w-3 h-3" /> PRO
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    rt.is_published
                      ? 'bg-green-500/20 text-green-500'
                      : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {rt.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className={`flex items-center gap-3 mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  <span>{formatDuration(rt.duration_seconds)}</span>
                  <span>↓ {rt.downloads_count}</span>
                  <span>▶ {rt.plays_count}</span>
                  <span className="truncate">{rt.slug}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(rt)}
                  title={rt.is_published ? 'Unpublish' : 'Publish'}
                  className={`p-1.5 rounded-lg transition ${
                    rt.is_published
                      ? isDark ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'
                      : isDark ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {rt.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(rt)}
                  className={`p-1.5 rounded-lg transition ${isDark ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'}`}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rt)}
                  className={`p-1.5 rounded-lg transition ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`p-2 rounded-lg ${page === 1 ? 'opacity-40 cursor-not-allowed' : ''} ${
              isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`p-2 rounded-lg ${page === totalPages ? 'opacity-40 cursor-not-allowed' : ''} ${
              isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default RingtoneManagement
