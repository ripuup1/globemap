/**
 * Vox Terra Service Worker
 *
 * Strategies:
 * - App shell (HTML, JS, CSS): Cache-first with network update
 * - API data (/api/events): Network-first with cache fallback
 * - Static assets (icons, fonts): Cache-first, long-lived
 * - Three.js globe textures: Cache-first (large, rarely change)
 */

const CACHE_NAME = 'vox-terra-v1'
const DATA_CACHE_NAME = 'vox-terra-data-v1'

// App shell files to pre-cache on install
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

// ============================================================================
// INSTALL - Pre-cache app shell
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// ============================================================================
// ACTIVATE - Clean old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== DATA_CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ============================================================================
// FETCH - Smart caching strategies
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip chrome-extension and other non-http(s)
  if (!url.protocol.startsWith('http')) return

  // API requests: Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Don't cache POST-only endpoints or error reporting
    if (url.pathname === '/api/views' || url.pathname === '/api/errors') return

    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone and cache successful responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(DATA_CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Globe textures (CDN): Cache-first, long-lived
  if (url.hostname.includes('unpkg.com') || url.hostname.includes('cdn.') ||
      url.pathname.includes('earth') || url.pathname.includes('night-sky')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // App shell & static assets: Stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        }).catch(() => cached)

        return cached || fetchPromise
      })
    )
    return
  }
})

// ============================================================================
// PUSH NOTIFICATIONS (placeholder for Phase 3)
// ============================================================================
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body || 'New breaking news event',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: data.tag || 'vox-terra-news',
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Vox Terra', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing window if open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Open new window
        return self.clients.openWindow(url)
      })
  )
})
