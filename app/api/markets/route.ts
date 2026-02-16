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
  { symbol: '^IXIC', displaySymbol: 'NASDAQ', name: 'NASDAQ' },
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
  // Use time-varying noise so direction changes over time
  const hourCycle = Math.sin(now / 3600000) // Changes direction every ~1.8 hours
  const minuteCycle = Math.sin(now / 60000) * 0.3 // Short-term wobble
  const noise = hourCycle + minuteCycle

  // Randomly flip direction for each index using time-seeded pseudo-random
  const seed = Math.floor(now / 300000) // Changes every 5 minutes
  const directions = [
    Math.sin(seed * 1.1) > 0 ? 1 : -1,
    Math.sin(seed * 2.3) > 0 ? 1 : -1,
    Math.sin(seed * 3.7) > 0 ? 1 : -1,
    Math.sin(seed * 5.1) > 0 ? 1 : -1,
  ]

  return [
    {
      symbol: 'SPX',
      name: 'S&P 500',
      value: parseFloat((5892.58 + noise * 30 * directions[0]).toFixed(2)),
      change: parseFloat((directions[0] * (42.15 + Math.abs(noise) * 15)).toFixed(2)),
      changePercent: parseFloat((directions[0] * (0.72 + Math.abs(noise) * 0.25)).toFixed(2)),
      history: generateHistory(5892.58, 0.02)
    },
    {
      symbol: 'NASDAQ',
      name: 'NASDAQ',
      value: parseFloat((21453.12 + noise * 100 * directions[1]).toFixed(2)),
      change: parseFloat((directions[1] * (124.56 + Math.abs(noise) * 50)).toFixed(2)),
      changePercent: parseFloat((directions[1] * (0.58 + Math.abs(noise) * 0.3)).toFixed(2)),
      history: generateHistory(21453.12, 0.025)
    },
    {
      symbol: 'DJI',
      name: 'Dow Jones',
      value: parseFloat((43876.34 + noise * 80 * directions[2]).toFixed(2)),
      change: parseFloat((directions[2] * (42.18 + Math.abs(noise) * 25)).toFixed(2)),
      changePercent: parseFloat((directions[2] * (0.10 + Math.abs(noise) * 0.15)).toFixed(2)),
      history: generateHistory(43876.34, 0.015)
    },
    {
      symbol: 'VIX',
      name: 'VIX',
      value: parseFloat((14.23 + noise * 0.8 * directions[3]).toFixed(2)),
      change: parseFloat((directions[3] * (0.87 + Math.abs(noise) * 0.4)).toFixed(2)),
      changePercent: parseFloat((directions[3] * (5.76 + Math.abs(noise) * 2)).toFixed(2)),
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
  // Fetch all symbols in parallel for faster response
  const results = await Promise.allSettled(
    MARKET_SYMBOLS.map(async ({ symbol, displaySymbol, name }) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

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

      const currentPrice = meta.regularMarketPrice || validPrices[validPrices.length - 1] || 0
      const previousClose = meta.previousClose || validPrices[validPrices.length - 2] || currentPrice
      const change = currentPrice - previousClose
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

      const history = validPrices.slice(-7).map((p: number) => parseFloat(p.toFixed(2)))

      return {
        symbol: displaySymbol,
        name,
        value: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        history: history.length >= 7 ? history : generateHistory(currentPrice, 0.02),
      } as MarketData
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<MarketData> => r.status === 'fulfilled')
    .map(r => r.value)
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
    const symbols = body.symbols || ['SPX', 'NASDAQ', 'DJI', 'VIX']
    
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
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
