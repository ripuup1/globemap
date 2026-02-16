/**
 * Satellite Control Panel
 * 
 * Professional settings panel with:
 * - Multi-select category filtering
 * - Country-specific top stories filter
 * - Location-based distance filter (Advanced Settings)
 * - Accordion behavior
 */

import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react'
import { EventType } from '@/types/event'
import { FilterState } from '../Globe/Globe'
import { Event } from '@/types/event'
import ISSSatellite from './ISSSatellite'
import { getCategoryColor, ICON_CATEGORIES } from '../Globe/markerIcons'
import { extractCountriesFromEvents } from '@/utils/countryExtractor'
import { calculateDistance } from '@/utils/geo'

// Extended FilterState for new features
export interface ExtendedFilterState extends FilterState {
  selectedCountries?: string[]
  userLocation?: { lat: number; lng: number; name: string } | null
  distanceRadius?: number // in miles
  showDistances?: boolean // Toggle for distance filtering
}

interface SatelliteControlPanelProps {
  filters: FilterState
  onFiltersChange: (filters: ExtendedFilterState) => void
  events: Event[]
  searchQuery: string
  onSearchChange: (query: string) => void
  timeRange: string
  onTimeRangeChange: (range: string) => void
  zoomLevel?: number
  globeAltitude?: number // For ISS zoom-aware positioning
  theme?: 'dark' | 'light' // Theme for ISS day/night visuals
  onSettingsOpenChange?: (isOpen: boolean) => void // Notify parent of settings state
}

// Category options - Professional labels, no emojis
const EVENT_CATEGORIES: Array<{ value: EventType | 'all'; label: string; color: string }> = [
  { value: 'breaking', label: 'Breaking', color: '#E8A838' },
  { value: 'politics', label: 'Politics', color: '#4F7CAC' },
  { value: 'sports', label: 'Sports', color: '#5B9A8B' },
  { value: 'business', label: 'Markets', color: '#D4A84B' },
  { value: 'technology', label: 'Technology', color: '#7BA4DB' },
  { value: 'entertainment', label: 'Entertainment', color: '#9B7ED9' },
  { value: 'health', label: 'Health', color: '#E08D9D' },
  { value: 'science', label: 'Science', color: '#5DADE2' },
  { value: 'crime', label: 'Crime', color: '#E67E5A' },
  { value: 'armed-conflict', label: 'Conflicts', color: '#C75146' },
  { value: 'terrorism', label: 'Security', color: '#B85450' },
  { value: 'civil-unrest', label: 'Unrest', color: '#D97B4A' },
  { value: 'earthquake', label: 'Seismic', color: '#A0826D' },
  { value: 'volcano', label: 'Volcanic', color: '#C4694D' },
  { value: 'wildfire', label: 'Wildfire', color: '#D4743A' },
  { value: 'storm', label: 'Storm', color: '#6B8CAE' },
]

// Country options are now dynamically extracted from events (see countryOptions useMemo below)

