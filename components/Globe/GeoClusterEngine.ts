/**
 * GeoClusterEngine - Production-Grade Spatial Clustering
 * 
 * Features:
 * - Haversine distance calculation (true geodesic distance)
 * - Spatial grid indexing for O(n) performance
 * - Zoom-aware clustering thresholds
 * - Viewport-based cluster limits
 * - Recalculation only after motion stops
 * 
 * Performance target: < 50ms on desktop, < 100ms on mobile
 */

import { Event } from '@/types/event'
import { findCapitalForCountry, isCapitalContextEvent, CAPITALS } from '@/data/capitals'

// ============================================================================
// TYPES
// ============================================================================

export interface ClusterConfig {
  /** Current globe altitude (affects clustering radius) */
  altitude: number
  /** Maximum clusters to display */
  maxClusters: number
  /** Whether device is mobile */
  isMobile: boolean
  /** City de-duplication radius in miles (events within same city collapse) */
  cityDeduplicationRadius?: number
  /** Enable capital aggregation (national news to single marker) */
  capitalAggregation?: boolean
  /** Viewport bounds (optional, for future viewport-based filtering) */
  viewportBounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

export interface GeoCluster {
  id: string
  /** Center latitude */
  lat: number
  /** Center longitude */
  lng: number
  /** All events in this cluster */
  events: Event[]
  /** Primary event (highest weight/severity) */
  primary: Event
  /** Dominant event type in cluster */
  dominantType: string
  /** Combined weight score */
  totalWeight: number
  /** Is this a single event (not clustered) */
  isSingle: boolean
}

export interface ClusterResult {
  clusters: GeoCluster[]
  singles: GeoCluster[]
  /** Total events processed */
  totalEvents: number
  /** Processing time in ms */
  processingTime: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EARTH_RADIUS_MILES = 3959

// HARD CAP: Maximum clusters at any zoom level (performance discipline)
// MOBILE FIX: Increased to allow 150-200+ markers on mobile
const ABSOLUTE_MAX_CLUSTERS = 300 // Increased from 80 to 300

// Zoom-based clustering radius (in miles)
// MOBILE FIX: Larger radii = less aggressive clustering = more individual markers visible
const CLUSTER_RADIUS_BY_ALTITUDE: { maxAlt: number; radius: number }[] = [
  { maxAlt: 0.5, radius: 15 },    // Very close zoom - show individual markers
  { maxAlt: 1.0, radius: 25 },    // Close zoom - minimal clustering
  { maxAlt: 1.5, radius: 40 },    // Medium-close - moderate clustering
  { maxAlt: 2.0, radius: 60 },    // Medium - moderate clustering
  { maxAlt: 2.5, radius: 90 },    // Medium-far - more clustering
  { maxAlt: 3.5, radius: 150 },   // Far - more clustering
  { maxAlt: Infinity, radius: 200 }, // Very far - aggressive clustering
]

// Grid cell size in degrees (approximately 100 miles at equator)
const GRID_CELL_SIZE = 1.5

// Same-city collapse radius in miles (events within this distance are always clustered)
// MOBILE FIX: Reduced to allow more individual markers
const SAME_CITY_RADIUS = 30 // Reduced from 50

// City de-duplication radius (default ~30 miles)
// MOBILE FIX: Smaller radius = less aggressive clustering
const DEFAULT_CITY_DEDUP_RADIUS = 20 // Reduced from 30

// Capital aggregation radius (events within this distance of capital are aggregated)
// MOBILE FIX: Reduced to show more individual markers
const CAPITAL_AGGREGATION_RADIUS = 30 // Reduced from 50

// ============================================================================
// HAVERSINE DISTANCE CALCULATION
// ============================================================================

/**
 * Calculate great-circle distance between two points using Haversine formula
 * @returns Distance in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => deg * (Math.PI / 180)
  
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return EARTH_RADIUS_MILES * c
}

// ============================================================================
// SPATIAL GRID INDEX
// ============================================================================

type GridKey = string

function getGridKey(lat: number, lng: number): GridKey {
  const latCell = Math.floor(lat / GRID_CELL_SIZE)
  const lngCell = Math.floor(lng / GRID_CELL_SIZE)
  return `${latCell}:${lngCell}`
}

function getAdjacentKeys(key: GridKey): GridKey[] {
  const [latCell, lngCell] = key.split(':').map(Number)
  const keys: GridKey[] = []
  
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      keys.push(`${latCell + dLat}:${lngCell + dLng}`)
    }
  }
  
  return keys
}

interface SpatialIndex {
  grid: Map<GridKey, Event[]>
  eventToKey: Map<string, GridKey>
}

function buildSpatialIndex(events: Event[]): SpatialIndex {
  const grid = new Map<GridKey, Event[]>()
  const eventToKey = new Map<string, GridKey>()
  
  for (const event of events) {
    if (typeof event.latitude !== 'number' || typeof event.longitude !== 'number') {
      continue
    }
    
    const key = getGridKey(event.latitude, event.longitude)
    eventToKey.set(event.id, key)
    
    if (!grid.has(key)) {
      grid.set(key, [])
    }
    grid.get(key)!.push(event)
  }
  
  return { grid, eventToKey }
}

// ============================================================================
// CLUSTERING ALGORITHM
// ============================================================================

/**
 * Get clustering radius based on current altitude
 */
function getClusterRadius(altitude: number): number {
  for (const { maxAlt, radius } of CLUSTER_RADIUS_BY_ALTITUDE) {
    if (altitude <= maxAlt) {
      return radius
    }
  }
  return 200 // Fallback
}

/**
 * Get event weight for prioritization
 */
function getEventWeight(event: Event): number {
  const baseWeight = (event.metadata?.weightScore as number) || 0
  const severityWeight = (event.severity || 0) * 10
  const recencyWeight = Math.max(0, 100 - (Date.now() - event.timestamp) / (1000 * 60 * 60)) // Decay over hours
  return baseWeight + severityWeight + recencyWeight
}

/**
 * Find dominant event type in a group
 */
function getDominantType(events: Event[]): string {
  const typeCounts = new Map<string, number>()
  
  for (const event of events) {
    const type = event.type || 'other'
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  }
  
  let maxCount = 0
  let dominantType = 'other'
  
  typeCounts.forEach((count, type) => {
    if (count > maxCount) {
      maxCount = count
      dominantType = type
    }
  })
  
  return dominantType
}

/**
 * Calculate cluster center (weighted centroid)
 */
function calculateClusterCenter(events: Event[]): { lat: number; lng: number } {
  if (events.length === 0) return { lat: 0, lng: 0 }
  if (events.length === 1) return { lat: events[0].latitude, lng: events[0].longitude }
  
  let totalWeight = 0
  let latSum = 0
  let lngSum = 0
  
  for (const event of events) {
    const weight = getEventWeight(event)
    latSum += event.latitude * weight
    lngSum += event.longitude * weight
    totalWeight += weight
  }
  
  if (totalWeight === 0) {
    // Fallback to simple average
    return {
      lat: events.reduce((sum, e) => sum + e.latitude, 0) / events.length,
      lng: events.reduce((sum, e) => sum + e.longitude, 0) / events.length,
    }
  }
  
  return {
    lat: latSum / totalWeight,
    lng: lngSum / totalWeight,
  }
}

/**
 * Check if two events are in the same city
 */
function areSameCity(event1: Event, event2: Event, cityRadius: number): boolean {
  const loc1 = (event1.metadata?.locationName as string) || ''
  const loc2 = (event2.metadata?.locationName as string) || ''
  
  // If both have location names, check if they match (case-insensitive)
  if (loc1 && loc2) {
    const loc1Normalized = loc1.toLowerCase().trim()
    const loc2Normalized = loc2.toLowerCase().trim()
    
    // Exact match
    if (loc1Normalized === loc2Normalized) {
      return true
    }
    
    // Check if one contains the other (e.g., "New York" and "New York City")
    if (loc1Normalized.includes(loc2Normalized) || loc2Normalized.includes(loc1Normalized)) {
      return true
    }
  }
  
  // Check geographic proximity (within city radius)
  const distance = haversineDistance(
    event1.latitude,
    event1.longitude,
    event2.latitude,
    event2.longitude
  )
  
  return distance <= cityRadius
}

/**
 * Check if event should be aggregated to capital
 */
function shouldAggregateToCapital(event: Event, config: ClusterConfig): { shouldAggregate: boolean; capitalLat?: number; capitalLng?: number } {
  if (!config.capitalAggregation) {
    return { shouldAggregate: false }
  }
  
  // Check if this is a capital context event
  if (!isCapitalContextEvent(event)) {
    return { shouldAggregate: false }
  }
  
  const country = event.metadata?.country as string
  if (!country) {
    return { shouldAggregate: false }
  }
  
  const capital = findCapitalForCountry(country)
  if (!capital) {
    return { shouldAggregate: false }
  }
  
  // Check if event is within capital aggregation radius
  const distance = haversineDistance(
    event.latitude,
    event.longitude,
    capital.lat,
    capital.lng
  )
  
  if (distance <= CAPITAL_AGGREGATION_RADIUS) {
    return {
      shouldAggregate: true,
      capitalLat: capital.lat,
      capitalLng: capital.lng,
    }
  }
  
  return { shouldAggregate: false }
}

/**
 * Main clustering function
 */
export function clusterEvents(events: Event[], config: ClusterConfig): ClusterResult {
  const startTime = performance.now()
  
  if (events.length === 0) {
    return {
      clusters: [],
      singles: [],
      totalEvents: 0,
      processingTime: performance.now() - startTime,
    }
  }
  
  const radius = getClusterRadius(config.altitude)
  const cityDedupRadius = config.cityDeduplicationRadius || DEFAULT_CITY_DEDUP_RADIUS
  const { grid } = buildSpatialIndex(events)
  
  const assigned = new Set<string>()
  const clusterGroups: Event[][] = []
  const capitalGroups = new Map<string, Event[]>() // countryCode -> events
  
  // First pass: Aggregate capital context events
  if (config.capitalAggregation) {
    for (const event of events) {
      if (assigned.has(event.id)) continue
      if (typeof event.latitude !== 'number' || typeof event.longitude !== 'number') continue
      
      const capitalInfo = shouldAggregateToCapital(event, config)
      if (capitalInfo.shouldAggregate) {
        const country = event.metadata?.country as string
        const capital = findCapitalForCountry(country)
        if (capital) {
          const key = capital.countryCode
          if (!capitalGroups.has(key)) {
            capitalGroups.set(key, [])
          }
          capitalGroups.get(key)!.push(event)
          assigned.add(event.id)
        }
      }
    }
  }
  
  // Second pass: Regular clustering with city de-duplication
  const sortedEvents = [...events]
    .filter(e => !assigned.has(e.id))
    .sort((a, b) => getEventWeight(b) - getEventWeight(a))
  
  for (const event of sortedEvents) {
    if (assigned.has(event.id)) continue
    if (typeof event.latitude !== 'number' || typeof event.longitude !== 'number') continue
    
    // Start a new cluster with this event
    const clusterEvents: Event[] = [event]
    assigned.add(event.id)
    
    // Get all events in adjacent grid cells
    const key = getGridKey(event.latitude, event.longitude)
    const adjacentKeys = getAdjacentKeys(key)
    
    for (const adjKey of adjacentKeys) {
      const cellEvents = grid.get(adjKey)
      if (!cellEvents) continue
      
      for (const candidate of cellEvents) {
        if (assigned.has(candidate.id)) continue
        if (candidate.id === event.id) continue
        
        // Calculate actual distance
        const distance = haversineDistance(
          event.latitude,
          event.longitude,
          candidate.latitude,
          candidate.longitude
        )
        
        // City de-duplication: events in same city MUST cluster
        const sameCity = areSameCity(event, candidate, cityDedupRadius)
        const withinRadius = distance <= radius
        
        if (sameCity || withinRadius) {
          clusterEvents.push(candidate)
          assigned.add(candidate.id)
        }
      }
    }
    
    clusterGroups.push(clusterEvents)
  }
  
  // Convert capital groups to clusters
  for (const [countryCode, capitalEvents] of capitalGroups.entries()) {
    if (capitalEvents.length > 0) {
      const capital = CAPITALS.find(c => c.countryCode === countryCode)
      if (capital) {
        clusterGroups.push(capitalEvents)
      }
    }
  }
  
  // Convert groups to GeoCluster objects
  const allClusters: GeoCluster[] = clusterGroups.map((group, index) => {
    // Check if this is a capital cluster
    const country = group[0]?.metadata?.country as string
    const capital = country ? findCapitalForCountry(country) : null
    const isCapitalCluster = capital && isCapitalContextEvent(group[0])
    
    let center: { lat: number; lng: number }
    if (isCapitalCluster && capital) {
      // Use capital coordinates for capital clusters
      center = { lat: capital.lat, lng: capital.lng }
    } else {
      center = calculateClusterCenter(group)
    }
    
    const sortedByWeight = [...group].sort((a, b) => getEventWeight(b) - getEventWeight(a))
    const primary = sortedByWeight[0]
    
    return {
      id: group.length === 1 ? group[0].id : `cluster-${index}`,
      lat: center.lat,
      lng: center.lng,
      events: group,
      primary,
      dominantType: getDominantType(group),
      totalWeight: group.reduce((sum, e) => sum + getEventWeight(e), 0),
      isSingle: group.length === 1,
    }
  })
  
  // Sort by total weight and apply HARD CAP
  // MOBILE FIX: Removed mobile-specific cap - use config.maxClusters directly
  allClusters.sort((a, b) => b.totalWeight - a.totalWeight)
  
  // MOBILE FIX: Use config.maxClusters directly (no mobile-specific reduction)
  const maxVisible = Math.min(config.maxClusters, ABSOLUTE_MAX_CLUSTERS)
  const visibleClusters = allClusters.slice(0, maxVisible)
  
  // Separate singles from multi-event clusters
  const singles = visibleClusters.filter(c => c.isSingle)
  const clusters = visibleClusters.filter(c => !c.isSingle)
  
  return {
    clusters,
    singles,
    totalEvents: events.length,
    processingTime: performance.now() - startTime,
  }
}

// ============================================================================
// CLUSTER MANAGER CLASS
// ============================================================================

/**
 * Manages clustering state and provides debounced recalculation
 */
export class GeoClusterManager {
  private lastResult: ClusterResult | null = null
  private lastConfig: ClusterConfig | null = null
  private pendingEvents: Event[] | null = null
  private isProcessing = false
  
