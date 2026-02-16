/**
 * Topic Detection System
 * 
 * Detects trending topics from event data using:
 * - Fixed geopolitical topics with predefined keywords
 * - Dynamic trending detection based on event frequency + severity
 * - Keyword clustering for emerging stories
 */

import { Event } from '@/types/event'
import { detectAllTrendingTopics } from './googleTrendsDetector'

// ============================================================================
// TYPES
// ============================================================================

export interface TopicDefinition {
  id: string
  name: string
  keywords: string[]
  category: 'geopolitical' | 'crisis' | 'trending' | 'markets'
  priority: number // Higher = shown first
  icon?: string
  alwaysActive?: boolean // Never filtered out, always included
}

export interface DetectedTopic extends TopicDefinition {
  eventCount: number
  avgSeverity: number
  isActive: boolean // Has recent events (last 48h)
  searchVolume24h?: number // Google search volume (24 hours)
  searchVolume7d?: number // Google search volume (7 days)
  trendDirection?: 'up' | 'down' | 'stable' // Search trend direction
}

// ============================================================================
// FIXED TOPICS - Major ongoing stories
// ============================================================================

export const FIXED_TOPICS: TopicDefinition[] = [
  // Geopolitical conflicts
  {
    id: 'ukraine-russia',
    name: 'Ukraine-Russia',
    keywords: ['ukraine', 'russia', 'kyiv', 'kiev', 'moscow', 'zelensky', 'putin', 'crimea', 'donbas', 'nato'],
    category: 'geopolitical',
    priority: 100,
  },
  {
    id: 'middle-east',
    name: 'Middle East',
    keywords: ['israel', 'gaza', 'hamas', 'palestine', 'iran', 'hezbollah', 'syria', 'lebanon', 'netanyahu', 'tel aviv'],
    category: 'geopolitical',
    priority: 95,
  },
  {
    id: 'venezuela',
    name: 'Venezuela',
    keywords: ['venezuela', 'maduro', 'caracas', 'guaido', 'venezuelan'],
    category: 'crisis',
    priority: 85,
  },
  {
    id: 'greenland',
    name: 'Greenland',
    keywords: ['greenland', 'denmark', 'arctic', 'nuuk', 'danish'],
    category: 'geopolitical',
    priority: 80,
  },
  
  // US Politics & Scandals
  {
    id: 'minneapolis-fraud',
    name: 'Minneapolis Fraud',
    keywords: ['minneapolis', 'fraud', 'feeding our future', 'minnesota', 'pandemic fraud'],
    category: 'trending',
    priority: 90,
  },
  {
    id: 'us-politics',
    name: 'US Politics',
    keywords: ['trump', 'biden', 'congress', 'white house', 'senate', 'republican', 'democrat', 'washington'],
    category: 'geopolitical',
    priority: 88,
  },
  
  // Economic
  {
    id: 'china-trade',
    name: 'China Trade',
    keywords: ['china', 'tariff', 'trade war', 'beijing', 'chinese', 'xi jinping'],
    category: 'geopolitical',
    priority: 82,
  },
  
  // Climate & Environment
  {
    id: 'climate-disasters',
    name: 'Climate Events',
    keywords: ['wildfire', 'hurricane', 'flood', 'drought', 'climate', 'extreme weather'],
    category: 'crisis',
    priority: 75,
  },
  
  // Economy & Finance (ALWAYS ACTIVE)
  {
    id: 'economy-finance',
    name: 'Economy & Finance',
    keywords: ['economy', 'finance', 'market', 'gdp', 'inflation', 'trade', 'economic', 'financial', 'nasdaq', 'dow', 's&p', 'fed', 'interest rate', 'stock', 'currency', 'banking'],
    category: 'markets',
    priority: 100, // Highest priority - always active
    alwaysActive: true, // Never filtered out
  },
  
  // Science & Development
  {
    id: 'science-development',
    name: 'Science & Development',
    keywords: ['science', 'research', 'breakthrough', 'discovery', 'innovation', 'technology', 'space', 'medical', 'scientific', 'study', 'experiment'],
    category: 'trending',
    priority: 85,
  },
  
  // Markets (legacy - kept for backward compatibility, but Economy & Finance is primary)
  {
    id: 'markets',
    name: 'Markets',
    keywords: ['stock', 'market', 'dow', 'nasdaq', 's&p', 'fed', 'interest rate', 'inflation', 'economy', 'gdp'],
    category: 'markets',
    priority: 70,
  },
]

// ============================================================================
// DYNAMIC TOPIC DETECTION
// ============================================================================