// Simple geocoding for common locations
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  'north carolina': { lat: 35.7596, lng: -79.0193 },
  'california': { lat: 36.7783, lng: -119.4179 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'texas': { lat: 31.9686, lng: -99.9018 },
  'florida': { lat: 27.6648, lng: -81.5158 },
  'colorado': { lat: 39.5501, lng: -105.7821 },
  'washington': { lat: 47.7511, lng: -120.7401 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
}

function SatelliteControlPanel({
  filters,
  onFiltersChange,
  events,
  searchQuery,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  zoomLevel = 1.0,
  globeAltitude = 2.5,
  theme = 'dark',
  onSettingsOpenChange,
}: SatelliteControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>('filters')
  
  // Advanced settings state
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [distanceRadius, setDistanceRadius] = useState<number>(500)
  const [showDistances, setShowDistances] = useState(false)
  
  // Swipe-to-dismiss state (mobile)
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  const touchCurrentY = useRef<number>(0)
  const isDragging = useRef<boolean>(false)
  const scrollableRef = useRef<HTMLDivElement>(null)
  
  // Dynamically extract countries from events
  const countryOptions = useMemo(() => {
    return extractCountriesFromEvents(events)
  }, [events])

  // Notify parent of settings open/close state
  useEffect(() => {
    onSettingsOpenChange?.(isExpanded)
  }, [isExpanded, onSettingsOpenChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); setIsExpanded(p => !p) }
      if (e.key === 'Escape') setIsExpanded(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
  
  // FIX #3: Swipe-to-dismiss for mobile settings panel
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable swipe on the handle area or when scrolled to top
    const target = e.target as HTMLElement
    const isHandle = target.closest('.swipe-handle')
    const scrollable = scrollableRef.current
    const isScrolledToTop = !scrollable || scrollable.scrollTop <= 0
    
    if (isHandle || isScrolledToTop) {
      touchStartY.current = e.touches[0].clientY
      isDragging.current = true
    }
  }, [])
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    touchCurrentY.current = e.touches[0].clientY
    const deltaY = touchCurrentY.current - touchStartY.current
    
    // Only allow downward swipe
    if (deltaY > 0 && panelRef.current) {
      panelRef.current.style.transform = `translateY(${deltaY}px)`
      panelRef.current.style.transition = 'none'
    }
  }, [])
  
  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    
    const deltaY = touchCurrentY.current - touchStartY.current
    
    if (panelRef.current) {
      panelRef.current.style.transition = 'transform 0.3s ease-out'
      
      // If swiped down more than 100px, close the panel
      if (deltaY > 100) {
        panelRef.current.style.transform = 'translateY(100%)'
        setTimeout(() => setIsExpanded(false), 300)
      } else {
        // Snap back
        panelRef.current.style.transform = 'translateY(0)'
      }
    }
    
    touchStartY.current = 0
    touchCurrentY.current = 0
  }, [])

  const toggleSection = (section: string) => {
    setActiveSection(prev => prev === section ? null : section)
  }

  const toggleCategory = useCallback((value: string) => {
    const currentTypes = filters.eventTypes || []
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter(t => t !== value)
      : [...currentTypes, value]
    onFiltersChange({ 
      ...filters, 
      eventTypes: newTypes,
      selectedCountries,
      userLocation,
      distanceRadius,
      showDistances,
    })
  }, [filters, onFiltersChange, selectedCountries, userLocation, distanceRadius, showDistances])

  const toggleAll = useCallback(() => {
    const currentTypes = filters.eventTypes || []
    const newTypes = currentTypes.length === EVENT_CATEGORIES.length ? [] : EVENT_CATEGORIES.map(c => c.value as string)
    onFiltersChange({ 
      ...filters, 
      eventTypes: newTypes,
      selectedCountries,
      userLocation,
      distanceRadius,
      showDistances,
    })
  }, [filters, onFiltersChange, selectedCountries, userLocation, distanceRadius, showDistances])

  const toggleCountry = useCallback((country: string) => {
    setSelectedCountries(prev => {
      const newCountries = prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country]
      // Notify parent of country filter change
      onFiltersChange({ 
        ...filters, 
        selectedCountries: newCountries,
        userLocation,
        distanceRadius,
        showDistances,
      })
      return newCountries
    })
  }, [filters, onFiltersChange, userLocation, distanceRadius, showDistances])

  // Geocode location input
  const handleLocationSubmit = useCallback(() => {
    const normalized = locationInput.toLowerCase().trim()
    const coords = LOCATION_COORDS[normalized]
    let newLocation: { lat: number; lng: number; name: string } | null = null
    
    if (coords) {
      newLocation = { ...coords, name: locationInput }
    } else {
      // Fallback: try to find partial match
      const match = Object.entries(LOCATION_COORDS).find(([key]) => 
        key.includes(normalized) || normalized.includes(key)
      )
      if (match) {
        newLocation = { lat: match[1].lat, lng: match[1].lng, name: match[0] }
      }
    }
    
    if (newLocation) {
      setUserLocation(newLocation)
      // Notify parent
      onFiltersChange({
        ...filters,
        selectedCountries,
        userLocation: newLocation,
        distanceRadius,
        showDistances,
      })
    }
  }, [locationInput, filters, onFiltersChange, selectedCountries, distanceRadius, showDistances])

  // Clear user location
  const handleClearLocation = useCallback(() => {
    setUserLocation(null)
    setShowDistances(false)
    onFiltersChange({
      ...filters,
      selectedCountries,
      userLocation: null,
      distanceRadius,
      showDistances: false,
    })
  }, [filters, onFiltersChange, selectedCountries, distanceRadius])

  // Handle distance radius change
  const handleDistanceChange = useCallback((newRadius: number) => {
    setDistanceRadius(newRadius)
    onFiltersChange({
      ...filters,
      selectedCountries,
      userLocation,
      distanceRadius: newRadius,
      showDistances,
    })
  }, [filters, onFiltersChange, selectedCountries, userLocation, showDistances])

  // Toggle distance filter
  const handleToggleDistanceFilter = useCallback((enabled: boolean) => {
    setShowDistances(enabled)
    onFiltersChange({
      ...filters,
      selectedCountries,
      userLocation,
      distanceRadius,
      showDistances: enabled,
    })
  }, [filters, onFiltersChange, selectedCountries, userLocation, distanceRadius])

  // Clear countries filter
  const handleClearCountries = useCallback(() => {
    setSelectedCountries([])
    onFiltersChange({
      ...filters,
      selectedCountries: [],
      userLocation,
      distanceRadius,
      showDistances,
    })
  }, [filters, onFiltersChange, userLocation, distanceRadius, showDistances])

  // Calculate stats
  const categoryStats = useMemo(() => 
    events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  , [events])

  // Filter events by country
  const filteredByCountry = useMemo(() => {
    if (selectedCountries.length === 0) return events
    return events.filter(e => {
      const country = (e.metadata?.country as string || '').toLowerCase()
      return selectedCountries.some(c => country.includes(c))
    })
  }, [events, selectedCountries])

  // Calculate distances and filter by radius
  const eventsWithDistance = useMemo(() => {
    if (!userLocation || !showDistances) return filteredByCountry
    return filteredByCountry
      .map(e => ({
        ...e,
        distance: calculateDistance(userLocation.lat, userLocation.lng, e.latitude, e.longitude)
      }))
      .filter(e => e.distance <= distanceRadius)
      .sort((a, b) => a.distance - b.distance)
  }, [filteredByCountry, userLocation, showDistances, distanceRadius])

  const activeFiltersCount = (filters.eventTypes?.length || 0) + selectedCountries.length + (userLocation ? 1 : 0)
  const displayEvents = showDistances && userLocation ? eventsWithDistance : filteredByCountry

  return (
    <>
      <ISSSatellite
        onClick={() => setIsExpanded(!isExpanded)}
        isExpanded={isExpanded}
        activeFiltersCount={activeFiltersCount}
        zoomLevel={zoomLevel}
        globeAltitude={globeAltitude}
        theme={theme}
      />

      {isExpanded && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Globe Settings"
          className="settings-panel fixed z-50 w-80 max-sm:w-full max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto sm:top-16 sm:right-4"
          style={{ animation: 'scp-slideIn 0.25s ease-out' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <style>{`
            @keyframes scp-slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @media (max-width: 640px) {
              @keyframes scp-slideIn { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
            }
          `}</style>
          
          <div 
            className="overflow-hidden max-sm:rounded-t-[20px] max-sm:rounded-b-none sm:rounded-2xl"
            style={{
              fontFamily: 'var(--font-exo2), system-ui, sans-serif',
              background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            }}
          >
            {/* FIX #3: Bottom sheet swipe handle - mobile only */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 swipe-handle cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛰️</span>
                  <div>
                    <h2 className="text-base font-bold text-white">Globe Settings</h2>
                    <p className="text-xs text-gray-500">{displayEvents.length} events</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close settings"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sections - scrollable with safe area */}
            <div 
              ref={scrollableRef}
              className="overflow-y-auto max-sm:max-h-[60vh] sm:max-h-[70vh]"
              style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
            >
              {/* Category Filters */}
              <AccordionSection
                title="Category Filters"
                
                isOpen={activeSection === 'filters'}
                onToggle={() => toggleSection('filters')}
                badge={filters.eventTypes?.length || undefined}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">Select categories</span>
                  <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    {filters.eventTypes?.length === EVENT_CATEGORIES.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-1.5 mb-4">
                  {EVENT_CATEGORIES.map(cat => {
                    const isChecked = filters.eventTypes?.includes(cat.value as string) || false
                    const count = categoryStats[cat.value] || 0
                    const color = getCategoryColor(cat.value as EventType)
                    
                    return (
                      <label
                        key={cat.value}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${isChecked ? 'bg-white/10' : 'bg-white/5 hover:bg-white/8'}`}
                        style={{ borderLeft: isChecked ? `3px solid ${color}` : '3px solid transparent' }}
                      >
                        <div 
                          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${isChecked ? 'border-transparent' : 'border-gray-600'}`}
                          style={{ backgroundColor: isChecked ? color : 'transparent' }}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <input id={`category-${cat.value}`} name={`category-${cat.value}`} type="checkbox" checked={isChecked} onChange={() => toggleCategory(cat.value as string)} className="sr-only" />
                        <span className={`text-sm flex-1 ${isChecked ? 'text-white font-medium' : 'text-gray-300'}`}>{cat.label}</span>
                        {count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${isChecked ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'}`}>{count}</span>}
                      </label>
                    )
                  })}
                </div>

                <div className="pt-3 border-t border-white/10">
                  <div className="text-xs font-medium text-gray-400 mb-2">Time Range</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[{ value: 'all', label: 'All' }, { value: '24h', label: '24h' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => onTimeRangeChange(opt.value)}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${timeRange === opt.value ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionSection>

              {/* Country Filter - NEW */}
              <AccordionSection
                title="Country Stories"
                
                isOpen={activeSection === 'countries'}
                onToggle={() => toggleSection('countries')}
                badge={selectedCountries.length || undefined}
              >
                <div className="text-xs text-gray-400 mb-3">Select countries for top stories</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {countryOptions.map(country => {
                    const isSelected = selectedCountries.includes(country.value)
                    // Match filter logic - use keywords for accurate counting
                    const count = events.filter(e => {
                      const eventCountry = (e.metadata?.country as string || '').toLowerCase()
                      const eventLocation = (e.metadata?.locationName as string || '').toLowerCase()
                      const searchText = `${eventCountry} ${eventLocation}`
                      return country.keywords.some(kw => searchText.includes(kw))
                    }).length
                    return (
                      <button
                        key={country.value}
                        onClick={() => toggleCountry(country.value)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all ${isSelected ? 'bg-blue-600/30 border border-blue-500/50 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      >
                        <span className="text-[10px] font-semibold text-gray-500 w-6">{country.code}</span>
                        <span className="flex-1 text-left truncate">{country.label}</span>
                        {count > 0 && <span className="text-[10px] text-gray-500">{count}</span>}
                      </button>
                    )
                  })}
                </div>
                {selectedCountries.length > 0 && (
                  <button
                    onClick={handleClearCountries}
                    className="w-full mt-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 transition-colors"
                  >
                    Clear Countries
                  </button>
                )}
              </AccordionSection>

              {/* Advanced Settings - Distance Filter */}
              <AccordionSection
                title="Advanced Settings"
                
                isOpen={activeSection === 'advanced'}
                onToggle={() => toggleSection('advanced')}
                badge={userLocation ? 1 : undefined}
              >
                <div className="space-y-4">
                  {/* Location Input */}
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-2">Your Location</div>
                    <div className="flex gap-2">
                      <input
                        id="location-input"
                        name="location-input"
                        type="text"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLocationSubmit()}
                        placeholder="e.g., North Carolina"
                        autoComplete="off"
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                      />
                      <button
                        onClick={handleLocationSubmit}
                        className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 transition-colors"
                      >
                        Set
                      </button>
                    </div>
                    {userLocation && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-green-400">{userLocation.name}</span>
                        <button onClick={handleClearLocation} className="text-xs text-gray-500 hover:text-red-400">Clear</button>
                      </div>
                    )}
                  </div>

                  {/* Distance Radius */}
                  {userLocation && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Distance Radius</span>
                        <span className="text-xs text-blue-400">{distanceRadius} miles</span>
                      </div>
                      <input
                        id="distance-radius"
                        name="distance-radius"
                        type="range"
                        min="50"
                        max="5000"
                        step="50"
                        value={distanceRadius}
                        onChange={(e) => handleDistanceChange(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>50mi</span>
                        <span>5000mi</span>
                      </div>
                    </div>
                  )}

                  {/* Toggle Distance Display */}
                  {userLocation && (
                    <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer">
                      <span className="text-xs text-gray-300">Filter by distance</span>
                      <div className={`w-10 h-5 rounded-full transition-colors ${showDistances ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        <div className={`w-4 h-4 mt-0.5 rounded-full bg-white transition-transform ${showDistances ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                      <input id="filter-by-distance" name="filter-by-distance" type="checkbox" checked={showDistances} onChange={(e) => handleToggleDistanceFilter(e.target.checked)} className="sr-only" />
                    </label>
                  )}
                </div>
              </AccordionSection>

              {/* Statistics */}
              <AccordionSection
                title="Statistics"
                
                isOpen={activeSection === 'stats'}
                onToggle={() => toggleSection('stats')}
              >
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{displayEvents.length}</div>
                    <div className="text-xs text-gray-500">Total Events</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-400">{Object.keys(categoryStats).length}</div>
                    <div className="text-xs text-gray-500">Categories</div>
                  </div>
                </div>
                
                <div className="text-xs font-medium text-gray-400 mb-2">Top Categories</div>
                <div className="space-y-1.5">
                  {Object.entries(categoryStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([type, count]) => {
                      const color = getCategoryColor(type as EventType)
                      const pct = Math.round((count / events.length) * 100)
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs text-gray-300 flex-1 capitalize">{type.replace('-', ' ')}</span>
                          <span className="text-xs text-gray-500">{count}</span>
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </AccordionSection>

              {/* Legend - Exact Match to Globe Markers */}
              <AccordionSection
                title="Map Legend"
                
                isOpen={activeSection === 'legend'}
                onToggle={() => toggleSection('legend')}
              >
                <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Event Categories</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Exact marker colors and icons from Globe.tsx */}
                  {[
                    { type: 'breaking', label: 'Breaking', color: '#dc2626', path: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' },
                    { type: 'politics', label: 'Politics', color: '#2563eb', path: 'M3 21h18M5 21v-7M19 21v-7M9 21v-4h6v4M3 14h18M12 3l9 7H3l9-7z' },
                    { type: 'sports', label: 'Sports', color: '#16a34a', path: 'M12 21c-4-4-8-7.5-8-12a8 8 0 1116 0c0 4.5-4 8-8 12z' },
                    { type: 'business', label: 'Markets', color: '#0891b2', path: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
                    { type: 'technology', label: 'Tech', color: '#7c3aed', path: 'M6 6h12v12H6zM9 6V3M15 6V3M9 21v-3M15 21v-3' },
                    { type: 'entertainment', label: 'Entertainment', color: '#db2777', path: 'M12 21c-4-4-8-7.5-8-12a8 8 0 1116 0c0 4.5-4 8-8 12z' },
                    { type: 'health', label: 'Health', color: '#059669', path: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z' },
                    { type: 'science', label: 'Science', color: '#6366f1', path: 'M9 3h6M10 3v6l-4 8h12l-4-8V3M8 17h8' },
                    { type: 'crime', label: 'Crime', color: '#b91c1c', path: 'M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z' },
                    { type: 'armed-conflict', label: 'Conflict', color: '#991b1b', path: 'M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z' },
                    { type: 'civil-unrest', label: 'Unrest', color: '#c2410c', path: 'M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z' },
                    { type: 'earthquake', label: 'Seismic', color: '#92400e', path: 'M12 3L2 21h20L12 3zM12 9v4M12 17h.01' },
                    { type: 'wildfire', label: 'Wildfire', color: '#ea580c', path: 'M12 3L2 21h20L12 3zM12 9v4M12 17h.01' },
                    { type: 'storm', label: 'Storm', color: '#0369a1', path: 'M12 12m-4 0a4 4 0 108 0 4 4 0 10-8 0M12 2v2M12 20v2M4.93 4.93l1.41 1.41' },
                  ].map(cat => {
                    const isActive = !filters.eventTypes?.length || filters.eventTypes.includes(cat.type as EventType)
                    
                    return (
                      <div 
                        key={cat.type} 
                        className="flex items-center gap-2 p-1.5 rounded-lg transition-all"
                        style={{ 
                          background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                          opacity: isActive ? 1 : 0.35,
                        }}
                      >
                        {/* Exact marker style from Globe.tsx */}
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ 
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: `1.5px solid ${cat.color}`,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                        >
                          <svg 
                            width="10" 
                            height="10" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke={cat.color} 
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={cat.path} />
                          </svg>
                        </div>
                        <span className="text-[10px] text-gray-300 truncate">{cat.label}</span>
                      </div>
                    )
                  })}
                </div>
                
                {/* Cluster indicator */}
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Clusters</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center relative"
                      style={{ 
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1.5px solid #6366f1',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                        <path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z" />
                      </svg>
                      <div 
                        className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5"
                        style={{ background: '#6366f1', border: '1px solid rgba(15, 23, 42, 0.9)' }}
                      >
                        <span className="text-[7px] font-semibold text-white">5+</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-300">Multiple events clustered</span>
                  </div>
                </div>
              </AccordionSection>

              {/* Option 12A: Theme Toggle (visible on mobile, moved from top right) */}
              <AccordionSection
                title="Appearance"
                
                isOpen={activeSection === 'appearance'}
                onToggle={() => toggleSection('appearance')}
              >
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">Toggle between light and dark mode</p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-700' : 'bg-amber-200'}`}>
                        <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-slate-400' : 'bg-amber-500'}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {theme === 'dark' ? 'Easy on the eyes' : 'Bright and clear'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newTheme = theme === 'dark' ? 'light' : 'dark'
                        // Update localStorage and trigger parent callback
                        localStorage.setItem('voxtera-theme', newTheme)
                        document.documentElement.classList.toggle('light-mode', newTheme === 'light')
                        // This will be picked up by the theme state in page.tsx
                        window.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }))
                      }}
                      className="relative w-12 h-6 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(251, 191, 36, 0.8)',
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200"
                        style={{
                          transform: theme === 'dark' ? 'translateX(2px)' : 'translateX(26px)',
                        }}
                      />
                    </button>
                  </div>
                </div>
              </AccordionSection>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface AccordionSectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  badge?: number
  children: React.ReactNode
}

function AccordionSection({ title, isOpen, onToggle, badge, children }: AccordionSectionProps) {
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-white uppercase tracking-wide">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{badge}</span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ease-out ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-4">{children}</div>
      </div>
    </div>
  )
}

export default memo(SatelliteControlPanel)
