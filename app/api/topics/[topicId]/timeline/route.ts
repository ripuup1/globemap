/**
 * Topic Timeline API Route
 * 
 * Fetches timeline from topic origin (first event) to current
 * Returns max 40 most significant events
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getEventsForTopic, FIXED_TOPICS } from '@/utils/topicDetector'
import { Event } from '@/types/event'
import { generateOriginToCurrentTimeline } from '@/utils/timelineGenerator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const { topicId } = await params
    
    // Find topic definition (check fixed topics first, then try to construct from topicId)
    let topic = FIXED_TOPICS.find(t => t.id === topicId)
    
    // If not found in fixed topics, it might be a dynamic topic
    // Create a minimal topic definition for dynamic topics
    if (!topic) {
      // Check if it's a dynamic topic (format: trending-{keyword} or synthetic-{keyword})
      if (topicId.startsWith('trending-') || topicId.startsWith('synthetic-')) {
        const keyword = topicId.replace(/^(trending-|synthetic-)/, '')
        topic = {
          id: topicId,
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          keywords: [keyword],
          category: 'trending',
          priority: 50,
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Topic not found', timeline: [] },
          { status: 404 }
        )
      }
    }
    
    // Fetch all events from Supabase
    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured', timeline: [] },
        { status: 500 }
      )
    }
    
    const { data: eventsData, error } = await (supabase as any)
      .from('events')
      .select('*')
      .order('timestamp', { ascending: true })
    
    if (error) {
      console.error('[Timeline API] Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events', timeline: [] },
        { status: 500 }
      )
    }
    
    // Convert to Event format
    const events: Event[] = (eventsData || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.category as any,
      severity: row.severity || 0,
      latitude: row.latitude,
      longitude: row.longitude,
      timestamp: new Date(row.timestamp).getTime(),
      source: row.source_name || 'Unknown',
      metadata: {
        url: row.source_url,
        locationName: row.location_name,
        country: row.country,
      },
    }))
    
    // Get events for this topic
    const topicEvents = getEventsForTopic(events, topic)
    
    // Generate smart timeline (origin to current, no duplicates)
    const timeline = generateOriginToCurrentTimeline(topicEvents)
    
    return NextResponse.json({
      success: true,
      topicId,
      topicName: topic.name,
      timeline,
      totalEvents: topicEvents.length,
      selectedEvents: timeline.length,
      dateRange: {
        oldest: timeline.length > 0 ? timeline[0].timestamp : 0,
        newest: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : 0,
      },
    })
  } catch (error) {
    console.error('[Timeline API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', timeline: [] },
      { status: 500 }
    )
  }
}
