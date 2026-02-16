/**
 * Content Generator Utility
 * 
 * Generates summaries, insights, and related content for Situation Room.
 * Template-based approach (can be enhanced with AI API later).
 */

import { Event, EventType } from '@/types/event'
import { capitalizePlace } from './capitalization'

// ============================================================================
// CATEGORY SUMMARIES
// ============================================================================

export interface CategorySummary {
  title: string
  summary: string
  keyPoints: string[]
  trend: 'up' | 'down' | 'stable'
  relatedTopics: string[]
}

/**
 * Generate summary for a specific category
 */
export function generateCategorySummary(events: Event[], category: string): CategorySummary {
  if (events.length === 0) {
    return generateEmptyCategorySummary(category)
  }
  
  // Sort by recency and priority
  const sorted = [...events].sort((a, b) => {
    const priorityA = (a.metadata?.priorityScore as number) || 0
    const priorityB = (b.metadata?.priorityScore as number) || 0
    if (priorityB !== priorityA) return priorityB - priorityA
    return b.timestamp - a.timestamp
  })
  
  const recent = sorted.slice(0, 5)
  const highPriority = sorted.filter(e => (e.metadata?.priorityScore as number) >= 70)
  
  // Extract key information
  const locations = new Set<string>()
  const sources = new Set<string>()
  const timeRange = sorted.length > 0 
    ? {
        oldest: Math.min(...sorted.map(e => e.timestamp)),
        newest: Math.max(...sorted.map(e => e.timestamp)),
      }
    : null
  
  sorted.forEach(event => {
    const location = capitalizePlace(event.metadata?.locationName as string || event.metadata?.country as string)
    if (location) locations.add(location)
    if (event.source) sources.add(event.source)
  })
  
  // Determine trend
  const now = Date.now()
  const last24h = sorted.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000).length
  const prev24h = sorted.filter(e => {
    const age = now - e.timestamp
    return age >= 24 * 60 * 60 * 1000 && age < 48 * 60 * 60 * 1000
  }).length
  
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (last24h > prev24h * 1.2) trend = 'up'
  else if (last24h < prev24h * 0.8) trend = 'down'
  
  // Generate title and summary
  const title = generateCategoryTitle(category, sorted.length, highPriority.length, trend)
  const summary = generateCategorySummaryText(category, sorted.length, recent, locations, sources, trend)
  const keyPoints = extractKeyPoints(recent, category)
  const relatedTopics = findRelatedTopics(category, sorted)
  
  return {
    title,
    summary,
    keyPoints,
    trend,
    relatedTopics,
  }
}

function generateCategoryTitle(
  category: string,
  totalCount: number,
  highPriorityCount: number,
  trend: 'up' | 'down' | 'stable'
): string {
  const trendText = trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Steady'
  
  if (highPriorityCount > 0) {
    return `${category.charAt(0).toUpperCase() + category.slice(1)}: ${highPriorityCount} High-Priority Developments`
  }
  
  if (totalCount === 0) {
    return `${category.charAt(0).toUpperCase() + category.slice(1)}: Monitoring`
  }
  
  return `${category.charAt(0).toUpperCase() + category.slice(1)}: ${trendText} Activity (${totalCount} events)`
}

function generateCategorySummaryText(
  category: string,
  count: number,
  recent: Event[],
  locations: Set<string>,
  sources: Set<string>,
  trend: 'up' | 'down' | 'stable'
): string {
  if (count === 0) {
    return `No recent developments in ${category}. Monitoring for updates.`
  }
  
  const locationList = Array.from(locations).slice(0, 3)
  const locationText = locationList.length > 0 
    ? `Key regions: ${locationList.join(', ')}${locations.size > 3 ? ` and ${locations.size - 3} more` : ''}.`
    : ''
  
  const topEvent = recent[0]
  const topEventText = topEvent 
    ? `Most significant: ${topEvent.title.substring(0, 100)}${topEvent.title.length > 100 ? '...' : ''}.`
    : ''
  
  const trendText = trend === 'up' 
    ? 'Activity is increasing' 
    : trend === 'down' 
    ? 'Activity is decreasing'
    : 'Activity remains steady'
  
  return `${trendText} with ${count} ${count === 1 ? 'event' : 'events'} tracked. ${topEventText} ${locationText} Coverage from ${sources.size} ${sources.size === 1 ? 'source' : 'sources'}.`
}

function extractKeyPoints(events: Event[], category: string): string[] {
  const points: string[] = []
  
  for (const event of events.slice(0, 3)) {
    const location = event.metadata?.locationName as string || event.metadata?.country as string || 'Global'
    const timeAgo = formatTimeAgo(event.timestamp)
    points.push(`${location}: ${event.title.substring(0, 60)}${event.title.length > 60 ? '...' : ''} (${timeAgo})`)
  }
  
  return points
}

