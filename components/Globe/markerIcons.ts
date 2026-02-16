/**
 * Marker Icon System
 * 
 * Professional iconography - NO EMOJIS.
 * Uses single-character glyphs and color coding for clarity.
 * Designed for institutional-grade visual language.
 */

import * as THREE from 'three'
import { EventType, SeverityLevel } from '@/types/event'

/**
 * Professional color palette - muted, sophisticated tones
 * Inspired by Bloomberg, Reuters, FT color systems
 */
export const CATEGORY_COLORS: Record<EventType, string> = {
  // News Categories - Professional muted palette
  'breaking': '#E8A838',        // Amber - urgent but not harsh
  'politics': '#4F7CAC',        // Slate blue - trustworthy
  'sports': '#5B9A8B',          // Sage green - energetic
  'business': '#D4A84B',        // Muted gold - prosperity
  'technology': '#7BA4DB',      // Sky blue - innovation
  'entertainment': '#9B7ED9',   // Soft purple - creative
  'health': '#E08D9D',          // Dusty rose - care
  'science': '#5DADE2',         // Bright cyan - discovery
  'crime': '#E67E5A',           // Terracotta - alert
  
  // Conflict Categories - Warmer, serious tones
  'armed-conflict': '#C75146',  // Brick red - serious
  'terrorism': '#B85450',       // Deep red - danger
  'civil-unrest': '#D97B4A',    // Burnt orange - tension
  
  // Disaster Categories - Earth tones
  'natural-disaster': '#8B6C5C', // Earth brown
  'earthquake': '#A0826D',       // Warm brown
  'volcano': '#C4694D',          // Volcanic red-brown
  'wildfire': '#D4743A',         // Fire orange
  'storm': '#6B8CAE',            // Storm blue-gray
  'tsunami': '#4A90A4',          // Deep ocean blue
  'flood': '#5D8AA8',            // Water blue
  
  // Fallback
  'other': '#8E99A4',            // Neutral gray
}

/**
 * SVG path definitions for sleek black-outline icons
 * Professional, minimal iconography
 */
export const EVENT_ICON_PATHS: Record<EventType, string> = {
  // News Categories - Geometric shapes
  'breaking': 'M12 2L2 7L12 12L22 7L12 2Z M12 7V12', // Alert/star
  'politics': 'M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z', // Building/government
  'sports': 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z M8 9L12 13L16 9', // Trophy
  'business': 'M12 2L22 8V16L12 22L2 16V8L12 2Z M12 8V22 M2 8L12 14L22 8', // Chart/graph
  'technology': 'M12 2L22 7L12 12L2 7L12 2Z M12 7L7 9L12 11L17 9L12 7Z', // Chip/processor
  'entertainment': 'M12 2C15 2 18 5 18 8C18 11 15 14 12 14C9 14 6 11 6 8C6 5 9 2 12 2Z', // Play button
  'health': 'M12 2L15 7L22 8L17 13L18 20L12 16L6 20L7 13L2 8L9 7L12 2Z', // Medical cross
  'science': 'M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z', // Atom/molecule
  'crime': 'M12 2L2 7L12 12L22 7L12 2Z M12 7L7 9L12 11L17 9L12 7Z', // Shield/security
  
  // Conflict Categories - Warning shapes
  'armed-conflict': 'M12 2L22 12L12 22L2 12L12 2Z M12 6L18 12L12 18L6 12L12 6Z', // Diamond alert
  'terrorism': 'M12 2L2 12L12 22L22 12L12 2Z M12 8L8 12L12 16L16 12L12 8Z', // Alert diamond
  'civil-unrest': 'M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z', // Tension indicator
  
  // Disaster Categories - Nature shapes
  'natural-disaster': 'M12 2L22 12L12 22L2 12L12 2Z', // Diamond
  'earthquake': 'M12 2L22 12L12 22L2 12L12 2Z M12 8L16 12L12 16L8 12L12 8Z', // Seismic waves
  'volcano': 'M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z', // Mountain/triangle
  'wildfire': 'M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z', // Fire/triangle
  'storm': 'M12 2C15 2 18 5 18 8C18 11 15 14 12 14C9 14 6 11 6 8C6 5 9 2 12 2Z', // Cloud/circle
  'tsunami': 'M12 2C15 2 18 5 18 8C18 11 15 14 12 14C9 14 6 11 6 8C6 5 9 2 12 2Z', // Wave/circle
  'flood': 'M12 2C15 2 18 5 18 8C18 11 15 14 12 14C9 14 6 11 6 8C6 5 9 2 12 2Z', // Water/circle
  
  // Fallback
  'other': 'M12 2C15 2 18 5 18 8C18 11 15 14 12 14C9 14 6 11 6 8C6 5 9 2 12 2Z', // Circle
}

