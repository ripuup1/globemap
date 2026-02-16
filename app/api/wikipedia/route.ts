/**
 * Vox Terra - Wikipedia API Integration
 * 
 * Option 6C: Hybrid Content-Aware Linking with Confidence Scoring
 * 
 * Links Wikipedia articles based on EVENT CONTENT, not location:
 * - Extracts key entities from title/description
 * - Scores relevance using multiple signals
 * - Only returns link if confidence threshold met
 * - Falls back gracefully when no good match
 */

import { NextResponse } from 'next/server'

interface WikipediaSummary {
  title: string
  extract: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  content_urls?: {
    desktop: {
      page: string
    }
  }
}

interface SearchResult {
  title: string
  snippet: string
  pageid: number
}

// =============================================================================
// CONTENT-AWARE ENTITY EXTRACTION
// Extracts meaningful entities from event titles for Wikipedia lookup
// =============================================================================

// Common words to ignore when extracting entities
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'with', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under',
  'above', 'news', 'breaking', 'update', 'latest', 'report', 'reports',
  'says', 'said', 'new', 'now', 'today', 'yesterday', 'week', 'month',
  'year', 'years', 'people', 'person', 'local', 'officials', 'sources',
])

// Event type to Wikipedia category hints
const CATEGORY_HINTS: Record<string, string[]> = {
  'armed-conflict': ['war', 'conflict', 'military', 'battle'],
  'terrorism': ['terrorism', 'attack', 'bombing'],
  'earthquake': ['earthquake', 'seismic', 'magnitude'],
  'volcano': ['volcano', 'eruption', 'volcanic'],
  'wildfire': ['wildfire', 'fire', 'blaze'],
  'flood': ['flood', 'flooding', 'hurricane'],
  'storm': ['storm', 'hurricane', 'typhoon', 'cyclone'],
  'politics': ['election', 'government', 'political party'],
  'business': ['company', 'corporation', 'market'],
  'technology': ['technology', 'software', 'company'],
  'sports': ['sport', 'team', 'championship', 'league'],
}

/**
 * Extract meaningful entities from title
 * Prioritizes proper nouns, organizations, and specific terms
 */
function extractEntities(title: string, eventType?: string): string[] {
  const entities: string[] = []
  
  // Split and clean
  const words = title
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
  
  // Find capitalized sequences (likely proper nouns)
  let currentEntity: string[] = []
  for (const word of words) {
    if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
      currentEntity.push(word)
    } else {
      if (currentEntity.length > 0) {
        entities.push(currentEntity.join(' '))
        currentEntity = []
      }
    }
  }
  if (currentEntity.length > 0) {
    entities.push(currentEntity.join(' '))
  }
  
  // Add category-specific terms if found in title
  if (eventType && CATEGORY_HINTS[eventType]) {
    for (const hint of CATEGORY_HINTS[eventType]) {
      if (title.toLowerCase().includes(hint)) {
        entities.push(hint)
      }
    }
  }
  
  // Remove duplicates and sort by length (longer = more specific)
  return [...new Set(entities)].sort((a, b) => b.length - a.length)
}

/**
 * Calculate confidence score for a Wikipedia result
 * Higher score = better match to the event
 */
function calculateConfidence(
  searchQuery: string,
  result: SearchResult,
  eventType?: string
): number {
  let score = 0
  const queryLower = searchQuery.toLowerCase()
  const titleLower = result.title.toLowerCase()
  const snippetLower = result.snippet.toLowerCase()
  
  // Exact title match = high confidence
  if (titleLower === queryLower) {
    score += 50
  }
  // Title contains query
  else if (titleLower.includes(queryLower)) {
    score += 30
  }
  // Query contains title
  else if (queryLower.includes(titleLower)) {
    score += 25
  }
  
  // Snippet relevance
  const queryWords = queryLower.split(/\s+/).filter(w => !STOP_WORDS.has(w))
  const matchedWords = queryWords.filter(w => snippetLower.includes(w))
  score += (matchedWords.length / queryWords.length) * 20
  
  // Category bonus - if snippet contains category-relevant terms
  if (eventType && CATEGORY_HINTS[eventType]) {
    const categoryMatches = CATEGORY_HINTS[eventType].filter(h => 
      snippetLower.includes(h) || titleLower.includes(h)
    )
    score += categoryMatches.length * 5
  }
  
  // Penalize disambiguation pages
  if (titleLower.includes('(disambiguation)') || snippetLower.includes('may refer to')) {
    score -= 30
  }
  
  // Penalize location-only results when we want content
  const locationIndicators = ['city', 'town', 'village', 'municipality', 'county', 'district']
  if (locationIndicators.some(l => snippetLower.startsWith(l))) {
    score -= 20
  }
  
  return Math.max(0, Math.min(100, score))
}

// Minimum confidence threshold to return a result
const CONFIDENCE_THRESHOLD = 25

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const eventType = searchParams.get('type') || undefined
  const title = searchParams.get('title') || query
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }
  
  try {
    // Extract entities from the event title for content-aware search
    const entities = extractEntities(title || query, eventType || undefined)
    
    // Try each entity in order of specificity
    const searchQueries = entities.length > 0 ? entities : [query]
    
    let bestResult: { data: WikipediaSummary; confidence: number } | null = null
    
    for (const searchQuery of searchQueries.slice(0, 3)) { // Limit to top 3 entities
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      
      try {
        // Search Wikipedia
        const searchApiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=3`
        
        const searchResponse = await fetch(searchApiUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'VoxTerra/1.0 (https://voxtera.app; contact@voxtera.app)',
          },
        })
        
        clearTimeout(timeout)
        
        if (!searchResponse.ok) continue
        
        const searchData = await searchResponse.json()
        const results: SearchResult[] = searchData?.query?.search || []
        
        // Score each result and find best match
        for (const result of results) {
          const confidence = calculateConfidence(searchQuery, result, eventType || undefined)
          
          if (confidence >= CONFIDENCE_THRESHOLD && (!bestResult || confidence > bestResult.confidence)) {
            // Fetch full summary for this result
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title)}`
            const summaryResponse = await fetch(summaryUrl, {
              headers: {
                'User-Agent': 'VoxTerra/1.0 (https://voxtera.app; contact@voxtera.app)',
              },
            })
            
            if (summaryResponse.ok) {
              const summaryData: WikipediaSummary = await summaryResponse.json()
              bestResult = { data: summaryData, confidence }
            }
          }
        }
        
        // If we found a high-confidence match, stop searching
        if (bestResult && bestResult.confidence >= 60) break
        
      } catch {
        // Continue to next entity on timeout/error
        continue
      }
    }
    
    // Return best result if found
    if (bestResult) {
      return NextResponse.json({
        title: bestResult.data.title,
        summary: bestResult.data.extract,
        thumbnail: bestResult.data.thumbnail?.source,
        url: bestResult.data.content_urls?.desktop?.page || 
             `https://en.wikipedia.org/wiki/${encodeURIComponent(bestResult.data.title)}`,
        confidence: bestResult.confidence,
        contentAware: true, // Flag indicating this is content-based, not location-based
      })
    }
    
    // No confident match found
    return NextResponse.json({ 
      error: 'No relevant Wikipedia article found',
      searched: searchQueries.slice(0, 3),
    }, { status: 404 })
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Wikipedia request timeout' }, { status: 504 })
    }
    
    console.error('Wikipedia API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Wikipedia data' }, { status: 500 })
  }
}
