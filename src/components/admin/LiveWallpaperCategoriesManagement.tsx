// ============================================================================
// 🎬 LiveWallpaperCategoriesManagement.tsx
// Admin panel pentru categorii live wallpapers — CRUD complet
// Se adaugă în EnhancedAdminPanel lângă "Live Wallpapers"
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { Plus, Edit, Trash2, Check, X, GripVertical, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface LiveCategory {
  id: number
  name: string
  slug: string
  sort_order: number
  is_active: boolean
}

function toSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function LiveWallpaperCategoriesManagement() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [categories, setCategories] = useState<LiveCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form pentru categorie nouă
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Editare inline
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')

  const card = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const input = `w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`
  const btn = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('live_wallpaper_categories')
      .select('*')
      .order('sort_order')
    if (error) { toast.error('Failed to load categories'); console.error(error) }
    else setCategories(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // ── Adaugă categorie nouă ──────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('Name is required'); return }
    const slug = newSlug.trim() || toSlug(newName)
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0

    setSaving(true)
    const { error } = await supabase
      .from('live_wallpaper_categories')
      .insert({ name: newName.trim(), slug, sort_order: maxOrder + 1, is_active: true })

    if (error) {
      toast.error(error.message.includes('unique') ? 'Slug already exists' : 'Failed to add category')
    } else {
      toast.success(`Category "${newName}" added`)
      setNewName(''); setNewSlug(''); setShowAddForm(false)
      fetchCategories()
    }
    setSaving(false)
  }

  // ── Salvează editare ───────────────────────────────────────────────────────
  const handleSaveEdit = async (id: number) => {
    if (!editName.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const { error } = await supabase
      .from('live_wallpaper_categories')
      .update({ name: editName.trim(), slug: editSlug.trim() || toSlug(editName) })
      .eq('id', id)

    if (error) toast.error('Failed to save')
    else { toast.success('Saved'); setEditingId(null); fetchCategories() }
    setSaving(false)
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggleActive = async (cat: LiveCategory) => {
    const { error } = await supabase
      .from('live_wallpaper_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id)
    if (error) toast.error('Failed to update')
    else fetchCategories()
  }

  // ── Șterge ─────────────────────────────────────────────────────────────────
  const handleDelete = async (cat: LiveCategory) => {
    if (!confirm(`Delete category "${cat.name}"? Live wallpapers in this category won't be deleted, only the category label.`)) return
    const { error } = await supabase
      .from('live_wallpaper_categories')
      .delete()
      .eq('id', cat.id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deleted'); fetchCategories() }
  }

  // ── Mută în sus / jos ──────────────────────────────────────────────────────
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= categories.length) return

    const a = categories[index]
    const b = categories[swapIndex]

    await Promise.all([
      supabase.from('live_wallpaper_categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('live_wallpaper_categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    fetchCategories()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Live Wallpaper Categories
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {categories.length} categories · editabile dinamic, fără deploy
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`${btn} bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5`}
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Form adăugare */}
      {showAddForm && (
        <div className={`border rounded-xl p-4 space-y-3 ${card}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>New category</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Name *</label>
              <input
                className={input}
                placeholder="e.g. Cyberpunk"
                value={newName}
                onChange={e => { setNewName(e.target.value); setNewSlug(toSlug(e.target.value)) }}
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Slug (auto)</label>
              <input
                className={input}
                placeholder="e.g. cyberpunk"
                value={newSlug}
                onChange={e => setNewSlug(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className={`${btn} bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); setNewSlug('') }}
              className={`${btn} ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lista categorii */}
      <div className={`border rounded-xl overflow-hidden ${card}`}>
        {categories.length === 0 ? (
          <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            No categories yet. Add one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-gray-500 w-8">#</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-gray-500">Name</th>
                <th className="px-4 py-2.5 text-left font-medium text-xs text-gray-500">Slug</th>
                <th className="px-4 py-2.5 text-center font-medium text-xs text-gray-500">Active</th>
                <th className="px-4 py-2.5 text-center font-medium text-xs text-gray-500">Order</th>
                <th className="px-4 py-2.5 text-right font-medium text-xs text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <tr
                  key={cat.id}
                  className={`border-b last:border-0 ${isDark ? 'border-gray-800 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-gray-400">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    {editingId === cat.id ? (
                      <input
                        className={`${input} w-40`}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>{cat.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === cat.id ? (
                      <input
                        className={`${input} w-36`}
                        value={editSlug}
                        onChange={e => setEditSlug(e.target.value)}
                      />
                    ) : (
                      <code className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {cat.slug}
                      </code>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`w-8 h-4 rounded-full transition-colors ${cat.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                    >
                      <span className={`block w-3 h-3 rounded-full bg-white mx-auto transition-transform ${cat.is_active ? 'translate-x-1.5' : '-translate-x-1.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="px-1.5 py-0.5 rounded text-xs disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >↑</button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="px-1.5 py-0.5 rounded text-xs disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >↓</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {editingId === cat.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(cat.id)}
                            disabled={saving}
                            className={`${btn} bg-green-600 hover:bg-green-700 text-white py-1`}
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className={`${btn} ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} py-1`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditSlug(cat.slug) }}
                            className={`${btn} ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} py-1`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className={`${btn} bg-red-500/10 hover:bg-red-500/20 text-red-500 py-1`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        Categoriile active apar automat pe pagina Live Wallpapers și în formularul de upload.
      </p>
    </div>
  )
}

export default LiveWallpaperCategoriesManagement
