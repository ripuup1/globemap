/**
 * Google Trends by Country for Marker Quotas
 * 
 * Uses Google Trends filters to identify highest searched/viewed topics per country
 * Ensures markers meet regional quotas based on actual search interest
 */

import { fetchRealGoogleTrends, GoogleTrendData, formatSearchVolume } from './googleTrendsReal'
import { Event, EventType } from '@/types/event'
import { fetchGoogleNewsByRegion } from './googleNewsParser'

export interface CountryTrendQuota {
  country: string
  countryCode: string
  topTrends: GoogleTrendData[]
  requiredMarkers: number
  currentMarkers: number
  missingMarkers: number
}

/**
 * Get top trending topics for a specific country
 */
export async function getTopTrendsForCountry(
  country: string,
  countryCode: string,
  limit: number = 10
): Promise<GoogleTrendData[]> {
  try {
    const trends = await fetchRealGoogleTrends(countryCode)
    
    // Sort by search volume (24h) and return top N
    return trends
      .sort((a, b) => b.searchVolume24h - a.searchVolume24h)
      .slice(0, limit)
  } catch (error) {
    console.error(`[CountryTrendQuota] Failed to get trends for ${country}:`, error)
    return []
  }
}

/**
 * Calculate marker quotas per country based on search trends
 */
