/**
 * Globe Component - Progressive Loading & Batched Rendering
 * 
 * KEY OPTIMIZATIONS:
 * - Progressive marker loading (batches of 30 via requestAnimationFrame)
 * - Staged initialization (globe → markers → clusters → labels)
 * - Minimum loading phase to ensure stability
 * - Error boundaries and graceful degradation
 * - Loading progress callback for parent UI
 */

import { useMemo, useCallback, useState, useRef, useEffect, memo } from 'react'
import Globe from 'react-globe.gl'
import { Event } from '@/types/event'
import { GlobeMarker } from './MarkerSystem'
import { createStyleProvider, MarkerStyleStrategy } from './markerStyles'
import { getVisibleLabels, getLabelStyle, GeoLabel } from '@/data/geoLabels'
import { GeoClusterManager, ClusterConfig, prioritizeClusters } from './GeoClusterEngine'
import ClusterCarousel from '@/components/UI/ClusterCarousel'

// ============================================================================
// CONFIGURATION
// ============================================================================

// ============================================================================
// DEVICE-SPECIFIC CONFIGURATION
// Desktop and mobile are SEPARATE execution paths - not compromises
// ============================================================================

const CONFIG_DESKTOP = {
  // Marker limits - increased to ensure all markers render
  MAX_MARKERS: 500,
  MAX_LABELS: 60,
  
  // Wave loading - can be more aggressive
  WAVE_1_COUNT: 8,
  WAVE_1_DELAY: 80,
  WAVE_2_BATCH_SIZE: 20,
  WAVE_2_DELAY: 150,
  WAVE_3_BATCH_SIZE: 35,
  
  // Timing
  STAGE_MAP_INTERACTIVE: 50,
  STAGE_LABELS_START: 250,
  
  // Clustering
  CLUSTER_THRESHOLD: 0.8,
}

const CONFIG_MOBILE = {
  // Marker limits - increased to ensure all markers render on mobile
  MAX_MARKERS: 250,
  MAX_LABELS: 20,
  
  // Wave loading - gentler batches
  WAVE_1_COUNT: 5,
  WAVE_1_DELAY: 50,      // Faster initial markers
  WAVE_2_BATCH_SIZE: 10, // Smaller batches
  WAVE_2_DELAY: 100,
  WAVE_3_BATCH_SIZE: 15,
  
  // Timing - faster on mobile
  STAGE_MAP_INTERACTIVE: 30,
  STAGE_LABELS_START: 200,
  
  // Clustering - more aggressive to reduce markers
  CLUSTER_THRESHOLD: 1.0,
}

// Shared config
const CONFIG = {
  BATCH_FRAME_DELAY: 16,  // ~60fps
  MIN_ALTITUDE: 0.25,
  MAX_ALTITUDE: 4.0,
  DEFAULT_ALTITUDE: 2.5,
  MIN_SCALE: 0.6,
  MAX_SCALE: 1.4,
}

// ============================================================================
// UTILITIES
// ============================================================================

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])
  return isMobile
}

function validateEvent(event: Event): Event | null {
  // More lenient validation - only reject if truly invalid
  if (!event?.id) return null // ID is required
  
  // Allow defaults for missing type/severity
  const eventType = event?.type || 'other'
  const eventSeverity = event?.severity !== undefined && event?.severity !== null ? event.severity : 5
  
  const lat = event.latitude, lng = event.longitude
  if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) return null
  
  return { 
    ...event, 
    type: eventType,
    severity: eventSeverity as Event['severity'],
    latitude: Math.max(-90, Math.min(90, lat)), 
    longitude: Math.max(-180, Math.min(180, lng)) 
  }
}

// Geo-radius clustering manager instance
const clusterManager = new GeoClusterManager()

// ============================================================================
// TYPES
// ============================================================================

export interface FilterState {
  severity: number | 'all'
  eventTypes: string[]
}