  /**
   * Request clustering calculation
   * Returns cached result if config hasn't changed significantly
   */
  cluster(events: Event[], config: ClusterConfig): ClusterResult {
    // Check if we can use cached result
    if (this.lastResult && this.lastConfig) {
      const altitudeDelta = Math.abs(config.altitude - this.lastConfig.altitude)
      const sameEventCount = events.length === this.lastResult.totalEvents
      
      // If altitude hasn't changed much and event count is same, use cache
      if (altitudeDelta < 0.2 && sameEventCount) {
        return this.lastResult
      }
    }
    
    // Calculate new clusters
    const result = clusterEvents(events, config)
    
    this.lastResult = result
    this.lastConfig = { ...config }
    
    return result
  }
  
  /**
   * Queue events for processing (called during motion)
   */
  queueEvents(events: Event[]): void {
    this.pendingEvents = events
  }
  
  /**
   * Process queued events (called when motion stops)
   */
  processPending(config: ClusterConfig): ClusterResult | null {
    if (!this.pendingEvents) return null
    
    const result = this.cluster(this.pendingEvents, config)
    this.pendingEvents = null
    
    return result
  }
  
  /**
   * Check if there are pending events
   */
  hasPending(): boolean {
    return this.pendingEvents !== null
  }
  
  /**
   * Clear all cached data
   */
  clear(): void {
    this.lastResult = null
    this.lastConfig = null
    this.pendingEvents = null
  }
}

// Singleton instance for easy import
export const geoClusterManager = new GeoClusterManager()

// ============================================================================
// PROGRESSIVE LOADING - Prioritize clusters near camera center
// ============================================================================

export interface CameraCenter {
  lat: number
  lng: number
}

export interface ProgressiveLoadConfig {
  /** Maximum angular distance from center (in degrees) - default 60° */
  maxAngle?: number
  /** Whether to include clusters outside the radius (deprioritized) */
  includeOutside?: boolean
}

/**
 * Calculate angular distance between two points on a sphere (in degrees)
 * More efficient than haversine for relative distance comparisons
 */
function angularDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  
  // Spherical law of cosines
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  // Convert to degrees
  return c * 180 / Math.PI
}

/**
 * Prioritize clusters based on distance from camera center
 * Returns clusters sorted by proximity, with optional filtering by max angle
 */
export function prioritizeClusters(
  result: ClusterResult,
  cameraCenter: CameraCenter,
  config: ProgressiveLoadConfig = {}
): ClusterResult {
  const { maxAngle = 60, includeOutside = true } = config
  
  // Calculate distance and sort for clusters
  const clustersWithDistance = result.clusters.map(cluster => ({
    cluster,
    distance: angularDistance(cameraCenter.lat, cameraCenter.lng, cluster.lat, cluster.lng),
  }))
  
  const singlesWithDistance = result.singles.map(single => ({
    cluster: single,
    distance: angularDistance(cameraCenter.lat, cameraCenter.lng, single.lat, single.lng),
  }))
  
  // Sort by distance (nearest first)
  clustersWithDistance.sort((a, b) => a.distance - b.distance)
  singlesWithDistance.sort((a, b) => a.distance - b.distance)
  
  // Filter to maxAngle or include all (deprioritized)
  let filteredClusters: GeoCluster[]
  let filteredSingles: GeoCluster[]
  
  if (includeOutside) {
    // All clusters, sorted by distance
    filteredClusters = clustersWithDistance.map(c => c.cluster)
    filteredSingles = singlesWithDistance.map(s => s.cluster)
  } else {
    // Only clusters within maxAngle
    filteredClusters = clustersWithDistance
      .filter(c => c.distance <= maxAngle)
      .map(c => c.cluster)
    filteredSingles = singlesWithDistance
      .filter(s => s.distance <= maxAngle)
      .map(s => s.cluster)
  }
  
  return {
    clusters: filteredClusters,
    singles: filteredSingles,
    totalEvents: result.totalEvents,
    processingTime: result.processingTime,
  }
}

/**
 * Get loading status text based on progress
 */
export function getLoadingStatus(loaded: number, total: number): string {
  if (loaded >= total) return ''
  return `Loading ${loaded}/${total} clusters...`
}
