/**
 * Push Subscription API
 *
 * Stores push notification subscriptions in Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { subscription } = await request.json()
    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        keys_p256dh: subscription.keys.p256dh,
        keys_auth: subscription.keys.auth,
        user_agent: request.headers.get('user-agent') || '',
        last_used: new Date().toISOString(),
      }, { onConflict: 'endpoint' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    const supabase = createServerClient()
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

    await (supabase as any).from('push_subscriptions').delete().eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}
