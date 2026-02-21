/**
 * Error Logging API
 *
 * Receives batched client-side error reports.
 * Logs to server console (and optionally Supabase in the future).
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const errors = body.errors || []

    // Log errors server-side
    for (const err of errors.slice(0, 10)) {
      console.error(`[ClientError][${err.source}] ${err.message}`, {
        url: err.url,
        timestamp: new Date(err.timestamp).toISOString(),
        metadata: err.metadata,
      })
    }

    return NextResponse.json({ received: errors.length })
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
