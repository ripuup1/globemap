/**
 * Smart Timeline Generator
 * 
 * Generates professional, relevant timelines with:
 * - No duplicate articles
 * - Chronological ordering
 * - Significant event selection
 * - Origin to current coverage
 */

import { Event } from '@/types/event'
import { TimelineEvent } from './topicAggregator'
import { deduplicateTimelineEvents } from './articleDeduplicator'
import { calculateMeaningfulSeverity } from './severityCalculator'

const MAX_TIMELINE_EVENTS = 40

/**
 * Generate smart timeline from events
 * 
 * Prioritizes:
 * 1. Origin event (first chronologically)
 * 2. Recent events (last 7 days)
 * 3. Highest severity events
 * 4. Evenly distributed milestones
 */
export function generateSmartTimeline(events: Event[]): TimelineEvent[] {
  if (events.length === 0) return []
  
  // Sort chronologically
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  
  // Must include: origin event
  const origin = sorted[0]
  const selected: Event[] = [origin]
  const selectedIds = new Set([origin.id])
  
  // Must include: recent events (last 7 days)
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const recent = sorted.filter(e => e.timestamp >= sevenDaysAgo && !selectedIds.has(e.id))
  selected.push(...recent.slice(0, 10)) // Up to 10 recent
  recent.slice(0, 10).forEach(e => selectedIds.add(e.id))
  
  // Must include: highest severity events (using meaningful severity)
  const bySeverity = sorted
    .filter(e => !selectedIds.has(e.id))
    .map(e => ({ event: e, severity: calculateMeaningfulSeverity(e) }))
    .sort((a, b) => b.severity - a.severity)
    .map(item => item.event)
  selected.push(...bySeverity.slice(0, 15)) // Top 15 by severity
  bySeverity.slice(0, 15).forEach(e => selectedIds.add(e.id))
  
  // Fill remaining slots with evenly distributed events across timeline
  const remaining = MAX_TIMELINE_EVENTS - selected.length
  if (remaining > 0) {
    const available = sorted.filter(e => !selectedIds.has(e.id))
    const step = Math.max(1, Math.floor(available.length / remaining))
    
    for (let i = 0; i < available.length && selected.length < MAX_TIMELINE_EVENTS; i += step) {
      selected.push(available[i])
      selectedIds.add(available[i].id)
    }
  }
  
  // Convert to timeline format
  const timeline: TimelineEvent[] = selected
    .sort((a, b) => a.timestamp - b.timestamp) // Chronological order
    .map(event => ({
      id: event.id,
      title: event.title,
      timestamp: event.timestamp,
      source: event.source || 'Unknown',
      severity: calculateMeaningfulSeverity(event),
      url: event.metadata?.url as string | undefined,
      location: event.metadata?.locationName as string | undefined,
    }))
  
  // Deduplicate by title similarity
  return deduplicateTimelineEvents(timeline, 0.85)
}

/**
 * Generate timeline from origin to current
 * 
 * Ensures comprehensive coverage from first event to most recent
 */
export function generateOriginToCurrentTimeline(events: Event[]): TimelineEvent[] {
  if (events.length === 0) return []
  
  // Sort chronologically
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  
  // Select significant milestones across the entire timeline
  const timeline: TimelineEvent[] = []
  const totalDuration = sorted[sorted.length - 1].timestamp - sorted[0].timestamp
  const targetCount = Math.min(MAX_TIMELINE_EVENTS, sorted.length)
  
  // Always include first and last
  timeline.push({
    id: sorted[0].id,
    title: sorted[0].title,
    timestamp: sorted[0].timestamp,
    source: sorted[0].source || 'Unknown',
    severity: calculateMeaningfulSeverity(sorted[0]),
    url: sorted[0].metadata?.url as string | undefined,
    location: sorted[0].metadata?.locationName as string | undefined,
  })
  
  if (sorted.length > 1) {
    timeline.push({
      id: sorted[sorted.length - 1].id,
      title: sorted[sorted.length - 1].title,
      timestamp: sorted[sorted.length - 1].timestamp,
      source: sorted[sorted.length - 1].source || 'Unknown',
      severity: calculateMeaningfulSeverity(sorted[sorted.length - 1]),
      url: sorted[sorted.length - 1].metadata?.url as string | undefined,
      location: sorted[sorted.length - 1].metadata?.locationName as string | undefined,
    })
  }
  
  // Fill middle with evenly distributed + high severity events
  const middleEvents = sorted.slice(1, -1)
  const highSeverity = middleEvents
    .map(e => ({ event: e, severity: calculateMeaningfulSeverity(e) }))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, Math.floor(targetCount / 2))
    .map(item => item.event)
  
  const step = Math.max(1, Math.floor(middleEvents.length / (targetCount - timeline.length - highSeverity.length)))
  const evenlyDistributed: Event[] = []
  for (let i = 0; i < middleEvents.length && evenlyDistributed.length < targetCount - timeline.length - highSeverity.length; i += step) {
    evenlyDistributed.push(middleEvents[i])
  }
  
  // Combine and deduplicate
  const allSelected = [...timeline.map(t => sorted.find(e => e.id === t.id)!).filter(Boolean), ...highSeverity, ...evenlyDistributed]
  const uniqueSelected = Array.from(new Map(allSelected.map(e => [e.id, e])).values())
  
  // Convert to timeline format and sort chronologically
  const finalTimeline: TimelineEvent[] = uniqueSelected
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, MAX_TIMELINE_EVENTS)
    .map(event => ({
      id: event.id,
      title: event.title,
      timestamp: event.timestamp,
      source: event.source || 'Unknown',
      severity: calculateMeaningfulSeverity(event),
      url: event.metadata?.url as string | undefined,
      location: event.metadata?.locationName as string | undefined,
    }))
  
  // Final deduplication
  return deduplicateTimelineEvents(finalTimeline, 0.85)
}
