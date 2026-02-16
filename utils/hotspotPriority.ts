/**
 * Hotspot & Priority Algorithm
 * 
 * ML/Statistical weighting system for event prioritization.
 * Combines multiple signals to identify high-priority events:
 * - Source reliability
 * - Recency (exponential decay)
 * - Category relevance
 * - Ripple effects (cross-category influence)
 * - Global trend analysis
 */

import { Event } from '@/types/event'

// ============================================================================
// SOURCE RELIABILITY SCORING
// ============================================================================

/**
 * Source reliability tiers (0-1 scale)
 */
const SOURCE_TIERS: Record<string, number> = {
  // Tier 1 (1.0): Premium sources
  'reuters': 1.0,
  'associated press': 1.0,
  'ap news': 1.0,
  'bbc': 1.0,
  'bbc news': 1.0,
  'new york times': 1.0,
  'nytimes': 1.0,
  'the new york times': 1.0,
  
  // Tier 2 (0.8): High-quality sources
  'al jazeera': 0.8,
  'the guardian': 0.8,
  'guardian': 0.8,
  'wall street journal': 0.8,
  'wsj': 0.8,
  'washington post': 0.8,
  'wapo': 0.8,
  'cnn': 0.8,
  'financial times': 0.8,
  'ft': 0.8,
  
  // Tier 3 (0.6): Regional/established sources
  'ap': 0.6,
  'afp': 0.6,
  'bloomberg': 0.6,
  'time': 0.6,
  'newsweek': 0.6,
  'usatoday': 0.6,
  'usa today': 0.6,
  
  // Tier 4 (0.4): Aggregators, blogs, unknown
  'default': 0.4,
}

/**
 * Get source reliability score (0-1)
 */
export function getSourceReliability(event: Event): number {
  const source = (event.metadata?.source as string || event.source || '').toLowerCase().trim()
  
  if (!source) return SOURCE_TIERS['default']
  
  // Direct match
  if (SOURCE_TIERS[source]) {
    return SOURCE_TIERS[source]
  }
  
  // Partial match (check if source contains tier keywords)
  for (const [key, score] of Object.entries(SOURCE_TIERS)) {
    if (key !== 'default' && source.includes(key)) {
      return score
    }
  }
  
  return SOURCE_TIERS['default']
}

// ============================================================================
// RECENCY WEIGHTING
// ============================================================================

/**
 * Recency weight using exponential decay
 * Formula: exp(-hoursSinceEvent / decayConstant)
 * decayConstant = 24 (half-life of ~17 hours)
 */
const DECAY_CONSTANT = 24

export function getRecencyWeight(event: Event): number {
  const now = Date.now()
  const hoursSinceEvent = (now - event.timestamp) / (1000 * 60 * 60)
  
  // Exponential decay: more recent = higher weight
  const weight = Math.exp(-hoursSinceEvent / DECAY_CONSTANT)
  
  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, weight))
}

// ============================================================================
// CATEGORY RELEVANCE
// ============================================================================

/**
 * Category relevance scoring (context-aware)
 * Some categories are inherently more important in certain contexts
 */
const CATEGORY_RELEVANCE: Record<string, number> = {
  // High relevance (1.0)
  'armed-conflict': 1.0,
  'terrorism': 1.0,
  'breaking': 1.0,
  
  // Medium-high (0.8)
  'security': 0.8,
  'civil-unrest': 0.8,
  'politics': 0.8,
  
  // Medium (0.6)
  'business': 0.6,
  'markets': 0.6,
  'economy': 0.6,
  'natural-disaster': 0.6,
  'earthquake': 0.6,
  
  // Lower (0.4)
  'technology': 0.4,
  'health': 0.4,
  'climate': 0.4,
  'science': 0.4,
  'entertainment': 0.4,
  'sports': 0.4,
  
  // Default
  'other': 0.3,
}

export function getCategoryRelevance(event: Event): number {
  return CATEGORY_RELEVANCE[event.type] || CATEGORY_RELEVANCE['other']
}

// ============================================================================
// RIPPLE EFFECT CALCULATION
// ============================================================================

/**
 * Detect ripple effects: events that trigger activity in other categories
 * Example: Political event → Market reaction → Security response
 * 
 * Returns multiplier (1.0 = no ripple, 1.3 = strong ripple)
 */
