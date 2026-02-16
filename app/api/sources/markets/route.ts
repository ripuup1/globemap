/**
 * Markets Source Integration
 * 
 * Multiple sources with fallback:
 * 1. Yahoo Finance (primary)
 * 2. Alpha Vantage (backup)
 * 3. Finnhub (backup)
 */

import { NextRequest, NextResponse } from 'next/server'

interface MarketData {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
  history: number[]
}

const MARKET_SYMBOLS = [
  { symbol: '^GSPC', displaySymbol: 'SPX', name: 'S&P 500' },
  { symbol: '^IXIC', displaySymbol: 'NASDAQ', name: 'NASDAQ' },
  { symbol: '^DJI', displaySymbol: 'DJI', name: 'Dow Jones' },
  { symbol: '^VIX', displaySymbol: 'VIX', name: 'VIX' },
]

/**
 * Fetch from Yahoo Finance
 */
async function fetchYahooFinance(): Promise<MarketData[]> {
  const results: MarketData[] = []
  
  for (const { symbol, displaySymbol, name } of MARKET_SYMBOLS) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const quote = data.chart?.result?.[0]
      if (!quote) continue
      
      const meta = quote.meta
      const closePrices = quote.indicators?.quote?.[0]?.close || []
      const validPrices = closePrices.filter((p: number | null) => p !== null)
      
      const currentPrice = meta.regularMarketPrice || validPrices[validPrices.length - 1] || 0
      const previousClose = meta.previousClose || validPrices[validPrices.length - 2] || currentPrice
      const change = currentPrice - previousClose
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
      
      results.push({
        symbol: displaySymbol,
        name,
        value: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        history: validPrices.slice(-7).map((p: number) => parseFloat(p.toFixed(2))),
      })
    } catch (err) {
      // Continue with other symbols
    }
  }
  
  return results
}

/**
 * Fetch from Alpha Vantage (backup)
 */
async function fetchAlphaVantage(): Promise<MarketData[] | null> {
  // Alpha Vantage requires API key - implement if available
  // For now, return null to use other sources
  return null
}

/**
 * Fetch from Finnhub (backup)
 */
async function fetchFinnhub(): Promise<MarketData[] | null> {
  // Finnhub requires API key - implement if available
  // For now, return null to use other sources
  return null
}

export async function GET(request: NextRequest) {
  try {
    // Try Yahoo Finance first (primary)
    let data = await fetchYahooFinance()
    
    if (data.length >= 2) {
      return NextResponse.json({
        data,
        source: 'yahoo_finance',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Try Alpha Vantage (backup)
    const alphaData = await fetchAlphaVantage()
    if (alphaData && alphaData.length >= 2) {
      return NextResponse.json({
        data: alphaData,
        source: 'alpha_vantage',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Try Finnhub (backup)
    const finnhubData = await fetchFinnhub()
    if (finnhubData && finnhubData.length >= 2) {
      return NextResponse.json({
        data: finnhubData,
        source: 'finnhub',
        cached: false,
        timestamp: Date.now(),
      })
    }
    
    // Return whatever we got from Yahoo (even if partial)
    if (data.length > 0) {
      return NextResponse.json({
        data,
        source: 'yahoo_finance_partial',
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
    console.error('[Markets Source] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market data', data: [] },
      { status: 500 }
    )
  }
}