/**
 * Extract significant keywords from event titles
 */
function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'says', 'said', 'new', 'after', 'about', 'over', 'into', 'up',
    'news', 'report', 'reports', 'update', 'latest', 'breaking'
  ])
  
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
}

/**
 * Detect trending topics dynamically from event clusters
 */
function detectTrendingTopics(events: Event[]): TopicDefinition[] {
  // Count keyword frequency
  const keywordCounts = new Map<string, number>()
  const keywordEvents = new Map<string, Event[]>()
  
  for (const event of events) {
    const keywords = extractKeywords(event.title)
    for (const keyword of keywords) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1)
      if (!keywordEvents.has(keyword)) {
        keywordEvents.set(keyword, [])
      }
      keywordEvents.get(keyword)!.push(event)
    }
  }
  
  // Find keywords that appear frequently (potential trending topics)
  // Lowered threshold: require only 1+ event (was 3+)
  const trendingKeywords = Array.from(keywordCounts.entries())
    .filter(([, count]) => count >= 1) // At least 1 event (lowered from 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15) // Top 15 trending keywords (increased from 10)
  
  // Convert to topic definitions (only if not already covered by fixed topics)
  const fixedKeywords = new Set(FIXED_TOPICS.flatMap(t => t.keywords))
  const trendingTopics: TopicDefinition[] = []
  
  for (const [keyword, count] of trendingKeywords) {
    if (fixedKeywords.has(keyword)) continue
    
    // Check if this keyword represents a significant topic
    // Lowered threshold: require only 1+ event (was 3+)
    const relatedEvents = keywordEvents.get(keyword) || []
    if (relatedEvents.length >= 1) {
      trendingTopics.push({
        id: `trending-${keyword}`,
        name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        keywords: [keyword],
        category: 'trending',
        priority: 50 + Math.min(count * 3, 40), // Increased priority boost
      })
    }
  }
  
  return trendingTopics.slice(0, 10) // Increased from 5 to 10
}

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect all topics (fixed + trending) and match events
 * Ensures 5-7 actively trending topics are always available
 */
