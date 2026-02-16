/**
 * External Sources API Route
 * 
 * Strategy A: Server-side fetching to avoid CORS
 * Routes to specific source handlers based on type and source parameters
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') as 'markets' | 'politics' | 'breaking' | null
  const source = searchParams.get('source')
  
  if (!type || !source) {
    return NextResponse.json(
      { error: 'Missing type or source parameter' },
      { status: 400 }
    )
  }
  
  try {
    let data: any = null
    
    // Route to appropriate handler
    switch (type) {
      case 'markets': {
        // Markets route doesn't take parameters, just call it directly
        const marketsModule = await import('../markets/route')
        const marketsResponse = await marketsModule.GET()
        data = await marketsResponse.json()
        break
      }
        
      case 'politics': {
        const { GET: politicsGET } = await import('./politics/route')
        const politicsResponse = await politicsGET(request)
        data = await politicsResponse.json()
        break
      }
        
      case 'breaking': {
        const { GET: breakingGET } = await import('./breaking/route')
        const breakingResponse = await breakingGET(request)
        data = await breakingResponse.json()
        break
      }
        
      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      ...data,
      cached: false,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error(`[Sources API] Error fetching ${type}/${source}:`, error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch source data',
        type,
        source,
      },
      { status: 500 }
    )
  }
}