export async function calculateCountryQuotas(
  countries: Array<{ name: string; code: string; requiredMarkers: number }>
): Promise<Map<string, CountryTrendQuota>> {
  const quotas = new Map<string, CountryTrendQuota>()
  
  // Fetch trends for all countries in parallel (batched)
  const batchSize = 5
  for (let i = 0; i < countries.length; i += batchSize) {
    const batch = countries.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(async (country) => {
        const topTrends = await getTopTrendsForCountry(
          country.name,
          country.code,
          country.requiredMarkers * 2 // Get 2x trends to have options
        )
        
        return {
          country: country.name,
          countryCode: country.code,
          topTrends,
          requiredMarkers: country.requiredMarkers,
          currentMarkers: 0, // Will be calculated later
          missingMarkers: country.requiredMarkers,
        }
      })
    )
    
    for (const quota of batchResults) {
      quotas.set(quota.country.toLowerCase(), quota)
    }
    
    // Small delay between batches
    if (i + batchSize < countries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return quotas
}

/**
 * Find articles for country based on top Google Trends
 */
export async function findArticlesForCountryTrends(
  country: string,
  countryCode: string,
  topTrends: GoogleTrendData[],
  maxArticles: number = 5
): Promise<Event[]> {
  const events: Event[] = []
  
  // For each top trend, search for articles
  for (const trend of topTrends.slice(0, maxArticles)) {
    try {
      // Fetch Google News for this trend keyword in this country
      const newsEvents = await fetchGoogleNewsByRegion(
        countryCode.toLowerCase(),
        'breaking'
      )
      
      // Filter articles that match the trend keyword
      const matchingEvents = newsEvents
        .filter(event => {
          const titleLower = event.title.toLowerCase()
          const descLower = (event.description || '').toLowerCase()
          const keywordLower = trend.keyword.toLowerCase()
          
          return titleLower.includes(keywordLower) || descLower.includes(keywordLower)
        })
        .slice(0, 1) // Take top match per trend
      
      // Add metadata about search volume
      for (const event of matchingEvents) {
        events.push({
          ...event,
          metadata: {
            ...event.metadata,
            country: country.toLowerCase(),
            searchVolume24h: trend.searchVolume24h,
            searchVolume7d: trend.searchVolume7d,
            trendDirection: trend.trendDirection,
            googleTrendKeyword: trend.keyword,
          },
        })
      }
    } catch (error) {
      console.warn(`[CountryTrendQuota] Failed to find articles for ${trend.keyword} in ${country}:`, error)
    }
  }
  
  return events
}

/**
 * Fill marker quotas for all countries using Google Trends
 */
export async function fillCountryQuotasWithTrends(
  countryQuotas: Map<string, CountryTrendQuota>,
  existingEvents: Event[]
): Promise<Event[]> {
  const newEvents: Event[] = []
  
  // Count current markers per country
  const countryMarkerCounts = new Map<string, number>()
  for (const event of existingEvents) {
    const country = (event.metadata?.country as string)?.toLowerCase()
    if (country) {
      countryMarkerCounts.set(country, (countryMarkerCounts.get(country) || 0) + 1)
    }
  }
  
  // Update quotas with current counts
  for (const [country, quota] of countryQuotas.entries()) {
    quota.currentMarkers = countryMarkerCounts.get(country) || 0
    quota.missingMarkers = Math.max(0, quota.requiredMarkers - quota.currentMarkers)
  }
  
  // Fill missing markers using top trends
  for (const [country, quota] of countryQuotas.entries()) {
    if (quota.missingMarkers <= 0) continue
    
    // Get articles for top trends
    const articles = await findArticlesForCountryTrends(
      quota.country,
      quota.countryCode,
      quota.topTrends,
      quota.missingMarkers
    )
    
    newEvents.push(...articles)
  }
  
  return newEvents
}

/**
 * Get countries with their required marker counts
 */
export function getCountriesWithQuotas(): Array<{ name: string; code: string; requiredMarkers: number }> {
  return [
    // Major countries with higher quotas
    { name: 'United States', code: 'US', requiredMarkers: 15 },
    { name: 'United Kingdom', code: 'GB', requiredMarkers: 8 },
    { name: 'Australia', code: 'AU', requiredMarkers: 6 },
    { name: 'Canada', code: 'CA', requiredMarkers: 6 },
    { name: 'Germany', code: 'DE', requiredMarkers: 7 },
    { name: 'France', code: 'FR', requiredMarkers: 7 },
    { name: 'Japan', code: 'JP', requiredMarkers: 6 },
    { name: 'China', code: 'CN', requiredMarkers: 8 },
    { name: 'India', code: 'IN', requiredMarkers: 8 },
    { name: 'Brazil', code: 'BR', requiredMarkers: 6 },
    { name: 'Mexico', code: 'MX', requiredMarkers: 5 },
    { name: 'South Africa', code: 'ZA', requiredMarkers: 5 },
    { name: 'Nigeria', code: 'NG', requiredMarkers: 5 },
    { name: 'Kenya', code: 'KE', requiredMarkers: 4 },
    { name: 'Egypt', code: 'EG', requiredMarkers: 4 },
    { name: 'Argentina', code: 'AR', requiredMarkers: 4 },
    { name: 'Chile', code: 'CL', requiredMarkers: 3 },
    { name: 'Colombia', code: 'CO', requiredMarkers: 4 },
    { name: 'Peru', code: 'PE', requiredMarkers: 3 },
    { name: 'Indonesia', code: 'ID', requiredMarkers: 5 },
    { name: 'Thailand', code: 'TH', requiredMarkers: 4 },
    { name: 'Vietnam', code: 'VN', requiredMarkers: 4 },
    { name: 'Philippines', code: 'PH', requiredMarkers: 4 },
    { name: 'Malaysia', code: 'MY', requiredMarkers: 3 },
    { name: 'Singapore', code: 'SG', requiredMarkers: 3 },
    { name: 'New Zealand', code: 'NZ', requiredMarkers: 3 },
    { name: 'South Korea', code: 'KR', requiredMarkers: 5 },
    { name: 'Italy', code: 'IT', requiredMarkers: 6 },
    { name: 'Spain', code: 'ES', requiredMarkers: 5 },
    { name: 'Poland', code: 'PL', requiredMarkers: 4 },
    { name: 'Netherlands', code: 'NL', requiredMarkers: 4 },
    { name: 'Belgium', code: 'BE', requiredMarkers: 3 },
    { name: 'Sweden', code: 'SE', requiredMarkers: 3 },
    { name: 'Norway', code: 'NO', requiredMarkers: 3 },
    { name: 'Denmark', code: 'DK', requiredMarkers: 3 },
    { name: 'Finland', code: 'FI', requiredMarkers: 3 },
    { name: 'Greece', code: 'GR', requiredMarkers: 3 },
    { name: 'Portugal', code: 'PT', requiredMarkers: 3 },
    { name: 'Turkey', code: 'TR', requiredMarkers: 5 },
    { name: 'Saudi Arabia', code: 'SA', requiredMarkers: 4 },
    { name: 'United Arab Emirates', code: 'AE', requiredMarkers: 3 },
    { name: 'Israel', code: 'IL', requiredMarkers: 4 },
    { name: 'Iran', code: 'IR', requiredMarkers: 4 },
    { name: 'Iraq', code: 'IQ', requiredMarkers: 3 },
    { name: 'Pakistan', code: 'PK', requiredMarkers: 5 },
    { name: 'Bangladesh', code: 'BD', requiredMarkers: 4 },
    { name: 'Sri Lanka', code: 'LK', requiredMarkers: 3 },
  ]
}
