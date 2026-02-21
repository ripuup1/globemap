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
import { extractAndGeocode as sharedGeocode } from '@/utils/geocoding'

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

    // 5s timeout for Supabase query (fail fast to RSS fallback)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    let query = (supabase as any)
      .from('events')
      .select(SELECT_COLUMNS, { signal: controller.signal })
      .order('weight_score', { ascending: false })
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (category && category !== 'all') query = query.eq('category', category)
    if (country) query = query.eq('country', country.toLowerCase())

    const { data, error } = await query
    clearTimeout(timeoutId)
    if (error) throw error
    if (!data || data.length === 0) throw new Error('No events in Supabase')

    const events: Event[] = (data as any[]).map((row: any) => {
      // Build articles from sources array stored in Supabase
      const sourcesArr = Array.isArray(row.sources) ? row.sources : []
      const articles: import('@/types/event').Article[] = sourcesArr.length > 0
        ? sourcesArr.map((s: any, idx: number) => ({
            id: `${row.id}-src-${idx}`,
            title: s.title || row.title,
            description: row.description || '',
            timestamp: new Date(s.date || row.timestamp).getTime(),
            source: s.sourceName || row.source_name || 'Unknown',
            url: s.url || row.source_url || '',
            sourceName: s.sourceName || row.source_name || 'Unknown',
            publishedAt: s.date || new Date(row.timestamp).toISOString(),
            type: row.category as EventType,
            severity: row.severity as Event['severity'],
            metadata: {},
          }))
        : row.source_url
          ? [{
              id: row.id,
              title: row.title,
              description: row.description || '',
              timestamp: new Date(row.timestamp).getTime(),
              source: row.source_name || 'Unknown',
              url: row.source_url,
              sourceName: row.source_name || 'Unknown',
              publishedAt: new Date(row.timestamp).toISOString(),
              type: row.category as EventType,
              severity: row.severity as Event['severity'],
              metadata: {},
            }]
          : []

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
          startDate: row.start_date,
        },
        isOngoing: row.is_ongoing || false,
        articles,
        articleCount: Math.max(articles.length, 1),
      }
    })

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

  // Conflict & Security
  if (text.match(/\b(war|military|battle|invasion|airstrike|missile|troops|army|navy|drone strike|artillery|ceasefire|frontline|offensive|soldiers|armed forces|airforce|bombing raid|shelling)\b/)) return 'armed-conflict'
  if (text.match(/\b(terror|terrorist|isis|hamas|hezbollah|al.?qaeda|jihadist|extremist|suicide bomb|car bomb|hostage|kidnap|militant attack)\b/)) return 'terrorism'
  if (text.match(/\b(protest|riot|uprising|demonstrat|civil unrest|strike action|coup|revolution|clashes|tear gas|crackdown|dissent|rally against|march against)\b/)) return 'civil-unrest'

  // Natural Disasters
  if (text.match(/\b(earthquake|quake|seismic|tremor|aftershock|magnitude \d)\b/)) return 'earthquake'
  if (text.match(/\b(volcano|eruption|volcanic|lava|magma|ash cloud|pyroclastic)\b/)) return 'volcano'
  if (text.match(/\b(wildfire|bushfire|forest fire|blaze|wildland fire|fire season|acres burned)\b/)) return 'wildfire'
  if (text.match(/\b(hurricane|typhoon|cyclone|tropical storm|tornado|blizzard|ice storm|derecho|wind damage)\b/)) return 'storm'
  if (text.match(/\b(tsunami|tidal wave)\b/)) return 'tsunami'
  if (text.match(/\b(flood|flooding|flash flood|inundation|levee|dam burst|mudslide|landslide)\b/)) return 'flood'
  if (text.match(/\b(natural disaster|disaster relief|emergency response|fema|evacuation order|state of emergency)\b/)) return 'natural-disaster'

  // News Categories
  if (text.match(/\b(breaking|urgent|just in|developing story)\b/)) return 'breaking'
  if (text.match(/\b(election|president|congress|parliament|vote|senator|governor|legislation|bill passed|supreme court|democrat|republican|prime minister|cabinet|diplomatic|treaty|sanctions|geopolitic|foreign policy|ambassador|nato|united nations)\b/)) return 'politics'
  if (text.match(/\b(murder|arrest|suspect|convicted|sentenced|robbery|fraud|theft|shooting|stabbing|homicide|drug bust|cartel|smuggling|trafficking|prison|inmate|fbi|dea|interpol|indicted|charged with|manslaughter|assault|gang)\b/)) return 'crime'
  if (text.match(/\b(championship|tournament|game|nfl|nba|mlb|nhl|soccer|football match|world cup|olympics|premier league|la liga|serie a|bundesliga|grand prix|formula 1|f1|tennis|golf|cricket|rugby|medal|playoff|mvp|transfer|signing|coach fired)\b/)) return 'sports'
  if (text.match(/\b(stock|market|economy|billion|company|ipo|merger|acquisition|gdp|inflation|recession|earnings|revenue|profit|wall street|nasdaq|dow|s&p|fed rate|interest rate|trade deal|tariff|unemployment|bankruptcy|startup fund|venture capital)\b/)) return 'business'
  if (text.match(/\b(ai|artificial intelligence|tech|software|apple|google|microsoft|meta|amazon|nvidia|openai|chatgpt|robot|chip|semiconductor|cybersecurity|hack|data breach|5g|quantum|startup|app launch|silicon valley|elon musk|spacex)\b/)) return 'technology'
  if (text.match(/\b(health|medical|hospital|disease|virus|pandemic|vaccine|outbreak|cdc|who|cancer|surgery|clinical trial|drug approval|fda|mental health|obesity|diabetes|heart|stroke|infection|epidemic)\b/)) return 'health'
  if (text.match(/\b(science|research|discovery|breakthrough|nasa|space|mars|moon|asteroid|comet|telescope|genome|dna|fossil|species|climate study|physics|particle|laboratory|experiment|published in)\b/)) return 'science'
  if (text.match(/\b(movie|film|actor|actress|celebrity|oscar|grammy|emmy|album|concert|box office|streaming|netflix|disney|tv show|series|premiere|entertainment|music|singer|band|tour|festival|award show|red carpet|broadway|viral video)\b/)) return 'entertainment'

  return 'other'
}

