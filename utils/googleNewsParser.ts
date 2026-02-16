/**
 * Google News Parser
 * 
 * Parses Google News RSS feeds and normalizes to Event format
 */

import { Event } from '@/types/event'

export interface GoogleNewsArticle {
  title: string
  link: string
  description?: string
  pubDate: string
  source?: string
}

/**
 * Parse Google News RSS XML
 */
export function parseGoogleNewsRSS(xml: string, region: string): GoogleNewsArticle[] {
  const articles: GoogleNewsArticle[] = []
  
  try {
    // Extract items from RSS
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
        
        articles.push({
          title,
          link,
          description,
          pubDate,
          source,
        })
      }
    }
  } catch (error) {
    console.error('[GoogleNewsParser] Failed to parse RSS:', error)
  }
  
  return articles
}

/**
 * Geocode article location from title/description
 * Uses simple keyword matching for now (can be enhanced with geocoding API)
 */
export async function geocodeGoogleNewsArticle(
  article: GoogleNewsArticle
): Promise<{ lat: number; lng: number; locationName?: string } | null> {
  // Simple country/city keyword matching
  const locationKeywords: Record<string, { lat: number; lng: number; name: string }> = {
    'africa': { lat: 0, lng: 20, name: 'Africa' },
    'south africa': { lat: -30, lng: 25, name: 'South Africa' },
    'nigeria': { lat: 9, lng: 8, name: 'Nigeria' },
    'kenya': { lat: 1, lng: 38, name: 'Kenya' },
    'egypt': { lat: 27, lng: 30, name: 'Egypt' },
    'australia': { lat: -25, lng: 133, name: 'Australia' },
    'sydney': { lat: -33.87, lng: 151.21, name: 'Sydney' },
    'melbourne': { lat: -37.81, lng: 144.96, name: 'Melbourne' },
    'canberra': { lat: -35.28, lng: 149.13, name: 'Canberra' },
    'brisbane': { lat: -27.47, lng: 153.03, name: 'Brisbane' },
    'perth': { lat: -31.95, lng: 115.86, name: 'Perth' },
  }
  
  const searchText = `${article.title} ${article.description || ''}`.toLowerCase()
  
  // Try exact matches first
  for (const [keyword, location] of Object.entries(locationKeywords)) {
    if (searchText.includes(keyword)) {
      return { ...location }
    }
  }
  
  // Fallback: return null (will need geocoding API for better accuracy)
  return null
}

/**
 * Normalize Google News article to Event format
 */
export async function normalizeGoogleNewsArticle(
  article: GoogleNewsArticle,
  region: string,
  category?: string
): Promise<Event | null> {
  const geocode = await geocodeGoogleNewsArticle(article)
  
  if (!geocode) {
    // Skip articles without location
    return null
  }
  
  // Parse publication date
  const timestamp = new Date(article.pubDate).getTime() || Date.now()
  
  // Determine category from title/description
  const text = `${article.title} ${article.description || ''}`.toLowerCase()
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
  if (category) {
    eventType = category
  }
  
  // Calculate severity (simple heuristic)
  let severity = 5 // Default
  if (text.match(/\b(critical|urgent|breaking|alert|emergency)\b/)) severity = 8
  else if (text.match(/\b(important|major|significant)\b/)) severity = 6
  else if (text.match(/\b(minor|small|local)\b/)) severity = 3
  
  return {
    id: `google-news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: article.title,
    description: article.description,
    type: eventType as any,
    severity: severity as any,
    latitude: geocode.lat,
    longitude: geocode.lng,
    timestamp,
    source: article.source || 'Google News',
    metadata: {
      url: article.link,
      locationName: geocode.locationName,
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
 * Fetch Google News RSS feed
 */
export async function fetchGoogleNewsRSS(url: string): Promise<string> {
  try {
    // Use CORS proxy if needed
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'application/xml',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Google News RSS fetch failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.contents || data
  } catch (error) {
    console.error('[GoogleNewsParser] Fetch failed:', error)
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
  
  // Build Google News RSS URL
  let query = region
  if (category) {
    query = `${region}+${category}`
  }
  
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`
  
  try {
    const xml = await fetchGoogleNewsRSS(rssUrl)
    const articles = parseGoogleNewsRSS(xml, region)
    
    // Normalize articles to events
    for (const article of articles.slice(0, 20)) { // Limit to 20 per region/category
      const event = await normalizeGoogleNewsArticle(article, region, category)
      if (event) {
        events.push(event)
      }
    }
  } catch (error) {
    console.error(`[GoogleNewsParser] Failed to fetch ${region}/${category}:`, error)
  }
  
  return events
}