interface GlobeComponentProps {
  events: Event[]
  onMarkerClick?: (event: Event) => void
  markerStyleStrategy?: MarkerStyleStrategy
  filters?: FilterState
  loading?: boolean
  processing?: boolean
  onZoomChange?: (zoom: number) => void
  onLoadingProgress?: (progress: number, stage: string) => void
  isDetailPanelOpen?: boolean
  isSettingsPanelOpen?: boolean
  isModalOpen?: boolean
  flyToTarget?: { lat: number; lng: number; onComplete?: () => void } | null
  highlightedEventIds?: string[]
  /** When set, only these event IDs will be visible (for country filter isolation) */
  isolatedEventIds?: string[] | null
  showLabels?: boolean
}

// ============================================================================
// COLORS
// ============================================================================

const COLORS: Record<string, string> = {
  breaking: '#dc2626', politics: '#2563eb', sports: '#16a34a', business: '#0891b2',
  technology: '#7c3aed', entertainment: '#db2777', health: '#059669', science: '#6366f1',
  crime: '#b91c1c', 'armed-conflict': '#991b1b', terrorism: '#7f1d1d', 'civil-unrest': '#c2410c',
  earthquake: '#92400e', volcano: '#b45309', wildfire: '#ea580c', storm: '#0369a1', 
  tsunami: '#0c4a6e', flood: '#0e7490', other: '#6b7280',
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function GlobeComponent({
  events,
  onMarkerClick,
  markerStyleStrategy = MarkerStyleStrategy.CRITICALITY_BASED,
  filters = { severity: 'all', eventTypes: [] },
  loading = false,
  processing = false,
  onZoomChange,
  onLoadingProgress,
  isDetailPanelOpen = false,
  isSettingsPanelOpen = false,
  isModalOpen = false,
  flyToTarget = null,
  highlightedEventIds = [],
  isolatedEventIds = null,
  showLabels = true,
}: GlobeComponentProps) {
  const globeRef = useRef<any>(null)
  const isMobile = useIsMobile()
  
  // ========== STAGED LOADING STATE ==========
  const [markersReady, setMarkersReady] = useState(false)
  const [labelsReady, setLabelsReady] = useState(false)
  
  // Marker loading state
  const [visibleMarkers, setVisibleMarkers] = useState<GlobeMarker[]>([])
  const allMarkersRef = useRef<GlobeMarker[]>([])
  
  // Camera state - uses refs during motion to avoid re-renders, commits to state on motion end
  const [currentAltitude, setCurrentAltitude] = useState(CONFIG.DEFAULT_ALTITUDE)
  const [cameraCenter, setCameraCenter] = useState<{ lat: number; lng: number }>({ lat: 20, lng: 0 })
  const pendingAltitudeRef = useRef(CONFIG.DEFAULT_ALTITUDE)
  const pendingCameraCenterRef = useRef<{ lat: number; lng: number }>({ lat: 20, lng: 0 })
  const [openCluster, setOpenCluster] = useState<{ events: Event[], position: { lat: number, lng: number }, regionName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // ========== VIEWPORT-ADAPTIVE CLUSTERING ==========
  // CRITICAL: Freeze marker updates during motion to eliminate lag
  const [isGlobeMoving, setIsGlobeMoving] = useState(false)
  const motionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingMarkersRef = useRef<GlobeMarker[] | null>(null)

  // Device-specific config - selected once based on device type
  const deviceConfig = useMemo(() => isMobile ? CONFIG_MOBILE : CONFIG_DESKTOP, [isMobile])
  const maxLabels = deviceConfig.MAX_LABELS

  // ========== THREE.JS CLEANUP ON UNMOUNT ==========
  useEffect(() => {
    return () => {
      // Dispose Three.js resources to prevent memory leaks
      if (globeRef.current) {
        const globe = globeRef.current
        try {
          // Access the Three.js scene and renderer
          const scene = globe.scene?.()
          const renderer = globe.renderer?.()

          if (scene) {
            scene.traverse((obj: any) => {
              if (obj.geometry) obj.geometry.dispose()
              if (obj.material) {
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((m: any) => {
                    m.map?.dispose()
                    m.dispose()
                  })
                } else {
                  obj.material.map?.dispose()
                  obj.material.dispose()
                }
              }
            })
          }

          if (renderer) {
            renderer.dispose()
            renderer.forceContextLoss?.()
          }
        } catch {
          // Cleanup failed - not critical
        }
      }

      // Clear timeouts
      if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current)
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current)

      // Clear cluster manager
      clusterManager.clear()
    }
  }, [])

  // ========== SIMPLIFIED MARKER LOADING ==========
  // No complex wave system - just show markers when data arrives

  // Globe ready immediately
  useEffect(() => {
    onLoadingProgress?.(25, 'Globe ready')
  }, [onLoadingProgress])

  // Process and filter events - REMOVED maxMarkers limit to show all valid markers
  const processedEvents = useMemo(() => {
    if (events.length === 0) return []
    try {
      let filtered = events.map(validateEvent).filter((e): e is Event => e !== null)
      if (filters.eventTypes?.length > 0) {
        filtered = filtered.filter(e => filters.eventTypes.includes(e.type))
      }
      if (filters.severity !== 'all' && typeof filters.severity === 'number') {
        const minSeverity = filters.severity
        filtered = filtered.filter(e => e.severity >= minSeverity)
      }
      // Sort by weight/severity
      filtered.sort((a, b) => {
        const weightA = (a.metadata?.weightScore as number) || a.severity || 0
        const weightB = (b.metadata?.weightScore as number) || b.severity || 0
        return weightB - weightA
      })
      return filtered
    } catch {
      return []
    }
  }, [events, filters.eventTypes, filters.severity])

  // Create markers with geo-radius clustering - respects motion state
  useEffect(() => {
    if (processedEvents.length === 0) {
      setVisibleMarkers([])
      pendingMarkersRef.current = null
      clusterManager.clear()
      return
    }

    // VIEWPORT-ADAPTIVE: If globe is moving, queue events for later
    if (isGlobeMoving) {
      clusterManager.queueEvents(processedEvents)
      return
    }

    try {
      // MOBILE FIX: On mobile, skip clustering entirely and show ALL individual markers
      const styleProvider = createStyleProvider(markerStyleStrategy)
      const markers: GlobeMarker[] = []
      
      if (isMobile) {
        // MOBILE: Use clustering with more aggressive settings to reduce marker count
        const clusterConfig: ClusterConfig = {
          altitude: currentAltitude,
          maxClusters: 200,
          isMobile: true,
          cityDeduplicationRadius: 50,
          capitalAggregation: true,
        }

        const rawClusterResult = clusterManager.cluster(processedEvents, clusterConfig)
        const clusterResult = prioritizeClusters(rawClusterResult, cameraCenter, {
          maxAngle: 60,
          includeOutside: true,
        })

        for (const single of clusterResult.singles) {
          const style = styleProvider.getStyle(single.primary)
          markers.push({
            id: single.id,
            lat: single.lat,
            lng: single.lng,
            size: 8,
            color: style.color,
            priority: style.priority,
            markerType: style.markerType,
            event: single.primary,
            opacity: 1,
            glow: style.glow ?? 0,
          })
        }

        for (const cluster of clusterResult.clusters) {
          const style = styleProvider.getStyle(cluster.primary)
          markers.push({
            id: cluster.id,
            lat: cluster.lat,
            lng: cluster.lng,
            size: 10,
            color: style.color,
            priority: cluster.totalWeight,
            markerType: 'circle',
            event: {
              ...cluster.primary,
              metadata: {
                ...cluster.primary.metadata,
                isCluster: true,
                clusterCount: cluster.events.length,
                clusterEvents: cluster.events,
              },
            },
            opacity: 1,
            glow: style.glow ?? 0,
          })
        }
      } else {
        // DESKTOP: Use clustering
        const clusterConfig: ClusterConfig = {
          altitude: currentAltitude,
          maxClusters: 500,
          isMobile: false,
          cityDeduplicationRadius: 30,
          capitalAggregation: true,
        }
        
        // Run geo-radius clustering
        const rawClusterResult = clusterManager.cluster(processedEvents, clusterConfig)
        
        // Apply progressive loading - prioritize clusters near camera center (60° radius)
        const clusterResult = prioritizeClusters(rawClusterResult, cameraCenter, {
          maxAngle: 60, // 60° radius = visible half of globe + buffer
          includeOutside: true, // Include all, but sorted by distance
        })
        
        // Add single events as individual markers
        for (const single of clusterResult.singles) {
          const style = styleProvider.getStyle(single.primary)
          markers.push({
            id: single.id,
            lat: single.lat,
            lng: single.lng,
            size: 8,
            color: style.color,
            priority: style.priority,
            markerType: style.markerType,
            event: single.primary,
            opacity: 1,
            glow: style.glow ?? 0,
          })
        }
        
        // Add clusters as markers with metadata
        for (const cluster of clusterResult.clusters) {
          const style = styleProvider.getStyle(cluster.primary)
          markers.push({
            id: cluster.id,
            lat: cluster.lat,
            lng: cluster.lng,
            size: 10,
            color: style.color,
            priority: cluster.totalWeight,
            markerType: 'circle',
            event: {
              ...cluster.primary,
              metadata: {
                ...cluster.primary.metadata,
                isCluster: true,
                clusterCount: cluster.events.length,
                clusterEvents: cluster.events,
              },
            },
            opacity: 1,
            glow: style.glow ?? 0,
          })
        }
      }
      
      // Sort by priority
      markers.sort((a, b) => b.priority - a.priority)
      
      allMarkersRef.current = markers
      setVisibleMarkers(markers)
      pendingMarkersRef.current = null
      
      onLoadingProgress?.(80, 'Markers clustered')
      setMarkersReady(true)
    } catch (e) {
      void e // Clustering failed - silently degrade
      setError('Failed to create markers')
    }
  }, [processedEvents, markerStyleStrategy, onLoadingProgress, isGlobeMoving, currentAltitude, isMobile, cameraCenter])

  // Enable labels after markers are ready
  useEffect(() => {
    if (!markersReady) return
    setLabelsReady(true)
    onLoadingProgress?.(95, 'Labels ready')
  }, [markersReady, onLoadingProgress])

  // STAGE 7: Skip borders for performance (removed heavy GeoJSON polygon rendering)
  useEffect(() => {
    if (labelsReady) {
      onLoadingProgress?.(100, 'Complete')
    }
  }, [labelsReady, onLoadingProgress])

  // ========== FLY TO ==========
  useEffect(() => {
    if (flyToTarget && globeRef.current) {
      try {
        globeRef.current.pointOfView({ 
          lat: flyToTarget.lat, 
          lng: flyToTarget.lng, 
          altitude: 1.5 
        }, 1200)
        if (flyToTarget.onComplete) {
          setTimeout(flyToTarget.onComplete, 1300)
        }
      } catch {}
    }
  }, [flyToTarget])

  // ========== ZOOM/PAN HANDLER WITH MOTION DETECTION ==========
  // Critical for performance: freeze marker updates during motion
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleZoom = useCallback((pov: { lat: number; lng: number; altitude: number }) => {
    // Mark globe as moving
    setIsGlobeMoving(true)

    // Store in refs during motion (avoids re-renders on every frame)
    const clampedAlt = Math.max(CONFIG.MIN_ALTITUDE, Math.min(CONFIG.MAX_ALTITUDE, pov.altitude))
    pendingAltitudeRef.current = clampedAlt
    pendingCameraCenterRef.current = { lat: pov.lat, lng: pov.lng }

    // Clear existing timeouts
    if (motionTimeoutRef.current) clearTimeout(motionTimeoutRef.current)
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current)

    // Debounce: when motion ends, commit refs to state (triggers one re-cluster)
    motionTimeoutRef.current = setTimeout(() => {
      setCurrentAltitude(pendingAltitudeRef.current)
      setCameraCenter(pendingCameraCenterRef.current)
      setIsGlobeMoving(false)
    }, isMobile ? 200 : 100)

    // Debounce zoom level callback
    zoomTimeoutRef.current = setTimeout(() => {
      const zoomLevel = 1 - (clampedAlt - CONFIG.MIN_ALTITUDE) / (CONFIG.MAX_ALTITUDE - CONFIG.MIN_ALTITUDE)
      onZoomChange?.(zoomLevel)
    }, isMobile ? 100 : 50)
  }, [onZoomChange, isMobile])

  // ========== DERIVED VALUES ==========
  const markerScale = useMemo(() => {
    const t = (currentAltitude - CONFIG.MIN_ALTITUDE) / (CONFIG.MAX_ALTITUDE - CONFIG.MIN_ALTITUDE)
    return CONFIG.MIN_SCALE + (CONFIG.MAX_SCALE - CONFIG.MIN_SCALE) * t
  }, [currentAltitude])

  const visibleLabels = useMemo(() => {
    if (!labelsReady || !showLabels) return []
    try {
      const labels = getVisibleLabels(currentAltitude)
      return labels.slice(0, maxLabels)
    } catch { 
      return [] 
    }
  }, [showLabels, currentAltitude, labelsReady, maxLabels])

  const activeNewsRegions = useMemo(() => 
    events.slice(0, 20).map(e => ({ lat: e.latitude, lng: e.longitude })), 
    [events]
  )

  // ========== ELEMENT CREATION ==========
  const getTimeAgo = (ts: number): string => {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return 'Now'
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
  }

  // SVG path data for professional outline icons
  const MARKER_SVG_PATHS: Record<string, string> = {
    'politics': '<path d="M3 21h18M5 21v-7M19 21v-7M9 21v-4h6v4M3 14h18M12 3l9 7H3l9-7z"/><circle cx="12" cy="8" r="1"/>',
    'business': '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>',
    'technology': '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 6V3M15 6V3M9 21v-3M15 21v-3M6 9H3M6 15H3M21 9h-3M21 15h-3"/>',
    'armed-conflict': '<path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z"/>',
    'terrorism': '<path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z"/>',
    'security': '<path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z"/>',
    'crime': '<path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z"/>',
    'civil-unrest': '<path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z"/>',
    'health': '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z"/>',
    'energy': '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    'climate': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    'earthquake': '<path d="M12 3L2 21h20L12 3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'volcano': '<path d="M12 3L2 21h20L12 3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'wildfire': '<path d="M12 3L2 21h20L12 3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'storm': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    'tsunami': '<path d="M12 3L2 21h20L12 3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'flood': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    'science': '<path d="M9 3h6"/><path d="M10 3v6l-4 8h12l-4-8V3"/><path d="M8 17h8"/>',
    'diplomacy': '<circle cx="12" cy="12" r="9"/><path d="M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9"/><path d="M12 3c-2.5 2.5-4 6-4 9s1.5 6.5 4 9"/><path d="M3 12h18"/>',
    'breaking': '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
    'other': '<path d="M12 21c-4-4-8-7.5-8-12a8 8 0 1116 0c0 4.5-4 8-8 12z"/><circle cx="12" cy="9" r="2"/>',
  }

  const createMarkerElement = useCallback((marker: GlobeMarker) => {
    const isCluster = marker.event.metadata?.isCluster === true
    const clusterCount = (marker.event.metadata?.clusterCount as number) || 1
    const clusterEvents = (marker.event.metadata?.clusterEvents as Event[]) || []
    const eventType = marker.event.type || 'other'
    const color = COLORS[eventType] || COLORS.other

    // Check if this marker should be visible (country filter isolation)
    // For clusters, check if ANY event in the cluster matches
    let isIsolated = false
    if (isolatedEventIds && isolatedEventIds.length > 0) {
      if (isCluster) {
        // Cluster is visible if any of its events are in the isolated set
        isIsolated = clusterEvents.some(e => isolatedEventIds.includes(e.id))
      } else {
        isIsolated = isolatedEventIds.includes(marker.event.id)
      }
    }
    
    // When isolation is active, non-isolated markers are hidden with scale+fade
    const shouldHide = isolatedEventIds && isolatedEventIds.length > 0 && !isIsolated

    // Check if this marker is highlighted (category browse mode)
    const isHighlighted = highlightedEventIds.length > 0 && highlightedEventIds.includes(marker.event.id)
    // When highlights are active, dim non-highlighted markers
    const shouldDim = highlightedEventIds.length > 0 && !isHighlighted

    const size = Math.round((isCluster ? 30 : 24) * markerScale)
    const iconSize = Math.round((isCluster ? 14 : 12) * markerScale)

    const container = document.createElement('div')
    container.className = 'globe-marker'
    container.setAttribute('data-event-id', marker.event.id)
    container.setAttribute('data-isolated', isIsolated ? 'true' : 'false')
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: ${shouldHide ? 'default' : 'pointer'};
      pointer-events: ${shouldHide ? 'none' : 'auto'};
      opacity: ${shouldHide ? '0' : shouldDim ? '0.3' : '1'};
      transition: opacity 0.35s ease;
    `

    // Main badge - clean circular background
    const badge = document.createElement('div')
    badge.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.9);
      border: ${isHighlighted ? '2.5px' : '1.5px'} solid ${color};
      box-shadow: ${isHighlighted ? `0 0 16px ${color}80, 0 0 8px ${color}40` : '0 2px 8px rgba(0,0,0,0.4)'};
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform 0.15s ease, border-width 0.15s ease, box-shadow 0.15s ease;
    `
    
    // SVG icon - professional outline style
    const svgPath = MARKER_SVG_PATHS[eventType] || MARKER_SVG_PATHS['other']
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', String(iconSize))
    svg.setAttribute('height', String(iconSize))
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', color)
    svg.setAttribute('stroke-width', '1.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.innerHTML = svgPath
    badge.appendChild(svg)

    // Cluster count badge
    if (isCluster && clusterCount > 1) {
      const countBadge = document.createElement('div')
      countBadge.style.cssText = `
        position: absolute;
        top: -3px;
        right: -3px;
        min-width: 14px;
        height: 14px;
        border-radius: 7px;
        background: ${color};
        border: 1px solid rgba(15, 23, 42, 0.9);
        color: #fff;
        font-size: 8px;
        font-weight: 600;
        font-family: system-ui, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 2px;
      `
      countBadge.textContent = clusterCount > 99 ? '99+' : String(clusterCount)
      badge.appendChild(countBadge)
    }

    container.appendChild(badge)

    // Hover effect (desktop only) - scale badge, not container (container transform is managed by CSS2DRenderer)
    container.onmouseenter = () => {
      if (shouldHide) return
      badge.style.borderWidth = '2px'
      badge.style.boxShadow = `0 0 12px ${color}60`
      badge.style.transform = 'scale(1.15)'
    }
    container.onmouseleave = () => {
      if (shouldHide) return
      badge.style.borderWidth = '1.5px'
      badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
      badge.style.transform = 'scale(1)'
    }

    // ========== GESTURE-PRIORITY ARBITRATION ==========
    // Mobile: Distinguish taps from drags/rotations
    // Thresholds: 200ms max duration, 15px max movement
    const GESTURE_THRESHOLDS = { TAP_MAX_DURATION: 200, TAP_MAX_MOVEMENT: 15 }
    let touchStart: { x: number; y: number; time: number } | null = null

    const handleMarkerAction = () => {
      if (shouldHide) return
      
      if (isCluster && clusterCount > 1) {
        // All clusters with 2+ events open swipeable carousel
        const regionName = (() => {
          const firstEvent = clusterEvents[0]
          const locationName = firstEvent?.metadata?.locationName as string
          const country = firstEvent?.metadata?.country as string
          if (locationName) return locationName
          if (country) return country
          return `${marker.lat.toFixed(1)}, ${marker.lng.toFixed(1)}`
        })()
        setOpenCluster({ events: clusterEvents, position: { lat: marker.lat, lng: marker.lng }, regionName })
      } else {
        onMarkerClick?.(marker.event)
      }
    }

    // Touch start - record position and time
    container.ontouchstart = (e) => {
      if (shouldHide) return
      const touch = e.touches[0]
      touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    }

    // Touch end - check if it's a tap (short duration, minimal movement)
    container.ontouchend = (e) => {
      if (shouldHide || !touchStart) return
      
      const touch = e.changedTouches[0]
      const duration = Date.now() - touchStart.time
      const movement = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y)
      
      // If this is a tap (not a drag/rotate), handle it
      if (duration < GESTURE_THRESHOLDS.TAP_MAX_DURATION && movement < GESTURE_THRESHOLDS.TAP_MAX_MOVEMENT) {
        e.preventDefault()
        e.stopPropagation()
        handleMarkerAction()
      }
      
      touchStart = null
    }

    // Touch cancel - reset state
    container.ontouchcancel = () => {
      touchStart = null
    }

    // Desktop click handler
    container.onclick = (e) => {
      if (shouldHide) return
      e.stopPropagation()
      handleMarkerAction()
    }

    return container
  }, [markerScale, onMarkerClick, isolatedEventIds, highlightedEventIds])

  const createLabelElement = useCallback((label: GeoLabel) => {
    const style = getLabelStyle(label, currentAltitude, activeNewsRegions)
    const div = document.createElement('div')
    div.className = 'geo-label'
    const textColor = `rgba(255,255,255,${style.opacity})`
    div.style.cssText = `
      font-family: system-ui, sans-serif;
      font-size: ${style.fontSize}px;
      font-weight: ${style.fontWeight};
      color: ${textColor};
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -50%);
      will-change: transform;
      backface-visibility: hidden;
      -webkit-font-smoothing: antialiased;
    `
    div.textContent = label.name
    return div
  }, [currentAltitude, activeNewsRegions])

  // ========== GRID LINES DATA ==========
  // Latitude/longitude grid lines (very subtle, opacity 0.05-0.10)
  // Format for react-globe.gl arcsData: { startLat, startLng, endLat, endLng }

  // ========== HTML DATA FOR GLOBE ==========
  const htmlData = useMemo(() => {
    const labelData = visibleLabels.map(l => ({ 
      lat: l.lat, 
      lng: l.lng, 
      label: l, 
      _type: 'label' as const 
    }))
    const markerData = visibleMarkers.map(m => ({ 
      ...m, 
      _type: 'marker' as const 
    }))
    return [...labelData, ...markerData]
  }, [visibleMarkers, visibleLabels])

  // ========== RENDER ==========
  const shouldBlur = isDetailPanelOpen || isSettingsPanelOpen || isModalOpen || openCluster !== null
  const globeImage = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
  const bgImage = '//unpkg.com/three-globe/example/img/night-sky.png'

  const closeCluster = useCallback(() => setOpenCluster(null), [])

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white text-lg mb-2">Something went wrong</div>
          <div className="text-gray-400 text-sm mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div 
        className="w-full h-full globe-container"
        style={{
          transition: 'opacity 0.3s ease-out',
          opacity: shouldBlur ? 0.6 : 1,
          background: '#0a0a0a',
        }}
      >
        <Globe
          ref={globeRef}
          globeImageUrl={globeImage}
          backgroundImageUrl={bgImage}
          htmlElementsData={htmlData}
          htmlLat={(d: any) => d.lat}
          htmlLng={(d: any) => d.lng}
          htmlAltitude={(d: any) => d._type === 'label' ? 0.003 : 0.006}
          htmlTransitionDuration={0}
          htmlElement={(d: any) => d._type === 'label' ? createLabelElement(d.label) : createMarkerElement(d)}
          enablePointerInteraction={!isDetailPanelOpen && !openCluster}
          atmosphereColor="#3b5998"
          atmosphereAltitude={0.15}
          {...({ onZoom: handleZoom } as any)}
        />
      </div>

      {/* Cluster Carousel - Category-grouped horizontal intelligence cards */}
      {openCluster && (
        <ClusterCarousel
          events={openCluster.events}
          regionName={openCluster.regionName}
          position={openCluster.position}
          onSelectEvent={(event) => {
            closeCluster()
            setTimeout(() => onMarkerClick?.(event), 50)
          }}
          onClose={closeCluster}
        />
      )}

      <style>{`
        .globe-marker { 
          pointer-events: auto; 
          z-index: 10; 
        }
        .geo-label { 
          z-index: 5; 
          pointer-events: none; 
        }
        @keyframes markerFadeIn {
          from { opacity: 0; transform: translate(-50%, -100%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
        .target-pulse {
          animation: targetPulse 1.2s ease-out !important;
        }
        @keyframes targetPulse {
          0% { transform: translate(-50%, -100%) scale(1); }
          50% { transform: translate(-50%, -100%) scale(1.3); }
          100% { transform: translate(-50%, -100%) scale(1); }
        }
      `}</style>
    </>
  )
}

export default memo(GlobeComponent)