function findRelatedTopics(category: string, events: Event[]): string[] {
  const related: Record<string, string[]> = {
    markets: ['economy', 'business', 'technology'],
    economy: ['markets', 'politics', 'business'],
    politics: ['diplomacy', 'security', 'economy'],
    security: ['politics', 'armed-conflict', 'terrorism'],
    technology: ['science', 'business', 'health'],
    energy: ['climate', 'economy', 'politics'],
    climate: ['natural-disaster', 'energy', 'health'],
    diplomacy: ['politics', 'security', 'economy'],
    health: ['science', 'technology', 'climate'],
    science: ['technology', 'health', 'climate'],
  }
  
  return related[category] || []
}

function generateEmptyCategorySummary(category: string): CategorySummary {
  const fallbacks: Record<string, CategorySummary> = {
    markets: {
      title: 'Markets: Monitoring Global Activity',
      summary: 'No major market-moving events in the last 24 hours. Major indices showing normal trading patterns. Monitoring for policy changes, earnings reports, and economic indicators.',
      keyPoints: [
        'Global markets operating normally',
        'No significant volatility detected',
        'Standard trading activity ongoing',
      ],
      trend: 'stable',
      relatedTopics: ['economy', 'business'],
    },
    science: {
      title: 'Science: Research & Discovery Updates',
      summary: 'Monitoring scientific developments across research institutions worldwide. Recent focus areas include space exploration, medical breakthroughs, and climate research.',
      keyPoints: [
        'Research activity ongoing globally',
        'Multiple institutions reporting findings',
        'Breakthrough discoveries tracked regularly',
      ],
      trend: 'stable',
      relatedTopics: ['technology', 'health'],
    },
    entertainment: {
      title: 'Entertainment: Global Cultural Events',
      summary: 'Tracking entertainment industry news, cultural events, and feel-good stories from around the world. Celebrating achievements in arts, music, film, and sports.',
      keyPoints: [
        'Cultural events worldwide',
        'Entertainment industry updates',
        'Positive stories from all regions',
      ],
      trend: 'stable',
      relatedTopics: ['sports', 'technology'],
    },
  }
  
  return fallbacks[category] || {
    title: `${category.charAt(0).toUpperCase() + category.slice(1)}: Monitoring`,
    summary: `No recent developments in ${category}. System monitoring for updates and new information.`,
    keyPoints: ['Monitoring for updates', 'No current activity', 'System active'],
    trend: 'stable',
    relatedTopics: [],
  }
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  magnitude: number // 0-1
  timeframe: string
  description: string
}

/**
 * Identify trends across events
 */
export function generateTrendAnalysis(events: Event[]): TrendAnalysis {
  if (events.length === 0) {
    return {
      direction: 'stable',
      magnitude: 0,
      timeframe: '24 hours',
      description: 'No activity to analyze',
    }
  }
  
  const now = Date.now()
  const buckets = {
    last6h: events.filter(e => now - e.timestamp < 6 * 60 * 60 * 1000).length,
    last12h: events.filter(e => {
      const age = now - e.timestamp
      return age >= 6 * 60 * 60 * 1000 && age < 12 * 60 * 60 * 1000
    }).length,
    last24h: events.filter(e => {
      const age = now - e.timestamp
      return age >= 12 * 60 * 60 * 1000 && age < 24 * 60 * 60 * 1000
    }).length,
  }
  
  const recent = buckets.last6h + buckets.last12h
  const older = buckets.last24h
  
  let direction: 'up' | 'down' | 'stable' = 'stable'
  let magnitude = 0
  
  if (recent > older * 1.3) {
    direction = 'up'
    magnitude = Math.min(1, (recent - older) / (older || 1))
  } else if (recent < older * 0.7) {
    direction = 'down'
    magnitude = Math.min(1, (older - recent) / (recent || 1))
  }
  
  const descriptions = {
    up: `Activity increased ${Math.round(magnitude * 100)}% in the last 12 hours`,
    down: `Activity decreased ${Math.round(magnitude * 100)}% in the last 12 hours`,
    stable: 'Activity levels remain consistent',
  }
  
  return {
    direction,
    magnitude,
    timeframe: '24 hours',
    description: descriptions[direction],
  }
}

// ============================================================================
// RELATED ARTICLES
// ============================================================================

/**
 * Find related articles for an event
 */
export function findRelatedArticles(event: Event, allEvents: Event[]): Event[] {
  const related: Event[] = []
  const eventKeywords = extractKeywords(event.title)
  
  for (const candidate of allEvents) {
    if (candidate.id === event.id) continue
    
    // Check category match
    if (candidate.type === event.type) {
      related.push(candidate)
      continue
    }
    
    // Check keyword overlap
    const candidateKeywords = extractKeywords(candidate.title)
    const commonKeywords = eventKeywords.filter(k => candidateKeywords.includes(k))
    
    if (commonKeywords.length >= 2) {
      related.push(candidate)
    }
    
    // Check location proximity
    if (event.latitude && event.longitude && candidate.latitude && candidate.longitude) {
      const distance = haversineDistance(
        event.latitude,
        event.longitude,
        candidate.latitude,
        candidate.longitude
      )
      
      if (distance < 200) { // Within 200 miles
        related.push(candidate)
      }
    }
  }
  
  // Sort by relevance and return top 5
  return related
    .sort((a, b) => {
      const scoreA = calculateRelevanceScore(event, a)
      const scoreB = calculateRelevanceScore(event, b)
      return scoreB - scoreA
    })
    .slice(0, 5)
}