export async function detectTopics(events: Event[]): Promise<DetectedTopic[]> {
  const now = Date.now()
  const recentWindow = 48 * 60 * 60 * 1000 // 48 hours
  
  // Get Google Trends (with 8s timeout to prevent blocking the Situation Room)
  let googleTrends: Array<TopicDefinition & { searchVolume24h?: number; searchVolume7d?: number; trendDirection?: 'up' | 'down' | 'stable' }> = []
  try {
    const trendingTopics = await Promise.race([
      detectAllTrendingTopics(events),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000)),
    ])
    googleTrends = trendingTopics.map(tt => ({
      id: tt.id,
      name: tt.name,
      keywords: tt.keywords,
      category: tt.category,
      priority: tt.priority,
      searchVolume24h: tt.searchVolume ? Math.round(tt.searchVolume * 10000) : undefined,
      searchVolume7d: tt.searchVolume ? Math.round(tt.searchVolume * 70000) : undefined,
      trendDirection: 'up' as const,
    }))
  } catch (error) {
    console.warn('[TopicDetector] Google Trends failed/timeout, using event-based fallback:', error)
  }

  // Fallback: If Google Trends returned nothing, detect trends from event keywords
  let eventTrendingTopics: TopicDefinition[] = []
  if (googleTrends.length === 0) {
    eventTrendingTopics = detectTrendingTopics(events)
  }

  // Combine: Fixed topics + Google Trends + event-based trending fallback
  const allTopics: Array<TopicDefinition & { searchVolume24h?: number; searchVolume7d?: number; trendDirection?: 'up' | 'down' | 'stable' }> = [
    ...FIXED_TOPICS,
    ...googleTrends,
    ...eventTrendingTopics,
  ]
  
  // Match events to topics
  const detectedTopics: DetectedTopic[] = []
  const assignedEventIds = new Set<string>()
  
  for (const topic of allTopics) {
    const matchingEvents = events.filter(event => {
      // Don't double-count events
      if (assignedEventIds.has(event.id)) return false
      
      const titleLower = event.title.toLowerCase()
      const descLower = (event.description || '').toLowerCase()
      const searchText = `${titleLower} ${descLower}`
      
      return topic.keywords.some(kw => searchText.includes(kw))
    })
    
    // Mark events as assigned to prevent duplication
    matchingEvents.forEach(e => assignedEventIds.add(e.id))
    
    // Calculate stats
    const recentEvents = matchingEvents.filter(e => now - e.timestamp < recentWindow)
    const avgSeverity = matchingEvents.length > 0
      ? matchingEvents.reduce((sum, e) => sum + (e.severity || 0), 0) / matchingEvents.length
      : 0
    
    detectedTopics.push({
      ...topic,
      eventCount: matchingEvents.length,
      avgSeverity,
      isActive: recentEvents.length > 0 || (topic.alwaysActive ?? false), // Always active topics are always active
      searchVolume24h: 'searchVolume24h' in topic ? topic.searchVolume24h : undefined,
      searchVolume7d: 'searchVolume7d' in topic ? topic.searchVolume7d : undefined,
      trendDirection: 'trendDirection' in topic ? topic.trendDirection : undefined,
    })
  }
  
  // Sort by priority (highest first), then by event count
  detectedTopics.sort((a, b) => {
    // Always-active topics first
    if (a.alwaysActive && !b.alwaysActive) return -1
    if (!a.alwaysActive && b.alwaysActive) return 1
    
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.eventCount - a.eventCount
  })
  
  // Filter: Always include always-active topics, filter others
  const alwaysActive = detectedTopics.filter(t => t.alwaysActive)
  const others = detectedTopics.filter(t => !t.alwaysActive && (t.eventCount > 0 || t.isActive))
  
  // Ensure 5-7 active topics total
  const MIN_ACTIVE_TOPICS = 5
  const MAX_ACTIVE_TOPICS = 7
  
  let activeTopics = [...alwaysActive, ...others]
  
  // If we have fewer than MIN_ACTIVE_TOPICS, boost trending topics
  if (activeTopics.length < MIN_ACTIVE_TOPICS) {
    // First, try to add topics with events (even if not recently active)
    const inactiveButHasEvents = detectedTopics.filter(t => 
      !t.alwaysActive && 
      !activeTopics.find(at => at.id === t.id) &&
      t.eventCount > 0
    )
    activeTopics.push(...inactiveButHasEvents.slice(0, MIN_ACTIVE_TOPICS - activeTopics.length))
    
    // If still not enough, create synthetic topics from top keywords
    if (activeTopics.length < MIN_ACTIVE_TOPICS) {
      const topKeywords = getTopKeywords(events, MIN_ACTIVE_TOPICS - activeTopics.length)
      for (const keyword of topKeywords) {
        // Check if keyword already covered
        const alreadyCovered = activeTopics.some(t => 
          t.keywords.some(kw => kw.toLowerCase() === keyword.toLowerCase())
        )
        if (!alreadyCovered) {
          activeTopics.push({
            id: `synthetic-${keyword}`,
            name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            keywords: [keyword],
            category: 'trending',
            priority: 45,
            eventCount: events.filter(e => 
              `${e.title} ${e.description || ''}`.toLowerCase().includes(keyword.toLowerCase())
            ).length,
            avgSeverity: 5,
            isActive: true,
          })
        }
        if (activeTopics.length >= MIN_ACTIVE_TOPICS) break
      }
    }
  }
  
  // Limit to MAX_ACTIVE_TOPICS, prioritizing by priority and event count
  activeTopics.sort((a, b) => {
    if (a.alwaysActive && !b.alwaysActive) return -1
    if (!a.alwaysActive && b.alwaysActive) return 1
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.eventCount - a.eventCount
  })
  activeTopics = activeTopics.slice(0, MAX_ACTIVE_TOPICS)
  
  return activeTopics
}

/**
 * Get top keywords from events for synthetic topic generation
 */
function getTopKeywords(events: Event[], count: number): string[] {
  const keywordCounts = new Map<string, number>()
  
  for (const event of events) {
    const keywords = extractKeywords(event.title)
    for (const keyword of keywords) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1)
    }
  }
  
  // Exclude common words and fixed topic keywords
  const fixedKeywords = new Set(FIXED_TOPICS.flatMap(t => t.keywords))
  const commonWords = new Set(['news', 'report', 'update', 'latest', 'breaking', 'world', 'global'])
  
  return Array.from(keywordCounts.entries())
    .filter(([keyword]) => !fixedKeywords.has(keyword) && !commonWords.has(keyword))
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([keyword]) => keyword)
}

/**
 * Get events for a specific topic
 */
export function getEventsForTopic(events: Event[], topic: TopicDefinition): Event[] {
  return events.filter(event => {
    const titleLower = event.title.toLowerCase()
    const descLower = (event.description || '').toLowerCase()
    const searchText = `${titleLower} ${descLower}`
    
    return topic.keywords.some(kw => searchText.includes(kw))
  }).sort((a, b) => b.timestamp - a.timestamp) // Most recent first
}
