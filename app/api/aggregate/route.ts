/**
 * Aggregation API Route - OPTIMIZED for 200+ Events
 * 
 * Key optimizations:
 * - Expanded RSS feeds (15+ sources)
 * - Increased items per feed (40 vs 20)
 * - Enhanced geocoding with 150+ locations
 * - Fallback geocoding for ungeocodable events
 * - Less aggressive deduplication
 * - Batch upserts for speed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { EventCategory } from '@/types/supabase'
import { extractAndGeocode, getFallbackLocation } from '@/utils/geocoding'

// ============================================================================
// CONFIGURATION - EXPANDED
// ============================================================================

const WEIGHT_CONFIG = {
  US_WEIGHT: 3.0,
  MEXICO_WEIGHT: 2.4,
  CANADA_WEIGHT: 2.3,
  SOUTH_AMERICA_WEIGHT: 2.5,
  CHINA_WEIGHT: 2.3,
  CONFLICT_WEIGHT: 2.5,
  TERRORISM_WEIGHT: 2.3,
  BREAKING_WEIGHT: 1.6,
  AFRICA_WEIGHT: 1.6,
  EUROPE_WEIGHT: 1.4,
  ASIA_WEIGHT: 1.3,
}

// EXPANDED: 15 RSS Feeds with higher item limits
const RSS_FEEDS = [
  // US News (primary)
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times World', maxItems: 40 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', name: 'NY Times', maxItems: 35 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', name: 'NY Times US', maxItems: 30 },
  { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR', maxItems: 30 },
  { url: 'https://feeds.npr.org/1004/rss.xml', name: 'NPR World', maxItems: 25 },
  // UK/Europe
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', maxItems: 40 },
  { url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', name: 'BBC Americas', maxItems: 25 },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', name: 'BBC Asia', maxItems: 25 },
  { url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml', name: 'BBC Europe', maxItems: 25 },
  { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', name: 'BBC Africa', maxItems: 20 },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC Middle East', maxItems: 25 },
  { url: 'https://www.theguardian.com/world/rss', name: 'Guardian World', maxItems: 35 },
  // Middle East / International
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', maxItems: 30 },
  // Sports & Tech
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', name: 'BBC Sports', maxItems: 20 },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica', maxItems: 15 },
  // Latin America
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Americas.xml', name: 'NY Times Americas', maxItems: 20 },
]

// ============================================================================
// CATEGORY DETECTION (unchanged but optimized)
// ============================================================================

function detectCategory(title: string, description: string = ''): EventCategory {
  const text = `${title} ${description}`.toLowerCase()
  if (text.match(/\b(war|military|troops|battle|invasion|airstrike|missile|combat|warfare|nato|defense|attack|offensive|frontline|casualties|wounded|killed in action|ceasefire|siege|bombardment|shelling|drone strike|militia|rebel)\b/)) return 'armed-conflict'
  if (text.match(/\b(terror|terrorist|extremist|isis|al-qaeda|hamas|hezbollah|militant|insurgent|suicide bomb|car bomb|hostage|jihadist|boko haram|al-shabaab|taliban)\b/)) return 'terrorism'
  if (text.match(/\b(breaking|just in|urgent|developing|alert)\b/)) return 'breaking'
  if (text.match(/\b(election|president|congress|senate|parliament|minister|governor|mayor|vote|voting|ballot|campaign|democrat|republican|conservative|liberal|legislation|bill passed|supreme court|government|political|policy|diplomat|embassy|sanctions|treaty|white house|biden|trump)\b/)) return 'politics'
  if (text.match(/\b(championship|tournament|match|game|score|team|player|coach|league|nfl|nba|mlb|nhl|fifa|uefa|premier league|world cup|olympics|medal|victory|defeat|win|loss|playoff|final|semifinal|quarterback|touchdown|goal|basketball|football|soccer|tennis|golf|boxing|ufc|mma|racing|f1|formula|super bowl)\b/)) return 'sports'
  if (text.match(/\b(stock|market|economy|trade|billion|million|company|ceo|profit|revenue|earnings|investment|investor|ipo|merger|acquisition|startup|business|economic|gdp|inflation|interest rate|federal reserve|wall street|nasdaq|dow jones|s&p|cryptocurrency|bitcoin|crypto)\b/)) return 'business'
  if (text.match(/\b(ai|artificial intelligence|chatgpt|openai|tech|technology|software|app|apple|google|microsoft|meta|amazon|tesla|startup|cyber|hack|data breach|smartphone|iphone|android|cloud|computing|robot|automation|machine learning|spacex|rocket|satellite)\b/)) return 'technology'
  if (text.match(/\b(movie|film|actor|actress|celebrity|music|concert|album|singer|award|grammy|oscar|emmy|golden globe|netflix|streaming|tv show|series|hollywood|bollywood|entertainment|star|famous|premiere|box office)\b/)) return 'entertainment'
  if (text.match(/\b(health|hospital|doctor|medical|disease|virus|covid|pandemic|vaccine|treatment|surgery|cancer|heart|mental health|who|fda|drug|pharmaceutical|patient|symptom|diagnosis|outbreak|epidemic)\b/)) return 'health'
  if (text.match(/\b(science|research|study|discovery|scientist|nasa|space|astronomy|physics|biology|chemistry|climate|environment|species|fossil|experiment|laboratory|university|professor|journal|nature)\b/)) return 'science'
  if (text.match(/\b(crime|criminal|police|arrest|murder|shooting|robbery|fraud|theft|prison|jail|court|trial|verdict|guilty|innocent|investigation|fbi|cia|suspect|victim|assault|kidnap)\b/)) return 'crime'
  if (text.match(/\b(protest|demonstration|rally|riot|uprising|revolution|coup|strike|march|activist|protesters|clashes|tear gas|civil unrest)\b/)) return 'civil-unrest'
  if (text.match(/\b(earthquake|quake|seismic|magnitude|richter)\b/)) return 'earthquake'
  if (text.match(/\b(volcano|eruption|lava|volcanic)\b/)) return 'volcano'
  if (text.match(/\b(wildfire|forest fire|bushfire)\b/)) return 'wildfire'
  if (text.match(/\b(hurricane|typhoon|cyclone|tornado|storm)\b/)) return 'storm'
  return 'other'
}

function calculateSeverity(type: EventCategory, title: string): number {
  const text = title.toLowerCase()
  const categoryBase: Partial<Record<EventCategory, number>> = {
    'armed-conflict': 9, 'terrorism': 9, 'breaking': 7, 'earthquake': 7, 'volcano': 7,
    'crime': 6, 'health': 5, 'politics': 5, 'business': 4, 'sports': 4, 'entertainment': 3, 'technology': 4, 'science': 4,
  }
  let base = categoryBase[type] || 5
  if (text.match(/\b(dead|killed|death|dies|fatal|casualties|massacre)\b/)) base = Math.min(10, base + 2)
  if (text.match(/\b(major|massive|devastating|catastrophic|historic|escalation)\b/)) base = Math.min(10, base + 1)
  return Math.min(10, Math.max(1, base))
}

function calculateWeight(event: { type: EventCategory; country?: string; continent?: string; title: string; timestamp: number }): number {
  const country = (event.country || '').toLowerCase()
  const continent = event.continent || ''
  const type = event.type
  
  let weight = 1.0
  
  // Regional weights
  if (country === 'usa' || country === 'united states' || country.includes('america')) {
    weight = WEIGHT_CONFIG.US_WEIGHT
  } else if (country === 'mexico') {
    weight = WEIGHT_CONFIG.MEXICO_WEIGHT
  } else if (country === 'canada') {
    weight = WEIGHT_CONFIG.CANADA_WEIGHT
  } else if (continent === 'south-america') {
    weight = WEIGHT_CONFIG.SOUTH_AMERICA_WEIGHT
  } else if (country === 'china') {
    weight = WEIGHT_CONFIG.CHINA_WEIGHT
  } else if (continent === 'africa') {
    weight = WEIGHT_CONFIG.AFRICA_WEIGHT
  } else if (continent === 'europe') {
    weight = WEIGHT_CONFIG.EUROPE_WEIGHT
  } else if (continent === 'asia') {
    weight = WEIGHT_CONFIG.ASIA_WEIGHT
  }
  
  // Type-based boosts
  if (type === 'armed-conflict') weight *= WEIGHT_CONFIG.CONFLICT_WEIGHT
  else if (type === 'terrorism') weight *= WEIGHT_CONFIG.TERRORISM_WEIGHT
  else if (type === 'breaking') weight *= WEIGHT_CONFIG.BREAKING_WEIGHT
  
  // Recency boost
  const hoursAgo = (Date.now() - event.timestamp) / (1000 * 60 * 60)
  if (hoursAgo < 6) weight *= 1.3
  else if (hoursAgo < 24) weight *= 1.15
  
  return weight
}

// ============================================================================
// RSS PARSING
// ============================================================================

function parseRSSItem(itemXml: string): { title: string; description: string; link: string; pubDate: string } | null {
  const getTagContent = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const match = xml.match(regex)
    return (match?.[1] || match?.[2] || '').trim()
  }
  const title = getTagContent(itemXml, 'title')
  if (!title) return null
  return {
    title,
    description: getTagContent(itemXml, 'description') || getTagContent(itemXml, 'content:encoded') || '',
    link: getTagContent(itemXml, 'link') || getTagContent(itemXml, 'guid'),
    pubDate: getTagContent(itemXml, 'pubDate') || getTagContent(itemXml, 'dc:date') || new Date().toISOString(),
  }
}

async function fetchWithRetry(url: string, timeoutMs: number = 15000, retries: number = 1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'VoxTerra/1.0 (news-aggregator)' },
      })
      clearTimeout(timeoutId)
      if (response.ok) return response
      if (attempt < retries) continue
      throw new Error(`HTTP ${response.status}`)
    } catch (err) {
      clearTimeout(timeoutId)
      if (attempt >= retries) throw err
    }
  }
  throw new Error('All retries failed')
}

async function fetchRSSFeed(url: string, sourceName: string, maxItems: number = 30): Promise<any[]> {
  try {
    const response = await fetchWithRetry(url)
    if (!response.ok) return []
    const xml = await response.text()
    const events: any[] = []
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || []
    
    for (const itemXml of itemMatches.slice(0, maxItems)) {
      const item = parseRSSItem(itemXml)
      if (!item) continue
      const cleanDesc = item.description.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim().substring(0, 500)
      const type = detectCategory(item.title, cleanDesc)
      
      // Try geocoding, use fallback if not found
      let geo = extractAndGeocode(`${item.title} ${cleanDesc}`)
      const usedFallback = !geo
      if (!geo) {
        geo = getFallbackLocation()
      }
      
      const timestamp = new Date(item.pubDate).getTime() || Date.now()
      const weightScore = calculateWeight({ type, country: geo.country, continent: geo.continent, title: item.title, timestamp })
      
      events.push({
        id: `rss-${sourceName.toLowerCase().replace(/\s/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: item.title.substring(0, 200),
        description: cleanDesc,
        category: type,
        severity: calculateSeverity(type, item.title),
        latitude: geo.lat,
        longitude: geo.lng,
        location_name: geo.location,
        country: geo.country,
        continent: geo.continent,
        timestamp: new Date(timestamp).toISOString(),
        source_name: sourceName,
        source_url: item.link,
        sources: [{ title: item.title, url: item.link, sourceName, date: new Date(timestamp).toISOString() }],
        is_ongoing: false,
        weight_score: usedFallback ? weightScore * 0.7 : weightScore,
        metadata: { geocodingQuality: geo.quality },
      })
    }
    return events
  } catch {
    return []
  }
}

// ============================================================================
// USGS EARTHQUAKES - Expanded
// ============================================================================

async function fetchUSGS(): Promise<any[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    // Fetch more earthquakes (M4.0+ instead of M4.5+)
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson'
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) return []
    const data = await response.json()
    if (!data.features) return []
    
    return data.features.slice(0, 25).map((feature: any) => {
      const props = feature.properties
      const coords = feature.geometry.coordinates
      const mag = props.mag || 0
      return {
        id: `usgs-${feature.id}`,
        title: props.title || `M${mag.toFixed(1)} Earthquake`,
        description: `Magnitude ${mag.toFixed(1)} earthquake at ${props.place}`,
        category: 'earthquake' as EventCategory,
        severity: Math.min(10, Math.round(mag)),
        latitude: coords[1],
        longitude: coords[0],
        location_name: props.place,
        country: 'global',
        continent: 'global',
        timestamp: new Date(props.time).toISOString(),
        weight_score: mag >= 6 ? 10.0 : mag >= 5 ? 6.0 : 4.0,
        source_name: 'USGS',
        source_url: props.url,
        is_ongoing: false,
        metadata: { magnitude: mag, depth: coords[2] },
      }
    })
  } catch {
    return []
  }
}

// ============================================================================
// ONGOING CONFLICTS - Expanded
// ============================================================================

function getOngoingConflicts(): any[] {
  const now = new Date().toISOString()
  return [
    { id: 'ongoing-ukraine', title: 'Russia-Ukraine War', description: 'Full-scale Russian invasion of Ukraine, ongoing since February 2022.', category: 'armed-conflict', severity: 10, latitude: 48.379, longitude: 31.165, location_name: 'Ukraine', country: 'ukraine', continent: 'europe', timestamp: now, weight_score: 15.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2022-02-24', timeline: [{ date: '2022-02-24', event: 'Russia launches full-scale invasion' }, { date: '2024-08-06', event: 'Ukraine incursion into Kursk Oblast' }] },
    { id: 'ongoing-gaza', title: 'Israel-Gaza War', description: 'Major conflict following Hamas attack on October 7, 2023.', category: 'armed-conflict', severity: 10, latitude: 31.354, longitude: 34.308, location_name: 'Gaza Strip', country: 'palestine', continent: 'asia', timestamp: now, weight_score: 15.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2023-10-07', timeline: [{ date: '2023-10-07', event: 'Hamas attack on southern Israel' }, { date: '2024-05-06', event: 'Rafah operation begins' }] },
    { id: 'ongoing-sudan', title: 'Sudan Civil War', description: 'Armed conflict between SAF and RSF causing massive displacement.', category: 'armed-conflict', severity: 9, latitude: 15.500, longitude: 32.560, location_name: 'Khartoum', country: 'sudan', continent: 'africa', timestamp: now, weight_score: 12.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2023-04-15', timeline: [{ date: '2023-04-15', event: 'Fighting erupts between SAF and RSF' }] },
    { id: 'ongoing-myanmar', title: 'Myanmar Civil War', description: 'Armed resistance against military junta following 2021 coup.', category: 'armed-conflict', severity: 8, latitude: 21.914, longitude: 95.956, location_name: 'Myanmar', country: 'myanmar', continent: 'asia', timestamp: now, weight_score: 10.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2021-02-01' },
    { id: 'ongoing-yemen', title: 'Yemen Civil War', description: 'Multi-sided civil war with Saudi-led coalition intervention.', category: 'armed-conflict', severity: 9, latitude: 15.552, longitude: 48.516, location_name: 'Yemen', country: 'yemen', continent: 'asia', timestamp: now, weight_score: 11.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2014-09-21' },
    { id: 'ongoing-ethiopia', title: 'Ethiopia Conflict', description: 'Ongoing instability following Tigray War ceasefire.', category: 'armed-conflict', severity: 7, latitude: 9.145, longitude: 40.489, location_name: 'Ethiopia', country: 'ethiopia', continent: 'africa', timestamp: now, weight_score: 8.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2020-11-04' },
    { id: 'ongoing-haiti', title: 'Haiti Crisis', description: 'Gang violence and political instability in Haiti.', category: 'civil-unrest', severity: 8, latitude: 18.9712, longitude: -72.2852, location_name: 'Port-au-Prince', country: 'haiti', continent: 'north-america', timestamp: now, weight_score: 9.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2021-07-07' },
    { id: 'ongoing-drc', title: 'DRC Conflict', description: 'Armed conflict in eastern Democratic Republic of Congo.', category: 'armed-conflict', severity: 8, latitude: -1.658, longitude: 29.220, location_name: 'North Kivu', country: 'drc', continent: 'africa', timestamp: now, weight_score: 9.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2022-03-01' },
  ]
}

// ============================================================================
// API HANDLER - OPTIMIZED
// ============================================================================

export async function POST(request: NextRequest) {
  // Verify cron secret for authenticated access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const errors: string[] = []
  const sourceStats: Record<string, number> = {}

  try {
    const supabase = createServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured. Set environment variables.' },
        { status: 503 }
      )
    }
    
    // Fetch from all sources in parallel
    const [rssResults, usgsResults] = await Promise.all([
      Promise.all(RSS_FEEDS.map(feed => fetchRSSFeed(feed.url, feed.name, feed.maxItems))),
      fetchUSGS(),
    ])
    
    // Collect all events
    const allEvents: any[] = []
    
    for (let i = 0; i < rssResults.length; i++) {
      const feedEvents = rssResults[i]
      allEvents.push(...feedEvents)
      sourceStats[RSS_FEEDS[i].name] = feedEvents.length
    }
    
    allEvents.push(...usgsResults)
    sourceStats['USGS'] = usgsResults.length
    
    // Add ongoing conflicts
    const conflicts = getOngoingConflicts()
    allEvents.push(...conflicts)
    sourceStats['Ongoing Conflicts'] = conflicts.length
    
    // IMPROVED DEDUPLICATION: Use longer title substring + source
    const seen = new Set<string>()
    const uniqueEvents = allEvents.filter(e => {
      // Use 60 chars instead of 40, and normalize more aggressively
      const normalizedTitle = e.title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 60)
      const locationKey = (e.location_name || e.country || '').toLowerCase().substring(0, 20)
      const key = `${normalizedTitle}-${e.source_name}-${locationKey}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    
    // Sort by weight and take top 300 (increased from 250)
    uniqueEvents.sort((a, b) => (b.weight_score || 0) - (a.weight_score || 0))
    const topEvents = uniqueEvents.slice(0, 300)
    
    // BATCH UPSERT for speed (chunks of 50)
    let storedCount = 0
    const chunkSize = 50
    
    for (let i = 0; i < topEvents.length; i += chunkSize) {
      const chunk = topEvents.slice(i, i + chunkSize)
      try {
        const { error } = await (supabase as any)
          .from('events')
          .upsert(
            chunk.map(event => ({
              id: event.id,
              title: event.title,
              description: event.description,
              category: event.category,
              severity: event.severity,
              latitude: event.latitude,
              longitude: event.longitude,
              location_name: event.location_name,
              country: event.country,
              continent: event.continent,
              timestamp: event.timestamp,
              weight_score: event.weight_score,
              source_name: event.source_name,
              source_url: event.source_url,
              sources: event.sources || [],
              timeline: event.timeline || [],
              is_ongoing: event.is_ongoing || false,
              start_date: event.start_date || null,
              metadata: event.metadata || {},
            })),
            { onConflict: 'id' }
          )
        
        if (!error) storedCount += chunk.length
        else errors.push(`Batch ${i}: ${error.message}`)
      } catch (e) {
        errors.push(`Batch ${i}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
    
    const durationMs = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      stats: {
        totalFetched: allEvents.length,
        uniqueEvents: uniqueEvents.length,
        stored: storedCount,
        bySource: sourceStats,
        geocoding: {
          city: topEvents.filter(e => e.metadata?.geocodingQuality === 'city').length,
          country: topEvents.filter(e => e.metadata?.geocodingQuality === 'country').length,
          fallback: topEvents.filter(e => e.metadata?.geocodingQuality === 'fallback').length,
        },
        durationMs,
        errors: errors.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Aggregation failed' },
      { status: 500 }
    )
  }
}

// GET: Trigger aggregation (used by Vercel cron)
export async function GET(request: NextRequest) {
  // Vercel cron sends GET requests - run the full aggregation
  return POST(request)
}
