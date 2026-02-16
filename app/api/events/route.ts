/**
 * Events API Route - OPTIMIZED
 *
 * Key optimizations:
 * - Select only needed columns (not *)
 * - In-memory cache (5min TTL)
 * - Parallel query execution
 * - Google Trends behind circuit breaker + race timeout
 * - Comprehensive geocoding via shared module
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Event, EventType } from '@/types/event'
import { fetchGoogleNewsByRegion } from '@/utils/googleNewsParser'
import { fetchGoogleTrendsForCountries } from '@/utils/googleTrendsByCountry'
import { extractCountriesFromEvents } from '@/utils/countryExtractor'
import { extractAndGeocode as sharedGeocode, COUNTRY_COORDS } from '@/utils/geocoding'

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface CacheEntry {
  data: Event[]
  timestamp: number
  source: string
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let eventsCache: CacheEntry | null = null

// Circuit breaker for Google Trends
const trendsCircuitBreaker = {
  failures: 0,
  lastFailure: 0,
  maxFailures: 3,
  cooldownMs: 10 * 60 * 1000,
  isOpen(): boolean {
    if (this.failures < this.maxFailures) return false
    if (Date.now() - this.lastFailure > this.cooldownMs) {
      this.failures = 0
      return false
    }
    return true
  },
  recordFailure(): void {
    this.failures++
    this.lastFailure = Date.now()
  },
  recordSuccess(): void {
    this.failures = 0
  },
}

function getCachedEvents(): CacheEntry | null {
  if (!eventsCache) return null
  if (Date.now() - eventsCache.timestamp > CACHE_TTL_MS) {
    eventsCache = null
    return null
  }
  return eventsCache
}

function setCachedEvents(data: Event[], source: string): void {
  eventsCache = { data, timestamp: Date.now(), source }
}

// ============================================================================
// OPTIMIZED COLUMNS
// ============================================================================

const SELECT_COLUMNS = `
  id,
  title,
  description,
  category,
  severity,
  latitude,
  longitude,
  location_name,
  country,
  continent,
  timestamp,
  weight_score,
  source_name,
  source_url,
  sources,
  timeline,
  is_ongoing,
  start_date
`.replace(/\s+/g, '')

// ============================================================================
// SUPABASE FETCH (Primary)
// ============================================================================

async function fetchFromSupabase(
  limit: number = 250,
  category?: string,
  country?: string,
  bypassCache: boolean = false
): Promise<{ events: Event[]; fromSupabase: boolean; cached: boolean }> {
  if (!bypassCache && !category && !country) {
    const cached = getCachedEvents()
    if (cached && cached.data.length > 0) {
      return { events: cached.data, fromSupabase: cached.source === 'supabase', cached: true }
    }
  }

  try {
    const supabase = createServerClient()
    if (!supabase) throw new Error('Supabase not configured')

    let query = (supabase as any)
      .from('events')
      .select(SELECT_COLUMNS)
      .order('weight_score', { ascending: false })
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (category && category !== 'all') query = query.eq('category', category)
    if (country) query = query.eq('country', country.toLowerCase())

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) throw new Error('No events in Supabase')

    const events: Event[] = (data as any[]).map((row: any) => ({
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
        startDate: row.start_date,
      },
      isOngoing: row.is_ongoing || false,
      articles: [],
      articleCount: Array.isArray(row.sources) ? row.sources.length : 1,
    }))

    if (!category && !country) setCachedEvents(events, 'supabase')
    return { events, fromSupabase: true, cached: false }
  } catch (error) {
    throw error
  }
}

// ============================================================================
// RSS FALLBACK (Streamlined)
// ============================================================================

function extractAndGeocode(text: string) {
  const result = sharedGeocode(text)
  if (!result) return null
  return { lat: result.lat, lng: result.lng, location: result.location, country: result.country, continent: result.continent }
}

function detectCategory(title: string): EventType {
  const text = title.toLowerCase()
  if (text.match(/\b(war|military|battle|invasion|airstrike|missile)\b/)) return 'armed-conflict'
  if (text.match(/\b(terror|terrorist|isis|hamas|hezbollah)\b/)) return 'terrorism'
  if (text.match(/\b(breaking|urgent)\b/)) return 'breaking'
  if (text.match(/\b(election|president|congress|parliament|vote)\b/)) return 'politics'
  if (text.match(/\b(championship|tournament|game|nfl|nba)\b/)) return 'sports'
  if (text.match(/\b(stock|market|economy|billion|company)\b/)) return 'business'
  if (text.match(/\b(ai|tech|software|apple|google|microsoft)\b/)) return 'technology'
  if (text.match(/\b(earthquake|quake)\b/)) return 'earthquake'
  return 'other'
}

const RSS_FEEDS = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
  { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech' },
]

function parseRSSItem(itemXml: string) {
  const getTag = (xml: string, tag: string) => {
    const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return (match?.[1] || match?.[2] || '').trim()
  }
  const title = getTag(itemXml, 'title')
  if (!title) return null
  return {
    title,
    description: getTag(itemXml, 'description').replace(/<[^>]+>/g, '').substring(0, 300),
    link: getTag(itemXml, 'link'),
    pubDate: getTag(itemXml, 'pubDate') || new Date().toISOString(),
  }
}

/**
 * Look up country coordinates from shared geocoding module.
 * Handles both proper-case ("United States") and lowercase ("usa") lookups.
 */