const RSS_FEEDS = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
  { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters' },
  { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', name: 'BBC Africa' },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', name: 'BBC Asia' },
  { url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml', name: 'BBC LatAm' },
  { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', name: 'CNA Singapore' },
  { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', name: 'Times of India' },
]

function cleanRssTitle(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&[a-z]+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanRssDescription(raw: string): string {
  return raw
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300)
}

function parseRSSItem(itemXml: string) {
  const getTag = (xml: string, tag: string) => {
    const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return (match?.[1] || match?.[2] || '').trim()
  }
  const title = getTag(itemXml, 'title')
  if (!title) return null
  return {
    title,
    description: cleanRssDescription(getTag(itemXml, 'description')),
    link: getTag(itemXml, 'link'),
    pubDate: getTag(itemXml, 'pubDate') || new Date().toISOString(),
  }
}

async function fetchRSSFallback(): Promise<{ events: Event[]; fromSupabase: boolean; cached: boolean }> {
  // Hardcoded ongoing conflicts - always returned immediately
  const now = Date.now()
  const conflictArticles: Record<string, { url: string; sourceName: string }> = {
    'ongoing-ukraine': { url: 'https://en.wikipedia.org/wiki/Russian_invasion_of_Ukraine', sourceName: 'Wikipedia' },
    'ongoing-gaza': { url: 'https://en.wikipedia.org/wiki/Israel%E2%80%93Hamas_war', sourceName: 'Wikipedia' },
    'ongoing-sudan': { url: 'https://en.wikipedia.org/wiki/Sudanese_civil_war_(2023%E2%80%93present)', sourceName: 'Wikipedia' },
  }
  const conflicts: Event[] = [
    { id: 'ongoing-ukraine', title: 'Russia-Ukraine War', description: 'Full-scale Russian invasion of Ukraine.', type: 'armed-conflict', severity: 10 as Event['severity'], latitude: 48.379, longitude: 31.165, timestamp: now, source: 'Curated', metadata: { country: 'ukraine', continent: 'europe', isOngoing: true, url: conflictArticles['ongoing-ukraine'].url, sourceName: conflictArticles['ongoing-ukraine'].sourceName }, isOngoing: true, articles: [{ id: 'ongoing-ukraine', title: 'Russia-Ukraine War', description: 'Full-scale Russian invasion of Ukraine.', timestamp: now, source: 'Wikipedia', url: conflictArticles['ongoing-ukraine'].url, sourceName: 'Wikipedia', publishedAt: new Date(now).toISOString(), type: 'armed-conflict', severity: 10 as Event['severity'], metadata: {} }], articleCount: 1 },
    { id: 'ongoing-gaza', title: 'Israel-Gaza War', description: 'Major conflict following October 7, 2023 attack.', type: 'armed-conflict', severity: 10 as Event['severity'], latitude: 31.354, longitude: 34.308, timestamp: now, source: 'Curated', metadata: { country: 'palestine', continent: 'asia', isOngoing: true, url: conflictArticles['ongoing-gaza'].url, sourceName: conflictArticles['ongoing-gaza'].sourceName }, isOngoing: true, articles: [{ id: 'ongoing-gaza', title: 'Israel-Gaza War', description: 'Major conflict following October 7, 2023 attack.', timestamp: now, source: 'Wikipedia', url: conflictArticles['ongoing-gaza'].url, sourceName: 'Wikipedia', publishedAt: new Date(now).toISOString(), type: 'armed-conflict', severity: 10 as Event['severity'], metadata: {} }], articleCount: 1 },
    { id: 'ongoing-sudan', title: 'Sudan Civil War', description: 'Armed conflict between SAF and RSF.', type: 'armed-conflict', severity: 9 as Event['severity'], latitude: 15.500, longitude: 32.560, timestamp: now, source: 'Curated', metadata: { country: 'sudan', continent: 'africa', isOngoing: true, url: conflictArticles['ongoing-sudan'].url, sourceName: conflictArticles['ongoing-sudan'].sourceName }, isOngoing: true, articles: [{ id: 'ongoing-sudan', title: 'Sudan Civil War', description: 'Armed conflict between SAF and RSF.', timestamp: now, source: 'Wikipedia', url: conflictArticles['ongoing-sudan'].url, sourceName: 'Wikipedia', publishedAt: new Date(now).toISOString(), type: 'armed-conflict', severity: 9 as Event['severity'], metadata: {} }], articleCount: 1 },
  ]

  // Race all external fetches against a 12s overall timeout.
  // Whatever data arrives within 12s is returned; the rest is dropped.
  const fetchAllSources = async (): Promise<Event[]> => {
    // 1. RSS feeds (fast, reliable) - 4s timeout per feed
    const rssPromise = Promise.all(RSS_FEEDS.map(async feed => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)
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

          const eventId = `rss-${feed.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
          const eventTitle = cleanRssTitle(item.title).substring(0, 200)
          const eventType = detectCategory(item.title)
          const eventTimestamp = new Date(item.pubDate).getTime() || Date.now()
          const articleUrl = item.link || ''

          events.push({
            id: eventId,
            title: eventTitle,
            description: item.description,
            type: eventType,
            severity: 5 as Event['severity'],
            latitude: geo.lat,
            longitude: geo.lng,
            timestamp: eventTimestamp,
            source: 'RSS',
            metadata: {
              locationName: geo.location,
              country: geo.country,
              continent: geo.continent,
              sourceName: feed.name,
              url: articleUrl,
            },
            isOngoing: false,
            articles: articleUrl ? [{
              id: eventId,
              title: eventTitle,
              description: item.description,
              timestamp: eventTimestamp,
              source: feed.name,
              url: articleUrl,
              sourceName: feed.name,
              publishedAt: new Date(eventTimestamp).toISOString(),
              type: eventType,
              severity: 5 as Event['severity'],
              metadata: {},
            }] : [],
            articleCount: 1,
          })
        }
        return events
      } catch {
        return []
      }
    }))

    // 2. Google News (slower, uses proxy fallback) - reduced to 5 high-value regions
    const googleNewsPromises = [
      fetchGoogleNewsByRegion('americas', 'breaking').catch(() => []),
      fetchGoogleNewsByRegion('europe', 'breaking').catch(() => []),
      fetchGoogleNewsByRegion('asia', 'breaking').catch(() => []),
      fetchGoogleNewsByRegion('middle east', 'breaking').catch(() => []),
      fetchGoogleNewsByRegion('africa', 'breaking').catch(() => []),
    ]

    // Run RSS + Google News in parallel
    const [rssResults, googleNewsResults] = await Promise.all([
      rssPromise,
      Promise.all(googleNewsPromises),
    ])

    return [...rssResults.flat(), ...googleNewsResults.flat()]
  }

  try {
    // 12-second hard timeout: return whatever arrived, drop the rest
    const externalEvents = await Promise.race([
      fetchAllSources(),
      new Promise<Event[]>(resolve => setTimeout(() => resolve([]), 12000)),
    ])

    const combined = [...conflicts, ...externalEvents]
    setCachedEvents(combined, 'rss-fallback')
    return { events: combined, fromSupabase: false, cached: false }
  } catch {
    // If everything fails, return conflicts at minimum
    return { events: conflicts, fromSupabase: false, cached: false }
  }
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
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