export function getRippleEffect(event: Event, allEvents: Event[]): number {
  // Check if this event has related events in other categories within 24 hours
  const eventTime = event.timestamp
  const timeWindow = 24 * 60 * 60 * 1000 // 24 hours in ms
  
  const relatedEvents = allEvents.filter(e => {
    if (e.id === event.id) return false
    
    const timeDiff = Math.abs(e.timestamp - eventTime)
    if (timeDiff > timeWindow) return false
    
    // Check if events are in same region (within ~500 miles)
    const distance = haversineDistance(
      event.latitude,
      event.longitude,
      e.latitude,
      e.longitude
    )
    
    return distance < 500 && e.type !== event.type
  })
  
  // If event has related events in different categories, it's a ripple event
  if (relatedEvents.length > 0) {
    // More related events = stronger ripple
    const rippleStrength = Math.min(1.3, 1.0 + (relatedEvents.length * 0.05))
    return rippleStrength
  }
  
  return 1.0
}

/**
 * Haversine distance calculation (miles)
 */
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

// ============================================================================
// GLOBAL TREND ANALYSIS
// ============================================================================

/**
 * Identify trending topics across all events
 * Uses simple frequency analysis + time decay
 * Returns boost factor (1.0 = no trend, 1.2 = trending)
 */
export function getGlobalTrendBoost(event: Event, allEvents: Event[]): number {
  const eventType = event.type
  const now = Date.now()
  const timeWindow = 7 * 24 * 60 * 60 * 1000 // 7 days
  
  // Count events of same type in recent time window
  const recentSameType = allEvents.filter(e => {
    if (e.type !== eventType) return false
    const timeDiff = now - e.timestamp
    return timeDiff <= timeWindow
  }).length
  
  // More events of same type = stronger trend
  // Threshold: 5+ events in 7 days = trending
  if (recentSameType >= 5) {
    const trendStrength = Math.min(1.2, 1.0 + ((recentSameType - 5) * 0.02))
    return trendStrength
  }
  
  return 1.0
}

// ============================================================================
// PRIORITY SCORE CALCULATION
// ============================================================================

export interface PriorityScore {
  score: number
  breakdown: {
    sourceReliability: number
    recencyWeight: number
    categoryRelevance: number
    rippleEffect: number
    globalTrend: number
    baseSeverity: number
  }
}

/**
 * Calculate comprehensive priority score for an event
 * 
 * Formula:
 * priorityScore = (
 *   sourceReliability * 0.25 +
 *   recencyWeight * 0.20 +
 *   categoryRelevance * 0.15 +
 *   rippleEffect * 0.20 +
 *   globalTrend * 0.20
 * ) * baseSeverity
 */
export function calculatePriorityScore(
  event: Event,
  allEvents: Event[] = []
): PriorityScore {
  const sourceReliability = getSourceReliability(event)
  const recencyWeight = getRecencyWeight(event)
  const categoryRelevance = getCategoryRelevance(event)
  const rippleEffect = getRippleEffect(event, allEvents)
  const globalTrend = getGlobalTrendBoost(event, allEvents)
  
  // Base severity (normalized 0-1)
  const baseSeverity = Math.min(1.0, event.severity / 10)
  
  // Weighted combination
  const weightedScore = (
    sourceReliability * 0.25 +
    recencyWeight * 0.20 +
    categoryRelevance * 0.15 +
    (rippleEffect - 1.0) * 0.20 + // Ripple is multiplier, subtract 1 for additive
    (globalTrend - 1.0) * 0.20    // Trend is multiplier, subtract 1 for additive
  )
  
  // Final score: weighted combination * base severity * ripple * trend
  const finalScore = weightedScore * baseSeverity * rippleEffect * globalTrend
  
  return {
    score: Math.max(0, Math.min(100, finalScore * 100)), // Scale to 0-100
    breakdown: {
      sourceReliability,
      recencyWeight,
      categoryRelevance,
      rippleEffect,
      globalTrend,
      baseSeverity,
    },
  }
}

/**
 * Sort events by priority score (highest first)
 * @param events Events to sort
 * @param allEvents All events in the system (for ripple effect and trend calculation)
 */
export function sortEventsByPriority(events: Event[], allEvents: Event[] = events): Event[] {
  // Calculate priority scores for all events
  // Use allEvents for accurate ripple effect and global trend analysis
  const eventsWithScores = events.map(event => ({
    event,
    priority: calculatePriorityScore(event, allEvents),
  }))
  
  // Sort by priority score
  eventsWithScores.sort((a, b) => b.priority.score - a.priority.score)
  
  // Add priority score to event metadata
  return eventsWithScores.map(({ event, priority }) => ({
    ...event,
    metadata: {
      ...event.metadata,
      priorityScore: priority.score,
      priorityBreakdown: priority.breakdown,
    },
  }))
}

/**
 * Get hotspot events (top N by priority)
 */
export function getHotspotEvents(events: Event[], limit: number = 10): Event[] {
  const sorted = sortEventsByPriority(events)
  return sorted.slice(0, limit)
}
