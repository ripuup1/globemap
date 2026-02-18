/**
 * Interaction Hint Modal
 *
 * Center overlay modal that appears on first visit to guide users:
 * - Click markers for event details
 * - Click ISS satellite for settings & filters
 * - Use search bar to find events
 *
 * Mobile-friendly, non-blocking, dismissible
 */

'use client'

import { memo, useState, useEffect } from 'react'
import { CloseIcon } from './Icons'

interface InteractionHintModalProps {
  isVisible: boolean
  onDismiss: () => void
  onNeverShowAgain?: () => void
}

function InteractionHintModal({ isVisible, onDismiss, onNeverShowAgain }: InteractionHintModalProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false)

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!isVisible) return

    const timer = setTimeout(() => {
      onDismiss()
    }, 10000)

    return () => clearTimeout(timer)
  }, [isVisible, onDismiss])

  const handleDismiss = () => {
    if (neverShowAgain && onNeverShowAgain) {
      onNeverShowAgain()
    }
    onDismiss()
  }

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop - allows globe interaction */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'auto',
        }}
        onClick={handleDismiss}
      />

      {/* Modal Card - Centered */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hint-modal-title"
          className="relative w-full max-w-md bg-[#0a0e14] rounded-lg shadow-2xl pointer-events-auto"
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <h3 id="hint-modal-title" className="text-sm font-semibold text-white mb-0.5">
                  Quick Guide
                </h3>
                <p className="text-[10px] text-gray-400">
                  Get started with Vox Terra
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4 mb-6">
              {/* Markers hint */}
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-white mb-1">
                    <strong className="font-semibold">News Markers</strong>
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Click any marker on the globe to read the full story, view sources, and explore related events.
                  </p>
                </div>
              </div>

              {/* Satellite Icon Hint */}
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-white mb-1">
                    <strong className="font-semibold">ISS Satellite</strong> (orbiting)
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Click the orbiting satellite to open <strong>Settings & Filters</strong> — filter by category, country, or distance.
                  </p>
                </div>
              </div>

              {/* Search hint */}
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-white mb-1">
                    <strong className="font-semibold">Search Bar</strong> (bottom)
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Search for events, regions, or categories. Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-white/10 border border-white/20">/</kbd> to focus.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleDismiss}
                className="w-full px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: 'white',
                }}
              >
                Got it
              </button>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={neverShowAgain}
                  onChange={(e) => setNeverShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600"
                  style={{
                    accentColor: '#6366f1',
                    background: 'rgba(10, 14, 20, 0.9)',
                  }}
                />
                <span className="text-[10px] text-gray-400">
                  Don't show this again
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default memo(InteractionHintModal)
