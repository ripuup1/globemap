/**
 * Single Event API Route
 *
 * Fetches a single event by ID from Supabase.
 * Falls back to the events list if not found in DB.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { data, error } = await (supabase as any)
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const row = data as any

  // Map DB row to Event shape
  const event = {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.category,
    severity: row.severity,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: new Date(row.created_at).getTime(),
    source: row.source || 'supabase',
    metadata: {
      locationName: row.location_name,
      country: row.country,
      ...(typeof row.metadata === 'object' ? row.metadata : {}),
    },
    articles: row.articles || [],
    articleCount: row.article_count || 0,
  }

  return NextResponse.json(event, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
