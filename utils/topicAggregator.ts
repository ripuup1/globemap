/**
 * Topic Aggregator
 * 
 * Aggregates events into topic digests with:
 * - Timeline data (chronological events)
 * - Key statistics (event count, severity, sources)
 * - Digest summary (key points extracted from titles)
 */

import { Event } from '@/types/event'
import { DetectedTopic, getEventsForTopic } from './topicDetector'
import { calculateMeaningfulSeverity } from './severityCalculator'

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineEvent {
  id: string
  title: string
  timestamp: number
  source: string
  severity: number
  url?: string
  location?: string
}

export interface TopicStats {
  eventCount: number
  sourceCount: number
  avgSeverity: number
  severityDistribution: {
    critical: number
    high: number
    medium: number
    low: number
  }
  geographicSpread: string[]
  timespan: {
    oldest: number
    newest: number
  }
}

export interface TopicDigest {
  id: string
  name: string
  category: string
  eventCount: number
  timeline: TimelineEvent[]
  keyPoints: string[]
  summary: string // AI-style summary paragraph
  stats: TopicStats
  articles: ArticleSummary[]
  relatedTopics?: string[] // Related topic IDs
  lastUpdated: number
  searchVolume24h?: number // Google search volume (24 hours)
  searchVolume7d?: number // Google search volume (7 days)
  trendDirection?: 'up' | 'down' | 'stable' // Search trend direction
}

export interface ArticleSummary {
  id: string
  title: string
  source: string
  timestamp: number
  url?: string
  excerpt?: string
  severity: number
}

// ============================================================================
// KEY POINT EXTRACTION
// ============================================================================

/**
 * Extract key points from event titles for digest summary
 */
