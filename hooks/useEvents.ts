/**
 * useEvents Hook - Invisible Infrastructure
 * 
 * Design Philosophy:
 * - Supabase is a sealed bearing: no grinding, no hesitation, no audible friction
 * - Data flow is preemptive (not reactive), buffered (not blocking), streamed (not dumped)
 * - The UI glides on top of data, never pauses to "ask permission"
 * - Errors are soft detours, not dead ends
 * - If the user can tell when Supabase is queried, the system is too loud
 * 
 * Implementation:
 * - Stale-while-revalidate: show cached data immediately, refresh silently
 * - Silent retries with exponential backoff
 * - Request deduplication prevents redundant fetches
 * - Realtime updates merge silently without layout shifts
 * - Partial data over no data
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Event } from '@/types/event'
import { supabase, CHANNELS } from '@/lib/supabase'

// ============================================================================
// CACHE LAYER - Stale-while-revalidate
// ============================================================================

const CACHE_KEY = 'vox-terra-events'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes - data is "fresh"
const CACHE_STALE_TTL = 30 * 60 * 1000 // 30 minutes - data is "stale but usable"

interface CachedData {
  events: Event[]
  timestamp: number
  source: 'supabase' | 'rss-fallback' | 'unknown'
}

function getCache(): CachedData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as CachedData
    // Reject if older than stale TTL
    if (Date.now() - data.timestamp > CACHE_STALE_TTL) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

function setCache(events: Event[], source: CachedData['source']): void {
  if (typeof window === 'undefined') return
  try {
    const data: CachedData = { events, timestamp: Date.now(), source }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or disabled - continue without cache
  }
}

function isCacheFresh(cache: CachedData | null): boolean {
  if (!cache) return false
  return Date.now() - cache.timestamp < CACHE_TTL
}

// ============================================================================
// CONFIGURATION
// ============================================================================

interface UseEventsOptions {
  /** Delay initialization until enabled (for first-paint protection) */
  enabled?: boolean
  refreshInterval?: number
  enableRealtime?: boolean
  limit?: number
}

interface UseEventsResult {
  events: Event[]
  loading: boolean
  processing: boolean
  error: string | null
  loadingProgress: number
  refetch: () => Promise<void>
  isInitialLoad: boolean
  dataSource: 'supabase' | 'rss-fallback' | 'unknown'
  lastUpdated: Date | null
}