/**
 * Legacy: Keep letter-based icons for backward compatibility
 * Will be replaced by SVG paths
 */
export const EVENT_ICONS: Record<EventType, string> = {
  'breaking': '!',
  'politics': 'P',
  'sports': 'S',
  'business': 'B',
  'technology': 'T',
  'entertainment': 'E',
  'health': 'H',
  'science': 'R',
  'crime': 'C',
  'armed-conflict': '×',
  'terrorism': '!',
  'civil-unrest': '±',
  'natural-disaster': '◆',
  'earthquake': '◆',
  'volcano': '▲',
  'wildfire': '▲',
  'storm': '○',
  'tsunami': '○',
  'flood': '○',
  'other': '•',
}

/**
 * Category labels for legend/UI (no emojis)
 */
export const CATEGORY_LABELS: Record<EventType, string> = {
  'breaking': 'Breaking',
  'politics': 'Politics',
  'sports': 'Sports',
  'business': 'Markets',
  'technology': 'Technology',
  'entertainment': 'Entertainment',
  'health': 'Health',
  'science': 'Science',
  'crime': 'Crime',
  'armed-conflict': 'Conflict',
  'terrorism': 'Security',
  'civil-unrest': 'Unrest',
  'natural-disaster': 'Disaster',
  'earthquake': 'Seismic',
  'volcano': 'Volcanic',
  'wildfire': 'Fire',
  'storm': 'Storm',
  'tsunami': 'Tsunami',
  'flood': 'Flood',
  'other': 'Other',
}

/**
 * Get text icon for event type
 */
export function getEventIcon(eventType: EventType): string {
  return EVENT_ICONS[eventType] || EVENT_ICONS['other']
}

/**
 * Get category color
 */
export function getCategoryColor(eventType: EventType): string {
  return CATEGORY_COLORS[eventType] || CATEGORY_COLORS['other']
}

/**
 * Get icon color based on severity
 */
export function getIconColor(severity: SeverityLevel): string {
  const severityColors = [
    '#8E99A4', // 0 - Light gray
    '#7A8B99', // 1
    '#6B7D8A', // 2
    '#5C6F7B', // 3
    '#4D616C', // 4
    '#D4A84B', // 5 - Gold (medium)
    '#E8A838', // 6 - Amber
    '#E67E5A', // 7 - Orange
    '#D97B4A', // 8 - Burnt orange
    '#C75146', // 9 - Brick red
    '#B85450', // 10 - Deep red
  ]
  return severityColors[Math.min(severity, 10)]
}

/**
 * Create Three.js sprite with sleek black-outline icon
 * Uses SVG paths rendered to canvas for crisp, professional icons
 */
