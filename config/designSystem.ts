/**
 * Vox Terra - Professional Design System
 * 
 * News-organization grade visual configuration
 * Inspired by NYT, BBC, Reuters cartographic standards
 * 
 * Design Principles:
 * 1. Data > Borders > Labels (visual hierarchy)
 * 2. Restraint over decoration
 * 3. Accessibility and legibility first
 * 4. Credibility through simplicity
 */

// =============================================================================
// 1. COUNTRY BORDERS / POLITICAL BOUNDARIES
// =============================================================================

export type BorderStyle = 'option-a' | 'option-b' | 'option-c'

/**
 * OPTION A: Subtle Neutral (RECOMMENDED - Default)
 * 
 * Design Rationale:
 * - Minimal visual interference with data markers
 * - Professional, understated appearance
 * - Works well in both light and dark modes
 * - Used by: NYT, The Economist
 * 
 * Best for: General news, data-heavy maps
 */
export const BORDER_OPTION_A = {
  id: 'option-a' as const,
  name: 'Subtle Neutral',
  color: 'rgba(255, 255, 255, 0.15)',      // Very subtle white
  width: 0.5,                               // Thin line
  opacity: 0.4,                             // Low opacity
  dashArray: undefined,                     // Solid line
  hoverColor: 'rgba(255, 255, 255, 0.25)', // Slightly visible on hover
}

/**
 * OPTION B: Defined Gray
 * 
 * Design Rationale:
 * - Clearer country delineation
 * - Good for political/regional stories
 * - Higher contrast for accessibility
 * - Used by: BBC, Al Jazeera
 * 
 * Best for: Political coverage, regional focus
 */
export const BORDER_OPTION_B = {
  id: 'option-b' as const,
  name: 'Defined Gray',
  color: 'rgba(150, 160, 180, 0.4)',        // Muted blue-gray
  width: 0.8,                                // Slightly thicker
  opacity: 0.6,                              // More visible
  dashArray: undefined,                      // Solid line
  hoverColor: 'rgba(150, 160, 180, 0.6)',
}

/**
 * OPTION C: Adaptive Contrast
 * 
 * Design Rationale:
 * - Adjusts to background for maximum legibility
 * - Best for varied terrain/imagery
 * - Professional cartographic standard
 * - Used by: Reuters, AP
 * 
 * Best for: Satellite imagery, varied backgrounds
 */
export const BORDER_OPTION_C = {
  id: 'option-c' as const,
  name: 'Adaptive Contrast',
  color: 'rgba(200, 200, 210, 0.25)',        // Light adaptive
  width: 0.6,
  opacity: 0.5,
  dashArray: [2, 1],                         // Subtle dash for disputed areas
  hoverColor: 'rgba(200, 200, 210, 0.4)',
}

export const BORDER_STYLES = {
  'option-a': BORDER_OPTION_A,
  'option-b': BORDER_OPTION_B,
  'option-c': BORDER_OPTION_C,
}

// Active border style (toggle here to switch)
export const ACTIVE_BORDER_STYLE: BorderStyle = 'option-a'

// =============================================================================
// 2. LOCATION / PLACE NAME LABELS
// =============================================================================

export type LabelStyle = 'option-a' | 'option-b' | 'option-c'

/**
 * OPTION A: Static Minimal (RECOMMENDED - Default)
 * 
 * Design Rationale:
 * - Consistent, predictable typography
 * - Low visual weight, recedes behind data
 * - Professional newspaper aesthetic
 * - Used by: Financial Times, WSJ
 * 
 * UX Tradeoffs:
 * + Predictable, no visual surprise
 * + Faster rendering (no dynamic calculations)
 * - May be too small at global view
 * - Less adaptive to context
 */
export const LABEL_OPTION_A = {
  id: 'option-a' as const,
  name: 'Static Minimal',
  city: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 9,                              // Small, unobtrusive
    fontWeight: 400,                          // Regular weight
    color: 'rgba(220, 225, 235, 0.6)',        // Muted white
    textTransform: 'none' as const,
    letterSpacing: '0.02em',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',  // Subtle shadow for legibility
  },
  country: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 10,
    fontWeight: 500,                          // Medium weight
    color: 'rgba(180, 190, 210, 0.5)',        // Muted blue-gray
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',                  // Wide tracking
    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
  },
  ocean: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 11,
    fontWeight: 300,                          // Light weight
    fontStyle: 'italic' as const,
    color: 'rgba(140, 160, 190, 0.35)',       // Very muted blue
    textTransform: 'none' as const,
    letterSpacing: '0.2em',
    textShadow: 'none',
  },
}

/**
 * OPTION B: Dynamic Zoom-Scaled
 * 
 * Design Rationale:
 * - Labels scale and fade based on zoom level
 * - More labels appear as user zooms in
 * - Natural information hierarchy
 * - Used by: Google Maps, Apple Maps
 * 
 * UX Tradeoffs:
 * + Context-appropriate density
 * + Cleaner global view
 * - More complex rendering
 * - Can feel "busy" during zoom transitions
 */