const DEFAULT_OPTIONS: UseEventsOptions = {
  enabled: true, // Default to enabled for backward compatibility
  refreshInterval: 0,
  enableRealtime: true,
  limit: 200,
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // State - simple defaults, cache checked in useEffect
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [processing, setProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)
  const [dataSource, setDataSource] = useState<CachedData['source']>('unknown')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Refs for request management
  const fetchInFlightRef = useRef<boolean>(false)
  const retryCountRef = useRef<number>(0)
  const realtimeChannelRef = useRef<any>(null)
  const mountedRef = useRef<boolean>(true)

  // ========== SILENT FETCH (Background revalidation) ==========
  const fetchEvents = useCallback(async (options: { silent?: boolean; retry?: boolean } = {}) => {
    const { silent = false, retry = false } = options
    
    // Deduplicate: don't start if already fetching
    if (fetchInFlightRef.current && !retry) return
    fetchInFlightRef.current = true
    
    // Only show loading UI on cold start (no cache)
    if (!silent && !getCache()?.events?.length) {
      setLoading(true)
      setProcessing(true)
      setLoadingProgress(10)
    }

    try {
      // Simulate progress for perceived smoothness
      if (!silent) {
        setLoadingProgress(30)
      }
      
      const response = await fetch(`/api/events?limit=${opts.limit}`, {
        cache: 'no-store', // Always get fresh data
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      if (!silent) {
        setLoadingProgress(70)
      }
      
      const data = await response.json()
      const newEvents = data.events || []
      const newSource = data.stats?.source === 'supabase' ? 'supabase' : 'rss-fallback'
      
      // Only update if component still mounted
      if (!mountedRef.current) return
      
      // Update cache
      setCache(newEvents, newSource as CachedData['source'])
      
      // Merge into state (no flash, no layout shift)
      setEvents(newEvents)
      setDataSource(newSource as CachedData['source'])
      setLastUpdated(new Date())
      setError(null)
      retryCountRef.current = 0
      
      if (!silent) {
        setLoadingProgress(100)
        // SYNC: Clear loading state immediately - no delay
        setProcessing(false)
        setLoading(false)
        setIsInitialLoad(false)
      }
      
    } catch (err) {
      // Silent retry with exponential backoff (max 3 retries)
      if (retryCountRef.current < 3) {
        retryCountRef.current++
        const backoff = Math.min(1000 * Math.pow(2, retryCountRef.current), 8000)
        setTimeout(() => {
          if (mountedRef.current) {
            fetchEvents({ silent: true, retry: true })
          }
        }, backoff)
        return // Don't set error on retry
      }
      
      // Only surface error if we have no data at all
      if (mountedRef.current && events.length === 0) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events')
        setLoading(false)
        setProcessing(false)
      }
      // If we have cached data, continue silently - partial data over no data
    } finally {
      fetchInFlightRef.current = false
    }
  }, [opts.limit, events.length])

  // ========== REALTIME - Silent merges (Deferred) ==========
  useEffect(() => {
    // PHASE 6 COMPLIANCE: No subscriptions until app is stable
    if (!opts.enabled) return
    if (!opts.enableRealtime) return
    if (!supabase || typeof supabase.channel !== 'function') return
    
    const channel = supabase
      .channel(CHANNELS.EVENTS)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          // Silent merge - no loading states, no announcements
          if (payload.eventType === 'INSERT') {
            setEvents(prev => {
              const newEvent = transformRow(payload.new)
              if (!newEvent) return prev
              // Check for duplicate
              if (prev.some(e => e.id === newEvent.id)) return prev
              // Insert and re-sort
              const updated = [newEvent, ...prev]
              updated.sort((a, b) => {
                const wA = (a.metadata?.weightScore as number) || 0
                const wB = (b.metadata?.weightScore as number) || 0
                return wB - wA
              })
              return updated.slice(0, opts.limit)
            })
          } else if (payload.eventType === 'UPDATE') {
            setEvents(prev => prev.map(e => 
              e.id === payload.new.id ? transformRow(payload.new) || e : e
            ))
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== payload.old.id))
          }
          setLastUpdated(new Date())
        }
      )
      .subscribe()
    
    realtimeChannelRef.current = channel
    
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, [opts.enabled, opts.enableRealtime, opts.limit])

  // ========== INITIALIZATION ==========
  // Simplified: fetch immediately when enabled, no complex dependencies
  const hasInitializedRef = useRef(false)
  
  useEffect(() => {
    mountedRef.current = true
    
    // Don't fetch until enabled
    if (!opts.enabled) {
      return () => { mountedRef.current = false }
    }
    
    // Only initialize once
    if (hasInitializedRef.current) {
      return () => { mountedRef.current = false }
    }
    hasInitializedRef.current = true
    
    // Check cache first
    const cache = getCache()
    
    if (cache?.events?.length) {
      // Cache hit: show immediately
      setEvents(cache.events)
      setDataSource(cache.source)
      setLastUpdated(new Date(cache.timestamp))
      setLoading(false)
      setIsInitialLoad(false)
      setLoadingProgress(100)
      
      // Revalidate in background if stale
      if (!isCacheFresh(cache)) {
        // Direct fetch call to avoid stale closure
        fetch(`/api/events?limit=${opts.limit}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            if (mountedRef.current && data.events) {
              setEvents(data.events)
              setCache(data.events, data.stats?.source === 'supabase' ? 'supabase' : 'rss-fallback')
              setLastUpdated(new Date())
            }
          })
          .catch(() => {}) // Silent fail for background refresh
      }
    } else {
      // Cache miss: fetch with loading UI
      setLoading(true)
      setProcessing(true)
      setLoadingProgress(10)
      
      fetch(`/api/events?limit=${opts.limit}`, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          setLoadingProgress(50)
          return res.json()
        })
        .then(data => {
          if (!mountedRef.current) return
          
          const newEvents = data.events || []
          const newSource = data.stats?.source === 'supabase' ? 'supabase' : 'rss-fallback'
          
          setEvents(newEvents)
          setDataSource(newSource as CachedData['source'])
          setCache(newEvents, newSource as CachedData['source'])
          setLastUpdated(new Date())
          setLoadingProgress(100)
          setError(null)
          // SYNC: No delay - set loading=false immediately
          setLoading(false)
          setProcessing(false)
          setIsInitialLoad(false)
        })
        .catch(err => {
          if (!mountedRef.current) return
          setError(err.message)
          setLoading(false)
          setProcessing(false)
        })
    }
    
    return () => {
      mountedRef.current = false
    }
  }, [opts.enabled, opts.limit])

  // ========== BACKGROUND POLLING (if enabled) ==========
  useEffect(() => {
    const refreshMs = opts.refreshInterval ?? 0
    if (refreshMs > 0 && !opts.enableRealtime) {
      const interval = setInterval(() => {
        fetchEvents({ silent: true }) // Always silent for polling
      }, refreshMs)
      return () => clearInterval(interval)
    }
  }, [opts.refreshInterval, opts.enableRealtime, fetchEvents])

  return {
    events,
    loading,
    processing,
    error,
    loadingProgress,
    refetch: () => fetchEvents({ silent: events.length > 0 }), // Silent if we have data
    isInitialLoad,
    dataSource,
    lastUpdated,
  }
}

// Transform Supabase row to Event format (for Realtime updates)
function transformRow(row: any): Event | null {
  if (!row || !row.id) return null
  
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    type: row.category,
    severity: row.severity,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: new Date(row.timestamp).getTime(),
    source: 'Supabase',
    metadata: {
      locationName: row.location_name,
      country: row.country,
      continent: row.continent,
      sourceName: row.source_name,
      url: row.source_url,
      weightScore: row.weight_score,
      sources: row.sources,
      timeline: row.timeline,
      isOngoing: row.is_ongoing,
    },
    isOngoing: row.is_ongoing,
    articles: [],
    articleCount: Array.isArray(row.sources) ? row.sources.length : 1,
  }
}

/**
 * useSearch Hook - For search bar functionality
 */
export function useSearch() {
  const [results, setResults] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const search = useCallback(async (query: string, options?: { country?: string; category?: string; limit?: number }) => {
    if (!query.trim()) {
      setResults([])
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({ q: query })
      if (options?.country) params.set('country', options.country)
      if (options?.category) params.set('category', options.category)
      if (options?.limit) params.set('limit', String(options.limit))
      
      const response = await fetch(`/api/search?${params.toString()}`)
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      setResults(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])
  
  const getTopStories = useCallback(async (options?: { country?: string; category?: string; limit?: number }) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({ top: 'true' })
      if (options?.country) params.set('country', options.country)
      if (options?.category) params.set('category', options.category)
      if (options?.limit) params.set('limit', String(options.limit))
      
      const response = await fetch(`/api/search?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to get top stories')
      
      const data = await response.json()
      setResults(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get top stories')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])
  
  const clear = useCallback(() => {
    setResults([])
    setError(null)
  }, [])
  
  return { results, loading, error, search, getTopStories, clear }
}
