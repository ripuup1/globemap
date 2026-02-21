/**
 * Push Notification Send API
 *
 * Sends push notifications to all subscribers.
 * Called by the aggregation cron when breaking news is detected.
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret') || authHeader?.replace('Bearer ', '')
    if (CRON_SECRET && secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    const { title, body, url, tag } = await request.json()
    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    webpush.setVapidDetails(
      'mailto:noreply@voxterra.app',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get all subscriptions
    const { data: subs, error } = await (supabase as any)
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth') as { data: Array<{ endpoint: string; keys_p256dh: string; keys_auth: string }> | null; error: any }

    if (error) throw error
    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscribers' })
    }

    const payload = JSON.stringify({ title, body, url, tag })
    let sent = 0
    let failed = 0
    const staleEndpoints: string[] = []

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
            },
            payload
          )
          sent++
        } catch (err: any) {
          failed++
          // Remove stale subscriptions (gone = 410, not found = 404)
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            staleEndpoints.push(sub.endpoint)
          }
        }
      })
    )

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', staleEndpoints)
    }

    return NextResponse.json({ sent, failed, cleaned: staleEndpoints.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
