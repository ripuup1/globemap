/**
 * Google News Parser
 *
 * Parses Google News RSS feeds and normalizes to Event format.
 * Uses shared geocoding module for comprehensive location matching.
 */

import { Event } from '@/types/event'
import { extractAndGeocode, getFallbackLocation } from './geocoding'

export interface GoogleNewsArticle {
  title: string
  link: string
  description?: string
  pubDate: string
  source?: string
}

// Region-based fallback coordinates when geocoding can't find a specific location
const REGION_COORDS: Record<string, { lat: number; lng: number; country: string; continent: string }> = {
  'africa': { lat: 0, lng: 20, country: 'africa', continent: 'africa' },
  'asia': { lat: 34, lng: 100, country: 'china', continent: 'asia' },
  'europe': { lat: 48, lng: 10, country: 'germany', continent: 'europe' },
  'americas': { lat: 39, lng: -98, country: 'usa', continent: 'north-america' },
  'australia': { lat: -25, lng: 133, country: 'australia', continent: 'oceania' },
  'oceania': { lat: -25, lng: 133, country: 'australia', continent: 'oceania' },
  'middle east': { lat: 29, lng: 47, country: 'iraq', continent: 'asia' },
  'us': { lat: 39, lng: -98, country: 'usa', continent: 'north-america' },
  'gb': { lat: 51.5, lng: -0.13, country: 'uk', continent: 'europe' },
  'au': { lat: -25, lng: 133, country: 'australia', continent: 'oceania' },
  'ca': { lat: 56, lng: -106, country: 'canada', continent: 'north-america' },
  'de': { lat: 51, lng: 10, country: 'germany', continent: 'europe' },
  'fr': { lat: 46, lng: 2, country: 'france', continent: 'europe' },
  'jp': { lat: 36, lng: 138, country: 'japan', continent: 'asia' },
  'cn': { lat: 35, lng: 104, country: 'china', continent: 'asia' },
  'in': { lat: 20, lng: 78, country: 'india', continent: 'asia' },
  'br': { lat: -14, lng: -51, country: 'brazil', continent: 'south-america' },
  'mx': { lat: 23, lng: -102, country: 'mexico', continent: 'north-america' },
  'za': { lat: -30, lng: 22, country: 'south africa', continent: 'africa' },
  'ng': { lat: 9, lng: 8, country: 'nigeria', continent: 'africa' },
  'ke': { lat: 0, lng: 37, country: 'kenya', continent: 'africa' },
  'eg': { lat: 26, lng: 30, country: 'egypt', continent: 'africa' },
}

/**
 * Parse Google News RSS XML
 */
export function parseGoogleNewsRSS(xml: string, region: string): GoogleNewsArticle[] {
  const articles: GoogleNewsArticle[] = []

  try {
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)

    for (const match of itemMatches) {
      const itemXml = match[1]

      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i)
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i)
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i)
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i)
      const sourceMatch = itemXml.match(/<source>(.*?)<\/source>/i)

      if (titleMatch && linkMatch) {
        const title = (titleMatch[1] || titleMatch[2] || '').trim()
        const link = linkMatch[1].trim()
        const description = (descMatch?.[1] || descMatch?.[2] || '').trim()
        const pubDate = pubDateMatch?.[1]?.trim() || new Date().toISOString()
        const source = sourceMatch?.[1]?.trim() || 'Google News'

        articles.push({ title, link, description, pubDate, source })
      }
    }
  } catch (error) {
    console.error('[GoogleNewsParser] Failed to parse RSS:', error)
  }

  return articles
}

/**
 * Normalize Google News article to Event format.
 * Uses shared geocoding module (150+ cities, 80+ countries).
 * Falls back to region-based coordinates if no specific location found.
 */
