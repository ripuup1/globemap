/**
 * Google Trends Detector
 * 
 * Detects trending topics SOLELY from Google search data
 * NO article keyword detection - only real Google search trends
 */

import { Event } from '@/types/event'
import { fetchGoogleSearchTrends, getTrendingKeywordsForTopics } from './googleSearchTrends'
import { GoogleTrendData, fetchRealGoogleTrends } from './googleTrendsReal'

export interface TrendingTopic {
  id: string
  name: string
  keywords: string[]
  searchVolume: number // Relative search volume (0-100)
  eventCount: number
  category: 'geopolitical' | 'crisis' | 'trending' | 'markets'
  priority: number
}

/**
 * Fetch Google search trending topics (SEARCH-ONLY, no article keywords)
 */
export async function fetchGoogleSearchTrendingTopics(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = []
  
  try {
    // Fetch real Google search trends (not article keywords)
    const searchTrends = await fetchGoogleSearchTrends()
    
    // Convert search trends to trending topics
    for (const trend of searchTrends.slice(0, 20)) {
      // Only include high-volume, trending-up searches
      if (trend.trendDirection === 'up' && trend.searchVolume24h > 50000) {
        topics.push({
          id: `trending-${trend.keyword.toLowerCase().replace(/\s+/g, '-')}`,
          name: trend.keyword.charAt(0).toUpperCase() + trend.keyword.slice(1),
          keywords: [trend.keyword.toLowerCase()],
          searchVolume: trend.relativeVolume,
          eventCount: 0, // Not based on events, based on searches
          category: 'trending',
          priority: 60 + Math.min(trend.relativeVolume, 40),
        })
      }
    }
  } catch (error) {
    console.error('[GoogleTrendsDetector] Failed to fetch search trends:', error)
  }
  
  return topics
}

/**
 * REMOVED: detectNewsAggregationTrends
 * 
 * This function used article keywords to detect trends.
 * We now use ONLY Google search data, not article keywords.
 */

/**
 * REMOVED: extractKeywords
 * 
 * We no longer extract keywords from articles.
 * All trending detection is based on Google search data only.
 */

/**
 * Combine all trending sources (SEARCH-ONLY)
 * 
 * Uses ONLY Google search data - no article keyword detection
 */
export async function detectAllTrendingTopics(events: Event[]): Promise<TrendingTopic[]> {
  // Fetch Google search trends (not article keywords)
  const googleTrends = await fetchGoogleSearchTrendingTopics()
  
  // Return sorted by priority (search volume)
  return googleTrends
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 15) // Top 15 trending from search data
}
