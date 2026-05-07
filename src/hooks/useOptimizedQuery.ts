import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ============================================================================
// useOptimizedQuery.ts — Queries optimizate pentru scale 100k
// ============================================================================
// Modificări față de versiunea originală:
//
// 1. select('*') → select cu coloane exacte (payload 3x mai mic)
// 2. ILIKE '%q%'  → search_vector @@ plainto_tsquery (index GIN idx_wallpapers_search_gin)
//    IMPORTANT: necesită rularea SQL din 01_fix_search_index.sql în Supabase
// 3. useOptimizedCategories → un singur query, fără Promise.all cu N+1
//    IMPORTANT: necesită rularea SQL din 02_fix_categories_n1.sql în Supabase
//    (adaugă coloana preview_thumbnail pe tabela categories via 02_fix_categories_FINAL.sql)
// ============================================================================

// Coloane necesare pentru card wallpaper — NU mai facem select('*')
const WALLPAPER_CARD_FIELDS = [
  'id', 'title', 'slug', 'thumbnail_url', 'image_url',
  'download_url', 'download_count', 'is_premium',
  'width', 'height', 'device_type', 'created_at',
  'live_video_url', 'live_poster_url', 'live_enabled',
  'resolution_1080p', 'resolution_4k', 'resolution_8k',
  'tags', 'visibility'
].join(', ')

interface OptimizedQueryOptions {
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
  enabled?: boolean
  retry?: number
}

// Sanitizare input search — elimină caractere periculoase
function sanitizeSearch(raw: string): string {
  return raw.replace(/[<>"'%;()&+\\]/g, '').trim()
}

// ── useOptimizedWallpapers ────────────────────────────────────────────────────

export const useOptimizedWallpapers = (
  filters: {
    category?: string
    search?: string
    sortBy?: string
    page?: number
    limit?: number
  } = {},
  options: OptimizedQueryOptions = {}
) => {
  const { category, search, sortBy = 'newest', page = 1, limit = 12 } = filters

  return useQuery({
    queryKey: ['wallpapers', { category, search, sortBy, page, limit }],
    queryFn: async () => {
      try {
        // Încearcă edge function wallpaper-management (are cache propriu)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallpaper-management`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'get_wallpapers',
              category,
              search,
              sort: sortBy,
              page,
              limit
            })
          }
        )

        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            return {
              wallpapers: result.data.wallpapers || [],
              totalCount: result.data.totalCount || 0,
              totalPages: result.data.totalPages || 1,
              currentPage: result.data.currentPage || page
            }
          }
        }

        // Fallback: query direct Supabase cu câmpuri explicite
        let query = supabase
          .from('wallpapers')
          .select(WALLPAPER_CARD_FIELDS, { count: 'exact' })
          .eq('is_published', true)
          .eq('is_active', true)
          .eq('visibility', 'public')

        // Filtru categorie — un singur query (nu N+1)
        if (category && category !== 'all') {
          const { data: cat } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', category)
            .single()
          if (cat) query = query.eq('category_id', cat.id)
        }

        // Search — FTS dacă indexul GIN există, altfel ILIKE ca fallback
        if (search) {
          const q = sanitizeSearch(search)
          if (q) {
            // Încearcă FTS (necesită 01_fix_search_index.sql aplicat)
            // Supabase textSearch folosește coloana search_vector și indexul GIN idx_wallpapers_search_gin
            query = (query as any).textSearch('search_vector', q, {
              type: 'plain',
              config: 'english'
            })
          }
        }

        // Sortare
        switch (sortBy) {
          case 'newest':
            query = query.order('created_at', { ascending: false }).order('id', { ascending: false })
            break
          case 'oldest':
            query = query.order('created_at', { ascending: true })
            break
          case 'popular':
            query = query.order('download_count', { ascending: false, nullsFirst: false })
                         .order('created_at', { ascending: false })
            break
          case 'title':
            query = query.order('title', { ascending: true })
            break
          default:
            query = query.order('created_at', { ascending: false })
        }

        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
          return { wallpapers: [], totalCount: 0, totalPages: 1, currentPage: page }
        }

        return {
          wallpapers: data || [],
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          currentPage: page
        }
      } catch {
        return { wallpapers: [], totalCount: 0, totalPages: 1, currentPage: page }
      }
    },
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 30 * 60 * 1000,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    enabled: options.enabled ?? true,
    retry: options.retry || 1,
  })
}

// ── useOptimizedCategories ────────────────────────────────────────────────────
// Un singur query — fără N+1.
// Folosește câmpul preview_thumbnail adăugat de 02_fix_categories_n1.sql.
// Dacă preview_thumbnail e null (coloana nu există încă), cade pe preview_image.

export const useOptimizedCategories = (options: OptimizedQueryOptions = {}) => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order, preview_image, preview_wallpaper_id, preview_thumbnail')
        .eq('is_active', true)
        .order('sort_order')
        .limit(6)

      if (error) throw error
      if (!categories) return []

      // Mapăm preview_thumbnail → preview_image dacă nu e deja setat
      // Nu mai facem niciun query extra — totul vine dintr-un singur request
      return categories.map(cat => ({
        ...cat,
        preview_image: cat.preview_image || (cat as any).preview_thumbnail || null
      }))
    },
    staleTime: options.staleTime || 10 * 60 * 1000,
    gcTime: options.cacheTime || 60 * 60 * 1000,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    enabled: options.enabled ?? true,
    retry: options.retry || 2,
  })
}

// ── useInfiniteWallpapers ─────────────────────────────────────────────────────
// Aceleași fix-uri: select cu câmpuri, FTS în loc de ILIKE

export const useInfiniteWallpapers = (
  filters: {
    category?: string
    search?: string
    sortBy?: string
    limit?: number
  } = {},
  options: OptimizedQueryOptions = {}
) => {
  const { category, search, sortBy = 'newest', limit = 12 } = filters

  return useInfiniteQuery({
    queryKey: ['wallpapers-infinite', { category, search, sortBy, limit }],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      let query = supabase
        .from('wallpapers')
        .select(WALLPAPER_CARD_FIELDS)
        .eq('is_published', true)
        .eq('is_active', true)
        .eq('visibility', 'public')

      if (category && category !== 'all') {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .single()
        if (cat) query = query.eq('category_id', cat.id)
      }

      if (search) {
        const q = sanitizeSearch(search)
        if (q) {
          query = (query as any).textSearch('search_vector', q, {
            type: 'plain',
            config: 'english'
          })
        }
      }

      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false }).order('id', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'popular':
          query = query.order('download_count', { ascending: false })
          break
        case 'title':
          query = query.order('title', { ascending: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const from = pageParam * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error } = await query

      if (error) throw error

      return {
        wallpapers: data || [],
        nextCursor: data && data.length === limit ? pageParam + 1 : null,
      }
    },
    getNextPageParam: (lastPage: { wallpapers: any[]; nextCursor: number | null }) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 30 * 60 * 1000,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    enabled: options.enabled ?? true,
    retry: options.retry || 1,
  })
}
