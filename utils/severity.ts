import { SeverityLevel, EventType } from '@/types/event'

/**
 * Severity Classification System
 * 
 * Defines severity levels, computation logic, and visual mappings
 * for global events based on real-world data fields.
 */

// ============================================================================
// Severity Level Definitions
// ============================================================================

export enum SeverityLabel {
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface SeverityDefinition {
  level: SeverityLevel
  label: SeverityLabel
  description: string
  numericRange: { min: number; max: number }
}

/**
 * Severity level definitions mapping numeric levels to semantic labels
 */
export const SEVERITY_DEFINITIONS: Record<SeverityLevel, SeverityDefinition> = {
  0: { level: 0, label: SeverityLabel.MINIMAL, description: 'Minimal impact, isolated incidents', numericRange: { min: 0, max: 1 } },
  1: { level: 1, label: SeverityLabel.MINIMAL, description: 'Minimal impact, isolated incidents', numericRange: { min: 0, max: 1 } },
  2: { level: 2, label: SeverityLabel.LOW, description: 'Low impact, localized effects', numericRange: { min: 2, max: 3 } },
  3: { level: 3, label: SeverityLabel.LOW, description: 'Low impact, localized effects', numericRange: { min: 2, max: 3 } },
  4: { level: 4, label: SeverityLabel.MODERATE, description: 'Moderate impact, regional significance', numericRange: { min: 4, max: 5 } },
  5: { level: 5, label: SeverityLabel.MODERATE, description: 'Moderate impact, regional significance', numericRange: { min: 4, max: 5 } },
  6: { level: 6, label: SeverityLabel.HIGH, description: 'High impact, widespread effects', numericRange: { min: 6, max: 7 } },
  7: { level: 7, label: SeverityLabel.HIGH, description: 'High impact, widespread effects', numericRange: { min: 6, max: 7 } },
  8: { level: 8, label: SeverityLabel.CRITICAL, description: 'Critical impact, major disaster', numericRange: { min: 8, max: 9 } },
  9: { level: 9, label: SeverityLabel.CRITICAL, description: 'Critical impact, major disaster', numericRange: { min: 8, max: 9 } },
  10: { level: 10, label: SeverityLabel.CRITICAL, description: 'Extreme impact, catastrophic event', numericRange: { min: 10, max: 10 } },
}

/**
 * Get severity label from numeric level
 */
export function getSeverityLabel(level: SeverityLevel): SeverityLabel {
  return SEVERITY_DEFINITIONS[level].label
}

/**
 * Get severity definition from numeric level
 */
export function getSeverityDefinition(level: SeverityLevel): SeverityDefinition {
  return SEVERITY_DEFINITIONS[level]
}

// ============================================================================
// Severity Computation
// ============================================================================

/**
 * Raw event data fields that can be used for severity computation
 */
export interface SeverityInputData {
  // Text content
  title?: string
  description?: string
  content?: string
  
  // Event type
  type?: EventType
  
  // Quantitative metrics (if available)
  magnitude?: number        // e.g., Richter scale for earthquakes
  casualties?: number        // Number of deaths/injuries
  affectedArea?: number      // Area affected in km²
  populationAffected?: number
  
  // Temporal/urgency indicators
  isOngoing?: boolean
  isEscalating?: boolean
  
  // Source trust weighting
  sourceTrustWeight?: number  // Trust weight from source classification (0.6 - 1.2)
  