function getCountryCoords(countryName: string): { lat: number; lng: number } | null {
  const lower = countryName.toLowerCase()
  const coords = COUNTRY_COORDS[lower]
  if (coords) return { lat: coords.lat, lng: coords.lng }
  return null
}

async function fetchRSSFallback(): Promise<{ events: Event[]; fromSupabase: boolean; cached: boolean }> {
  // 1. Fetch Google News for all major regions in parallel
  const googleNewsPromises = [
    fetchGoogleNewsByRegion('africa', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('africa', 'politics').catch(() => []),
    fetchGoogleNewsByRegion('australia', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('asia', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('asia', 'politics').catch(() => []),
    fetchGoogleNewsByRegion('europe', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('europe', 'politics').catch(() => []),
    fetchGoogleNewsByRegion('americas', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('americas', 'politics').catch(() => []),
    fetchGoogleNewsByRegion('middle east', 'breaking').catch(() => []),
  ]

  // 2. Fetch RSS feeds in parallel with Google News
  const rssPromise = Promise.all(RSS_FEEDS.map(async feed => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(feed.url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!response.ok) return []
      const xml = await response.text()
      const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []
      const events: Event[] = []

      for (const itemXml of items.slice(0, 20)) {
        const item = parseRSSItem(itemXml)
        if (!item) continue
        const geo = extractAndGeocode(`${item.title} ${item.description}`)
        if (!geo) continue

        events.push({
          id: `rss-${feed.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: item.title.substring(0, 200),
          description: item.description,
          type: detectCategory(item.title),
          severity: 5 as Event['severity'],
          latitude: geo.lat,
          longitude: geo.lng,
          timestamp: new Date(item.pubDate).getTime() || Date.now(),
          source: 'RSS',
          metadata: {
            locationName: geo.location,
            country: geo.country,
            continent: geo.continent,
            sourceName: feed.name,
          },
          isOngoing: false,
          articles: [],
          articleCount: 1,
        })
      }
      return events
    } catch {
      return []
    }
  }))

  // Run Google News + RSS in parallel
  const [googleNewsResults, rssResults] = await Promise.all([
    Promise.all(googleNewsPromises),
    rssPromise,
  ])

  const googleNewsEvents = googleNewsResults.flat()
  const rssEvents = rssResults.flat()
  console.log(`[Events API] Google News: ${googleNewsEvents.length}, RSS: ${rssEvents.length}`)

  // 3. Google Trends (non-blocking, behind circuit breaker + race timeout)
  let googleTrendsEvents: Event[] = []
  if (!trendsCircuitBreaker.isOpen()) {
    try {
      // Race: Google Trends has max 8 seconds before we give up
      googleTrendsEvents = await Promise.race([
        fetchGoogleTrendsEvents(googleNewsEvents),
        new Promise<Event[]>(resolve => setTimeout(() => resolve([]), 8000)),
      ])
      if (googleTrendsEvents.length > 0) {
        trendsCircuitBreaker.recordSuccess()
      }
    } catch (error) {
      trendsCircuitBreaker.recordFailure()
      console.warn(`[Events API] Google Trends failed (${trendsCircuitBreaker.failures}/${trendsCircuitBreaker.maxFailures}):`, error)
    }
  } else {
    console.log('[Events API] Google Trends circuit breaker OPEN - skipping')
  }

  // 4. Hardcoded ongoing conflicts
  const now = Date.now()
  const conflicts: Event[] = [
    { id: 'ongoing-ukraine', title: 'Russia-Ukraine War', description: 'Full-scale Russian invasion of Ukraine.', type: 'armed-conflict', severity: 10 as Event['severity'], latitude: 48.379, longitude: 31.165, timestamp: now, source: 'Curated', metadata: { country: 'ukraine', continent: 'europe', isOngoing: true }, isOngoing: true, articles: [], articleCount: 1 },
    { id: 'ongoing-gaza', title: 'Israel-Gaza War', description: 'Major conflict following October 7, 2023 attack.', type: 'armed-conflict', severity: 10 as Event['severity'], latitude: 31.354, longitude: 34.308, timestamp: now, source: 'Curated', metadata: { country: 'palestine', continent: 'asia', isOngoing: true }, isOngoing: true, articles: [], articleCount: 1 },
    { id: 'ongoing-sudan', title: 'Sudan Civil War', description: 'Armed conflict between SAF and RSF.', type: 'armed-conflict', severity: 9 as Event['severity'], latitude: 15.500, longitude: 32.560, timestamp: now, source: 'Curated', metadata: { country: 'sudan', continent: 'africa', isOngoing: true }, isOngoing: true, articles: [], articleCount: 1 },
  ]

  // 5. Combine all sources
  const combined = [...conflicts, ...rssEvents, ...googleNewsEvents, ...googleTrendsEvents]

  setCachedEvents(combined, 'rss-fallback')
  console.log(`[Events API] Total: ${combined.length} (GNews: ${googleNewsEvents.length}, Trends: ${googleTrendsEvents.length}, RSS: ${rssEvents.length}, Conflicts: ${conflicts.length})`)

  return { events: combined, fromSupabase: false, cached: false }
}

/**
 * Fetch Google Trends events using shared COUNTRY_COORDS for geocoding.
 */
async function fetchGoogleTrendsEvents(existingEvents: Event[]): Promise<Event[]> {
  const allCountries = extractCountriesFromEvents(existingEvents)
  const countryNames = allCountries.map(c => c.label).slice(0, 10) // Limit to 10 countries

  const trendsMap = await fetchGoogleTrendsForCountries(countryNames)
  const events: Event[] = []

  for (const [country, topics] of trendsMap.entries()) {
    for (const topic of topics.slice(0, 3)) {
      const coords = getCountryCoords(country)
      if (!coords) continue

      events.push({
        id: `google-trends-${country}-${topic.id}-${Date.now()}`,
        title: `${topic.name} - Trending in ${country}`,
        description: `Trending topic in ${country} with ${topic.eventCount} related events`,
        type: 'other' as EventType,
        severity: 4 as Event['severity'],
        latitude: coords.lat + (Math.random() - 0.5) * 2,
        longitude: coords.lng + (Math.random() - 0.5) * 2,
        timestamp: Date.now(),
        source: 'Google Trends',
        metadata: {
          country: country.toLowerCase(),
          sourceName: 'Google Trends',
          sourceTier: 2,
          sourceTrustWeight: 0.9,
        },
        articles: [],
        articleCount: topic.eventCount,
        isOngoing: false,
      })
    }
  }

  return events
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(400, parseInt(searchParams.get('limit') || '250'))
    const category = searchParams.get('category') || undefined
    const country = searchParams.get('country') || undefined
    const source = searchParams.get('source') || 'supabase'
    const bypassCache = searchParams.get('fresh') === 'true'

    let result: { events: Event[]; fromSupabase: boolean; cached: boolean }

    if (source !== 'rss') {
      try {
        result = await fetchFromSupabase(limit, category, country, bypassCache)
      } catch {
        result = await fetchRSSFallback()
      }
    } else {
      result = await fetchRSSFallback()
    }

    const durationMs = Date.now() - startTime
    console.log(`[Events API] Response: ${result.events.length} events (source: ${result.fromSupabase ? 'supabase' : 'rss-fallback'}, cached: ${result.cached}, duration: ${durationMs}ms)`)

    return NextResponse.json({
      events: result.events,
      stats: {
        total: result.events.length,
        source: result.fromSupabase ? 'supabase' : 'rss-fallback',
        durationMs,
        cached: result.cached,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Data-Source': result.fromSupabase ? 'supabase' : 'rss-fallback',
        'X-Cache-Hit': result.cached ? 'true' : 'false',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch events', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
