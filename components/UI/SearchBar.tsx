/**
 * SearchBar - Futuristic Google Earth inspired search
 *
 * Features:
 * - Real-time filtering with synonym expansion
 * - Smart suggestion chips
 * - Results counter
 * - Keyboard shortcut (/) to focus
 */

'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { themeColors } from '@/utils/themeColors'
import { SEARCH_SYNONYMS } from '@/utils/searchSynonyms'
import { Event } from '@/types/event'

interface SearchBarProps {
  filteredEventsCount: number
  onEnterBrowseMode: (searchTerm: string, label: string, icon: string) => void
}

export default function SearchBar({ filteredEventsCount, onEnterBrowseMode }: SearchBarProps) {
  const searchQuery = useAppStore(s => s.searchQuery)
  const setSearchQuery = useAppStore(s => s.setSearchQuery)
  const categoryBrowseMode = useAppStore(s => s.categoryBrowseMode)
  const colors = themeColors

  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []
    const query = searchQuery.toLowerCase()
    const suggestions: Array<{ label: string; searchTerm: string }> = []

    if (['war', 'conflict', 'fight', 'military', 'battle', 'arm'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Conflicts', searchTerm: 'armed conflict' })
      suggestions.push({ label: 'Middle East', searchTerm: 'middle east' })
      suggestions.push({ label: 'Ukraine', searchTerm: 'ukraine' })
    }
    if (['middle', 'east', 'israel', 'gaza', 'iran', 'iraq'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Middle East', searchTerm: 'middle east' })
      suggestions.push({ label: 'Israel', searchTerm: 'israel' })
    }
    if (['america', 'us', 'usa', 'states', 'biden', 'trump'].some(t => query.includes(t))) {
      suggestions.push({ label: 'United States', searchTerm: 'united states' })
      suggestions.push({ label: 'Politics', searchTerm: 'politics' })
    }
    if (['latin', 'south', 'brazil', 'mexico', 'argent'].some(t => query.includes(t))) {
      suggestions.push({ label: 'South America', searchTerm: 'south america' })
      suggestions.push({ label: 'Mexico', searchTerm: 'mexico' })
      suggestions.push({ label: 'Brazil', searchTerm: 'brazil' })
    }
    if (['china', 'asia', 'korea', 'japan', 'india'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Asia Pacific', searchTerm: 'asia' })
      suggestions.push({ label: 'China', searchTerm: 'china' })
    }
    if (['sport', 'footb', 'soccer', 'basket', 'nfl', 'nba'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Sports', searchTerm: 'sports' })
    }
    if (['tech', 'ai', 'software', 'apple', 'google'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Technology', searchTerm: 'technology' })
    }
    if (['politic', 'elect', 'govern', 'vote', 'president'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Politics', searchTerm: 'politics' })
    }
    if (['africa', 'nigeria', 'kenya', 'egypt', 'congo'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Africa', searchTerm: 'africa' })
    }
    if (['canada', 'toronto', 'trudeau', 'vancouver'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Canada', searchTerm: 'canada' })
    }
    if (['market', 'stock', 'nasdaq', 'dow', 'economy'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Markets', searchTerm: 'business' })
    }
    if (['climate', 'weather', 'storm', 'flood', 'hurricane'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Climate', searchTerm: 'climate' })
    }

    return suggestions.filter((s, i, arr) =>
      arr.findIndex(x => x.label === s.label) === i
    ).slice(0, 4)
  }, [searchQuery])

  return (
    <div
      className={`fixed ${categoryBrowseMode ? 'bottom-36' : 'bottom-20'} left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 transition-all duration-300`}
      style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}
    >
      <div
        className="relative group"
        role="search"
        aria-label="Search events, regions, and categories"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.92) 0%, rgba(30, 41, 59, 0.92) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '14px',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.25), inset 0 0 15px rgba(99, 102, 241, 0.08)',
          }}
        />
        <div className="relative flex items-center gap-3 px-4 py-3">
          <svg
            className="w-5 h-5 text-indigo-400/70 group-focus-within:text-indigo-400 transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="global-search"
            name="global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, regions, categories..."
            aria-label="Search events, regions, and categories"
            className="flex-1 bg-transparent text-sm focus:outline-none tracking-wide"
            autoComplete="off"
            style={{ caretColor: '#818cf8', color: colors.textPrimary }}
          />
          {!searchQuery && (
            <kbd
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-gray-500 transition-opacity"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span>/</span>
            </kbd>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchSuggestions.length > 0 && (
          <div
            className="px-4 py-2 border-t border-white/5"
            style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
          >
            <style>{`
              @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div className="flex flex-wrap gap-1.5">
              {searchSuggestions.map(suggestion => (
                <button
                  key={suggestion.label}
                  onClick={() => onEnterBrowseMode(suggestion.searchTerm, suggestion.label, '')}
                  className="px-2.5 py-1 rounded text-[11px] font-medium transition-all hover:bg-white/10"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {searchQuery && (
          <div className="px-4 py-2 border-t border-white/5 text-xs flex items-center justify-between">
            {filteredEventsCount > 0 ? (
              <span className="text-indigo-300">
                <span className="text-white font-medium">{filteredEventsCount}</span> events found
              </span>
            ) : (
              <span className="italic text-gray-400">
                No matches — <span className="text-indigo-400/80">Thank you for showing ME something new!</span>
              </span>
            )}
            {filteredEventsCount > 0 && (
              <span className="text-gray-500 text-[10px]">Press Esc to clear</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
