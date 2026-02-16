/**
 * Google Trends by Country
 * 
 * Fetches Google Trends RSS feeds by country/region to identify trending topics
 * Used to ensure markers for underrepresented countries
 */

import { TrendingTopic } from './googleTrendsDetector'
import { fetchGoogleNewsRSS, parseGoogleNewsRSS } from './googleNewsParser'

// Country name to Google Trends geo code mapping
const COUNTRY_CODES: Record<string, string> = {
  'United States': 'US',
  'United Kingdom': 'GB',
  'Australia': 'AU',
  'South Africa': 'ZA',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Egypt': 'EG',
  'Ghana': 'GH',
  'Morocco': 'MA',
  'Tanzania': 'TZ',
  'Uganda': 'UG',
  'Ethiopia': 'ET',
  'Algeria': 'DZ',
  'Tunisia': 'TN',
  'Canada': 'CA',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'India': 'IN',
  'China': 'CN',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Indonesia': 'ID',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Philippines': 'PH',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'New Zealand': 'NZ',
  'France': 'FR',
  'Germany': 'DE',
  'Italy': 'IT',
  'Spain': 'ES',
  'Poland': 'PL',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Greece': 'GR',
  'Portugal': 'PT',
  'Turkey': 'TR',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'Israel': 'IL',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Pakistan': 'PK',
  'Bangladesh': 'BD',
  'Sri Lanka': 'LK',
}

/**
 * Fetch Google Trends for a specific country
 */
export async function fetchGoogleTrendsByCountry(country: string): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = []
  
  try {
    const geoCode = COUNTRY_CODES[country] || 'US'
    
    // Google Trends RSS URL
    // Note: Google Trends RSS may require different endpoints or parsing
    // Using Google News country-specific as fallback
    const rssUrl = `https://news.google.com/rss/headlines/section/topics/WORLD?hl=en&gl=${geoCode}&ceid=${geoCode}:en`
    
    // Alternative: Try Google News search for country
    const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(country)}+news&hl=en&gl=${geoCode}&ceid=${geoCode}:en`
    
    let xml: string
    try {
      xml = await fetchGoogleNewsRSS(rssUrl)
    } catch {
      // Fallback to search URL
      xml = await fetchGoogleNewsRSS(searchUrl)
    }
    
    const articles = parseGoogleNewsRSS(xml, country)
    
    // Extract trending keywords from articles
    const keywordCounts = new Map<string, number>()
    
    for (const article of articles.slice(0, 30)) {
      const keywords = extractKeywords(article.title)
      for (const keyword of keywords) {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1)
      }
    }
    
    // Convert to trending topics
    const sortedKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    for (const [keyword, count] of sortedKeywords) {
      if (count >= 2) {
        topics.push({
          id: `trending-${country}-${keyword}`,
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          keywords: [keyword],
          searchVolume: Math.min(count * 10, 100),
          eventCount: count,
          category: 'trending',
          priority: 55 + count * 2,
        })
      }
    }
  } catch (error) {
    console.error(`[GoogleTrendsByCountry] Failed to fetch trends for ${country}:`, error)
  }
  
  return topics
}

/**
 * Fetch trends for multiple countries
 */
export async function fetchGoogleTrendsForCountries(countries: string[]): Promise<Map<string, TrendingTopic[]>> {
  const results = new Map<string, TrendingTopic[]>()
  
  // Fetch in parallel (limit to 5 at a time to avoid rate limits)
  const batchSize = 5
  for (let i = 0; i < countries.length; i += batchSize) {
    const batch = countries.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (country) => {
        const topics = await fetchGoogleTrendsByCountry(country)
        return { country, topics }
      })
    )
    
    for (const { country, topics } of batchResults) {
      results.set(country, topics)
    }
    
    // Small delay between batches
    if (i + batchSize < countries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'says', 'said', 'new', 'after', 'about', 'over', 'into', 'up',
    'news', 'report', 'reports', 'update', 'latest', 'breaking'
  ])
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5)
}
