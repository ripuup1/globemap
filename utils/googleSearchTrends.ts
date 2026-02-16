/**
 * Google Search Trending Topics
 * 
 * Fetches trending searches from Google (not article keywords)
 * This is the primary source for trending topic detection
 */

import { GoogleTrendData, fetchRealGoogleTrends } from './googleTrendsReal'

export interface TrendingSearch {
  keyword: string
  searchVolume24h: number
  searchVolume7d: number
  trendDirection: 'up' | 'down' | 'stable'
  relativeVolume: number
  region: string
}

/**
 * Fetch trending searches from Google (search-only, no article keywords)
 */
export async function fetchGoogleSearchTrends(
  regions: string[] = ['US', 'GB', 'AU', 'CA', 'DE', 'FR', 'JP', 'CN', 'IN']
): Promise<TrendingSearch[]> {
  const allTrends: TrendingSearch[] = []
  
  // Fetch trends for each region in parallel (limit to 5 at a time)
  const batchSize = 5
  for (let i = 0; i < regions.length; i += batchSize) {
    const batch = regions.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(async (region) => {
        try {
          const trends = await fetchRealGoogleTrends(region)
          return trends.map(trend => ({
            keyword: trend.keyword,
            searchVolume24h: trend.searchVolume24h,
            searchVolume7d: trend.searchVolume7d,
            trendDirection: trend.trendDirection,
            relativeVolume: trend.relativeVolume,
            region,
          }))
        } catch (error) {
          console.warn(`[GoogleSearchTrends] Failed for region ${region}:`, error)
          return []
        }
      })
    )
    
    allTrends.push(...batchResults.flat())
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < regions.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // Deduplicate by keyword (keep highest volume)
  const keywordMap = new Map<string, TrendingSearch>()
  
  for (const trend of allTrends) {
    const existing = keywordMap.get(trend.keyword.toLowerCase())
    if (!existing || trend.searchVolume24h > existing.searchVolume24h) {
      keywordMap.set(trend.keyword.toLowerCase(), trend)
    }
  }
  
  // Sort by search volume (descending)
  return Array.from(keywordMap.values())
    .sort((a, b) => b.searchVolume24h - a.searchVolume24h)
    .slice(0, 50) // Top 50 trending searches
}

/**
 * Get trending keywords for topic detection (search-only)
 */
export async function getTrendingKeywordsForTopics(): Promise<string[]> {
  const trends = await fetchGoogleSearchTrends()
  
  // Filter for high-volume, trending-up keywords
  const relevantKeywords = trends
    .filter(t => 
      t.trendDirection === 'up' && 
      t.searchVolume24h > 50000 &&
      t.relativeVolume > 5
    )
    .map(t => t.keyword.toLowerCase())
  
  return relevantKeywords.slice(0, 20) // Top 20 trending keywords
}
