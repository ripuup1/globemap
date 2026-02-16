/**
 * Google Trends API Route
 * 
 * Returns real Google Trends data with search volumes
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchRealGoogleTrends } from '@/utils/googleTrendsReal'
import { fetchGoogleSearchTrends } from '@/utils/googleSearchTrends'
import { dataCache } from '@/utils/dataCache'
import { getCacheHeaders } from '@/lib/compression'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || undefined
    const category = searchParams.get('category') || undefined
    const type = searchParams.get('type') || 'trends' // 'trends' or 'searches'
    
    // Check cache
    const cacheKey = `trends:${region || 'global'}:${category || 'all'}:${type}`
    const cached = dataCache.get(cacheKey)
    
    if (cached) {
      const response = NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      })
      Object.entries(getCacheHeaders()).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }
    
    // Fetch fresh data
    let data
    if (type === 'searches') {
      const regions = region ? [region] : ['US', 'GB', 'AU', 'CA', 'DE', 'FR', 'JP', 'CN', 'IN']
      data = await fetchGoogleSearchTrends(regions)
    } else {
      data = await fetchRealGoogleTrends(region, category)
    }
    
    // Cache for 5 minutes
    dataCache.set(cacheKey, data, 5 * 60 * 1000)
    
    const response = NextResponse.json({
      success: true,
      data,
      cached: false,
    })
    
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    console.error('[Google Trends API] Error:', error)
    
    const response = NextResponse.json({
      success: false,
      error: 'Failed to fetch Google Trends',
      data: [],
    }, { status: 500 })
    
    Object.entries(getCacheHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}