function extractKeyPoints(events: Event[], maxPoints: number = 5): string[] {
  if (events.length === 0) return []
  
  // Sort by severity and recency
  const sorted = [...events].sort((a, b) => {
    const severityDiff = (b.severity || 0) - (a.severity || 0)
    if (severityDiff !== 0) return severityDiff
    return b.timestamp - a.timestamp
  })
  
  // Extract unique key points from titles
  const keyPoints: string[] = []
  const seenPatterns = new Set<string>()
  
  for (const event of sorted) {
    if (keyPoints.length >= maxPoints) break
    
    // Clean and normalize title
    let title = event.title
      .replace(/^(breaking|update|report|news):\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Skip if too similar to existing points
    const titleWords = title.toLowerCase().split(' ').slice(0, 5).join(' ')
    if (seenPatterns.has(titleWords)) continue
    seenPatterns.add(titleWords)
    
    // Truncate if too long
    if (title.length > 120) {
      title = title.slice(0, 117) + '...'
    }
    
    keyPoints.push(title)
  }
  
  return keyPoints
}

/**
 * Generate AI-style summary paragraph (2-3 sentences)
 */
function generateSummary(events: Event[], topicName: string): string {
  if (events.length === 0) {
    return `No recent developments for ${topicName}.`
  }
  
  // Get most significant events
  const sorted = [...events].sort((a, b) => {
    const severityA = calculateMeaningfulSeverity(a)
    const severityB = calculateMeaningfulSeverity(b)
    if (severityB !== severityA) return severityB - severityA
    return b.timestamp - a.timestamp
  })
  
  const topEvents = sorted.slice(0, 3)
  const eventCount = events.length
  const recentCount = events.filter(e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000).length
  
  // Build summary
  let summary = `${topicName} has seen ${eventCount} ${eventCount === 1 ? 'development' : 'developments'}`
  if (recentCount > 0) {
    summary += `, with ${recentCount} ${recentCount === 1 ? 'event' : 'events'} in the last 24 hours.`
  } else {
    summary += ' across recent reporting.'
  }
  
  if (topEvents.length > 0) {
    const topEvent = topEvents[0]
    const severity = calculateMeaningfulSeverity(topEvent)
    if (severity >= 7) {
      summary += ` The most significant development involves ${topEvent.title.slice(0, 80)}${topEvent.title.length > 80 ? '...' : ''}.`
    } else if (topEvents.length >= 2) {
      summary += ` Key developments include ${topEvents[0].title.slice(0, 60)}${topEvents[0].title.length > 60 ? '...' : ''} and related updates.`
    }
  }
  
  return summary
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

/**
 * Calculate statistics for a topic's events
 */
function calculateStats(events: Event[]): TopicStats {
  if (events.length === 0) {
    return {
      eventCount: 0,
      sourceCount: 0,
      avgSeverity: 0,
      severityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      geographicSpread: [],
      timespan: { oldest: 0, newest: 0 },
    }
  }
  
  // Count unique sources
  const sources = new Set(events.map(e => e.source || 'Unknown'))
  
  // Calculate severity distribution using meaningful severity
  const severityDistribution = { critical: 0, high: 0, medium: 0, low: 0 }
  let totalSeverity = 0
  
  for (const event of events) {
    // Use meaningful severity calculation instead of raw event.severity
    const severity = calculateMeaningfulSeverity(event)
    totalSeverity += severity
    
    if (severity >= 8) severityDistribution.critical++
    else if (severity >= 6) severityDistribution.high++
    else if (severity >= 4) severityDistribution.medium++
    else severityDistribution.low++
  }
  
  // Get geographic spread
  const locations = new Set<string>()
  for (const event of events) {
    if (event.metadata?.country) {
      locations.add(event.metadata.country as string)
    }
  }
  
  // Get timespan
  const timestamps = events.map(e => e.timestamp).filter(t => t > 0)
  
  return {
    eventCount: events.length,
    sourceCount: sources.size,
    avgSeverity: totalSeverity / events.length,
    severityDistribution,
    geographicSpread: Array.from(locations).slice(0, 5),
    timespan: {
      oldest: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newest: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    },
  }
}

// ============================================================================
// TIMELINE GENERATION
// ============================================================================

/**
 * Generate timeline events from raw events
 * 
 * Uses smart timeline generator for professional, deduplicated timelines
 */
function generateTimeline(events: Event[], maxEvents: number = 20): TimelineEvent[] {
  // Use smart timeline generator for better results (origin to current, no duplicates)
  const { generateOriginToCurrentTimeline } = require('./timelineGenerator')
  const fullTimeline = generateOriginToCurrentTimeline(events)
  return fullTimeline.slice(0, maxEvents)
}

/**
 * Generate article summaries
 * 
 * Note: For enhanced sources, use identifyRelevantSources from aiSourceIdentifier
 * This function provides basic article generation from events
 */
export function generateArticles(events: Event[], maxArticles: number = 15): ArticleSummary[] {
  // Deduplicate by title similarity first
  const deduplicated = events
    .map(event => ({
      id: event.id,
      title: event.title,
      source: event.source || 'Unknown',
      timestamp: event.timestamp,
      url: event.metadata?.url as string | undefined,
      excerpt: event.description?.slice(0, 200),
      severity: calculateMeaningfulSeverity(event), // Use meaningful severity
    }))
  
  // Use deduplicator to remove similar articles
  const { deduplicateByTitleSimilarity } = require('./articleDeduplicator')
  return deduplicateByTitleSimilarity(deduplicated, 0.85).slice(0, maxArticles)
}

// ============================================================================
// MAIN AGGREGATION FUNCTION
// ============================================================================

/**
 * Create a full digest for a topic
 */
export function createTopicDigest(
  topic: DetectedTopic,
  allEvents: Event[]
): TopicDigest {
  // Get events for this topic
  const topicEvents = getEventsForTopic(allEvents, topic)
  
  return {
    id: topic.id,
    name: topic.name,
    category: topic.category,
    eventCount: topicEvents.length,
    timeline: generateTimeline(topicEvents),
    keyPoints: extractKeyPoints(topicEvents, 7), // Increased to 7 key points
    summary: generateSummary(topicEvents, topic.name),
    stats: calculateStats(topicEvents),
    articles: generateArticles(topicEvents, 15), // Increased to 15 articles
    lastUpdated: Date.now(),
    searchVolume24h: topic.searchVolume24h,
    searchVolume7d: topic.searchVolume7d,
    trendDirection: topic.trendDirection,
  }
}

/**
 * Create digests for all detected topics
 */
export function createAllDigests(
  topics: DetectedTopic[],
  events: Event[]
): Map<string, TopicDigest> {
  const digests = new Map<string, TopicDigest>()
  
  for (const topic of topics) {
    digests.set(topic.id, createTopicDigest(topic, events))
  }
  
  return digests
}

/**
 * Format timestamp for display
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return new Date(timestamp).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}

/**
 * Format date for timeline
 */
export function formatTimelineDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get severity label and color
 * Uses severityCalculator for consistency
 */
export function getSeverityInfo(severity: number): { label: string; color: string } {
  // Use same logic as severityCalculator
  if (severity >= 8) return { label: 'Critical', color: '#ef4444' }
  if (severity >= 6) return { label: 'High', color: '#f59e0b' }
  if (severity >= 4) return { label: 'Medium', color: '#3b82f6' }
  return { label: 'Low', color: '#6b7280' }
}
