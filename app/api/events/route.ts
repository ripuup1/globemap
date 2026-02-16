/**
 * Events API Route - OPTIMIZED
 * 
 * Key optimizations:
 * - Select only needed columns (not *)
 * - In-memory cache (60s TTL)
 * - Parallel query execution
 * - Better error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Event, EventType } from '@/types/event'
import { fetchGoogleNewsByRegion } from '@/utils/googleNewsParser'
import { fetchGoogleTrendsForCountries } from '@/utils/googleTrendsByCountry'
import { extractCountriesFromEvents } from '@/utils/countryExtractor'
import { dataCache } from '@/utils/dataCache'
import { getCacheHeaders } from '@/lib/compression'
import {
  calculateCountryQuotas,
  fillCountryQuotasWithTrends,
  getCountriesWithQuotas,
} from '@/utils/googleTrendsByCountryQuota'

// ============================================================================
// IN-MEMORY CACHE (Simple but effective)
// ============================================================================

interface CacheEntry {
  data: Event[]
  timestamp: number
  source: string
}

const CACHE_TTL_MS = 60 * 1000 // 60 seconds
let eventsCache: CacheEntry | null = null

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
// OPTIMIZED COLUMNS (Only what we need)
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
): Promise<{ events: Event[], fromSupabase: boolean, cached: boolean }> {
  // Check cache first (only for default queries)
  if (!bypassCache && !category && !country) {
    const cached = getCachedEvents()
    if (cached && cached.data.length > 0) {
      // Don't slice cached data - return all available
      return { 
        events: cached.data, 
        fromSupabase: cached.source === 'supabase', 
        cached: true 
      }
    }
  }

  try {
    const supabase = createServerClient()
    
    if (!supabase) {
      throw new Error('Supabase not configured')
    }
    
    // Build optimized query - only select needed columns
    let query = (supabase as any)
      .from('events')
      .select(SELECT_COLUMNS)
      .order('weight_score', { ascending: false })
      .order('timestamp', { ascending: false })
      .limit(limit)

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    if (country) {
      query = query.eq('country', country.toLowerCase())
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No events in Supabase')
    }

    // Transform to Event format (optimized - no nested mapping)
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
      articles: [], // Don't populate articles array - saves memory
      articleCount: Array.isArray(row.sources) ? row.sources.length : 1,
    }))

    // Cache the result (only for unfiltered queries)
    if (!category && !country) {
      setCachedEvents(events, 'supabase')
    }

    return { events, fromSupabase: true, cached: false }
  } catch (error) {
    throw error
  }
}

// ============================================================================
// RSS FALLBACK (Streamlined)
// ============================================================================

const CITY_COORDS: Record<string, { lat: number; lng: number; country: string; continent: string }> = {
  'new york': { lat: 40.7128, lng: -74.0060, country: 'usa', continent: 'north-america' },
  'washington': { lat: 38.9072, lng: -77.0369, country: 'usa', continent: 'north-america' },
  'london': { lat: 51.5074, lng: -0.1278, country: 'uk', continent: 'europe' },
  'paris': { lat: 48.8566, lng: 2.3522, country: 'france', continent: 'europe' },
  'berlin': { lat: 52.5200, lng: 13.4050, country: 'germany', continent: 'europe' },
  'tokyo': { lat: 35.6762, lng: 139.6503, country: 'japan', continent: 'asia' },
  'beijing': { lat: 39.9042, lng: 116.4074, country: 'china', continent: 'asia' },
  'moscow': { lat: 55.7558, lng: 37.6173, country: 'russia', continent: 'europe' },
  'kyiv': { lat: 50.4501, lng: 30.5234, country: 'ukraine', continent: 'europe' },
  'gaza': { lat: 31.3547, lng: 34.3088, country: 'palestine', continent: 'asia' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, country: 'israel', continent: 'asia' },
  'cairo': { lat: 30.0444, lng: 31.2357, country: 'egypt', continent: 'africa' },
  'sydney': { lat: -33.8688, lng: 151.2093, country: 'australia', continent: 'oceania' },
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; continent: string }> = {
  'usa': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'united states': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'uk': { lat: 55.3781, lng: -3.4360, continent: 'europe' },
  'china': { lat: 35.8617, lng: 104.1954, continent: 'asia' },
  'russia': { lat: 61.5240, lng: 105.3188, continent: 'europe' },
  'ukraine': { lat: 48.3794, lng: 31.1656, continent: 'europe' },
  'israel': { lat: 31.0461, lng: 34.8516, continent: 'asia' },
  'palestine': { lat: 31.9522, lng: 35.2332, continent: 'asia' },
}

function extractAndGeocode(text: string) {
  const lowerText = text.toLowerCase()
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lowerText.includes(city)) return { ...coords, location: city }
  }
  for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
    if (lowerText.includes(country)) return { ...coords, location: country, country }
  }
  return null
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

async function fetchRSSFallback(): Promise<{ events: Event[], fromSupabase: boolean, cached: boolean }> {
  // Fetch Google News for all major regions to ensure global coverage
  const googleNewsPromises = [
    // Africa
    fetchGoogleNewsByRegion('africa', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('africa', 'politics').catch(() => []),
    fetchGoogleNewsByRegion('africa', 'technology').catch(() => []),
    // Australia/Oceania
    fetchGoogleNewsByRegion('australia', 'technology').catch(() => []),
    fetchGoogleNewsByRegion('australia', 'economy').catch(() => []),
    fetchGoogleNewsByRegion('australia', 'breaking').catch(() => []),
    // Asia-Pacific
    fetchGoogleNewsByRegion('asia', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('asia', 'politics').catch(() => []),
    // Europe
    fetchGoogleNewsByRegion('europe', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('europe', 'politics').catch(() => []),
    // Americas
    fetchGoogleNewsByRegion('americas', 'breaking').catch(() => []),
    fetchGoogleNewsByRegion('americas', 'politics').catch(() => []),
  ]
  
  const googleNewsResults = await Promise.all(googleNewsPromises)
  const googleNewsEvents = googleNewsResults.flat()
  console.log(`[Events API] Google News events fetched: ${googleNewsEvents.length}`)
  
  // Fetch Google Trends for all countries to ensure comprehensive marker coverage
  // This helps enforce markers for every area based on search trends
  let googleTrendsEvents: Event[] = []
  try {
    // Get countries from existing events to identify underrepresented ones
    const allCountries = extractCountriesFromEvents([...googleNewsEvents])
    // Increased to 20 countries for better global coverage
    const countryNames = allCountries.map(c => c.label).slice(0, 20)
    
    // Fetch trends for these countries
    const trendsMap = await fetchGoogleTrendsForCountries(countryNames)
    
    // Convert trending topics to events (simplified - would need full geocoding)
    for (const [country, topics] of trendsMap.entries()) {
      // Increased to 3-4 events per country from trends for better coverage
      for (const topic of topics.slice(0, 4)) {
        // Simple geocoding based on country (would need proper geocoding API)
        const countryCoords: Record<string, { lat: number; lng: number }> = {
          'United States': { lat: 39.8283, lng: -98.5795 },
          'Australia': { lat: -25.2744, lng: 133.7751 },
          'South Africa': { lat: -30.5595, lng: 22.9375 },
          'Nigeria': { lat: 9.0820, lng: 8.6753 },
          'Kenya': { lat: -0.0236, lng: 37.9062 },
          // Add more as needed
        }
        
        const coords = countryCoords[country] || { lat: 0, lng: 0 }
        if (coords.lat === 0 && coords.lng === 0) continue // Skip if no coordinates
        
        googleTrendsEvents.push({
          id: `google-trends-${country}-${topic.id}-${Date.now()}`,
          title: `${topic.name} - Trending in ${country}`,
          description: `Trending topic in ${country} with ${topic.eventCount} related events`,
          type: 'other' as EventType, // Trending topics use 'other' type
          severity: 4 as Event['severity'], // Moderate severity for trends
          latitude: coords.lat,
          longitude: coords.lng,
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
  } catch (error) {
    console.warn('[Events API] Google Trends fetch failed:', error)
  }
  
  const results = await Promise.all(RSS_FEEDS.map(async feed => {
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
          metadata: { locationName: geo.location, country: geo.country, continent: geo.continent },
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
  
  const allEvents = results.flat()
  
  // Add ongoing conflicts
  const now = Date.now()
  const conflicts: Event[] = [
    { id: 'ongoing-ukraine', title: 'Russia-Ukraine War', description: 'Full-scale Russian invasion of Ukraine.', type: 'armed-conflict', severity: 10 as Event['severity'], latitude: 48.379, longitude: 31.165, timestamp: now, source: 'Curated', metadata: { country: 'ukraine', isOngoing: true }, isOngoing: true, articles: [], articleCount: 1 },
    { id: 'ongoing-gaza', title: 'Israel-Gaza War', description: 'Major conflict following October 7, 2023 attack.', type: 'armed-conflict', severity: 10 as Event['severity'], latitude: 31.354, longitude: 34.308, timestamp: now, source: 'Curated', metadata: { country: 'palestine', isOngoing: true }, isOngoing: true, articles: [], articleCount: 1 },
    { id: 'ongoing-sudan', title: 'Sudan Civil War', description: 'Armed conflict between SAF and RSF.', type: 'armed-conflict', severity: 9 as Event['severity'], latitude: 15.500, longitude: 32.560, timestamp: now, source: 'Curated', metadata: { country: 'sudan', isOngoing: true }, isOngoing: true, articles: [], articleCount: 1 },
  ]
  
  // Combine: conflicts + RSS feeds + Google News + Google Trends
  let combined = [...conflicts, ...allEvents, ...googleNewsEvents, ...googleTrendsEvents]
  
  // Fill country quotas using Google Trends (highest searched/viewed per country)
  try {
    const countriesWithQuotas = getCountriesWithQuotas()
    const countryQuotas = await calculateCountryQuotas(countriesWithQuotas)
    const quotaFilledEvents = await fillCountryQuotasWithTrends(countryQuotas, combined)
    
    // Add quota-filled events (deduplicate by ID)
    const existingIds = new Set(combined.map(e => e.id))
    const newQuotaEvents = quotaFilledEvents.filter(e => !existingIds.has(e.id))
    combined.push(...newQuotaEvents)
    
    console.log(`[Events API] Added ${newQuotaEvents.length} events from country trend quotas`)
  } catch (error) {
    console.warn('[Events API] Country quota filling failed:', error)
  }
  
  // Don't slice - return all events for maximum marker coverage
  // Cache the fallback result
  setCachedEvents(combined, 'rss-fallback')
  
  console.log(`[Events API] Total events generated: ${combined.length} (Google News: ${googleNewsEvents.length}, Google Trends: ${googleTrendsEvents.length}, RSS: ${allEvents.length}, Conflicts: ${conflicts.length})`)
  
  return { events: combined, fromSupabase: false, cached: false }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    // Increased limits: default 250, max 400 to ensure all markers load
    const limit = Math.min(400, parseInt(searchParams.get('limit') || '250'))
    const category = searchParams.get('category') || undefined
    const country = searchParams.get('country') || undefined
    const source = searchParams.get('source') || 'supabase'
    const bypassCache = searchParams.get('fresh') === 'true'
    
    let result: { events: Event[], fromSupabase: boolean, cached: boolean }
    
    // Try Supabase first, fall back to RSS
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
    
    // Diagnostic logging
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
