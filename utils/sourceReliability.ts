/**
 * Source Reliability Scoring
 * 
 * Tiered source reliability system for event prioritization.
 * Higher tier sources get higher weight in ML algorithms.
 */

import { Event } from '@/types/event'

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

/**
 * Get source tier label
 */
export function getSourceTierLabel(score: number): string {
  if (score >= 1.0) return 'Tier 1'
  if (score >= 0.8) return 'Tier 2'
  if (score >= 0.6) return 'Tier 3'
  return 'Tier 4'
}
