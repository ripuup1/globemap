/**
 * Google Source Parser
 * 
 * Uses Google Custom Search API or Google News RSS
 * to find relevant articles by topic
 */

import { ArticleSummary } from './topicAggregator'
import { fetchGoogleNewsRSS, parseGoogleNewsRSS } from './googleNewsParser'

// Google Custom Search API (if available)
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY || ''
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || ''

/**
 * Search Google Custom Search for articles
 */
export async function searchGoogleCustomSearch(
  query: string,
  limit: number = 10
): Promise<ArticleSummary[]> {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) {
    // Fallback to Google News RSS
    return searchGoogleNewsRSS(query, limit)
  }
  
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=${limit}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Google CSE error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.items || !Array.isArray(data.items)) {
      return []
    }
    
    return data.items.slice(0, limit).map((item: any, index: number) => ({
      id: `google-cse-${Date.now()}-${index}`,
      title: item.title || '',
      source: item.displayLink || 'Google',
      timestamp: new Date().getTime(), // Google CSE doesn't provide dates
      url: item.link,
      excerpt: item.snippet?.slice(0, 200),
      severity: 5,
    }))
  } catch (error) {
    console.warn('[GoogleSourceParser] Google CSE failed, using RSS fallback:', error)
    return searchGoogleNewsRSS(query, limit)
  }
}

/**
 * Search Google News RSS for articles
 */
export async function searchGoogleNewsRSS(
  query: string,
  limit: number = 10
): Promise<ArticleSummary[]> {
  try {
    // Google News RSS search URL
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=us&ceid=us:en`
    
    const xml = await fetchGoogleNewsRSS(rssUrl)
    const articles = parseGoogleNewsRSS(xml, 'global')
    
    return articles.slice(0, limit).map((article, index) => ({
      id: `google-news-${Date.now()}-${index}`,
      title: article.title,
      source: article.source || 'Google News',
      timestamp: new Date(article.pubDate || Date.now()).getTime(),
      url: article.link,
      excerpt: article.description?.slice(0, 200),
      severity: 5,
    }))
  } catch (error) {
    console.warn('[GoogleSourceParser] Google News RSS failed:', error)
    return []
  }
}
