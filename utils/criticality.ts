/**
 * Criticality Scoring System
 * 
 * Combines multiple factors into a single 0-100 criticality score:
 * - Severity level (0-40 points)
 * - Source trust weight (0-20 points)
 * - Location confidence (0-15 points)
 * - Topic category (0-15 points)
 * - Recency (0-10 points)
 * 
 * Total: 0-100 points
 * 
 * Scoring Logic:
 * ==============
 * 
 * 1. Severity Component (0-40 points):
 *    - Maps severity level (0-10) to 0-40 points
 *    - Formula: severityPoints = severity * 4
 *    - Critical events (8-10) get 32-40 points
 * 
 * 2. Source Trust Component (0-20 points):
 *    - Maps source trust weight (0.6-1.2) to 0-20 points
 *    - Formula: trustPoints = (sourceTrustWeight - 0.6) / 0.6 * 20
 *    - Tier 1 sources (1.1) get ~16.7 points
 *    - Tier 2 sources (0.9) get ~10 points
 *    - Tier 3 sources (0.7) get ~3.3 points
 * 
 * 3. Location Confidence Component (0-15 points):
 *    - Maps location confidence (0.5-1.0) to 0-15 points
 *    - Formula: confidencePoints = (locationConfidence - 0.5) / 0.5 * 15
 *    - High confidence (1.0) gets 15 points
 *    - Medium confidence (0.7) gets 6 points
 *    - Low confidence (0.5) gets 0 points
 * 
 * 4. Topic Category Component (0-15 points):
 *    - Critical types (tsunami, volcano): 15 points
 *    - High types (earthquake, wildfire): 12 points
 *    - Medium types (storm, flood): 8 points
 *    - Other: 5 points
 * 
 * 5. Recency Component (0-10 points):
 *    - Time since event (hours) mapped to 0-10 points
 *    - Formula: recencyPoints = max(0, 10 - (hoursSinceEvent / 24) * 10)
 *    - Events < 24 hours old: 10 points
 *    - Events 24-48 hours: 5 points
 *    - Events > 48 hours: 0 points
 * 
 * Filtering Thresholds:
 * - High Criticality (70-100): Always render, highlight prominently
 * - Medium Criticality (40-69): Render by default
 * - Low Criticality (30-39): Render by default but less prominent
 * - Very Low Criticality (0-29): Suppress by default
 */

import { Event, EventType, SeverityLevel } from '@/types/event'

/**
 * Criticality score breakdown for debugging
 */
export interface CriticalityBreakdown {
  severityPoints: number
  trustPoints: number
  confidencePoints: number
  topicPoints: number
  recencyPoints: number
  totalScore: number
}

/**
 * Criticality score result
 */
export interface CriticalityScoreResult {
  score: number
  breakdown: CriticalityBreakdown
}

/**
 * Calculate severity component (0-40 points)
 * Maps severity level (0-10) to 0-40 points
 */
function calculateSeverityPoints(severity: SeverityLevel): number {
  // Direct mapping: severity * 4
  return severity * 4
}

/**
 * Calculate source trust component (0-20 points)
 * Maps source trust weight (0.6-1.2) to 0-20 points
 */
function calculateTrustPoints(sourceTrustWeight: number | undefined): number {
  if (sourceTrustWeight === undefined || sourceTrustWeight <= 0) {
    // Default to Tier 2 (0.9) if not available
    sourceTrustWeight = 0.9
  }
  
  // Normalize to 0-20 range
  // Formula: (weight - 0.6) / 0.6 * 20
  // Range: 0.6 -> 0 points, 1.2 -> 20 points
  const normalized = (sourceTrustWeight - 0.6) / 0.6
  return Math.max(0, Math.min(20, normalized * 20))
}

/**
 * Calculate location confidence component (0-15 points)
 * Maps location confidence (0.5-1.0) to 0-15 points
 */
function calculateConfidencePoints(locationConfidence: number | undefined): number {
  if (locationConfidence === undefined || locationConfidence <= 0) {
    // Default to medium confidence (0.7) if not available
    locationConfidence = 0.7
  }
  
  // Normalize to 0-15 range
  // Formula: (confidence - 0.5) / 0.5 * 15
  // Range: 0.5 -> 0 points, 1.0 -> 15 points
  const normalized = (locationConfidence - 0.5) / 0.5
  return Math.max(0, Math.min(15, normalized * 15))
}

/**
 * Calculate topic category component (0-15 points)
 * Different event types have different inherent importance
 */
function getTopicCategoryScore(eventType: EventType): number {
  const topicScores: Record<EventType, number> = {
    // Critical types: highest importance
    'breaking': 14,
    'terrorism': 15,
    'armed-conflict': 14,
    'tsunami': 15,
    'volcano': 15,
    
    // High types: significant importance
    'earthquake': 12,
    'wildfire': 12,
    'natural-disaster': 12,
    'crime': 10,
    
    // Medium types: moderate importance
    'civil-unrest': 10,
    'politics': 9,
    'health': 9,
    'storm': 8,
    'flood': 8,
    
    // News types: standard importance
    'business': 7,
    'technology': 7,
    'science': 7,
    'sports': 6,
    'entertainment': 5,
    
    // Fallback
    'other': 5,
  }
  
  return topicScores[eventType] || 5
}