export function createIconSprite(
  icon: string,
  color: string,
  size: number,
  eventType?: EventType
): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  if (!context) {
    throw new Error('Could not get canvas context')
  }
  
  const canvasSize = 128
  canvas.width = canvasSize
  canvas.height = canvasSize
  
  context.clearRect(0, 0, canvasSize, canvasSize)
  
  // Use SVG path if available, otherwise fall back to text
  const useSvgPath = eventType && EVENT_ICON_PATHS[eventType]
  
  if (useSvgPath) {
    // Render SVG path as black outline
    context.strokeStyle = '#000000' // Black outline
    context.fillStyle = color // Category color fill
    context.lineWidth = 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    
    // Scale and center the path
    const scale = canvasSize * 0.35 / 24 // Scale to fit in icon area
    context.save()
    context.translate(canvasSize / 2, canvasSize / 2)
    context.scale(scale, scale)
    
    // Parse and draw SVG path
    const path = new Path2D(useSvgPath)
    context.fill(path) // Fill with category color
    context.stroke(path) // Stroke with black outline
    
    context.restore()
  } else {
    // Fallback: Text-based icon with black outline
    // Background circle with category color
    context.fillStyle = color
    context.globalAlpha = 0.9
    context.beginPath()
    context.arc(canvasSize / 2, canvasSize / 2, canvasSize * 0.42, 0, Math.PI * 2)
    context.fill()
    
    // Black border
    context.strokeStyle = '#000000'
    context.lineWidth = 3
    context.stroke()
    
    // Icon character with black outline effect
    context.globalAlpha = 1.0
    context.fillStyle = '#ffffff'
    const fontSize = canvasSize * 0.45
    context.font = `600 ${fontSize}px "SF Pro", "Inter", system-ui, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    
    // Draw text with black outline
    context.strokeStyle = '#000000'
    context.lineWidth = 4
    context.strokeText(icon, canvasSize / 2, canvasSize / 2 + 2)
    context.fillText(icon, canvasSize / 2, canvasSize / 2 + 2)
  }
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1.0,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: false,
  })
  
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(size, size, 1)
  
  return sprite
}

/**
 * Get category distribution for cluster markers
 * Returns array of category colors representing composition
 */
export function getClusterCategoryComposition(events: Event[]): string[] {
  const categoryCounts = new Map<string, number>()
  
  events.forEach(event => {
    const category = getCategoryColor(event.type as EventType)
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
  })
  
  // Sort by count and return top 3-4 colors
  const sorted = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([color]) => color)
  
  return sorted.length > 0 ? sorted : [CATEGORY_COLORS['other']]
}

/**
 * Create cluster marker with category composition hints
 * Returns a sprite showing segmented colors representing category distribution
 */
export function createClusterIcon(
  categoryColors: string[],
  size: number
): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  if (!context) {
    throw new Error('Could not get canvas context')
  }
  
  const canvasSize = 128
  canvas.width = canvasSize
  canvas.height = canvasSize
  
  context.clearRect(0, 0, canvasSize, canvasSize)
  
  const centerX = canvasSize / 2
  const centerY = canvasSize / 2
  const radius = canvasSize * 0.4
  
  // Draw segmented circle showing category composition
  const segmentCount = Math.min(categoryColors.length, 4)
  const segmentAngle = (Math.PI * 2) / segmentCount
  
  for (let i = 0; i < segmentCount; i++) {
    const startAngle = i * segmentAngle - Math.PI / 2
    const endAngle = (i + 1) * segmentAngle - Math.PI / 2
    
    context.beginPath()
    context.moveTo(centerX, centerY)
    context.arc(centerX, centerY, radius, startAngle, endAngle)
    context.closePath()
    
    context.fillStyle = categoryColors[i] || CATEGORY_COLORS['other']
    context.globalAlpha = 0.8
    context.fill()
    
    // Black outline
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.globalAlpha = 1.0
    context.stroke()
  }
  
  // Outer black circle border
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.strokeStyle = '#000000'
  context.lineWidth = 3
  context.stroke()
  
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1.0,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: false,
  })
  
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(size, size, 1)
  
  return sprite
}

/**
 * Get icon info for event
 */
export function getIconInfo(eventType: EventType, severity: SeverityLevel): {
  icon: string
  color: string
} {
  return {
    icon: getEventIcon(eventType),
    color: getCategoryColor(eventType),
  }
}

/**
 * Category information for legend/UI - NO EMOJIS
 */
export const ICON_CATEGORIES: Array<{
  type: EventType
  icon: string
  label: string
  description: string
  color: string
}> = [
  // News
  { type: 'breaking', icon: '!', label: 'Breaking News', description: 'Urgent, developing stories', color: CATEGORY_COLORS['breaking'] },
  { type: 'politics', icon: 'P', label: 'Politics', description: 'Government, elections, policy', color: CATEGORY_COLORS['politics'] },
  { type: 'sports', icon: 'S', label: 'Sports', description: 'Games, championships, athletes', color: CATEGORY_COLORS['sports'] },
  { type: 'business', icon: 'B', label: 'Business', description: 'Markets, economy, companies', color: CATEGORY_COLORS['business'] },
  { type: 'technology', icon: 'T', label: 'Technology', description: 'Tech news, AI, startups', color: CATEGORY_COLORS['technology'] },
  { type: 'entertainment', icon: 'E', label: 'Entertainment', description: 'Movies, music, celebrities', color: CATEGORY_COLORS['entertainment'] },
  { type: 'health', icon: 'H', label: 'Health', description: 'Medical news, healthcare', color: CATEGORY_COLORS['health'] },
  { type: 'science', icon: 'R', label: 'Science', description: 'Research, discoveries, space', color: CATEGORY_COLORS['science'] },
  
  // Conflict
  { type: 'armed-conflict', icon: '×', label: 'Armed Conflict', description: 'War, military operations', color: CATEGORY_COLORS['armed-conflict'] },
  { type: 'civil-unrest', icon: '±', label: 'Civil Unrest', description: 'Protests, riots', color: CATEGORY_COLORS['civil-unrest'] },
  
  // Disasters
  { type: 'natural-disaster', icon: '◆', label: 'Natural Disaster', description: 'Earthquakes, storms, floods', color: CATEGORY_COLORS['natural-disaster'] },
]
