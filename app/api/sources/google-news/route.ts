/**
 * Google News API Route
 * 
 * Fetches Google News RSS feeds by region and category
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchGoogleNewsByRegion, fetchGoogleNewsRSS, parseGoogleNewsRSS } from '@/utils/googleNewsParser'
import { Event } from '@/types/event'

// Regional Google News feeds
const GOOGLE_NEWS_FEEDS = {
  trending: 'https://news.google.com/rss', // Global trending
  africa: [
    { query: 'africa+breaking+news', category: 'breaking' },
    { query: 'africa+politics', category: 'politics' },
    { query: 'africa+economy', category: 'business' },
    { query: 'africa+climate', category: 'climate' },
  ],
  australia: [
    { query: 'australia+technology', category: 'technology' },
    { query: 'australia+sports', category: 'sports' },
    { query: 'australia+climate', category: 'climate' },
    { query: 'australia+economy', category: 'business' },
  ],
  asia: [
    { query: 'asia+breaking+news', category: 'breaking' },
    { query: 'asia+technology', category: 'technology' },
    { query: 'asia+economy', category: 'business' },
  ],
  europe: [
    { query: 'europe+breaking+news', category: 'breaking' },
    { query: 'europe+politics', category: 'politics' },
    { query: 'europe+economy', category: 'business' },
  ],
  americas: [
    { query: 'americas+breaking+news', category: 'breaking' },
    { query: 'americas+politics', category: 'politics' },
    { query: 'americas+economy', category: 'business' },
  ],
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const region = searchParams.get('region') || 'trending'
    const category = searchParams.get('category') || undefined
    
    const events: Event[] = []
    
    if (region === 'trending') {
      // Fetch global trending
      try {
        const xml = await fetchGoogleNewsRSS('https://news.google.com/rss')
        const articles = parseGoogleNewsRSS(xml, 'global')
        
        // Convert to events (simplified - would need full normalization)
        for (const article of articles.slice(0, 30)) {
          events.push({
            id: `google-trending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: article.title,
            description: article.description,
            type: 'breaking',
            severity: 7,
            latitude: 0,
            longitude: 0,
            timestamp: new Date(article.pubDate).getTime() || Date.now(),
            source: article.source || 'Google News',
            metadata: {
              url: article.link,
              sourceName: 'Google News Trending',
              sourceTier: 1,
              sourceTrustWeight: 1.0,
            },
            articles: [],
            articleCount: 1,
            isOngoing: false,
          } as Event)
        }
      } catch (error) {
        console.error('[GoogleNews API] Trending fetch failed:', error)
      }
    } else {
      // Fetch by region
      const regionFeeds = GOOGLE_NEWS_FEEDS[region as keyof typeof GOOGLE_NEWS_FEEDS]
      
      if (Array.isArray(regionFeeds)) {
        for (const feed of regionFeeds) {
          if (category && feed.category !== category) continue
          
          const regionEvents = await fetchGoogleNewsByRegion(region, feed.category)
          events.push(...regionEvents)
        }
      } else if (category) {
        // Single category for region
        const regionEvents = await fetchGoogleNewsByRegion(region, category)
        events.push(...regionEvents)
      }
    }
    
    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      region,
      category,
    })
  } catch (error) {
    console.error('[GoogleNews API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Google News', events: [] },
      { status: 500 }
    )
  }
}
