/**
 * Marker Style Definitions
 * 
 * Provides style functions for different marker appearance strategies.
 * Currently supports severity-based styling with optional event type influence.
 * 
 * Future: Can add type-based, hybrid, or custom style strategies here.
 */

import { SeverityLevel, EventType, Event } from '@/types/event'
import {
  getSeverityColor,
  getSeveritySize,
  getSeverityPriority,
  getSeverityGlow,
} from '@/utils/severity'
import { getCriticalityLabel } from '@/utils/criticality'
import { DefaultMarkerStyleProvider, type MarkerStyleProvider, type MarkerType, type MarkerStyle } from './MarkerSystem'

/**
 * Severity-based style functions
 * These use the centralized severity system
 */
function getColorBySeverity(severity: SeverityLevel, _type?: EventType): string {
  return getSeverityColor(severity)
}

function getSizeBySeverity(severity: SeverityLevel, _type?: EventType): number {
  return getSeveritySize(severity)
}

function getPriorityBySeverity(severity: SeverityLevel, _type?: EventType): number {
  return getSeverityPriority(severity)
}

function getGlowBySeverity(severity: SeverityLevel, _type?: EventType): number {
  return getSeverityGlow(severity)
}

/**
 * Opacity mapping: higher opacity for important markers
 * Returns opacity value (0-1) for marker visibility
 * Higher severity markers get higher opacity for better visibility
 */
function getOpacityBySeverity(severity: SeverityLevel, _type?: EventType): number {
  // Higher severity = higher opacity for better visibility
  if (severity >= 8) return 1.0  // Maximum opacity for critical (8-10)
  if (severity >= 6) return 0.95  // Very high opacity for high (6-7)
  if (severity >= 4) return 0.9   // High opacity for moderate (4-5)
  return 0.85                      // Good opacity for low/minimal (0-3)
}

/**
 * Hybrid style: Severity + Event Type
 * Uses severity as base, with type-specific adjustments
 */
function getColorBySeverityAndType(severity: SeverityLevel, type?: EventType): string {
  const baseColor = getSeverityColor(severity)
  
  // Type-specific color adjustments (optional enhancement)
  // For now, we use severity-based colors, but this allows future customization
  if (type) {
    // Could add type-specific tints here
    // Example: earthquake markers slightly more red, storms more blue
  }
  
  return baseColor
}

function getSizeBySeverityAndType(severity: SeverityLevel, type?: EventType): number {
  const baseSize = getSeveritySize(severity)
  
  // Type-specific size adjustments (optional)
  // Some event types might benefit from slightly different sizes
  if (type) {
    // Could add type-specific size modifiers here
  }
  
  return baseSize
}

/**
 * Determine marker type based on event properties
 * - Pin markers: High/medium severity (4-10) or single-article events
 * - Circle markers: Low severity (0-3) or clustered events
 */
function getMarkerTypeBySeverity(event: Event): MarkerType {
  // Check if event is clustered (has multiple articles)
  const isClustered = (event.articles && event.articles.length > 1) || (event.articleCount && event.articleCount > 1)
  
  // Clustered events use circle markers
  if (isClustered) {
    return 'circle'
  }
  
  // Low severity (0-3) uses circle markers
  if (event.severity <= 3) {
    return 'circle'
  }
  
  // Medium and high severity (4-10) use pin markers for precise location indication
  return 'pin'
}

/**
 * Get criticality tier from score
 */
