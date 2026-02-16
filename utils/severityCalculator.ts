/**
 * Severity Calculator
 * 
 * Calculates meaningful severity ratings (0-10) based on:
 * - Event type (base severity)
 * - Recency (recent = higher)
 * - Source reliability (tier 1 = higher)
 * - Geographic impact (widespread = higher)
 * - Keyword analysis (critical words = higher)
 */

import { Event, EventType } from '@/types/event'

/**
 * Calculate meaningful severity for an event
 * Returns 0-10 scale that correlates to actual event importance
 */
export function calculateMeaningfulSeverity(event: Event): number {
  let severity = 5 // Base moderate
  
  // 1. Event type base severity (0-9 points)
  const typeBase: Partial<Record<EventType, number>> = {
    'breaking': 7,
    'armed-conflict': 8,
    'terrorism': 9,
    'civil-unrest': 7,
    'crime': 6,
    'earthquake': 6,
    'natural-disaster': 7,
    'volcano': 8,
    'tsunami': 9,
    'wildfire': 6,
    'storm': 5,
    'flood': 5,
    'politics': 5,
    'business': 4,
    'technology': 3,
    'science': 4,
    'health': 5,
    'sports': 2,
    'entertainment': 2,
    'other': 3,
  }
  
  severity = typeBase[event.type] || 5
  
  // 2. Recency boost (0-2 points)
  const hoursAgo = (Date.now() - event.timestamp) / (1000 * 60 * 60)
  if (hoursAgo < 6) {
    severity += 2 // Very recent
  } else if (hoursAgo < 24) {
    severity += 1 // Recent
  } else if (hoursAgo > 168) { // 7 days
    severity -= 1 // Old news
  }
  
  // 3. Source reliability (0-1 point)
  const sourceTier = event.metadata?.sourceTier as number | undefined
  if (sourceTier === 1) {
    severity += 1 // Tier 1 sources boost
  } else if (sourceTier === 3) {
    severity -= 0.5 // Tier 3 sources reduce slightly
  }
  
  // 4. Keyword analysis (0-2 points)
  const text = `${event.title} ${event.description || ''}`.toLowerCase()
  
  // Critical keywords
  if (text.match(/\b(critical|urgent|breaking|major|catastrophic|devastating|massive|widespread)\b/)) {
    severity += 2
  } else if (text.match(/\b(important|significant|serious|severe|extensive)\b/)) {
    severity += 1
  }
  
  // Casualty/impact indicators
  if (text.match(/\b(killed|deaths|casualties|fatalities|injured|hundreds|thousands|millions)\b/)) {
    severity += 1
  }
  
  // 5. Geographic spread (0-1 point)
  // If multiple countries/regions mentioned, higher impact
  const countryMentions = (text.match(/\b(country|countries|nation|nations|region|regions|global|international|worldwide)\b/g) || []).length
  if (countryMentions >= 2) {
    severity += 1
  }
  
  // 6. Ongoing events boost
  if (event.isOngoing) {
    severity += 0.5
  }
  
  // 7. Article count (more coverage = higher importance)
  const articleCount = event.articleCount || 1
  if (articleCount >= 10) {
    severity += 1
  } else if (articleCount >= 5) {
    severity += 0.5
  }
  
  // Clamp to valid range (0-10)
  return Math.min(10, Math.max(0, Math.round(severity * 10) / 10))
}

/**
 * Get severity label and color
 */
export function getSeverityInfo(severity: number): { label: string; color: string; level: 'critical' | 'high' | 'medium' | 'low' } {
  if (severity >= 8) {
    return { label: 'Critical', color: '#ef4444', level: 'critical' }
  }
  if (severity >= 6) {
    return { label: 'High', color: '#f59e0b', level: 'high' }
  }
  if (severity >= 4) {
    return { label: 'Medium', color: '#3b82f6', level: 'medium' }
  }
  return { label: 'Low', color: '#6b7280', level: 'low' }
}

/**
 * Recalculate severity for all events in an array
 */
export function recalculateSeverities(events: Event[]): Event[] {
  return events.map(event => ({
    ...event,
    severity: calculateMeaningfulSeverity(event) as any,
  }))
}
