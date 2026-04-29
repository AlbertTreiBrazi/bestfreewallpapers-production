// ============================================================================
// 🎵 RingtoneCategoriesManagement.tsx — Admin pentru categorii ringtone
// ============================================================================
// Permite admin să gestioneze categoriile ringtone (Genre, Mood, Use For):
//   - Listare grupată pe 3 tab-uri
//   - Create / Edit / Delete / Toggle is_active
//   - Sort order, descriere, preview image, SEO fields
// ============================================================================

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Music,
  Heart,
  Phone,
  X,
  Save,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================================================
// TYPES
// ============================================================================

interface RingtoneCategory {
  id: number
  name: string
  slug: string
  description: string | null
  category_type: 'genre' | 'mood' | 'use_case'
  sort_order: number
  is_active: boolean
  preview_image: string | null
  seo_title: string | null
  seo_description: string | null
  created_at?: string
  updated_at?: string
}

type TabType = 'genre' | 'mood' | 'use_case'

const TAB_CONFIG: Record<TabType, { label: string; icon: any; color: string }> = {
  genre: { label: 'Genre', icon: Music, color: 'text-purple-500' },
  mood: { label: 'Mood', icon: Heart, color: 'text-pink-500' },
  use_case: { label: 'Use For', icon: Phone, color: 'text-blue-500' },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RingtoneCategoriesManagement() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [categories, setCategories] = useState<RingtoneCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('genre')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<RingtoneCategory | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<RingtoneCategory | null>(null)

  // ---- Load on mount ----
  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ringtone-categories-management', {
        body: { action: 'list' },
      })

      if (error) throw error

      const result = data?.data?.categories || []
      setCategories(result)
    } catch (err: any) {
      console.error('[loadCategories] failed:', err)
      toast.error(err.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  // ---- Filtered for active tab ----
  const filteredCategories = categories
    .filter((c) => c.category_type === activeTab)
    .sort((a, b) => a.sort_order - b.sort_order)

  // ---- Open new / edit modal ----
  function openNewModal() {
    setEditingCategory(null)
    setShowFormModal(true)
  }

  function openEditModal(category: RingtoneCategory) {
    setEditingCategory(category)
    setShowFormModal(true)
  }

  function closeModal() {
    setShowFormModal(false)
    setEditingCategory(null)
  }

  // ---- Toggle is_active ----
  async function handleToggle(category: RingtoneCategory) {
    try {
      const { data, error } = await supabase.functions.invoke('ringtone-categories-management', {
        body: { action: 'toggle', id: category.id },
      })

      if (error) throw error

      toast.success(`${category.name} ${category.is_active ? 'disabled' : 'enabled'}`)
      await loadCategories()
    } catch (err: any) {
      console.error('[handleToggle] failed:', err)
      toast.error(err.message || 'Failed to toggle category')
    }
  }

  // ---- Delete category ----
  async function handleDelete() {
    if (!deleteConfirm) return

    try {
      const { data, error } = await supabase.functions.invoke('ringtone-categories-management', {
        body: { action: 'delete', id: deleteConfirm.id },
      })

      if (error) {
        // Show specific error from Edge Function (e.g. has ringtones)
        const msg = (error as any)?.context?.body
          ? JSON.parse((error as any).context.body)?.error
          : error.message
        throw new Error(msg || 'Failed to delete')
      }

      toast.success(`${deleteConfirm.name} deleted`)
      setDeleteConfirm(null)
      await loadCategories()
    } catch (err: any) {
      console.error('[handleDelete] failed:', err)
      toast.error(err.message || 'Failed to delete')
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Ringtone Categories
          </h2>
          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            Manage Genre, Mood, and Use For categories for ringtones
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => {
          const config = TAB_CONFIG[tab]
          const Icon = config.icon
          const count = categories.filter((c) => c.category_type === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 -mb-px ${
                activeTab === tab
                  ? `${config.color} border-current`
                  : isDark
                  ? 'text-gray-400 border-transparent hover:text-gray-200'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isDark
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCategories.length === 0 && (
        <div
          className={`text-center py-12 rounded-lg ${
            isDark
              ? 'bg-gray-800 border border-gray-700 text-gray-400'
              : 'bg-gray-50 border border-gray-200 text-gray-500'
          }`}
        >
          <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No {TAB_CONFIG[activeTab].label.toLowerCase()} categories yet</p>
          <button
            onClick={openNewModal}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            Create the first one
          </button>
        </div>
      )}

      {/* Categories list */}
      {!loading && filteredCategories.length > 0 && (
        <div className="space-y-2">
          {filteredCategories.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              isDark={isDark}
              onEdit={() => openEditModal(cat)}
              onToggle={() => handleToggle(cat)}
              onDelete={() => setDeleteConfirm(cat)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showFormModal && (
        <CategoryFormModal
          category={editingCategory}
          defaultType={activeTab}
          isDark={isDark}
          onClose={closeModal}
          onSaved={async () => {
            closeModal()
            await loadCategories()
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <DeleteConfirmModal
          category={deleteConfirm}
          isDark={isDark}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CategoryRow({
  category,
  isDark,
  onEdit,
  onToggle,
  onDelete,
}: {
  category: RingtoneCategory
  isDark: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border transition ${
        isDark
          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
          : 'bg-white border-gray-200 hover:border-gray-300'
      } ${!category.is_active ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Sort order badge */}
        <span
          className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${
            isDark
              ? 'bg-gray-700 text-gray-300'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {category.sort_order}
        </span>

        {/* Name + slug + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={`font-semibold truncate ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {category.name}
            </h4>
            {!category.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                Disabled
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs mt-0.5">
            <code
              className={`px-1.5 py-0.5 rounded ${
                isDark ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-700'
              }`}
            >
              /{category.slug}
            </code>
            {category.description && (
              <span
                className={`truncate ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {category.description}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={category.is_active ? 'Disable' : 'Enable'}
          className={`p-2 rounded-lg transition ${
            isDark
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
        >
          {category.is_active ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onEdit}
          title="Edit"
          className={`p-2 rounded-lg transition ${
            isDark
              ? 'hover:bg-gray-700 text-gray-400 hover:text-blue-400'
              : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'
          }`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className={`p-2 rounded-lg transition ${
            isDark
              ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400'
              : 'hover:bg-red-50 text-gray-500 hover:text-red-600'
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// FORM MODAL (Create / Edit)
// ============================================================================

function CategoryFormModal({
  category,
  defaultType,
  isDark,
  onClose,
  onSaved,
}: {
  category: RingtoneCategory | null
  defaultType: TabType
  isDark: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    category_type: category?.category_type || defaultType,
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
    preview_image: category?.preview_image || '',
    seo_title: category?.seo_title || '',
    seo_description: category?.seo_description || '',
  })

  // Auto-generate slug from name when creating new
  function updateName(value: string) {
    const updates: any = { name: value }
    if (!category) {
      // Only auto-slug for new categories
      updates.slug = value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }
    setForm((prev) => ({ ...prev, ...updates }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required')
      return
    }

    setSaving(true)
    try {
      const action = category ? 'update' : 'create'
      const payload: any = {
        action,
        ...form,
        sort_order: Number(form.sort_order) || 0,
      }
      if (category) payload.id = category.id

      const { data, error } = await supabase.functions.invoke('ringtone-categories-management', {
        body: payload,
      })

      if (error) {
        const msg = (error as any)?.context?.body
          ? JSON.parse((error as any).context.body)?.error
          : error.message
        throw new Error(msg || 'Save failed')
      }

      toast.success(category ? 'Category updated' : 'Category created')
      onSaved()
    } catch (err: any) {
      console.error('[handleSubmit] failed:', err)
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`relative w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <h3
            className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {category ? 'Edit Category' : 'New Category'}
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg ${
              isDark
                ? 'hover:bg-gray-800 text-gray-400'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <Field label="Type" isDark={isDark}>
            <select
              value={form.category_type}
              onChange={(e) =>
                setForm({ ...form, category_type: e.target.value as TabType })
              }
              className={inputClass(isDark)}
              required
            >
              <option value="genre">Genre</option>
              <option value="mood">Mood</option>
              <option value="use_case">Use For</option>
            </select>
          </Field>

          {/* Name */}
          <Field label="Name *" isDark={isDark}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateName(e.target.value)}
              placeholder="e.g. Cinematic"
              className={inputClass(isDark)}
              required
            />
          </Field>

          {/* Slug */}
          <Field label="Slug *" isDark={isDark} hint="URL-friendly identifier (lowercase, dashes only)">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. cinematic"
              className={inputClass(isDark)}
              required
              pattern="[a-z0-9-]+"
            />
          </Field>

          {/* Description */}
          <Field label="Description" isDark={isDark}>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description shown on the category page"
              rows={2}
              className={inputClass(isDark)}
            />
          </Field>

          {/* Sort order */}
          <Field label="Sort Order" isDark={isDark} hint="Lower numbers appear first">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: Number(e.target.value) })
              }
              className={inputClass(isDark)}
            />
          </Field>

          {/* Preview image */}
          <Field label="Preview Image URL" isDark={isDark}>
            <input
              type="text"
              value={form.preview_image}
              onChange={(e) =>
                setForm({ ...form, preview_image: e.target.value })
              }
              placeholder="Optional - https://..."
              className={inputClass(isDark)}
            />
          </Field>

          {/* SEO */}
          <details
            className={`rounded-lg p-3 ${
              isDark ? 'bg-gray-800/50' : 'bg-gray-50'
            }`}
          >
            <summary
              className={`cursor-pointer text-sm font-medium ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              SEO Settings (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="SEO Title" isDark={isDark}>
                <input
                  type="text"
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                  className={inputClass(isDark)}
                />
              </Field>
              <Field label="SEO Description" isDark={isDark}>
                <textarea
                  value={form.seo_description}
                  onChange={(e) =>
                    setForm({ ...form, seo_description: e.target.value })
                  }
                  rows={2}
                  className={inputClass(isDark)}
                />
              </Field>
            </div>
          </details>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
            <span
              className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Active (shown in filters)
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {category ? 'Save Changes' : 'Create Category'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// DELETE CONFIRM MODAL
// ============================================================================

function DeleteConfirmModal({
  category,
  isDark,
  onCancel,
  onConfirm,
}: {
  category: RingtoneCategory
  isDark: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl p-6 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3
              className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Delete category?
            </h3>
            <p
              className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <strong>{category.name}</strong> will be permanently removed.
            </p>
          </div>
        </div>

        <p
          className={`text-sm mb-6 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          If ringtones still use this category, deletion will be blocked. Consider
          disabling instead.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-medium ${
              isDark
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function Field({
  label,
  isDark,
  hint,
  children,
}: {
  label: string
  isDark: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className={`block text-sm font-medium mb-1 ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p
          className={`text-xs mt-1 ${
            isDark ? 'text-gray-500' : 'text-gray-500'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

function inputClass(isDark: boolean) {
  return `w-full px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`
}

export default RingtoneCategoriesManagement
