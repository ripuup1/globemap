/**
 * Search API Route
 * 
 * Provides intelligent news search with:
 * - Full-text search via Supabase
 * - Synonym expansion
 * - Country/category filtering
 * - Top Stories mode
 * 
 * Endpoints:
 * - GET /api/search?q=ukraine - Full-text search
 * - GET /api/search?top=true&country=usa - Top stories for country
 * - GET /api/search?top=true&category=sports - Top stories by category
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Event, EventType } from '@/types/event'

// Search synonyms for intelligent expansion
const SEARCH_SYNONYMS: Record<string, string[]> = {
  'usa': ['united states', 'america', 'american', 'washington', 'new york', 'biden', 'trump', 'white house', 'congress'],
  'united states': ['usa', 'america', 'american'],
  'uk': ['united kingdom', 'britain', 'british', 'england', 'london'],
  'middle east': ['israel', 'palestine', 'gaza', 'iran', 'iraq', 'syria', 'yemen', 'saudi arabia'],
  'israel': ['israeli', 'tel aviv', 'jerusalem', 'gaza', 'hamas', 'netanyahu'],
  'palestine': ['palestinian', 'gaza', 'west bank', 'hamas'],
  'europe': ['eu', 'european', 'france', 'germany', 'italy', 'spain', 'nato', 'brussels'],
  'russia': ['russian', 'moscow', 'putin', 'kremlin'],
  'ukraine': ['ukrainian', 'kyiv', 'zelensky'],
  'china': ['chinese', 'beijing', 'shanghai', 'xi jinping'],
  'war': ['conflict', 'military', 'battle', 'fighting', 'troops', 'combat', 'invasion'],
  'tech': ['technology', 'ai', 'artificial intelligence', 'software', 'startup', 'apple', 'google', 'microsoft'],
  'sports': ['football', 'soccer', 'basketball', 'baseball', 'nfl', 'nba', 'mlb', 'championship'],
  'politics': ['political', 'election', 'government', 'president', 'congress', 'vote'],
  'economy': ['economic', 'financial', 'market', 'stock', 'trade', 'gdp', 'inflation'],
}

// Expand search query with synonyms
function expandQuery(query: string): string[] {
  const terms = [query.toLowerCase()]
  const lowerQuery = query.toLowerCase()
  
  for (const [key, synonyms] of Object.entries(SEARCH_SYNONYMS)) {
    if (lowerQuery.includes(key) || synonyms.some(s => lowerQuery.includes(s))) {
      terms.push(key, ...synonyms)
    }
  }
  
  return [...new Set(terms)]
}

// Transform Supabase row to Event format
function transformToEvent(row: any): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    type: row.category as EventType,
    severity: row.severity as Event['severity'],
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: new Date(row.timestamp).getTime(),
    source: 'Supabase',
    metadata: {
      locationName: row.location_name,
      country: row.country,
      continent: row.continent,
      sourceName: row.source_name,
      url: row.source_url,
      weightScore: row.weight_score,
      sources: row.sources,
      timeline: row.timeline,
      isOngoing: row.is_ongoing,
    },
    isOngoing: row.is_ongoing,
    articles: [],
    articleCount: Array.isArray(row.sources) ? row.sources.length : 1,
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const isTopStories = searchParams.get('top') === 'true'
    const country = searchParams.get('country') || null
    const category = searchParams.get('category') || null
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const supabase = createServerClient()
    let events: Event[] = []
    
    // If no Supabase client, return empty results
    if (!supabase) {
      return NextResponse.json({
        events: [],
        query,
        isTopStories,
        filters: { country, category },
        count: 0,
        durationMs: Date.now() - startTime,
        error: 'Supabase not configured',
      })
    }
    
    // Cast supabase to any to bypass strict typing
    const sb = supabase as any
    
    if (isTopStories) {
      // Top Stories mode - fetch ranked stories
      let topQuery = sb
        .from('events')
        .select('*')
        .order('weight_score', { ascending: false })
        .order('timestamp', { ascending: false })
        .limit(limit)
      
      if (country) {
        topQuery = topQuery.eq('country', country.toLowerCase())
      }
      
      if (category) {
        topQuery = topQuery.eq('category', category)
      }
      
      const { data, error } = await topQuery
      
      if (error) throw error
      events = ((data || []) as any[]).map(transformToEvent)
      
    } else if (query) {
      // Full-text search mode
      const expandedTerms = expandQuery(query)
      
      // Try full-text search first
      let ftsData: any[] = []
      try {
        const { data, error } = await sb.rpc('search_events', {
          search_query: query,
          limit_count: limit,
        })
        if (!error && data) ftsData = data
      } catch {
        // Function might not exist
      }
      
      if (ftsData.length > 0) {
        events = ftsData.map(transformToEvent)
      } else {
        // Fallback to ILIKE search
        const { data, error } = await sb
          .from('events')
          .select('*')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,location_name.ilike.%${query}%,country.ilike.%${query}%`)
          .order('weight_score', { ascending: false })
          .limit(limit)
        
        if (error) throw error
        events = ((data || []) as any[]).map(transformToEvent)
      }
    } else {
      // No query - return recent events
      const { data, error } = await sb
        .from('events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      events = ((data || []) as any[]).map(transformToEvent)
    }
    
    return NextResponse.json({
      events,
      query,
      isTopStories,
      filters: { country, category },
      count: events.length,
      durationMs: Date.now() - startTime,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed', events: [] },
      { status: 500 }
    )
  }
}
