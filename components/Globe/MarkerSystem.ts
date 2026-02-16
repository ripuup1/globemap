/**
 * Marker System - Performance Optimized
 * 
 * Data-driven marker rendering with:
 * - ZERO console.log calls (major performance gain)
 * - Efficient marker creation
 * - Type-safe styling
 */

import { Event, EventType, SeverityLevel } from '@/types/event'
import { validateCoordinates } from '@/utils/validation'

export type MarkerType = 'pin' | 'circle'

export interface MarkerStyle {
  color: string
  size: number
  priority: number
  markerType: MarkerType
  opacity?: number
  glow?: number
}

export interface GlobeMarker {
  id: string
  lat: number
  lng: number
  size: number
  color: string
  priority: number
  markerType: MarkerType
  event: Event
  opacity?: number
  glow?: number
}

export interface MarkerStyleProvider {
  getStyle(event: Event): MarkerStyle
  getMarkerType(event: Event): MarkerType
}

/**
 * Default marker style provider
 */
export class DefaultMarkerStyleProvider implements MarkerStyleProvider {
  constructor(
    private getColor: (severity: SeverityLevel, type?: EventType) => string,
    private getSize: (severity: SeverityLevel, type?: EventType) => number,
    private getPriority: (severity: SeverityLevel, type?: EventType) => number,
    private getMarkerTypeFn: (event: Event) => MarkerType,
    private getOpacity?: (severity: SeverityLevel, type?: EventType) => number,
    private getGlow?: (severity: SeverityLevel, type?: EventType) => number
  ) {}

  getStyle(event: Event): MarkerStyle {
    return {
      color: this.getColor(event.severity, event.type),
      size: this.getSize(event.severity, event.type),
      priority: this.getPriority(event.severity, event.type),
      markerType: this.getMarkerTypeFn(event),
      opacity: this.getOpacity?.(event.severity, event.type),
      glow: this.getGlow?.(event.severity, event.type),
    }
  }

  getMarkerType(event: Event): MarkerType {
    return this.getMarkerTypeFn(event)
  }
}

/**
 * Optimized marker factory
 * - No console.log calls
 * - Minimal validation overhead
 * - Fast path for valid events
 */
export class MarkerFactory {
  constructor(private styleProvider: MarkerStyleProvider) {}

  createMarker(event: Event): GlobeMarker | null {
    // Fast validation
    const coordValidation = validateCoordinates(event.latitude, event.longitude)
    if (!coordValidation.valid || !event.id || !event.title) {
      return null
    }

    const style = this.styleProvider.getStyle(event)

    // Fixed size for visibility (override calculations)
    const MARKER_SIZE = 8
    const MARKER_OPACITY = 1.0

    return {
      id: event.id,
      lat: event.latitude,
      lng: event.longitude,
      size: MARKER_SIZE,
      color: style.color || '#ff0000',
      priority: style.priority,
      markerType: style.markerType,
      event,
      opacity: MARKER_OPACITY,
      glow: style.glow ?? 0,
    }
  }

  createMarkers(events: Event[]): GlobeMarker[] {
    const markers: GlobeMarker[] = []
    
    for (const event of events) {
      const marker = this.createMarker(event)
      // REMOVED opacity check - show all valid markers to ensure 150-200 markers render
      if (marker) {
        markers.push(marker)
      }
    }

    // Sort by priority (higher = on top)
    return markers.sort((a, b) => b.priority - a.priority)
  }
}

/**
 * Main marker system
 */
export class MarkerSystem {
  private factory: MarkerFactory

  constructor(styleProvider: MarkerStyleProvider) {
    this.factory = new MarkerFactory(styleProvider)
  }

  createMarkers(events: Event[]): GlobeMarker[] {
    return this.factory.createMarkers(events)
  }

  setStyleProvider(provider: MarkerStyleProvider): void {
    this.factory = new MarkerFactory(provider)
  }
}
