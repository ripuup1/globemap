/**
 * Intelligent Source API Route
 * 
 * Returns relevant sources for a topic using AI-powered identification
 */

import { NextRequest, NextResponse } from 'next/server'
import { identifyRelevantSources } from '@/utils/aiSourceIdentifier'
import { FIXED_TOPICS, getEventsForTopic } from '@/utils/topicDetector'
import { createServerClient } from '@/lib/supabase'
import { Event } from '@/types/event'
import { generateArticles } from '@/utils/topicAggregator'
import { dataCache } from '@/utils/dataCache'
import { getCacheHeaders } from '@/lib/compression'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')
    
    if (!topicId) {
      return NextResponse.json(
        { success: false, error: 'topicId required' },
        { status: 400 }
      )
    }
    
    // Check cache
    const cacheKey = `sources:${topicId}`
    const cached = dataCache.get(cacheKey)
    
    if (cached) {
      const response = NextResponse.json({
        success: true,
        sources: cached,
        cached: true,
      })
      Object.entries(getCacheHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }
    
    // Find topic definition
    let topic = FIXED_TOPICS.find(t => t.id === topicId)
    
    // If not found, try to construct from topicId
    if (!topic) {
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
          { success: false, error: 'Topic not found' },
          { status: 404 }
        )
      }
    }
    
    // Fetch events for this topic
    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }
    
    const { data: eventsData } = await (supabase as any)
      .from('events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200)
    
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
      articles: [],
      articleCount: 1,
      isOngoing: false,
    }))
    
    const topicEvents = getEventsForTopic(events, topic)
    const existingArticles = generateArticles(topicEvents, 20)
    
    // Identify relevant sources using AI-powered approach
    const detectedTopic = {
      ...topic,
      eventCount: topicEvents.length,
      avgSeverity: topicEvents.length > 0
        ? topicEvents.reduce((sum, e) => sum + (e.severity || 0), 0) / topicEvents.length
        : 0,
      isActive: topicEvents.length > 0,
    }
    
    const sources = await identifyRelevantSources(detectedTopic, existingArticles, 20)
    
    // Cache for 10 minutes
    dataCache.set(cacheKey, sources, 10 * 60 * 1000)
    
    const response = NextResponse.json({
      success: true,
      topicId,
      topicName: topic.name,
      sources,
      count: sources.length,
      cached: false,
    })
    
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    console.error('[Intelligent Sources API] Error:', error)
    
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      sources: [],
    }, { status: 500 })
    
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}
