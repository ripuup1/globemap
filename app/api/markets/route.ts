/**
 * Markets API Route - Live Market Data Integration
 * 
 * Fetches real-time market data from Yahoo Finance (free tier).
 * Falls back to simulated data when API is unavailable.
 * 
 * Symbols: SPX (S&P 500), NDX (NASDAQ), DJI (Dow Jones), VIX
 */

import { NextResponse } from 'next/server'

// Market index configuration
const MARKET_SYMBOLS = [
  { symbol: '^GSPC', displaySymbol: 'SPX', name: 'S&P 500' },
  { symbol: '^IXIC', displaySymbol: 'NDX', name: 'NASDAQ' },
  { symbol: '^DJI', displaySymbol: 'DJI', name: 'Dow Jones' },
  { symbol: '^VIX', displaySymbol: 'VIX', name: 'VIX' },
]

// Cache for rate limiting and performance
let cachedData: MarketData[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minute cache

interface MarketData {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
  history: number[]
}

// Simulated fallback data (used when API unavailable)
function getSimulatedData(): MarketData[] {
  const now = Date.now()
  const baseNoise = Math.sin(now / 100000) * 0.5
  
  return [
    { 
      symbol: 'SPX', 
      name: 'S&P 500', 
      value: 5892.58 + baseNoise * 50, 
      change: 42.15 + baseNoise * 10, 
      changePercent: 0.72 + baseNoise * 0.1, 
      history: generateHistory(5892.58, 0.02) 
    },
    { 
      symbol: 'NDX', 
      name: 'NASDAQ', 
      value: 21453.12 + baseNoise * 150, 
      change: 124.56 + baseNoise * 30, 
      changePercent: 0.58 + baseNoise * 0.15, 
      history: generateHistory(21453.12, 0.025) 
    },
    { 
      symbol: 'DJI', 
      name: 'Dow Jones', 
      value: 43876.34 + baseNoise * 100, 
      change: -42.18 + baseNoise * 20, 
      changePercent: -0.10 + baseNoise * 0.08, 
      history: generateHistory(43876.34, 0.015) 
    },
    { 
      symbol: 'VIX', 
      name: 'VIX', 
      value: 14.23 + baseNoise * 0.5, 
      change: -0.87 + baseNoise * 0.2, 
      changePercent: -5.76 + baseNoise * 1, 
      history: generateHistory(14.23, 0.05) 
    },
  ]
}

function generateHistory(baseValue: number, volatility: number): number[] {
  const points: number[] = []
  let value = baseValue * (1 - volatility * 0.5)
  
  for (let i = 0; i < 7; i++) {
    const change = (Math.random() - 0.45) * volatility * baseValue
    value = value + change
    points.push(parseFloat(value.toFixed(2)))
  }
  
  return points
}

async function fetchYahooFinanceData(): Promise<MarketData[]> {
  const results: MarketData[] = []
  
  for (const { symbol, displaySymbol, name } of MARKET_SYMBOLS) {
    try {
      // Yahoo Finance v8 API endpoint
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${symbol}: ${response.status}`)
      }
      
      const data = await response.json()
      const quote = data.chart?.result?.[0]
      
      if (!quote) {
        throw new Error(`No data for ${symbol}`)
      }
      
      const meta = quote.meta
      const closePrices = quote.indicators?.quote?.[0]?.close || []
      const validPrices = closePrices.filter((p: number | null) => p !== null)
      
      // Get current price and calculate change
      const currentPrice = meta.regularMarketPrice || validPrices[validPrices.length - 1] || 0
      const previousClose = meta.previousClose || validPrices[validPrices.length - 2] || currentPrice
      const change = currentPrice - previousClose
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
      
      // Build history from last 7 data points
      const history = validPrices.slice(-7).map((p: number) => parseFloat(p.toFixed(2)))
      
      results.push({
        symbol: displaySymbol,
        name,
        value: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        history: history.length >= 7 ? history : generateHistory(currentPrice, 0.02),
      })
    } catch (err) {
      console.warn(`Failed to fetch ${symbol}:`, err)
      // Continue with other symbols
    }
  }
  
  return results
}

export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached data if still valid
    if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        data: cachedData,
        source: 'cache',
        timestamp: cacheTimestamp,
      })
    }
    
    // Try to fetch live data
    const liveData = await fetchYahooFinanceData()
    
    if (liveData.length >= 2) {
      // Successfully got at least 2 indices
      cachedData = liveData
      cacheTimestamp = now
      
      return NextResponse.json({
        data: liveData,
        source: 'yahoo_finance',
        timestamp: now,
      })
    }
    
    // Fall back to simulated data
    const simulatedData = getSimulatedData()
    
    return NextResponse.json({
      data: simulatedData,
      source: 'simulated',
      timestamp: now,
    })
  } catch (error) {
    console.error('Markets API error:', error)
    
    // Always return simulated data on error
    const simulatedData = getSimulatedData()
    
    return NextResponse.json({
      data: simulatedData,
      source: 'simulated_fallback',
      timestamp: Date.now(),
    })
  }
}

// Optional: POST endpoint for specific symbols
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const symbols = body.symbols || ['SPX', 'NDX', 'DJI', 'VIX']
    
    // For now, return the same GET data filtered by symbols
    const response = await GET()
    const data = await response.json()
    
    const filteredData = data.data.filter((d: MarketData) => 
      symbols.includes(d.symbol)
    )
    
    return NextResponse.json({
      data: filteredData,
      source: data.source,
      timestamp: data.timestamp,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