export const LABEL_OPTION_B = {
  id: 'option-b' as const,
  name: 'Dynamic Zoom-Scaled',
  city: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    baseFontSize: 8,
    maxFontSize: 12,
    fontWeight: 400,
    baseColor: 'rgba(220, 225, 235, 0.4)',
    zoomedColor: 'rgba(220, 225, 235, 0.75)',
    textTransform: 'none' as const,
    letterSpacing: '0.02em',
    textShadow: '0 1px 2px rgba(0,0,0,0.7)',
  },
  country: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    baseFontSize: 9,
    maxFontSize: 11,
    fontWeight: 500,
    baseColor: 'rgba(180, 190, 210, 0.35)',
    zoomedColor: 'rgba(180, 190, 210, 0.55)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  ocean: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    baseFontSize: 10,
    maxFontSize: 12,
    fontWeight: 300,
    fontStyle: 'italic' as const,
    baseColor: 'rgba(140, 160, 190, 0.25)',
    zoomedColor: 'rgba(140, 160, 190, 0.4)',
    textTransform: 'none' as const,
    letterSpacing: '0.15em',
    textShadow: 'none',
  },
}

/**
 * OPTION C: Context-Aware Priority
 * 
 * Design Rationale:
 * - Prioritizes capitals and news-active regions
 * - Labels for locations WITH markers are bolder
 * - Intelligent declutter based on data density
 * - Used by: Reuters, professional cartography
 * 
 * UX Tradeoffs:
 * + Data-aware, relevant labeling
 * + Reduces visual noise in quiet areas
 * - Requires marker data integration
 * - More computation overhead
 */
export const LABEL_OPTION_C = {
  id: 'option-c' as const,
  name: 'Context-Aware Priority',
  city: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 9,
    activeRegionFontSize: 11,                // Larger near markers
    fontWeight: 400,
    activeRegionFontWeight: 500,
    color: 'rgba(220, 225, 235, 0.5)',
    activeRegionColor: 'rgba(220, 225, 235, 0.8)',
    textTransform: 'none' as const,
    letterSpacing: '0.02em',
    textShadow: '0 1px 2px rgba(0,0,0,0.7)',
  },
  country: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 10,
    fontWeight: 500,
    color: 'rgba(180, 190, 210, 0.45)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  ocean: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 10,
    fontWeight: 300,
    fontStyle: 'italic' as const,
    color: 'rgba(140, 160, 190, 0.3)',
    textTransform: 'none' as const,
    letterSpacing: '0.18em',
    textShadow: 'none',
  },
}

export const LABEL_STYLES = {
  'option-a': LABEL_OPTION_A,
  'option-b': LABEL_OPTION_B,
  'option-c': LABEL_OPTION_C,
}

// Active label style (toggle here to switch)
export const ACTIVE_LABEL_STYLE: LabelStyle = 'option-a'

// =============================================================================
// 3. MAP MARKERS (Pins / Points)
// =============================================================================

export type MarkerStyle = 'option-a' | 'option-b' | 'option-c'

/**
 * OPTION A: Clean Circle (RECOMMENDED - Default)
 * 
 * Design Rationale:
 * - Simple, professional appearance
 * - Clear visual hierarchy through size/color
 * - No decorative elements
 * - Used by: NYT, BBC, Reuters
 * 
 * Best for:
 * - General news coverage
 * - Dense data clusters
 * - Professional publications
 */
export const MARKER_OPTION_A = {
  id: 'option-a' as const,
  name: 'Clean Circle',
  shape: 'circle' as const,
  
  // Base dimensions
  baseSize: 12,                              // Smaller, professional
  minSize: 8,
  maxSize: 18,
  
  // Visual style
  fill: 'solid' as const,                    // Solid fill
  borderWidth: 1.5,
  borderColor: 'rgba(255, 255, 255, 0.9)',
  
  // No stem/pin
  hasStem: false,
  
  // Subtle hover
  hoverScale: 1.15,
  hoverTransition: '150ms ease-out',
  
  // Category indication via color only
  usesCategoryColor: true,
  usesIcon: false,                           // No emoji icons
  
  // Breaking news indicator
  breakingIndicator: {
    type: 'ring' as const,                   // Pulsing outer ring
    color: 'rgba(239, 68, 68, 0.6)',         // Red
    animation: 'pulse 2s ease-in-out infinite',
  },
  
  // Severity indication
  severityIndicator: {
    type: 'size' as const,                   // Size = severity
    minSeveritySize: 8,
    maxSeveritySize: 16,
  },
}

/**
 * OPTION B: Ring Halo
 * 
 * Design Rationale:
 * - Hollow center allows map visibility
 * - Halo effect for emphasis without blocking
 * - Modern, sophisticated appearance
 * - Used by: The Guardian, Vox
 * 
 * Best for:
 * - Ongoing events
 * - Stories requiring sustained attention
 * - Layered data visualization
 */
