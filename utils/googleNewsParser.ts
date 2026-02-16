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

  if (text.match(/\b(breaking|urgent|alert)\b/)) eventType = 'breaking'
  else if (text.match(/\b(politics|election|government|president|prime minister)\b/)) eventType = 'politics'
  else if (text.match(/\b(economy|finance|market|gdp|inflation|trade)\b/)) eventType = 'business'
  else if (text.match(/\b(technology|tech|ai|software|digital)\b/)) eventType = 'technology'
  else if (text.match(/\b(science|research|discovery|breakthrough)\b/)) eventType = 'science'
  else if (text.match(/\b(sports|sport|football|soccer|basketball)\b/)) eventType = 'sports'
  else if (text.match(/\b(health|medical|hospital|disease|virus)\b/)) eventType = 'health'
  else if (text.match(/\b(climate|weather|flood|drought|wildfire)\b/)) eventType = 'climate'
  else if (text.match(/\b(earthquake|quake|seismic)\b/)) eventType = 'earthquake'
  else if (text.match(/\b(conflict|war|military|attack)\b/)) eventType = 'armed-conflict'

  // Override with provided category if available
  if (category && category !== 'breaking') {
    eventType = category
  }

  // Calculate severity
  let severity = 5
  if (text.match(/\b(critical|urgent|breaking|alert|emergency)\b/)) severity = 8
  else if (text.match(/\b(important|major|significant)\b/)) severity = 6
  else if (text.match(/\b(minor|small|local)\b/)) severity = 3

  return {
    id: `google-news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: article.title,
    description: article.description,
    type: eventType as any,
    severity: severity as any,
    latitude: lat,
    longitude: lng,
    timestamp,
    source: article.source || 'Google News',
    metadata: {
      url: article.link,
      locationName,
      country,
      continent,
      region,
      sourceName: article.source || 'Google News',
      sourceTier: 1,
      sourceTrustWeight: 1.0,
    },
    articles: [],
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