/**
 * Calculate recency component (0-10 points)
 * More recent events get higher scores
 */
function getRecencyScore(timestamp: number): number {
  const now = Date.now()
  const hoursSinceEvent = (now - timestamp) / (1000 * 60 * 60)
  
  // Formula: max(0, 10 - (hoursSinceEvent / 24) * 10)
  // Events < 24 hours: 10 points
  // Events 24-48 hours: 5 points
  // Events > 48 hours: 0 points
  const recencyPoints = Math.max(0, 10 - (hoursSinceEvent / 24) * 10)
  
  return Math.min(10, recencyPoints)
}

/**
 * Calculate criticality score for an event
 * 
 * Combines all components into a single 0-100 score:
 * - Severity: 0-40 points
 * - Source Trust: 0-20 points
 * - Location Confidence: 0-15 points
 * - Topic Category: 0-15 points
 * - Recency: 0-10 points
 * 
 * Total: 0-100 points
 */
export function calculateCriticalityScore(event: Event): CriticalityScoreResult {
  // 1. Severity component (0-40 points)
  const severityPoints = calculateSeverityPoints(event.severity)
  
  // 2. Source trust component (0-20 points)
  const sourceTrustWeight = event.metadata?.sourceTrustWeight as number | undefined
  const trustPoints = calculateTrustPoints(sourceTrustWeight)
  
  // 3. Location confidence component (0-15 points)
  const locationConfidence = event.metadata?.locationConfidence as number | undefined
  const confidencePoints = calculateConfidencePoints(locationConfidence)
  
  // 4. Topic category component (0-15 points)
  const topicPoints = getTopicCategoryScore(event.type)
  
  // 5. Recency component (0-10 points)
  const recencyPoints = getRecencyScore(event.timestamp)
  
  // Calculate total score
  const totalScore = Math.round(
    severityPoints +
    trustPoints +
    confidencePoints +
    topicPoints +
    recencyPoints
  )
  
  // Clamp to 0-100 range
  const clampedScore = Math.max(0, Math.min(100, totalScore))
  
  const breakdown: CriticalityBreakdown = {
    severityPoints: Math.round(severityPoints * 10) / 10,
    trustPoints: Math.round(trustPoints * 10) / 10,
    confidencePoints: Math.round(confidencePoints * 10) / 10,
    topicPoints,
    recencyPoints: Math.round(recencyPoints * 10) / 10,
    totalScore: clampedScore,
  }
  
  return {
    score: clampedScore,
    breakdown,
  }
}

/**
 * Filter events by criticality score
 * 
 * @param events Array of events to filter
 * @param minScore Minimum criticality score to include (default: 30)
 * @returns Filtered array of events meeting the threshold
 */
export function filterEventsByCriticality(
  events: Event[],
  minScore: number = 30
): Event[] {
  return events.filter(event => {
    const criticalityScore = event.metadata?.criticalityScore as number | undefined
    if (criticalityScore === undefined) {
      // If score not calculated, calculate it now
      const result = calculateCriticalityScore(event)
      return result.score >= minScore
    }
    return criticalityScore >= minScore
  })
}

/**
 * Get criticality label from score
 */
export function getCriticalityLabel(score: number): 'very-low' | 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 30) return 'low'
  return 'very-low'
}

/**
 * Get adjusted criticality threshold for an event
 * Non-earthquake events get relaxed thresholds to allow more markers
 * 
 * @param event Event to check
 * @param baseThreshold Base criticality threshold
 * @returns Adjusted threshold (lower for non-earthquake events)
 */
export function getAdjustedCriticalityThreshold(event: Event, baseThreshold: number): number {
  const eventType = event.type
  
  // Breaking news: Always show
  if (eventType === 'breaking') {
    return Math.max(0, baseThreshold - 15)
  }
  
  // Natural disasters: Keep strict threshold
  if (eventType === 'earthquake' || 
      eventType === 'natural-disaster' || 
      eventType === 'volcano' || 
      eventType === 'wildfire' || 
      eventType === 'storm' || 
      eventType === 'tsunami' || 
      eventType === 'flood') {
    return baseThreshold
  }
  
  // Political and civil events: Lower threshold
  if (eventType === 'politics' || eventType === 'civil-unrest') {
    return Math.max(0, baseThreshold - 12)
  }
  
  // Crime and conflict: Moderate threshold
  if (eventType === 'armed-conflict' || eventType === 'terrorism' || eventType === 'crime') {
    return Math.max(0, baseThreshold - 8)
  }
  
  // News categories: Relaxed threshold
  if (eventType === 'sports' || 
      eventType === 'entertainment' || 
      eventType === 'business' || 
      eventType === 'technology' ||
      eventType === 'health' ||
      eventType === 'science') {
    return Math.max(0, baseThreshold - 10)
  }
  
  // Default: slight relaxation
  return Math.max(0, baseThreshold - 5)
}
