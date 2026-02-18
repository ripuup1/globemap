import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'voxtera-bookmarks'

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())

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

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(bookmarkedIds)))
  }, [bookmarkedIds])

  const toggleBookmark = useCallback((eventId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  const isBookmarked = useCallback((eventId: string) => {
    return bookmarkedIds.has(eventId)
  }, [bookmarkedIds])

  return { bookmarkedIds, toggleBookmark, isBookmarked }
}
