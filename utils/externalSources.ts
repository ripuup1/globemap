/**
 * External Sources Utility
 * 
 * Dual fetch strategy (A + B) to prevent caching crashes:
 * - Strategy A: API Routes (primary)
 * - Strategy B: Client-Side Fetch (fallback)
 */

export interface SourceData {
  data: any[]
  source: string
  cached: boolean
  timestamp: number
  error?: string
}

// Cache for client-side fallback
const clientCache = new Map<string, { data: SourceData; timestamp: number }>()
const CLIENT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch external source with dual strategy
 * Strategy A: API route (primary)
 * Strategy B: Client-side fetch (fallback)
 */
export async function fetchExternalSource(
  type: 'markets' | 'politics' | 'breaking',
  source: string
): Promise<SourceData | null> {
  const cacheKey = `${type}:${source}`
  
  // Strategy A: Try API route first
  try {
    const response = await fetch(`/api/sources?type=${type}&source=${source}`, {
      cache: 'no-store', // Prevent stale cache
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Update client cache
      clientCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })
      
      return data
    }
  } catch (error) {
    console.warn(`[ExternalSources] API route failed for ${type}/${source}:`, error)
  }
  
  // Strategy B: Client-side fetch fallback
  try {
    const data = await clientFetchSource(type, source)
    
    if (data) {
      // Update cache
      clientCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })
      
      return data
    }
  } catch (error) {
    console.warn(`[ExternalSources] Client-side fetch failed for ${type}/${source}:`, error)
  }
  
  // Final fallback: Return cached data if available
  const cached = getCachedSource(type, source)
  if (cached) {
    console.log(`[ExternalSources] Using cached data for ${type}/${source}`)
    return cached
  }
  
  return null
}

/**
 * Client-side fetch (Strategy B)
 */
async function clientFetchSource(
  type: 'markets' | 'politics' | 'breaking',
  source: string
): Promise<SourceData | null> {
  // For markets, try direct Yahoo Finance fetch
  if (type === 'markets' && source === 'yahoo') {
    try {
      const symbols = ['^GSPC', '^IXIC', '^DJI', '^VIX']
      const results: any[] = []
      
      for (const symbol of symbols) {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            const quote = data.chart?.result?.[0]
            if (quote) {
              const meta = quote.meta
              const currentPrice = meta.regularMarketPrice || 0
              const previousClose = meta.previousClose || currentPrice
              const change = currentPrice - previousClose
              const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
              
              results.push({
                symbol: symbol.replace('^', ''),
                name: getSymbolName(symbol),
                value: parseFloat(currentPrice.toFixed(2)),
                change: parseFloat(change.toFixed(2)),
                changePercent: parseFloat(changePercent.toFixed(2)),
                history: quote.indicators?.quote?.[0]?.close?.slice(-7) || [],
              })
            }
          }
        } catch (err) {
          // Continue with other symbols
        }
      }
      
      if (results.length > 0) {
        return {
          data: results,
          source: 'yahoo_finance_client',
          cached: false,
          timestamp: Date.now(),
        }
      }
    } catch (error) {
      console.warn('Client-side Yahoo Finance fetch failed:', error)
    }
  }
  
  // For politics, try RSS feed parsing
  if (type === 'politics' && source === 'cspan') {
    try {
      // Use a CORS proxy or direct fetch if CORS allows
      const rssUrl = 'https://www.c-span.org/rss/'
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`
      
      const response = await fetch(proxyUrl)
      if (response.ok) {
        const proxyData = await response.json()
        const rssText = proxyData.contents
        
        // Parse RSS (simplified)
        const items = parseRSS(rssText)
        
        if (items.length > 0) {
          return {
            data: items,
            source: 'cspan_rss_client',
            cached: false,
            timestamp: Date.now(),
          }
        }
      }
    } catch (error) {
      console.warn('Client-side C-SPAN RSS fetch failed:', error)
    }
  }
  
  return null
}

/**
 * Get cached source data
 */
function getCachedSource(
  type: 'markets' | 'politics' | 'breaking',
  source: string
): SourceData | null {
  const cacheKey = `${type}:${source}`
  const cached = clientCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
    return {
      ...cached.data,
      cached: true,
    }
  }
  
  return null
}

/**
 * Parse RSS feed (simplified)
 */
function parseRSS(rssText: string): any[] {
  // Simplified RSS parsing - extract items
  const items: any[] = []
  const itemMatches = rssText.matchAll(/<item>([\s\S]*?)<\/item>/gi)
  
  for (const match of itemMatches) {
    const itemXml = match[1]
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || 
                       itemXml.match(/<title>(.*?)<\/title>/i)
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i)
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/i)
    
    if (titleMatch) {
      items.push({
        title: titleMatch[1].trim(),
        url: linkMatch?.[1] || '',
        timestamp: pubDateMatch ? new Date(pubDateMatch[1]).getTime() : Date.now(),
        source: 'C-SPAN',
      })
    }
  }
  
  return items.slice(0, 10) // Limit to 10 items
}

/**
 * Get symbol display name
 */
function getSymbolName(symbol: string): string {
  const names: Record<string, string> = {
    '^GSPC': 'S&P 500',
    '^IXIC': 'NASDAQ',
    '^DJI': 'Dow Jones',
    '^VIX': 'VIX',
  }
  return names[symbol] || symbol
}
