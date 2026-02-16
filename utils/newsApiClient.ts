/**
 * News API Client
 * 
 * Integrates with NewsAPI.org and similar services
 * for authoritative source identification
 */

import { ArticleSummary } from './topicAggregator'

// NewsAPI.org endpoint (free tier: 100 requests/day)
const NEWS_API_KEY = process.env.NEWS_API_KEY || ''
const NEWS_API_BASE = 'https://newsapi.org/v2'

/**
 * Search NewsAPI for articles matching keywords
 */
export async function searchNewsAPI(
  keywords: string[],
  limit: number = 10
): Promise<ArticleSummary[]> {
  if (!NEWS_API_KEY) {
    console.warn('[NewsAPIClient] No API key configured')
    return []
  }
  
  try {
    const query = keywords.slice(0, 3).join(' OR ') // Use top 3 keywords
    const url = `${NEWS_API_BASE}/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=${limit}&apiKey=${NEWS_API_KEY}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.articles || !Array.isArray(data.articles)) {
      return []
    }
    
    return data.articles.slice(0, limit).map((article: any, index: number) => ({
      id: `newsapi-${Date.now()}-${index}`,
      title: article.title || '',
      source: article.source?.name || 'NewsAPI',
      timestamp: new Date(article.publishedAt || Date.now()).getTime(),
      url: article.url,
      excerpt: article.description?.slice(0, 200),
      severity: 5, // Default moderate severity
    }))
  } catch (error) {
    console.warn('[NewsAPIClient] Failed to fetch from NewsAPI:', error)
    return []
  }
}

/**
 * Get top headlines for a category
 */
export async function getTopHeadlines(
  category: string,
  country: string = 'us',
  limit: number = 10
): Promise<ArticleSummary[]> {
  if (!NEWS_API_KEY) {
    return []
  }
  
  try {
    const url = `${NEWS_API_BASE}/top-headlines?category=${category}&country=${country}&pageSize=${limit}&apiKey=${NEWS_API_KEY}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.articles || !Array.isArray(data.articles)) {
      return []
    }
    
    return data.articles.slice(0, limit).map((article: any, index: number) => ({
      id: `newsapi-headlines-${Date.now()}-${index}`,
      title: article.title || '',
      source: article.source?.name || 'NewsAPI',
      timestamp: new Date(article.publishedAt || Date.now()).getTime(),
      url: article.url,
      excerpt: article.description?.slice(0, 200),
      severity: 6, // Headlines are typically higher severity
    }))
  } catch (error) {
    console.warn('[NewsAPIClient] Failed to fetch headlines:', error)
    return []
  }
}