  // Source-specific metadata
  metadata?: Record<string, any>
}

/**
 * Keyword patterns for severity detection
 */
const SEVERITY_KEYWORDS = {
  extreme: {
    patterns: [
      /\b(catastrophic|devastating|apocalyptic|annihilation|extinction|total destruction)\b/i,
      /\b(mass|genocide|massacre|slaughter)\b/i,
    ],
    weight: 10,
  },
  critical: {
    patterns: [
      /\b(critical|severe|major disaster|massive|deadly|fatal|killed|deaths|casualties)\b/i,
      /\b(emergency|evacuation|state of emergency|declared disaster)\b/i,
      /\b(hundreds|thousands|millions)\s+(killed|dead|affected|displaced)\b/i,
    ],
    weight: 8,
  },
  high: {
    patterns: [
      /\b(significant|serious|substantial|widespread|extensive|major)\b/i,
      /\b(damage|destruction|devastation|injury|injured)\b/i,
      /\b(dozens|hundreds)\s+(killed|dead|affected)\b/i,
    ],
    weight: 6,
  },
  moderate: {
    patterns: [
      /\b(moderate|considerable|notable|several|multiple)\b/i,
      /\b(impact|effect|incident|event)\b/i,
    ],
    weight: 4,
  },
  low: {
    patterns: [
      /\b(minor|small|limited|localized|isolated|few)\b/i,
      /\b(incident|occurrence|report)\b/i,
    ],
    weight: 2,
  },
} as const

/**
 * Event type base severity modifiers
 * Some event types are inherently more severe
 */
const EVENT_TYPE_BASE_SEVERITY: Partial<Record<EventType, number>> = {
  earthquake: 2,    // Earthquakes are often significant
  volcano: 3,       // Volcanic eruptions are typically high-impact
  tsunami: 4,       // Tsunamis are usually catastrophic
  wildfire: 1,      // Wildfires vary widely
  storm: 1,         // Storms vary widely
  flood: 1,         // Floods vary widely
  other: 0,
}

/**
 * Compute severity from event data fields
 * 
 * This is a pure function that analyzes available data fields
 * and returns a SeverityLevel (0-10)
 */
export function computeSeverity(data: SeverityInputData): SeverityLevel {
  let severityScore = 0
  
  // Combine all text content
  const textContent = [
    data.title || '',
    data.description || '',
    data.content || '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  
  // 1. Keyword-based severity detection
  for (const [level, config] of Object.entries(SEVERITY_KEYWORDS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(textContent)) {
        severityScore = Math.max(severityScore, config.weight)
        break // Use highest matching level
      }
    }
  }
  
  // 2. Quantitative metrics (if available)
  if (data.magnitude !== undefined) {
    // Richter scale: 0-3.9 (minor), 4-4.9 (light), 5-5.9 (moderate), 6-6.9 (strong), 7-7.9 (major), 8+ (great)
    if (data.magnitude >= 8) severityScore = Math.max(severityScore, 10)
    else if (data.magnitude >= 7) severityScore = Math.max(severityScore, 9)
    else if (data.magnitude >= 6) severityScore = Math.max(severityScore, 7)
    else if (data.magnitude >= 5) severityScore = Math.max(severityScore, 5)
    else if (data.magnitude >= 4) severityScore = Math.max(severityScore, 3)
  }
  
  if (data.casualties !== undefined) {
    if (data.casualties >= 10000) severityScore = Math.max(severityScore, 10)
    else if (data.casualties >= 1000) severityScore = Math.max(severityScore, 9)
    else if (data.casualties >= 100) severityScore = Math.max(severityScore, 7)
    else if (data.casualties >= 10) severityScore = Math.max(severityScore, 5)
    else if (data.casualties > 0) severityScore = Math.max(severityScore, 3)
  }
  
  if (data.populationAffected !== undefined) {
    if (data.populationAffected >= 1000000) severityScore = Math.max(severityScore, 9)
    else if (data.populationAffected >= 100000) severityScore = Math.max(severityScore, 7)
    else if (data.populationAffected >= 10000) severityScore = Math.max(severityScore, 5)
    else if (data.populationAffected >= 1000) severityScore = Math.max(severityScore, 3)
  }
  
  // 3. Event type base modifier
  if (data.type && EVENT_TYPE_BASE_SEVERITY[data.type] !== undefined) {
    severityScore = Math.max(severityScore, EVENT_TYPE_BASE_SEVERITY[data.type]!)
  }
  
  // 4. Escalation/ongoing modifiers
  if (data.isEscalating) {
    severityScore = Math.min(10, severityScore + 1)
  }
  
  // 5. Fallback: if no indicators found, use moderate default
  if (severityScore === 0 && textContent.length > 0) {
    severityScore = 5 // Default moderate
  }
  
  // 6. Apply source trust weight (if provided)
  // Trust weight acts as a multiplier: Tier 1 (1.1) boosts, Tier 3 (0.7) reduces
  if (data.sourceTrustWeight !== undefined && data.sourceTrustWeight > 0) {
    severityScore = severityScore * data.sourceTrustWeight
  }
  
  // Clamp to valid range
  return Math.min(10, Math.max(0, Math.round(severityScore))) as SeverityLevel
}

// ============================================================================
// Visual Mappings
// ============================================================================

/**
 * Color mapping: severity-based gradient from low (green) to critical (red)
 */
export const SEVERITY_COLORS: Record<SeverityLabel, string> = {
  [SeverityLabel.MINIMAL]: '#22c55e',  // Bright green
  [SeverityLabel.LOW]: '#84cc16',      // Yellow-green
  [SeverityLabel.MODERATE]: '#eab308', // Bright yellow
  [SeverityLabel.HIGH]: '#f97316',     // Bright orange
  [SeverityLabel.CRITICAL]: '#dc2626',  // Bright red
}

/**
 * Get color for severity level
 */
export function getSeverityColor(level: SeverityLevel): string {
  const label = getSeverityLabel(level)
  return SEVERITY_COLORS[label]
}

/**
 * Size mapping: severity-based marker size
 * Returns size in globe units with minimum size and distinct ranges
 * - Low (0-3): 0.5-0.7 (small)
 * - Medium (4-6): 0.8-1.1 (medium)
 * - High (7-10): 1.2-1.8 (large)
 * Minimum size: 0.5 for all markers to ensure visibility
 */
export function getSeveritySize(level: SeverityLevel): number {
  // Ensure minimum size of 0.5 for all markers
  if (level <= 3) {
    // Low severity: 0.5-0.7 (small)
    return 0.5 + (level / 3) * 0.2
  }
  if (level <= 6) {
    // Medium severity: 0.8-1.1 (medium)
    return 0.8 + ((level - 4) / 2) * 0.3
  }
  // High severity: 1.2-1.8 (large)
  return 1.2 + ((level - 7) / 3) * 0.6
}

/**
 * Visual priority mapping: z-index equivalent for rendering order
 * Higher severity = higher priority (rendered on top)
 */
export function getSeverityPriority(level: SeverityLevel): number {
  // Returns priority value (0-100) for rendering order
  return level * 10
}

/**
 * Glow intensity mapping: visual emphasis for critical events
 * Returns opacity value (0-1) for glow effect
 * Enhanced for better visibility of high-severity markers
 */
export function getSeverityGlow(level: SeverityLevel): number {
  if (level >= 8) return 1.0  // Maximum glow for critical (8-10)
  if (level >= 7) return 0.8  // Strong glow for high (7)
  if (level >= 6) return 0.6  // Medium-strong glow for high (6)
  if (level >= 4) return 0.3  // Light glow for moderate (4-5)
  return 0                     // No glow for low/minimal (0-3)
}

/**
 * Complete visual configuration for a severity level
 */
export interface SeverityVisualConfig {
  color: string
  size: number
  priority: number
  glow: number
  label: SeverityLabel
}

/**
 * Get complete visual configuration for severity level
 */
export function getSeverityVisualConfig(level: SeverityLevel): SeverityVisualConfig {
  return {
    color: getSeverityColor(level),
    size: getSeveritySize(level),
    priority: getSeverityPriority(level),
    glow: getSeverityGlow(level),
    label: getSeverityLabel(level),
  }
}
