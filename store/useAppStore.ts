/**
 * Global App Store (Zustand)
 *
 * Centralized state management for Vox Terra.
 * Replaces the 20+ useState calls in page.tsx.
 */

import { create } from 'zustand'
import { Event } from '@/types/event'
import { ExtendedFilterState } from '@/components/UI/SatelliteControlPanel'

// ============================================================================
// TYPES
// ============================================================================

export interface CategoryBrowseMode {
  active: boolean
  category: string
  categoryLabel: string
  categoryIcon: string
  matchingEvents: Event[]
  currentIndex: number
}

export interface FlyToTarget {
  lat: number
  lng: number
  onComplete?: () => void
}

interface AppState {
  // --- Event Selection ---
  selectedEvent: Event | null
  eventHistory: Event[]
  selectEvent: (event: Event | null) => void
  navigateToEvent: (event: Event) => void
  goBack: () => Event | null

  // --- Filters ---
  filters: ExtendedFilterState
  searchQuery: string
  timeRange: string
  setFilters: (filters: ExtendedFilterState) => void
  setSearchQuery: (query: string) => void
  setTimeRange: (range: string) => void

  // --- Globe State ---
  globeZoom: number
  globeAltitude: number
  flyToTarget: FlyToTarget | null
  setGlobeZoom: (zoom: number) => void
  setFlyToTarget: (target: FlyToTarget | null) => void

  // --- Category Browse ---
  categoryBrowseMode: CategoryBrowseMode | null
  setCategoryBrowseMode: (mode: CategoryBrowseMode | null) => void
  navigateCategoryPin: (direction: 'next' | 'prev') => Event | null
  exitCategoryBrowseMode: () => void

  // --- Panels & Modals ---
  isSettingsPanelOpen: boolean
  showInteractionHint: boolean
  showInfoModal: boolean
  showShortcutsHelp: boolean
  showAuthModal: boolean
  setSettingsPanelOpen: (open: boolean) => void
  setShowInteractionHint: (show: boolean) => void
  setShowInfoModal: (show: boolean) => void
  setShowShortcutsHelp: (show: boolean) => void
  setShowAuthModal: (show: boolean) => void

  // --- Loading State ---
  canShowContent: boolean
  degradedMode: boolean
  showRetryPrompt: boolean
  hasError: boolean
  setCanShowContent: (show: boolean) => void
  setDegradedMode: (degraded: boolean) => void
  setShowRetryPrompt: (show: boolean) => void
  setHasError: (error: boolean) => void

  // --- Device ---
  isMobile: boolean
  setIsMobile: (mobile: boolean) => void
}

// ============================================================================
// STORE
// ============================================================================

export const useAppStore = create<AppState>((set, get) => ({
  // --- Event Selection ---
  selectedEvent: null,
  eventHistory: [],
  selectEvent: (event) => set({ selectedEvent: event }),
  navigateToEvent: (event) => {
    const { selectedEvent } = get()
    set(state => ({
      eventHistory: selectedEvent
        ? [...state.eventHistory, selectedEvent]
        : state.eventHistory,
      selectedEvent: event,
    }))
  },
  goBack: () => {
    const { eventHistory } = get()
    if (eventHistory.length === 0) return null
    const previous = eventHistory[eventHistory.length - 1]
    set({
      eventHistory: eventHistory.slice(0, -1),
      selectedEvent: previous,
    })
    return previous
  },

  // --- Filters ---
  filters: {
    severity: 'all',
    eventTypes: [],
    selectedCountries: [],
    userLocation: null,
    distanceRadius: 500,
    showDistances: false,
  },
  searchQuery: '',
  timeRange: 'all',
  setFilters: (filters) => set({ filters }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTimeRange: (timeRange) => set({ timeRange }),

  // --- Globe State ---
  globeZoom: 1.0,
  globeAltitude: 2.5,
  flyToTarget: null,
  setGlobeZoom: (zoom) => set({
    globeZoom: zoom,
    globeAltitude: Math.max(0.5, Math.min(4.0, 2.5 / Math.max(zoom, 0.5))),
  }),
  setFlyToTarget: (flyToTarget) => set({ flyToTarget }),

  // --- Category Browse ---
  categoryBrowseMode: null,
  setCategoryBrowseMode: (mode) => set({ categoryBrowseMode: mode }),
  navigateCategoryPin: (direction) => {
    const { categoryBrowseMode } = get()
    if (!categoryBrowseMode) return null
    const { matchingEvents, currentIndex } = categoryBrowseMode
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % matchingEvents.length
      : (currentIndex - 1 + matchingEvents.length) % matchingEvents.length
    const targetEvent = matchingEvents[newIndex]
    set({
      categoryBrowseMode: { ...categoryBrowseMode, currentIndex: newIndex },
      selectedEvent: targetEvent,
    })
    return targetEvent
  },
  exitCategoryBrowseMode: () => set({
    categoryBrowseMode: null,
    searchQuery: '',
  }),

  // --- Panels & Modals ---
  isSettingsPanelOpen: false,
  showInteractionHint: false,
  showInfoModal: false,
  showShortcutsHelp: false,
  showAuthModal: false,
  setSettingsPanelOpen: (open) => set({ isSettingsPanelOpen: open }),
  setShowInteractionHint: (show) => set({ showInteractionHint: show }),
  setShowInfoModal: (show) => set({ showInfoModal: show }),
  setShowShortcutsHelp: (show) => set({ showShortcutsHelp: show }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),

  // --- Loading State ---
  canShowContent: false,
  degradedMode: false,
  showRetryPrompt: false,
  hasError: false,
  setCanShowContent: (show) => set({ canShowContent: show }),
  setDegradedMode: (degraded) => set({ degradedMode: degraded }),
  setShowRetryPrompt: (show) => set({ showRetryPrompt: show }),
  setHasError: (error) => set({ hasError: error }),

  // --- Device ---
  isMobile: false,
  setIsMobile: (mobile) => set({ isMobile: mobile }),
}))
