/**
 * CategoryBrowseNav - Bottom navigation for category browse mode
 *
 * Shows prev/next controls, category info, and exit button
 * when browsing events by category or topic.
 */

'use client'

import { useAppStore } from '@/store/useAppStore'

interface CategoryBrowseNavProps {
  onNavigate: (direction: 'next' | 'prev') => void
  onExit: () => void
}

export default function CategoryBrowseNav({ onNavigate, onExit }: CategoryBrowseNavProps) {
  const categoryBrowseMode = useAppStore(s => s.categoryBrowseMode)

  if (!categoryBrowseMode) return null

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4"
      style={{
        fontFamily: 'var(--font-exo2), system-ui, sans-serif',
        bottom: 'max(56px, calc(56px + env(safe-area-inset-bottom, 0px)))',
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
        <div className="flex items-center justify-between p-3">
          <button
            onClick={() => onNavigate('prev')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 active:scale-95"
            style={{ color: '#a5b4fc' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Prev</span>
          </button>
          <div className="flex-1 text-center px-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-white font-semibold text-sm uppercase tracking-wide">{categoryBrowseMode.categoryLabel}</span>
            </div>
            <div className="text-xs text-indigo-300 mt-0.5">
              <span className="text-white font-medium">{categoryBrowseMode.currentIndex + 1}</span>
              <span className="text-gray-400"> of </span>
              <span className="text-white font-medium">{categoryBrowseMode.matchingEvents.length}</span>
              {categoryBrowseMode.matchingEvents[categoryBrowseMode.currentIndex] && (
                <span className="text-gray-500 ml-1 hidden sm:inline">
                  • {(categoryBrowseMode.matchingEvents[categoryBrowseMode.currentIndex].metadata?.locationName as string || 'Unknown').slice(0, 20)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate('next')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 active:scale-95"
            style={{ color: '#a5b4fc' }}
          >
            <span className="hidden sm:inline">Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="border-t border-white/10 px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-500">Use ← → keys to navigate</span>
          <button
            onClick={onExit}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}
