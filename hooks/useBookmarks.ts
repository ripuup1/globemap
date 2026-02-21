import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'voxtera-bookmarks'

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const initialSyncDone = useRef(false)

  // Listen for auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id ?? null
      setUserId(newUserId)
      if (!newUserId) initialSyncDone.current = false
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setBookmarkedIds(new Set(parsed))
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Sync with Supabase when user logs in
  useEffect(() => {
    if (!userId || initialSyncDone.current) return
    initialSyncDone.current = true

    const syncBookmarks = async () => {
      // Fetch remote bookmarks
      const { data } = await (supabase as any)
        .from('user_bookmarks')
        .select('event_id')
        .eq('user_id', userId)

      const remoteIds = new Set<string>((data || []).map((r: any) => r.event_id))

      // Merge local + remote
      setBookmarkedIds(prev => {
        const merged = new Set([...prev, ...remoteIds])

        // Upload any local-only bookmarks to remote
        const localOnly = [...prev].filter(id => !remoteIds.has(id))
        if (localOnly.length > 0) {
          const rows = localOnly.map(event_id => ({ user_id: userId, event_id }));
          (supabase as any)
            .from('user_bookmarks')
            .upsert(rows, { onConflict: 'user_id,event_id' })
            .then(() => {})
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged]))
        return merged
      })
    }

    syncBookmarks()
  }, [userId])

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(bookmarkedIds)))
  }, [bookmarkedIds])

  const toggleBookmark = useCallback((eventId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
        // Remove from Supabase if logged in
        if (userId) {
          (supabase as any)
            .from('user_bookmarks')
            .delete()
            .eq('user_id', userId)
            .eq('event_id', eventId)
            .then(() => {})
        }
      } else {
        next.add(eventId)
        // Add to Supabase if logged in
        if (userId) {
          (supabase as any)
            .from('user_bookmarks')
            .upsert({ user_id: userId, event_id: eventId }, { onConflict: 'user_id,event_id' })
            .then(() => {})
        }
      }
      return next
    })
  }, [userId])

  const isBookmarked = useCallback((eventId: string) => {
    return bookmarkedIds.has(eventId)
  }, [bookmarkedIds])

  return { bookmarkedIds, toggleBookmark, isBookmarked }
}