export const MARKER_OPTION_B = {
  id: 'option-b' as const,
  name: 'Ring Halo',
  shape: 'ring' as const,
  
  // Base dimensions
  baseSize: 14,
  minSize: 10,
  maxSize: 20,
  
  // Visual style
  fill: 'hollow' as const,
  strokeWidth: 2,
  borderColor: 'rgba(255, 255, 255, 0.6)',
  
  // Outer halo
  hasHalo: true,
  haloSize: 24,
  haloOpacity: 0.15,
  
  // No stem/pin
  hasStem: false,
  
  // Subtle hover
  hoverScale: 1.1,
  hoverHaloOpacity: 0.25,
  hoverTransition: '200ms ease-out',
  
  // Category indication
  usesCategoryColor: true,
  usesIcon: false,
  
  // Breaking news
  breakingIndicator: {
    type: 'halo-pulse' as const,
    color: 'rgba(239, 68, 68, 0.5)',
    animation: 'halo-expand 1.5s ease-out infinite',
  },
  
  // Severity indication
  severityIndicator: {
    type: 'stroke-width' as const,
    minStroke: 1.5,
    maxStroke: 3,
  },
}

/**
 * OPTION C: Minimal Glyph
 * 
 * Design Rationale:
 * - Ultra-minimal point marker
 * - Category shown via small icon on hover
 * - Maximum map visibility
 * - Used by: AP, minimalist data viz
 * 
 * Best for:
 * - Very dense data clusters
 * - Clean, minimal aesthetic
 * - Mobile-first design
 */
export const MARKER_OPTION_C = {
  id: 'option-c' as const,
  name: 'Minimal Glyph',
  shape: 'dot' as const,
  
  // Base dimensions
  baseSize: 8,
  minSize: 6,
  maxSize: 12,
  
  // Visual style
  fill: 'solid' as const,
  borderWidth: 0,                            // No border
  
  // No stem/pin
  hasStem: false,
  
  // Expand on hover to show detail
  hoverScale: 1.5,
  hoverShowsIcon: true,                      // Icon appears on hover
  hoverTransition: '120ms ease-out',
  
  // Category indication
  usesCategoryColor: true,
  usesIcon: false,                           // Icons only on hover
  
  // Breaking news
  breakingIndicator: {
    type: 'glow' as const,
    color: 'rgba(239, 68, 68, 0.8)',
    animation: 'glow-pulse 2s ease-in-out infinite',
  },
  
  // Severity indication
  severityIndicator: {
    type: 'opacity' as const,
    minOpacity: 0.6,
    maxOpacity: 1.0,
  },
}

export const MARKER_STYLES = {
  'option-a': MARKER_OPTION_A,
  'option-b': MARKER_OPTION_B,
  'option-c': MARKER_OPTION_C,
}

// Active marker style (toggle here to switch)
export const ACTIVE_MARKER_STYLE: MarkerStyle = 'option-a'

// =============================================================================
// PROFESSIONAL COLOR PALETTE (News-Grade)
// =============================================================================

/**
 * Refined category colors - muted, professional tones
 * Designed for credibility and accessibility
 */
export const PROFESSIONAL_COLORS = {
  // Primary categories - muted, trustworthy
  breaking: '#DC2626',        // Red - urgent but not garish
  politics: '#4B5563',        // Slate gray - neutral, serious
  business: '#B45309',        // Amber brown - prosperity
  technology: '#2563EB',      // Blue - innovation
  sports: '#059669',          // Green - energetic
  entertainment: '#7C3AED',   // Purple - creative
  health: '#DB2777',          // Pink - care
  science: '#0891B2',         // Cyan - discovery
  crime: '#EA580C',           // Orange - alert
  
  // Conflict - serious reds
  'armed-conflict': '#B91C1C', // Dark red
  terrorism: '#991B1B',        // Deeper red
  'civil-unrest': '#C2410C',   // Burnt orange
  
  // Disasters - earth tones
  'natural-disaster': '#78716C', // Stone
  earthquake: '#A16207',         // Earth
  volcano: '#C2410C',            // Volcanic
  wildfire: '#EA580C',           // Fire
  storm: '#475569',              // Storm gray
  flood: '#0369A1',              // Water blue
  
  // Default
  other: '#6B7280',              // Neutral gray
}

// =============================================================================
// TOOLTIP STYLE
// =============================================================================

export const TOOLTIP_STYLE = {
  background: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  padding: '8px 12px',
  maxWidth: '220px',
  fontFamily: '"Inter", -apple-system, sans-serif',
  fontSize: '11px',
  lineHeight: 1.4,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
}

// =============================================================================
// EXPORT ACTIVE CONFIGURATION
// =============================================================================

export const ACTIVE_DESIGN = {
  borders: BORDER_STYLES[ACTIVE_BORDER_STYLE],
  labels: LABEL_STYLES[ACTIVE_LABEL_STYLE],
  markers: MARKER_STYLES[ACTIVE_MARKER_STYLE],
  colors: PROFESSIONAL_COLORS,
  tooltip: TOOLTIP_STYLE,
}
