/**
 * Politics Source Integration
 * 
 * Multiple sources with fallback:
 * 1. C-SPAN RSS (primary)
 * 2. AP News API (backup)
 * 3. Reuters RSS (backup)
 */

import { NextRequest, NextResponse } from 'next/server'

interface PoliticsArticle {
  title: string
  url: string
  timestamp: number
  source: string
  description?: string
}

const C_SPAN_RSS_URL = 'https://www.c-span.org/rss/'
const REUTERS_RSS_URL = 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best'

/**
 * Fetch and parse C-SPAN RSS
 */
async function fetchCSpanRSS(): Promise<PoliticsArticle[]> {
  try {
    const response = await fetch(C_SPAN_RSS_URL, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })
    
    if (!response.ok) {
      throw new Error(`C-SPAN RSS failed: ${response.status}`)
    }
    
    const xml = await response.text()
    return parseRSSFeed(xml, 'C-SPAN')
  } catch (error) {
    console.warn('[Politics Source] C-SPAN RSS failed:', error)
    return []
  }
}

/**
 * Fetch from AP News API (backup)
 */
async function fetchAPNews(): Promise<PoliticsArticle[]> {
  // AP News API requires API key
  // For now, return empty - can be implemented when API key is available
  return []
}

/**
 * Fetch and parse Reuters RSS
 */
async function fetchReutersRSS(): Promise<PoliticsArticle[]> {
  try {
    const response = await fetch(REUTERS_RSS_URL, {
      next: { revalidate: 300 },
    })
    
    if (!response.ok) {
      throw new Error(`Reuters RSS failed: ${response.status}`)
    }
    
    const xml = await response.text()
    return parseRSSFeed(xml, 'Reuters')
  } catch (error) {
    console.warn('[Politics Source] Reuters RSS failed:', error)
    return []
  }
}

/**
 * Parse RSS feed XML
 */
function parseRSSFeed(xml: string, sourceName: string): PoliticsArticle[] {
  const articles: PoliticsArticle[] = []
  
  // Extract items using regex (simplified parser)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  
  while ((match = itemRegex.exec(xml)) !== null && articles.length < 20) {
    const itemXml = match[1]
    
    // Extract title
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) ||
                       itemXml.match(/<title>(.*?)<\/title>/i)
    
    // Extract link
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i)
    
    // Extract pubDate
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i)
    
    // Extract description
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) ||
                      itemXml.match(/<description>(.*?)<\/description>/i)
    
    if (titleMatch && linkMatch) {
      const pubDate = pubDateMatch 
        ? new Date(pubDateMatch[1]).getTime()
        : Date.now()
      
      articles.push({
        title: cleanHTML(titleMatch[1]),
        url: linkMatch[1].trim(),
        timestamp: pubDate,
        source: sourceName,
        description: descMatch ? cleanHTML(descMatch[1]).substring(0, 200) : undefined,
      })
    }
  }
  
  return articles
}

/**
 * Clean HTML tags from text
 */
function cleanHTML(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

export async function GET(request: NextRequest) {
  try {
    // Try C-SPAN RSS first (primary)
    let articles = await fetchCSpanRSS()
    
    if (articles.length >= 5) {
      return NextResponse.json({
        data: articles,
        source: 'cspan_rss',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Try AP News (backup)
    const apArticles = await fetchAPNews()
    if (apArticles.length >= 5) {
      return NextResponse.json({
        data: apArticles,
        source: 'ap_news',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Try Reuters RSS (backup)
    const reutersArticles = await fetchReutersRSS()
    if (reutersArticles.length >= 5) {
      return NextResponse.json({
        data: reutersArticles,
        source: 'reuters_rss',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Return whatever we got (even if partial)
    if (articles.length > 0) {
      return NextResponse.json({
        data: articles,
        source: 'cspan_rss_partial',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Combine all sources if we have partial data
    const combined = [...articles, ...apArticles, ...reutersArticles]
    if (combined.length > 0) {
      return NextResponse.json({
        data: combined.slice(0, 20),
        source: 'multiple_sources',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Fallback: return empty
    return NextResponse.json({
      data: [],
      source: 'none',
      cached: false,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('[Politics Source] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch politics data', data: [] },
      { status: 500 }
    )
  }
}