function calculateRelevanceScore(event: Event, candidate: Event): number {
  let score = 0
  
  // Same category
  if (candidate.type === event.type) score += 10
  
  // Keyword overlap
  const eventKeywords = extractKeywords(event.title)
  const candidateKeywords = extractKeywords(candidate.title)
  const commonKeywords = eventKeywords.filter(k => candidateKeywords.includes(k))
  score += commonKeywords.length * 2
  
  // Location proximity
  if (event.latitude && event.longitude && candidate.latitude && candidate.longitude) {
    const distance = haversineDistance(
      event.latitude,
      event.longitude,
      candidate.latitude,
      candidate.longitude
    )
    if (distance < 200) score += 5
  }
  
  // Recency
  const timeDiff = Math.abs(event.timestamp - candidate.timestamp)
  if (timeDiff < 24 * 60 * 60 * 1000) score += 3
  
  return score
}

// ============================================================================
// INSIGHTS
// ============================================================================

export interface Insight {
  type: 'pattern' | 'anomaly' | 'trend' | 'correlation'
  title: string
  description: string
  confidence: number // 0-1
}

/**
 * Generate key insights and patterns
 */
export function generateInsights(events: Event[]): Insight[] {
  const insights: Insight[] = []
  
  if (events.length === 0) return insights
  
  // Pattern: Geographic clustering
  const regionCounts = new Map<string, number>()
  events.forEach(event => {
    const region = getGeographicRegion(event)
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
  })
  
  const topRegion = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]
  
  if (topRegion && topRegion[1] > events.length * 0.4) {
    insights.push({
      type: 'pattern',
      title: 'Geographic Concentration',
      description: `${Math.round((topRegion[1] / events.length) * 100)}% of events are occurring in ${topRegion[0]}`,
      confidence: 0.8,
    })
  }
  
  // Trend: Time-based patterns
  const now = Date.now()
  const recentCount = events.filter(e => now - e.timestamp < 6 * 60 * 60 * 1000).length
  const olderCount = events.filter(e => {
    const age = now - e.timestamp
    return age >= 6 * 60 * 60 * 1000 && age < 12 * 60 * 60 * 1000
  }).length
  
  if (recentCount > olderCount * 1.5) {
    insights.push({
      type: 'trend',
      title: 'Accelerating Activity',
      description: `Event frequency has increased ${Math.round(((recentCount - olderCount) / (olderCount || 1)) * 100)}% in the last 6 hours`,
      confidence: 0.7,
    })
  }
  
  // Correlation: Category relationships
  const categoryPairs = new Map<string, number>()
  events.forEach(event => {
    const related = findRelatedTopics(event.type, events)
    related.forEach(relatedCategory => {
      const key = [event.type, relatedCategory].sort().join('-')
      categoryPairs.set(key, (categoryPairs.get(key) || 0) + 1)
    })
  })
  
  const topPair = Array.from(categoryPairs.entries())
    .sort((a, b) => b[1] - a[1])[0]
  
  if (topPair && topPair[1] >= 3) {
    const [cat1, cat2] = topPair[0].split('-')
    insights.push({
      type: 'correlation',
      title: 'Category Correlation',
      description: `${cat1} and ${cat2} events are frequently occurring together`,
      confidence: 0.6,
    })
  }
  
  return insights.slice(0, 3) // Return top 3 insights
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
  ])
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5)
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const toRad = (deg: number) => deg * (Math.PI / 180)
  
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

function getGeographicRegion(event: Event): string {
  const { latitude, longitude } = event
  
  if (latitude >= 15 && latitude <= 75 && longitude >= -180 && longitude <= -50) {
    return 'North America'
  }
  if (latitude >= -60 && latitude <= 15 && longitude >= -90 && longitude <= -30) {
    return 'South America'
  }
  if (latitude >= 35 && latitude <= 75 && longitude >= -15 && longitude <= 40) {
    return 'Europe'
  }
  if (latitude >= -35 && latitude <= 35 && longitude >= -20 && longitude <= 55) {
    return 'Africa'
  }
  if (latitude >= -10 && latitude <= 75 && longitude >= 40 && longitude <= 180) {
    return 'Asia'
  }
  if (latitude >= -50 && latitude <= 0 && longitude >= 110 && longitude <= 180) {
    return 'Oceania'
  }
  
  return 'Other'
}
