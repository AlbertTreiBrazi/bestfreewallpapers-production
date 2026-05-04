// ============================================================================
// 🎬 LiveWallpaperManagement.tsx — Admin panel pentru live wallpapers
// ============================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Plus, Edit, Trash2, Upload, Video, Search,
  Crown, Eye, EyeOff, Loader2, ChevronLeft, ChevronRight, X, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

interface LiveWallpaper {
  id: number
  title: string
  slug: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  tags: string[]
  is_premium: boolean
  is_published: boolean
  downloads_count: number
  created_at: string
}

interface FormState {
  title: string
  slug: string
  description: string
  video_url: string
  thumbnail_url: string
  tags: string
  is_premium: boolean
  is_published: boolean
}

const EMPTY_FORM: FormState = {
  title: '', slug: '', description: '', video_url: '',
  thumbnail_url: '', tags: '', is_premium: false, is_published: true,
}

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function LiveWallpaperManagement() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [wallpapers, setWallpapers] = useState<LiveWallpaper[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [uploadProgress, setUploadProgress] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const PAGE_SIZE = 20

  const loadWallpapers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('live-wallpapers-api', {
        body: { action: 'admin_list', page, pageSize: PAGE_SIZE, search: search || undefined },
      })
      if (error) throw error
      setWallpapers(data?.wallpapers || [])
      setTotal(data?.total || 0)
    } catch (err: any) {
      toast.error('Failed to load: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { loadWallpapers() }, [loadWallpapers])

  // Upload video to R2
  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file (MP4)')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video too large — max 50MB')
      return
    }

    setUploading(true)
    setUploadProgress('Reading video...')

    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const videoData = reader.result as string
        setUploadProgress('Uploading to CDN...')

        const { data, error } = await supabase.functions.invoke('live-wallpapers-api', {
          body: {
            action: 'upload_video',
            videoData,
            fileName: file.name,
          },
        })

        if (error) throw error

        setForm(prev => ({ ...prev, video_url: data.url }))
        setUploadProgress('')
        toast.success('Video uploaded!')
        setUploading(false)
      }
      reader.onerror = () => { throw new Error('Failed to read file') }
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message)
      setUploadProgress('')
      setUploading(false)
    }
  }

  // Upload thumbnail to R2
  const handleThumbUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const imageData = reader.result as string
        const { data, error } = await supabase.functions.invoke('live-wallpapers-api', {
          body: { action: 'upload_thumbnail', imageData, fileName: file.name },
        })
        if (error) throw error
        setForm(prev => ({ ...prev, thumbnail_url: data.url }))
        toast.success('Thumbnail uploaded!')
        setUploading(false)
      }
    } catch (err: any) {
      toast.error('Thumbnail upload failed: ' + err.message)
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.title || !form.video_url) {
      toast.error('Title and video are required')
      return
    }

    try {
      const payload = {
        ...form,
        slug: form.slug || toSlug(form.title),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }

      const action = editingId ? 'update' : 'create'
      const { error } = await supabase.functions.invoke('live-wallpapers-api', {
        body: { action, id: editingId, ...payload },
      })
      if (error) throw error

      toast.success(editingId ? 'Updated!' : 'Created!')
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      loadWallpapers()
    } catch (err: any) {
      toast.error('Failed: ' + err.message)
    }
  }

  const handleEdit = (w: LiveWallpaper) => {
    setEditingId(w.id)
    setForm({
      title: w.title,
      slug: w.slug,
      description: w.description || '',
      video_url: w.video_url,
      thumbnail_url: w.thumbnail_url || '',
      tags: w.tags?.join(', ') || '',
      is_premium: w.is_premium,
      is_published: w.is_published,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this live wallpaper?')) return
    try {
      const { error } = await supabase.functions.invoke('live-wallpapers-api', {
        body: { action: 'delete', id },
      })
      if (error) throw error
      toast.success('Deleted')
      loadWallpapers()
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  const togglePublish = async (w: LiveWallpaper) => {
    try {
      const { error } = await supabase.functions.invoke('live-wallpapers-api', {
        body: { action: 'update', id: w.id, is_published: !w.is_published },
      })
      if (error) throw error
      toast.success(w.is_published ? 'Unpublished' : 'Published')
      loadWallpapers()
    } catch (err: any) {
      toast.error('Failed: ' + err.message)
    }
  }

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
    isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
           : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-400'
  }`

  return (
    <div className={`p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-purple-500" />
            Live Wallpapers
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {total} total live wallpapers
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Live Wallpaper
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        <input
          type="text"
          placeholder="Search live wallpapers..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className={inputClass + ' pl-10'}
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className={`mb-6 p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow'}`}>
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit' : 'Add'} Live Wallpaper</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value, slug: p.slug || toSlug(e.target.value) }))}
                placeholder="e.g. Blue Supercar Drift"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <input
                value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: toSlug(e.target.value) }))}
                placeholder="auto-generated from title"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Describe the live wallpaper..."
              className={inputClass}
            />
          </div>

          {/* Video Upload */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Video (MP4) *</label>
            {form.video_url ? (
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'border-green-700 bg-green-900/20' : 'border-green-300 bg-green-50'}`}>
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-green-600 truncate flex-1">{form.video_url.split('/').pop()}</span>
                <button onClick={() => setForm(p => ({ ...p, video_url: '' }))} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => videoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDark ? 'border-gray-600 hover:border-purple-500' : 'border-gray-300 hover:border-purple-400'
                }`}
              >
                {uploading && uploadProgress ? (
                  <p className="text-purple-500">{uploadProgress}</p>
                ) : (
                  <>
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                    <p className="text-sm">Click to upload MP4 video (max 50MB)</p>
                  </>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                />
              </div>
            )}
          </div>

          {/* Thumbnail Upload */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Thumbnail (optional)</label>
            {form.thumbnail_url ? (
              <div className="flex items-center gap-3">
                <img src={form.thumbnail_url} alt="thumb" className="w-16 h-16 object-cover rounded-lg" />
                <button onClick={() => setForm(p => ({ ...p, thumbnail_url: '' }))} className="text-red-400 text-sm hover:underline">Remove</button>
              </div>
            ) : (
              <button
                onClick={() => thumbInputRef.current?.click()}
                className={`px-4 py-2 rounded-lg border text-sm ${isDark ? 'border-gray-600 hover:border-purple-500' : 'border-gray-300 hover:border-purple-400'}`}
              >
                Upload thumbnail image
              </button>
            )}
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleThumbUpload(e.target.files[0])}
            />
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium mb-1 block">Tags (comma separated)</label>
            <input
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="car, luxury, blue, neon, aesthetic"
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-6 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_premium} onChange={e => setForm(p => ({ ...p, is_premium: e.target.checked }))} />
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Premium</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} />
              <span className="text-sm">Published</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }}
              className={`px-6 py-2 rounded-lg border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : wallpapers.length === 0 ? (
        <div className="text-center py-20">
          <Video className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No live wallpapers yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className="text-left py-3 px-2 font-medium">Preview</th>
                <th className="text-left py-3 px-2 font-medium">Title</th>
                <th className="text-left py-3 px-2 font-medium">Downloads</th>
                <th className="text-left py-3 px-2 font-medium">Status</th>
                <th className="text-left py-3 px-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wallpapers.map(w => (
                <tr key={w.id} className={`border-b ${isDark ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className="py-2 px-2">
                    {w.thumbnail_url ? (
                      <img src={w.thumbnail_url} alt={w.title} className="w-10 h-16 object-cover rounded" />
                    ) : (
                      <div className={`w-10 h-16 rounded flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <Video className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <p className="font-medium">{w.title}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{w.slug}</p>
                    {w.is_premium && <span className="text-xs text-yellow-500 flex items-center gap-1"><Crown className="w-3 h-3" />Premium</span>}
                  </td>
                  <td className="py-2 px-2">{w.downloads_count}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      w.is_published
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {w.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(w)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => togglePublish(w)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={w.is_published ? 'Unpublish' : 'Publish'}>
                        {w.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(w.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total}
              className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveWallpaperManagement
