/**
 * Client-side providers and initializers.
 * Wraps the app in layout.tsx.
 */

'use client'

import { useEffect, ReactNode } from 'react'
import { installGlobalErrorHandlers } from '@/utils/errorReporter'

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    installGlobalErrorHandlers()
    registerServiceWorker()
  }, [])

  return <>{children}</>
}

function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  // Register after page load to not block initial render
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[SW] Registered, scope:', registration.scope)

        // Check for updates periodically
        setInterval(() => registration.update(), 60 * 60 * 1000) // hourly
      },
      (error) => {
        console.warn('[SW] Registration failed:', error)
      }
    )
  })
}
