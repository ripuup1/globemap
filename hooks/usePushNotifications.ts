/**
 * usePushNotifications Hook
 *
 * Manages push notification subscription state.
 * Handles permission requests, subscription lifecycle.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type PushState = 'unsupported' | 'default' | 'denied' | 'subscribed' | 'unsubscribed'

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('unsupported')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }

    // Check current state
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }

    navigator.serviceWorker.ready.then(registration => {
      registration.pushManager.getSubscription().then(sub => {
        setState(sub ? 'subscribed' : 'unsubscribed')
      })
    }).catch(() => setState('unsubscribed'))
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) return
    setLoading(true)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      setState('subscribed')
    } catch (error) {
      console.error('[Push] Subscribe failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }
      setState('unsubscribed')
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    state,
    loading,
    subscribe,
    unsubscribe,
    isSupported: state !== 'unsupported',
    isSubscribed: state === 'subscribed',
  }
}
