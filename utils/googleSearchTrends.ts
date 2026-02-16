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
 * Fetch trending searches from Google (search-only, no article keywords).
 * Wrapped in a global 10s timeout to prevent blocking the entire data pipeline.
 */
export async function fetchGoogleSearchTrends(
  regions: string[] = ['US', 'GB', 'AU'],
): Promise<TrendingSearch[]> {
  // Global timeout: if the whole chain takes > 10s, return whatever we have
  return Promise.race([
    fetchGoogleSearchTrendsInternal(regions),
    new Promise<TrendingSearch[]>(resolve =>
      setTimeout(() => {
        console.warn('[GoogleSearchTrends] Global timeout reached (10s), returning empty')
        resolve([])
      }, 10000)
    ),
  ])
}

async function fetchGoogleSearchTrendsInternal(regions: string[]): Promise<TrendingSearch[]> {
  const allTrends: TrendingSearch[] = []

  // Fetch all regions in parallel (each has its own 5s timeout)
  const batchResults = await Promise.all(
    regions.map(async (region) => {
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
    .slice(0, 50)
}