function getCriticalityTier(score: number | undefined): 'high' | 'medium' | 'low' {
  if (score === undefined) return 'low'
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/**
 * Check if earthquake is severe (magnitude >= 7.0 or has casualties/damage)
 */
function isSevereEarthquake(event: Event): boolean {
  if (event.type !== 'earthquake') return false
  
  const magnitude = event.metadata?.magnitude as number | undefined
  const hasDamage = event.metadata?.hasDamageIndicators as boolean | undefined
  
  // Severe if magnitude >= 7.0 or has damage indicators
  if (magnitude !== undefined && magnitude >= 7.0) return true
  if (hasDamage === true) return true
  
  return false
}

/**
 * Earthquake-specific color: neutral gray for non-severe, normal for severe
 */
function getEarthquakeColor(event: Event, baseColor: string): string {
  if (isSevereEarthquake(event)) {
    return baseColor // Keep normal color for severe earthquakes
  }
  return '#888888' // Neutral gray for routine earthquakes
}

/**
 * Earthquake-specific size: 70% of normal for non-severe
 */
function getEarthquakeSize(event: Event, baseSize: number): number {
  if (isSevereEarthquake(event)) {
    return baseSize // Keep normal size for severe earthquakes
  }
  return baseSize * 0.7 // Reduce size by 30% for routine earthquakes
}

/**
 * Earthquake-specific priority: lower for non-severe
 */
function getEarthquakePriority(event: Event, basePriority: number): number {
  if (isSevereEarthquake(event)) {
    return basePriority // Keep normal priority for severe earthquakes
  }
  return basePriority - 30 // Lower priority (render behind other events)
}

/**
 * Earthquake-specific opacity: slightly reduced for non-severe
 */
function getEarthquakeOpacity(event: Event, baseOpacity: number): number {
  if (isSevereEarthquake(event)) {
    return baseOpacity // Keep normal opacity for severe earthquakes
  }
  return Math.min(0.8, baseOpacity * 0.8) // Reduce opacity to max 0.8
}

/**
 * Criticality-based color function (wrapper that uses event)
 */
function getColorByCriticalityWrapper(event: Event): string {
  const score = event.metadata?.criticalityScore as number | undefined
  const severity = event.severity
  const baseColor = getSeverityColor(severity)
  const tier = getCriticalityTier(score)
  
  // Apply earthquake-specific styling if applicable
  if (event.type === 'earthquake') {
    return getEarthquakeColor(event, baseColor)
  }
  
  if (tier === 'high') {
    // High criticality: Use strong, saturated colors (intensify)
    return baseColor
  } else if (tier === 'medium') {
    // Medium criticality: Mute colors by reducing saturation
    // Convert hex to RGB, reduce saturation, convert back
    const hex = baseColor.replace('#', '')
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      
      // Reduce saturation by 25% (mix with gray)
      const gray = 128
      const mutedR = Math.round(r * 0.75 + gray * 0.25)
      const mutedG = Math.round(g * 0.75 + gray * 0.25)
      const mutedB = Math.round(b * 0.75 + gray * 0.25)
      
      const toHex = (n: number) => {
        const hex = Math.round(n).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      
      return `#${toHex(mutedR)}${toHex(mutedG)}${toHex(mutedB)}`
    }
  }
  
  // Low criticality: Return base color (but will be hidden)
  return baseColor
}

/**
 * Criticality-based color function (signature for DefaultMarkerStyleProvider)
 */
function getColorByCriticality(score: number | undefined, severity: SeverityLevel, _type?: EventType): string {
  // This is a fallback - the wrapper function will be used instead
  return getSeverityColor(severity)
}

/**
 * Criticality-based size function
 * High criticality: 1.5x base size
 * Medium criticality: 0.8x base size
 * Low criticality: 0 (hidden)
 */
function getSizeByCriticality(score: number | undefined, severity: SeverityLevel, _type?: EventType): number {
  const baseSize = getSeveritySize(severity)
  const tier = getCriticalityTier(score)
  
  if (tier === 'high') {
    return baseSize * 1.5 // Larger for high criticality
  } else if (tier === 'medium') {
    return baseSize * 0.8 // Smaller for medium criticality
  }
  
  // Low criticality: Return base size (but will be hidden via opacity)
  return baseSize
}

/**
 * Criticality-based marker type function
 * High criticality (>=70): Always pin (clear pointer)
 * Medium criticality (40-69): Circle (simpler marker)
 * Low criticality (<40): Circle (but hidden)
 */
function getMarkerTypeByCriticality(event: Event): MarkerType {
  const score = event.metadata?.criticalityScore as number | undefined
  const tier = getCriticalityTier(score)
  
  if (tier === 'high') {
    return 'pin' // Always pin for high criticality
  }
  
  // Medium and low use circle markers
  return 'circle'
}

/**
 * Criticality-based opacity function
 * High criticality: 1.0 (fully visible)
 * Medium criticality: 0.7-0.8 (slightly faded)
 * Low criticality: 0.5 (visible but faded, not hidden)
 */
function getOpacityByCriticality(score: number | undefined, severity: SeverityLevel, _type?: EventType): number {
  const tier = getCriticalityTier(score)
  
  if (tier === 'high') {
    return 1.0 // Fully visible
  } else if (tier === 'medium') {
    return 0.75 // Slightly faded
  }
  
  // Low criticality: Visible but faded (not hidden)
  return 0.5
}

/**
 * Criticality-based glow function
 * High criticality: Strong glow (1.0)
 * Medium criticality: Light glow (0.3-0.5)
 * Low criticality: No glow (0)
 */
function getGlowByCriticality(score: number | undefined, severity: SeverityLevel, _type?: EventType): number {
  const tier = getCriticalityTier(score)
  const baseGlow = getSeverityGlow(severity)
  
  if (tier === 'high') {
    return Math.max(baseGlow, 1.0) // Strong glow for high criticality
  } else if (tier === 'medium') {
    return baseGlow * 0.4 // Light glow for medium criticality
  }
  
  // Low criticality: No glow
  return 0
}

/**
 * Criticality-based priority function
 * Higher criticality = higher priority (rendered on top)
 */
function getPriorityByCriticality(score: number | undefined, severity: SeverityLevel, _type?: EventType): number {
  const basePriority = getSeverityPriority(severity)
  const tier = getCriticalityTier(score)
  
  if (tier === 'high') {
    return basePriority + 50 // Higher priority for high criticality
  } else if (tier === 'medium') {
    return basePriority // Standard priority for medium
  }
  
  // Low criticality: Lower priority (but will be hidden)
  return basePriority - 20
}

/**
 * Create default severity-based style provider
 */
export function createSeverityBasedStyleProvider(): MarkerStyleProvider {
  return new DefaultMarkerStyleProvider(
    getColorBySeverity,
    getSizeBySeverity,
    getPriorityBySeverity,
    getMarkerTypeBySeverity,
    getOpacityBySeverity,
    getGlowBySeverity
  )
}

/**
 * Create hybrid severity+type style provider
 */
export function createHybridStyleProvider(): MarkerStyleProvider {
  return new DefaultMarkerStyleProvider(
    getColorBySeverityAndType,
    getSizeBySeverityAndType,
    getPriorityBySeverity,
    getMarkerTypeBySeverity,
    getOpacityBySeverity,
    getGlowBySeverity
  )
}

/**
 * Custom criticality-based style provider with earthquake support
 */
class CriticalityBasedStyleProvider implements MarkerStyleProvider {
  getStyle(event: Event): MarkerStyle {
    const score = event.metadata?.criticalityScore as number | undefined
    const severity = event.severity
    const baseColor = getSeverityColor(severity)
    const baseSize = getSeveritySize(severity)
    const basePriority = getSeverityPriority(severity)
    const baseOpacity = getOpacityByCriticality(score, severity, event.type)
    let baseGlow = getGlowByCriticality(score, severity, event.type)
    
    // Apply earthquake-specific styling
    const color = getColorByCriticalityWrapper(event)
    
    const size = event.type === 'earthquake'
      ? getEarthquakeSize(event, getSizeByCriticality(score, severity, event.type))
      : getSizeByCriticality(score, severity, event.type)
    
    let priority = event.type === 'earthquake'
      ? getEarthquakePriority(event, getPriorityByCriticality(score, severity, event.type))
      : getPriorityByCriticality(score, severity, event.type)
    
    const opacity = event.type === 'earthquake'
      ? getEarthquakeOpacity(event, baseOpacity)
      : baseOpacity
    
    // Ongoing events get higher priority and stronger glow
    if (event.isOngoing || event.duration === 'ongoing') {
      priority += 100 // Render on top
      baseGlow = Math.max(baseGlow, 0.8) // Stronger glow for visibility
    }
    
    return {
      color,
      size,
      priority,
      markerType: getMarkerTypeByCriticality(event),
      opacity,
      glow: baseGlow,
    }
  }
  
  getMarkerType(event: Event): MarkerType {
    return getMarkerTypeByCriticality(event)
  }
}

/**
 * Create criticality-based style provider
 * Uses criticality score to determine marker appearance
 * Includes earthquake-specific styling for reduced visual priority
 */
export function createCriticalityBasedStyleProvider(): MarkerStyleProvider {
  return new CriticalityBasedStyleProvider()
}

/**
 * Style strategy enum for future extensibility
 */
export enum MarkerStyleStrategy {
  SEVERITY_ONLY = 'severity-only',
  SEVERITY_AND_TYPE = 'severity-and-type',
  CRITICALITY_BASED = 'criticality-based', // New strategy
  TYPE_ONLY = 'type-only',
  CUSTOM = 'custom',
}

/**
 * Factory function to create style provider based on strategy
 */
export function createStyleProvider(strategy: MarkerStyleStrategy = MarkerStyleStrategy.CRITICALITY_BASED): MarkerStyleProvider {
  switch (strategy) {
    case MarkerStyleStrategy.SEVERITY_ONLY:
      return createSeverityBasedStyleProvider()
    case MarkerStyleStrategy.SEVERITY_AND_TYPE:
      return createHybridStyleProvider()
    case MarkerStyleStrategy.CRITICALITY_BASED:
      return createCriticalityBasedStyleProvider()
    case MarkerStyleStrategy.TYPE_ONLY:
      // Future: Implement type-only styling
      return createSeverityBasedStyleProvider()
    case MarkerStyleStrategy.CUSTOM:
      // Future: Allow custom style providers
      return createSeverityBasedStyleProvider()
    default:
      return createCriticalityBasedStyleProvider() // Default to criticality-based
  }
}