export function normalizeGoogleNewsArticle(
  article: GoogleNewsArticle,
  region: string,
  category?: string
): Event | null {
  const searchText = `${article.title} ${article.description || ''}`

  // Try shared geocoding (150+ cities, 80+ countries)
  const geo = extractAndGeocode(searchText)

  let lat: number
  let lng: number
  let locationName: string
  let country: string
  let continent: string

  if (geo) {
    lat = geo.lat
    lng = geo.lng
    locationName = geo.location
    country = geo.country
    continent = geo.continent
  } else {
    // Fall back to region-based coordinates with slight randomization
    const regionCoords = REGION_COORDS[region.toLowerCase()]
    if (regionCoords) {
      lat = regionCoords.lat + (Math.random() - 0.5) * 4
      lng = regionCoords.lng + (Math.random() - 0.5) * 4
      locationName = region
      country = regionCoords.country
      continent = regionCoords.continent
    } else {
      // Last resort: use rotating fallback locations
      const fallback = getFallbackLocation()
      lat = fallback.lat
      lng = fallback.lng
      locationName = fallback.location
      country = fallback.country
      continent = fallback.continent
    }
  }

  // Parse publication date
  const timestamp = new Date(article.pubDate).getTime() || Date.now()

  // Determine category from title/description
  const text = searchText.toLowerCase()
  let eventType: string = 'other'

  // Conflict & Security
  if (text.match(/\b(war|military|battle|invasion|airstrike|missile|troops|army|drone strike|artillery|ceasefire|offensive|soldiers|armed forces|bombing raid|shelling)\b/)) eventType = 'armed-conflict'
  else if (text.match(/\b(terror|terrorist|isis|hamas|hezbollah|al.?qaeda|jihadist|extremist|suicide bomb|car bomb|hostage|militant attack)\b/)) eventType = 'terrorism'
  else if (text.match(/\b(protest|riot|uprising|demonstrat|civil unrest|strike action|coup|revolution|clashes|tear gas|crackdown|rally against|march against)\b/)) eventType = 'civil-unrest'

  // Natural Disasters
  else if (text.match(/\b(earthquake|quake|seismic|tremor|aftershock|magnitude \d)\b/)) eventType = 'earthquake'
  else if (text.match(/\b(volcano|eruption|volcanic|lava|ash cloud|pyroclastic)\b/)) eventType = 'volcano'
  else if (text.match(/\b(wildfire|bushfire|forest fire|blaze|acres burned|fire season)\b/)) eventType = 'wildfire'
  else if (text.match(/\b(hurricane|typhoon|cyclone|tropical storm|tornado|blizzard|ice storm|derecho)\b/)) eventType = 'storm'
  else if (text.match(/\b(tsunami|tidal wave)\b/)) eventType = 'tsunami'
  else if (text.match(/\b(flood|flooding|flash flood|inundation|dam burst|mudslide|landslide)\b/)) eventType = 'flood'
  else if (text.match(/\b(natural disaster|disaster relief|emergency response|evacuation order|state of emergency)\b/)) eventType = 'natural-disaster'

  // News Categories
  else if (text.match(/\b(breaking|urgent|alert|just in|developing story)\b/)) eventType = 'breaking'
  else if (text.match(/\b(election|president|congress|parliament|vote|senator|governor|legislation|supreme court|democrat|republican|prime minister|cabinet|diplomatic|treaty|sanctions|foreign policy|ambassador|nato|united nations|politics|government)\b/)) eventType = 'politics'
  else if (text.match(/\b(murder|arrest|suspect|convicted|sentenced|robbery|fraud|theft|shooting|stabbing|homicide|drug bust|cartel|smuggling|trafficking|prison|fbi|interpol|indicted|charged with|manslaughter|assault|gang)\b/)) eventType = 'crime'
  else if (text.match(/\b(championship|tournament|nfl|nba|mlb|nhl|soccer|football match|world cup|olympics|premier league|la liga|serie a|bundesliga|grand prix|formula 1|f1|tennis|golf|cricket|rugby|medal|playoff|mvp|transfer|sports|sport|basketball)\b/)) eventType = 'sports'
  else if (text.match(/\b(stock|market|economy|billion|company|ipo|merger|acquisition|gdp|inflation|recession|earnings|revenue|profit|wall street|nasdaq|dow|fed rate|interest rate|tariff|unemployment|bankruptcy|finance|trade deal|venture capital)\b/)) eventType = 'business'
  else if (text.match(/\b(ai|artificial intelligence|tech|software|apple|google|microsoft|meta|amazon|nvidia|openai|chatgpt|robot|semiconductor|cybersecurity|hack|data breach|5g|quantum|startup|silicon valley|elon musk|spacex|technology|digital)\b/)) eventType = 'technology'
  else if (text.match(/\b(health|medical|hospital|disease|virus|pandemic|vaccine|outbreak|cdc|who|cancer|surgery|clinical trial|drug approval|fda|mental health|infection|epidemic)\b/)) eventType = 'health'
  else if (text.match(/\b(science|research|discovery|breakthrough|nasa|space|mars|moon|asteroid|telescope|genome|dna|fossil|climate study|physics|laboratory|experiment)\b/)) eventType = 'science'
  else if (text.match(/\b(movie|film|actor|actress|celebrity|oscar|grammy|emmy|album|concert|box office|streaming|netflix|disney|tv show|premiere|entertainment|music|singer|band|tour|festival|award show|broadway|viral video)\b/)) eventType = 'entertainment'

  // Override with provided category if available
  if (category && category !== 'breaking') {
    eventType = category
  }

  // Calculate severity
  let severity = 5
  if (text.match(/\b(critical|urgent|breaking|alert|emergency)\b/)) severity = 8
  else if (text.match(/\b(important|major|significant)\b/)) severity = 6
  else if (text.match(/\b(minor|small|local)\b/)) severity = 3

  const eventId = `google-news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const sourceName = article.source || 'Google News'
  const articleUrl = article.link || ''

  return {
    id: eventId,
    title: article.title,
    description: article.description,
    type: eventType as any,
    severity: severity as any,
    latitude: lat,
    longitude: lng,
    timestamp,
    source: sourceName,
    metadata: {
      url: articleUrl,
      locationName,
      country,
      continent,
      region,
      sourceName,
      sourceTier: 1,
      sourceTrustWeight: 1.0,
    },
    articles: articleUrl ? [{
      id: eventId,
      title: article.title,
      description: article.description || '',
      timestamp,
      source: sourceName,
      url: articleUrl,
      sourceName,
      publishedAt: new Date(timestamp).toISOString(),
      type: eventType as any,
      severity: severity as any,
      metadata: {},
    }] : [],
    articleCount: 1,
    isOngoing: false,
  }
}

/**
 * Fetch Google News RSS feed with timeout
 */
export async function fetchGoogleNewsRSS(url: string): Promise<string> {
  // Direct fetch only (no CORS proxy fallback - saves 8s on failure).
  // Server-side Vercel can fetch Google News directly.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      return await response.text()
    }
    throw new Error(`Google News RSS fetch failed: ${response.status}`)
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Fetch Google News by region and category
 */
export async function fetchGoogleNewsByRegion(
  region: string,
  category?: string
): Promise<Event[]> {
  const events: Event[] = []

  let query = region
  if (category) {
    query = `${region}+${category}`
  }

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`

  try {
    const xml = await fetchGoogleNewsRSS(rssUrl)
    const articles = parseGoogleNewsRSS(xml, region)

    // Normalize articles to events (now synchronous, no more dropped articles)
    for (const article of articles.slice(0, 20)) {
      const event = normalizeGoogleNewsArticle(article, region, category)
      if (event) {
        events.push(event)
      }
    }
  } catch (error) {
    console.error(`[GoogleNewsParser] Failed to fetch ${region}/${category}:`, error)
  }

  return events
}
