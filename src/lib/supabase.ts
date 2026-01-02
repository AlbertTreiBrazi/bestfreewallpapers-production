import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Export config status for UI to handle gracefully
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Create client only if configured, otherwise create a dummy that will fail gracefully
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

// Database types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          plan_type: string
          premium_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          plan_type?: string
          premium_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          plan_type?: string
          premium_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          slug: string
          description: string | null
          parent_id: number | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
      }
      wallpapers: {
        Row: {
          id: number
          title: string
          slug: string | null
          description: string | null
          category_id: number | null
          tags: string[] | null
          device_type: string | null
          resolution_1080p: string | null
          resolution_4k: string | null
          resolution_8k: string | null
          thumbnail_url: string | null
          download_count: number
          is_premium: boolean
          is_published: boolean
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
      }
      downloads: {
        Row: {
          id: string
          user_id: string | null
          wallpaper_id: number
          resolution: string | null
          device_type: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
      }
    }
  }
}
