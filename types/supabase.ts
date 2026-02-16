/**
 * Supabase Database Types
 * 
 * Type definitions for the Vox Terra database schema.
 * These types ensure type-safe queries throughout the application.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Event type enumeration (matches existing EventType)
 */
export type EventCategory =
  | 'breaking'
  | 'politics'
  | 'sports'
  | 'business'
  | 'technology'
  | 'entertainment'
  | 'health'
  | 'science'
  | 'crime'
  | 'armed-conflict'
  | 'terrorism'
  | 'civil-unrest'
  | 'earthquake'
  | 'volcano'
  | 'wildfire'
  | 'storm'
  | 'tsunami'
  | 'flood'
  | 'other'

/**
 * Database schema definition
 */
export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          category: EventCategory
          severity: number
          latitude: number
          longitude: number
          location_name: string | null
          country: string | null
          continent: string | null
          timestamp: string
          weight_score: number
          source_name: string
          source_url: string | null
          sources: Json | null
          timeline: Json | null
          is_ongoing: boolean
          start_date: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          title: string
          description?: string | null
          category: EventCategory
          severity: number
          latitude: number
          longitude: number
          location_name?: string | null
          country?: string | null
          continent?: string | null
          timestamp: string
          weight_score?: number
          source_name: string
          source_url?: string | null
          sources?: Json | null
          timeline?: Json | null
          is_ongoing?: boolean
          start_date?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: EventCategory
          severity?: number
          latitude?: number
          longitude?: number
          location_name?: string | null
          country?: string | null
          continent?: string | null
          timestamp?: string
          weight_score?: number
          source_name?: string
          source_url?: string | null
          sources?: Json | null
          timeline?: Json | null
          is_ongoing?: boolean
          start_date?: string | null
          metadata?: Json | null
          updated_at?: string
        }
      }
      top_stories: {
        Row: {
          id: string
          event_id: string
          rank: number
          country_filter: string | null
          category_filter: EventCategory | null
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          rank: number
          country_filter?: string | null
          category_filter?: EventCategory | null
          score: number
          created_at?: string
        }
        Update: {
          event_id?: string
          rank?: number
          country_filter?: string | null
          category_filter?: EventCategory | null
          score?: number
        }
      }
      aggregation_log: {
        Row: {
          id: string
          started_at: string
          completed_at: string | null
          events_fetched: number
          events_stored: number
          sources_processed: Json | null
          errors: Json | null
          duration_ms: number | null
        }
        Insert: {
          id?: string
          started_at?: string
          completed_at?: string | null
          events_fetched?: number
          events_stored?: number
          sources_processed?: Json | null
          errors?: Json | null
          duration_ms?: number | null
        }
        Update: {
          completed_at?: string | null
          events_fetched?: number
          events_stored?: number
          sources_processed?: Json | null
          errors?: Json | null
          duration_ms?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_events: {
        Args: {
          search_query: string
          limit_count?: number
        }
        Returns: Database['public']['Tables']['events']['Row'][]
      }
      get_top_stories: {
        Args: {
          country?: string | null
          category?: EventCategory | null
          limit_count?: number
        }
        Returns: Database['public']['Tables']['events']['Row'][]
      }
    }
    Enums: {
      event_category: EventCategory
    }
  }
}

/**
 * Helper type for event rows
 */
export type EventRow = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type TopStoryRow = Database['public']['Tables']['top_stories']['Row']
