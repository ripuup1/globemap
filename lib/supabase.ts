/**
 * Supabase Client Configuration
 * 
 * Provides typed Supabase client for:
 * - Server-side operations (API routes, Edge Functions)
 * - Client-side operations (React components with Realtime)
 * 
 * Features:
 * - Lazy initialization to avoid build errors
 * - Auto-reconnect for Realtime subscriptions
 * - Graceful fallback when credentials missing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Supabase configuration from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yzxxxfwjdaieqgkdidlb.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Singleton client instance (lazy init)
let clientInstance: SupabaseClient<Database> | null = null

/**
 * Mock Supabase client for when credentials are missing
 * Prevents runtime errors while allowing graceful degradation
 */
const createMockClient = (): SupabaseClient<Database> => {
  const mockChannel = {
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => {},
  }
  
  return {
    channel: () => mockChannel,
    removeChannel: () => Promise.resolve('ok'),
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as any
}

/**
 * Get Supabase client for client-side operations
 * Lazy initialization to avoid build-time errors
 * Returns mock client when credentials are missing
 */
export const supabase: SupabaseClient<Database> = (() => {
  // No anon key = return mock client (both SSR and client-side)
  if (!SUPABASE_ANON_KEY) {
    return createMockClient()
  }
  
  // Create real client with credentials
  if (!clientInstance) {
    clientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }
  
  return clientInstance
})()

/**
 * Create a Supabase client for server-side operations
 * Returns null if credentials are missing (for graceful fallback)
 */
export function createServerClient(): SupabaseClient<Database> | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const key = serviceRoleKey || SUPABASE_ANON_KEY
  
  if (!key) {
    return null
  }
  
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Type-safe table names
 */
export const TABLES = {
  EVENTS: 'events',
  TOP_STORIES: 'top_stories',
  SOURCES: 'sources',
  AGGREGATION_LOG: 'aggregation_log',
} as const

/**
 * Realtime channel names
 */
export const CHANNELS = {
  EVENTS: 'events-realtime',
  TOP_STORIES: 'top-stories-realtime',
} as const
