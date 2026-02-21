/**
 * InstallPrompt - "Add to Home Screen" banner
 *
 * Shows a dismissible banner when the browser supports PWA installation.
 * Respects user preference via localStorage.
 */

'use client'

import { useState, useEffect, useRef } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (typeof window === 'undefined') return
    if (localStorage.getItem('vt-install-dismissed')) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      // Show after a delay so it doesn't compete with initial load
      setTimeout(() => setShowBanner(true), 10000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    deferredPrompt.current = null
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('vt-install-dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4"
      style={{ top: 'max(16px, env(safe-area-inset-top, 16px))', animation: 'fadeSlideDown 0.4s ease-out' }}
    >
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">Install Vox Terra</p>
          <p className="text-gray-400 text-xs">Get instant access from your home screen</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors text-xs px-2 py-1"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
