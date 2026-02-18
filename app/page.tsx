/**
 * Main Page Component
 * 
 * Production-ready interactive globe with:
 * - Multi-select category filtering
 * - Country and distance filters (functional on map)
 * - Professional loading animations
 * - ISS satellite visualization
 * - Creation credit footer
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Event } from '@/types/event'
import { useEvents } from '@/hooks/useEvents'
import LoadingOverlay from '@/components/UI/LoadingOverlay'
import ErrorBoundary from '@/components/UI/ErrorBoundary'
import EventDetailPanel from '@/components/UI/EventDetailPanel'
import SatelliteControlPanel, { ExtendedFilterState } from '@/components/UI/SatelliteControlPanel'
import InteractionHintModal from '@/components/UI/InteractionHintModal'
import VoxTerraLogo from '@/components/UI/VoxTerraLogo'
import ThemeToggle, { ThemeMode } from '@/components/UI/ThemeToggle'
import { balanceCategories } from '@/utils/categoryBalance'
import { extractCountriesFromEvents, getCountryKey } from '@/utils/countryExtractor'
import { calculateDistance } from '@/utils/geo'
import { SEARCH_SYNONYMS } from '@/utils/searchSynonyms'
import { useBookmarks } from '@/hooks/useBookmarks'
import { getThemeColors } from '@/utils/themeColors'
import { useTopics } from '@/hooks/useTopics'
import TrendingSidebar from '@/components/UI/TrendingSidebar'
import TimelineSlider from '@/components/UI/TimelineSlider'

// ============================================================================
// WORLD ALIGN LOADER
// Infrastructure disguised as design. Trust before speed.
// ============================================================================

// Fun facts: globally relevant, intelligent, neutral tone
const GLOBAL_FACTS = [
  "Over half the world's population now lives in urban areas.",
  "Most global conflicts are reported within 12 hours of escalation.",
  "The Earth rotates at roughly 1,000 miles per hour at the equator.",
  "News travels faster than weather systems across most continents.",
  "There are more than 7,000 languages spoken worldwide.",
  "International shipping moves 90% of global trade.",
  "The world gains approximately 200,000 people each day.",
  "Earthquakes occur somewhere on Earth every 11 seconds.",
  "More data is created daily than in all of human history before 2003.",
  "Satellites orbit Earth at 17,500 miles per hour.",
]

interface WorldAlignLoaderProps {
  isVisible: boolean
  progress: number
}

/**
 * WorldAlignLoader - Bulletproof Loading Screen
 * 
 * SIMPLIFIED: No complex phase state machine.
 * - Shows when isVisible=true
 * - Fades out via CSS when isVisible=false
 * - Completely unmounts after fade completes
 * - Progress bar always animates (never frozen)
 */
function WorldAlignLoader({ isVisible, progress }: WorldAlignLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0)
  const [currentFact, setCurrentFact] = useState(0)
  const [factOpacity, setFactOpacity] = useState(1)
  const [shouldRender, setShouldRender] = useState(true)
  
  // Track visibility for fade-out then unmount
  // Use timeout for both show/hide to avoid synchronous setState in effect
  useEffect(() => {
    if (!isVisible) {
      const unmountTimer = setTimeout(() => {
        setShouldRender(false)
      }, 600) // Match CSS transition duration
      return () => clearTimeout(unmountTimer)
    } else if (!shouldRender) {
      // Re-show after being hidden - use microtask to avoid sync setState
      const showTimer = setTimeout(() => setShouldRender(true), 0)
      return () => clearTimeout(showTimer)
    }
  }, [isVisible]) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Cycle through fun facts - rotate every 3-4 seconds with smooth transitions
  useEffect(() => {
    if (!shouldRender) return

    const cycleFact = () => {
      setFactOpacity(0)
      setTimeout(() => {
        setCurrentFact(prev => (prev + 1) % GLOBAL_FACTS.length)
        setFactOpacity(1)
      }, 300)
    }

    const interval = setInterval(cycleFact, 3500)
    return () => clearInterval(interval)
  }, [shouldRender])
  
  // Progress interpolation - smooth, never frozen
  useEffect(() => {
    if (!shouldRender) return
    
    const autonomousStep = () => {
      setInternalProgress(prev => {
        // Follow real progress or autonomous minimum (bar never freezes)
        const dataTarget = Math.min(progress, 95)
        const autonomousMin = Math.min(prev + 0.4, 90) // Slightly faster autonomous
        const target = Math.max(dataTarget, autonomousMin)
        
        // When hiding, snap to 100%
        if (!isVisible) return 100
        
        const diff = target - prev
        if (Math.abs(diff) < 0.1) return target
        
        // Non-linear easing
        const easeFactor = 0.08 + (prev / 100) * 0.04
        return prev + diff * easeFactor
      })
    }
    
    const interval = setInterval(autonomousStep, 50)
    return () => clearInterval(interval)
  }, [progress, isVisible, shouldRender])
  
  // Don't render if we're done
  if (!shouldRender) return null
  
  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ 
        background: '#0a0a0b',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {/* Subtle grain texture */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Main content container */}
      <div className="flex flex-col items-center gap-6 w-full max-w-md px-8">
        
        {/* Fun fact */}
        <div 
          className="text-center h-12 flex items-center justify-center"
          style={{ opacity: factOpacity, transition: 'opacity 0.3s ease' }}
        >
          <p 
            className="text-[13px] text-gray-500 leading-relaxed max-w-xs"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {GLOBAL_FACTS[currentFact]}
          </p>
        </div>
        
        {/* Loading bar */}
        <div className="relative w-full">
          <div 
            className="relative h-[3px] rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, #1c1c22 0%, #252530 50%, #1c1c22 100%)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            {/* Progress fill */}
            <div 
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
              style={{
                width: `${internalProgress}%`,
                background: 'linear-gradient(90deg, #3a4a65 0%, #4a5d75 40%, #5a6a7a 70%, #6a757a 100%)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                }}
              />
            </div>
            
            {/* Shimmer */}
            <div 
              className="absolute inset-y-0 w-24 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(140, 160, 180, 0.15) 50%, transparent 100%)',
                animation: 'sweepShimmer 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        
        {/* Branding */}
        <div className="text-center" style={{ opacity: 0.4 }}>
          <span 
            className="text-[11px] font-medium tracking-[0.35em] text-gray-600 uppercase"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            Vox Terra
          </span>
        </div>
      </div>
      
      <style>{`
        @keyframes sweepShimmer {
          0% { left: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// Fun facts about the world shown during loading
const GLOBE_FACTS = [
  "Earth's core is as hot as the surface of the Sun — about 5,500°C.",
  "There are more trees on Earth than stars in the Milky Way.",
  "Russia spans 11 time zones, more than any other country.",
  "The Pacific Ocean is larger than all the land on Earth combined.",
  "Antarctica contains about 70% of Earth's fresh water.",
  "A day on Earth was only 6 hours long 4.5 billion years ago.",
  "The Dead Sea is the lowest point on Earth's surface at 430m below sea level.",
  "Lightning strikes Earth about 8 million times per day.",
  "The Amazon Rainforest produces 20% of the world's oxygen.",
  "Mount Everest grows about 4mm taller every year.",
  "The Sahara Desert is roughly the same size as the United States.",
  "Earth's atmosphere extends about 10,000 km into space.",
  "There are more than 7,000 languages spoken worldwide.",
  "The Great Wall of China spans over 21,000 kilometers.",
  "Greenland is the world's largest island that isn't a continent.",
  "Lake Baikal in Russia holds 20% of the world's unfrozen fresh water.",
  "The Mariana Trench is deeper than Mount Everest is tall.",
  "Australia is wider than the Moon — 4,000 km vs 3,400 km.",
  "Canada has more lakes than the rest of the world combined.",
  "The Nile River flows through 11 different countries.",
  "Tokyo is the most populated metropolitan area on Earth.",
  "There are 195 countries recognized by the United Nations.",
  "The Earth rotates at about 1,670 km/h at the equator.",
  "Oceans cover 71% of Earth's surface but we've explored less than 5%.",
  "Vatican City is the smallest country in the world at 0.44 km².",
  "The ISS orbits Earth about 16 times every day.",
  "Iceland has no army, navy, or air force.",
  "More people live inside the circle of East Asia than outside it.",
  "The Caspian Sea is actually the world's largest lake.",
  "Africa is the only continent in all four hemispheres.",
]

// Dynamically import Globe to avoid SSR issues with Three.js
const GlobeComponent = dynamic(
  () => import('@/components/Globe/Globe'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-black">
        <div
          className="w-12 h-12 rounded-full border-2 border-gray-700 border-t-blue-500"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
  }
)

export default function HomePage() {
  // ========== DATA FETCHING ==========
  // Simplified: fetch starts immediately, loading screen handles UX
  const { events, loading, processing, error, loadingProgress, refetch } = useEvents()
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks()
  const { topics } = useTopics(events)

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [filters, setFilters] = useState<ExtendedFilterState>({
    severity: 'all',
    eventTypes: [],
    selectedCountries: [],
    userLocation: null,
    distanceRadius: 500,
    showDistances: false,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState('all')
  const [customTimeRange, setCustomTimeRange] = useState<{ start: number; end: number } | null>(null)
  const [globeZoom, setGlobeZoom] = useState<number>(1.0)
  const [globeAltitude, setGlobeAltitude] = useState<number>(2.5)
  const [showInteractionHint, setShowInteractionHint] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)

  // Fun fact - picked once on mount, shown during initial data fetch
  const funFact = useRef(GLOBE_FACTS[Math.floor(Math.random() * GLOBE_FACTS.length)])
  const [showFunFact, setShowFunFact] = useState(true)
  
  // Hide fun fact once events have loaded
  useEffect(() => {
    if (!loading && events.length > 0 && showFunFact) {
      const timer = setTimeout(() => setShowFunFact(false), 600)
      return () => clearTimeout(timer)
    }
  }, [loading, events.length, showFunFact])

  // Check localStorage for hint dismissal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const neverShowHint = localStorage.getItem('neverShowInteractionHint')
      if (!neverShowHint) {
        // Show hint on first visit after a brief delay
        const timer = setTimeout(() => {
          setShowInteractionHint(true)
        }, 2000) // 2 second delay
        return () => clearTimeout(timer)
      }
    }
  }, [])
  
  // Category browse mode state
  const [categoryBrowseMode, setCategoryBrowseMode] = useState<{
    active: boolean
    category: string
    categoryLabel: string
    categoryIcon: string
    matchingEvents: Event[]
    currentIndex: number
  } | null>(null)
  
  // Fly-to target for cinematic navigation
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; onComplete?: () => void } | null>(null)
  
  // Event history stack for drill-down navigation
  const [eventHistory, setEventHistory] = useState<Event[]>([])
  
  // Settings panel open state (for blur)
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)

  // Ref for current selectedEvent to avoid stale closures in navigateToEvent
  const selectedEventRef = useRef<Event | null>(null)
  selectedEventRef.current = selectedEvent
  
  // Theme state (dark/light mode)
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const colors = getThemeColors(theme)

  // Listen for theme changes from settings panel (Option 12A)
  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<ThemeMode>) => {
      setTheme(e.detail)
    }
    window.addEventListener('theme-change', handleThemeChange as EventListener)
    return () => window.removeEventListener('theme-change', handleThemeChange as EventListener)
  }, [])

  // FIX #7: Private view counter - silent background ping
  useEffect(() => {
    // Fire once on page load (non-blocking, silent fail)
    fetch('/api/views', { method: 'POST' }).catch(() => {})
  }, [])

  // Load persisted theme on mount (prevents flash when ThemeToggle reads localStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('voxtera-theme') as ThemeMode | null
      if (stored) setTheme(stored)
    } catch {
      // Storage disabled or unavailable
    }
  }, [])

  // Memoized event filtering for performance - includes country and distance filters
  const filteredEvents = useMemo(() => {
    let result = events.filter(event => {
      // Time range filter
      if (timeRange === 'custom' && customTimeRange) {
        if (event.timestamp < customTimeRange.start) return false
      } else if (timeRange !== 'all') {
        const now = Date.now()
        const ranges: Record<string, number> = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        }
        const cutoff = now - (ranges[timeRange] || 0)
        if (event.timestamp < cutoff) return false
      }

      // Search filter - intelligent search with synonym expansion
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const title = (event.title || '').toLowerCase()
        const description = (event.description || '').toLowerCase()
        const location = (event.metadata?.locationName as string || '').toLowerCase()
        const country = (event.metadata?.country as string || '').toLowerCase()
        const eventType = (event.type || '').toLowerCase().replace('-', ' ')
        const source = (event.source || '').toLowerCase()
        const continent = (event.metadata?.continent as string || '').toLowerCase()

        // Combined searchable text
        const searchableText = `${title} ${description} ${location} ${country} ${eventType} ${source} ${continent}`

        // Direct match first
        let matchesSearch = searchableText.includes(query)

        // Synonym expansion if no direct match
        if (!matchesSearch) {
          const synonymKeys = Object.keys(SEARCH_SYNONYMS)
          for (const key of synonymKeys) {
            const synonyms = SEARCH_SYNONYMS[key]
            const allTerms = [key, ...synonyms]
            if (allTerms.some(term => query.includes(term) || term.includes(query))) {
              if (allTerms.some(term => searchableText.includes(term))) {
                matchesSearch = true
                break
              }
            }
          }
        }

        if (!matchesSearch) return false
      }

      // Category/Event Type filter - filter by selected categories
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        const eventType = event.type || 'other'
        if (!filters.eventTypes.includes(eventType)) {
          return false
        }
      }

      // Country filter - filter by normalized country key
      if (filters.selectedCountries && filters.selectedCountries.length > 0) {
        const rawCountry = (event.metadata?.country as string || '')
        const normalizedKey = getCountryKey(rawCountry)
        if (!normalizedKey || !filters.selectedCountries.includes(normalizedKey)) return false
      }

      return true
    })

    // Distance filter - filter by radius from user location
    if (filters.showDistances && filters.userLocation) {
      const { lat, lng } = filters.userLocation
      const radius = filters.distanceRadius || 500
      
      result = result
        .map(event => ({
          ...event,
          metadata: {
            ...event.metadata,
            distance: calculateDistance(lat, lng, event.latitude, event.longitude),
          },
        }))
        .filter(event => (event.metadata?.distance as number) <= radius)
    }

    return result
  }, [events, timeRange, customTimeRange, searchQuery, filters.eventTypes, filters.selectedCountries, filters.showDistances, filters.userLocation, filters.distanceRadius])

  // ========== CATEGORY BALANCE ==========
  // Apply balanced category distribution before geo separation
  const balancedEvents = useMemo(() => {
    if (filteredEvents.length === 0) return filteredEvents
    return balanceCategories(filteredEvents)
  }, [filteredEvents])
  
  // ========== DYNAMIC COUNTRY OPTIONS ==========
  // Extract countries from ALL events (not filteredEvents) to break circular dependency
  const countryOptions = useMemo(() => {
    return extractCountriesFromEvents(events)
  }, [events])

  // ========== COUNTRY FILTER ISOLATION ==========
  // When country filter is active, compute which event IDs should be visible on globe
  // Non-matching markers will be hidden with scale+fade animation
  const isolatedEventIds = useMemo(() => {
    // If no countries selected, no isolation (all visible)
    if (!filters.selectedCountries || filters.selectedCountries.length === 0) {
      return null
    }

    // Filter ALL events (not just filtered) to get IDs that match selected countries
    const matchingIds: string[] = []

    events.forEach(event => {
      const rawCountry = (event.metadata?.country as string || '')
      const normalizedKey = getCountryKey(rawCountry)
      if (normalizedKey && filters.selectedCountries!.includes(normalizedKey)) {
        matchingIds.push(event.id)
      }
    })

    return matchingIds
  }, [events, filters.selectedCountries])

  // All balanced events with coordinates go to the globe
  const geoEvents = useMemo(() => {
    return balancedEvents.filter(event => event.latitude && event.longitude)
  }, [balancedEvents])

  // Optimized zoom handler with debouncing
  // Also estimates altitude for ISS positioning (altitude ≈ 5 / zoom for our globe config)
  const handleZoomChange = useCallback((zoom: number) => {
    setGlobeZoom(zoom)
    // Estimate altitude from zoom (higher zoom = lower altitude/closer view)
    const estimatedAltitude = Math.max(0.5, Math.min(4.0, 2.5 / Math.max(zoom, 0.5)))
    setGlobeAltitude(estimatedAltitude)
  }, [])

  const handleMarkerClick = useCallback((event: Event) => {
    if (!event || !event.id) return
    setSelectedEvent(event)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedEvent(null)
  }, [])

  const handleFiltersChange = useCallback((newFilters: ExtendedFilterState) => {
    setFilters(newFilters)
  }, [])

  // Enter category browse mode - highlights all matching pins
  const enterCategoryBrowseMode = useCallback((category: string, label: string, icon: string) => {
    const matching = filteredEvents.filter(e => {
      const searchText = `${e.title} ${e.description} ${e.type} ${e.metadata?.locationName || ''} ${e.metadata?.country || ''}`.toLowerCase()
      
      // Check direct match or synonym match
      const synonyms = SEARCH_SYNONYMS[category.toLowerCase()] || [category.toLowerCase()]
      return synonyms.some(term => searchText.includes(term)) || e.type.toLowerCase().includes(category.toLowerCase())
    })
    
    if (matching.length > 0) {
      setCategoryBrowseMode({
        active: true,
        category,
        categoryLabel: label,
        categoryIcon: icon,
        matchingEvents: matching,
        currentIndex: 0,
      })
      
      // Fly to first matching event
      const first = matching[0]
      setFlyToTarget({
        lat: first.latitude,
        lng: first.longitude,
        onComplete: () => {
          // Pulse the target marker after arrival
          const marker = document.querySelector(`[data-event-id="${first.id}"]`)
          if (marker) {
            marker.classList.add('target-pulse')
            setTimeout(() => marker.classList.remove('target-pulse'), 1200)
          }
        }
      })
    }
  }, [filteredEvents])

  // Navigate to next/previous pin in category browse mode
  const navigateCategoryPin = useCallback((direction: 'next' | 'prev') => {
    if (!categoryBrowseMode) return
    
    const { matchingEvents, currentIndex } = categoryBrowseMode
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % matchingEvents.length
      : (currentIndex - 1 + matchingEvents.length) % matchingEvents.length
    
    const targetEvent = matchingEvents[newIndex]
    
    setCategoryBrowseMode(prev => prev ? { ...prev, currentIndex: newIndex } : null)
    
    // Fly to the new event (no pulse for next/prev navigation per user request)
    setFlyToTarget({
      lat: targetEvent.latitude,
      lng: targetEvent.longitude,
    })
  }, [categoryBrowseMode])

  // Exit category browse mode
  const exitCategoryBrowseMode = useCallback(() => {
    setCategoryBrowseMode(null)
    setSearchQuery('')
  }, [])

  // Navigate to a specific event (used by related events drill-down)
  // Uses selectedEventRef to avoid stale closure during fly-to animation
  const navigateToEvent = useCallback((event: Event, addToHistory: boolean = true) => {
    if (addToHistory && selectedEventRef.current) {
      setEventHistory(prev => [...prev, selectedEventRef.current!])
    }

    // Fly to the event
    setFlyToTarget({
      lat: event.latitude,
      lng: event.longitude,
      onComplete: () => {
        // Select the event after arriving
        setSelectedEvent(event)

        // Pulse the target marker
        const marker = document.querySelector(`[data-event-id="${event.id}"]`)
        if (marker) {
          marker.classList.add('target-pulse')
          setTimeout(() => marker.classList.remove('target-pulse'), 1200)
        }
      }
    })
  }, [])

  // Go back in event history
  const goBackInHistory = useCallback(() => {
    if (eventHistory.length === 0) return
    
    const previousEvent = eventHistory[eventHistory.length - 1]
    setEventHistory(prev => prev.slice(0, -1))
    
    // Navigate without adding to history
    setFlyToTarget({
      lat: previousEvent.latitude,
      lng: previousEvent.longitude,
      onComplete: () => setSelectedEvent(previousEvent)
    })
  }, [eventHistory])

  // Keyboard shortcuts - professional UX with comprehensive controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isInputFocused = (e.target as HTMLElement).tagName === 'INPUT' || 
                            (e.target as HTMLElement).tagName === 'TEXTAREA'
      
      // Escape closes panels or clears search or exits category browse mode
      if (e.key === 'Escape') {
        if (showInfoModal) {
          setShowInfoModal(false)
        } else if (showShortcutsHelp) {
          setShowShortcutsHelp(false)
        } else if (categoryBrowseMode) {
          exitCategoryBrowseMode()
        } else if (selectedEvent) {
          // Check if we have history to go back to
          if (eventHistory.length > 0) {
            goBackInHistory()
          } else {
            setSelectedEvent(null)
            setEventHistory([])
          }
        } else if (searchQuery) {
          setSearchQuery('')
        }
        return
      }
      
      // Arrow keys for category browse mode navigation
      if (categoryBrowseMode && !isInputFocused) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          navigateCategoryPin('prev')
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          navigateCategoryPin('next')
          return
        }
        // Enter selects current pin
        if (e.key === 'Enter') {
          e.preventDefault()
          const currentEvent = categoryBrowseMode.matchingEvents[categoryBrowseMode.currentIndex]
          if (currentEvent) {
            setSelectedEvent(currentEvent)
            exitCategoryBrowseMode()
          }
          return
        }
      }
      
      // Don't process other shortcuts if input is focused
      if (isInputFocused) return
      
      // "/" or Ctrl+F focuses search bar
      if (e.key === '/' || (e.ctrlKey && e.key === 'f')) {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
        return
      }
      
      // "S" opens settings (via satellite)
      if (e.key === 's' || e.key === 'S') {
        // Trigger click on ISS satellite to open settings
        const issButton = document.querySelector('[data-iss-trigger]') as HTMLElement
        if (issButton) {
          issButton.click()
        }
        return
      }
      
      // "I" shows info modal
      if (e.key === 'i' || e.key === 'I') {
        setShowInfoModal(prev => !prev)
        return
      }
      
      // "?" shows keyboard shortcuts help
      if (e.key === '?') {
        setShowShortcutsHelp(prev => !prev)
        return
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedEvent, searchQuery, categoryBrowseMode, eventHistory, exitCategoryBrowseMode, navigateCategoryPin, goBackInHistory, showInfoModal, showShortcutsHelp])

  // Memoized highlighted event IDs for Globe (avoids new array ref each render)
  const highlightedEventIds = useMemo(() =>
    categoryBrowseMode?.matchingEvents.map(e => e.id) || [],
    [categoryBrowseMode]
  )


  // Memoized search suggestions (avoids recalculating inline IIFE every render)
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []
    const query = searchQuery.toLowerCase()
    const suggestions: Array<{ label: string; searchTerm: string }> = []

    if (['war', 'conflict', 'fight', 'military', 'battle', 'arm'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Conflicts', searchTerm: 'armed conflict' })
      suggestions.push({ label: 'Middle East', searchTerm: 'middle east' })
      suggestions.push({ label: 'Ukraine', searchTerm: 'ukraine' })
    }
    if (['middle', 'east', 'israel', 'gaza', 'iran', 'iraq'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Middle East', searchTerm: 'middle east' })
      suggestions.push({ label: 'Israel', searchTerm: 'israel' })
    }
    if (['america', 'us', 'usa', 'states', 'biden', 'trump'].some(t => query.includes(t))) {
      suggestions.push({ label: 'United States', searchTerm: 'united states' })
      suggestions.push({ label: 'Politics', searchTerm: 'politics' })
    }
    if (['latin', 'south', 'brazil', 'mexico', 'argent'].some(t => query.includes(t))) {
      suggestions.push({ label: 'South America', searchTerm: 'south america' })
      suggestions.push({ label: 'Mexico', searchTerm: 'mexico' })
      suggestions.push({ label: 'Brazil', searchTerm: 'brazil' })
    }
    if (['china', 'asia', 'korea', 'japan', 'india'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Asia Pacific', searchTerm: 'asia' })
      suggestions.push({ label: 'China', searchTerm: 'china' })
    }
    if (['sport', 'footb', 'soccer', 'basket', 'nfl', 'nba'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Sports', searchTerm: 'sports' })
    }
    if (['tech', 'ai', 'software', 'apple', 'google'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Technology', searchTerm: 'technology' })
    }
    if (['politic', 'elect', 'govern', 'vote', 'president'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Politics', searchTerm: 'politics' })
    }
    if (['africa', 'nigeria', 'kenya', 'egypt', 'congo'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Africa', searchTerm: 'africa' })
    }
    if (['canada', 'toronto', 'trudeau', 'vancouver'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Canada', searchTerm: 'canada' })
    }
    if (['market', 'stock', 'nasdaq', 'dow', 'economy'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Markets', searchTerm: 'business' })
    }
    if (['climate', 'weather', 'storm', 'flood', 'hurricane'].some(t => query.includes(t))) {
      suggestions.push({ label: 'Climate', searchTerm: 'climate' })
    }

    return suggestions.filter((s, i, arr) =>
      arr.findIndex(x => x.label === s.label) === i
    ).slice(0, 4)
  }, [searchQuery])

  // Mobile detection for UI layout - debounced to avoid excess re-renders
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const check = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        setIsMobile(window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
      }, 150)
    }
    // Initial check (immediate, not debounced)
    setIsMobile(window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])
  
  // ========== PHASE 8: Hybrid Waterfall Loading System ==========
  // Uses refs to avoid state race conditions. Simple, reliable, guaranteed to complete.
  // Flow: Mount → Min Timer (1.5s desktop / 1s mobile) → Check Data → Show Content
  // Failsafe: 4s absolute max regardless of data state
  
  const [degradedMode, setDegradedMode] = useState(false)
  const [showRetryPrompt, setShowRetryPrompt] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  // Use ref for load start time to avoid re-render issues
  const loadStartTime = useRef(Date.now())
  const [canShowContent, setCanShowContent] = useState(false)
  
  // Single effect handles all loading logic - no external state dependencies for timers
  useEffect(() => {
    // Detect mobile inside effect to avoid state dependency race condition
    const isMobileDevice = typeof window !== 'undefined' && (
      window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    )
    
    // Minimum display time: 1s mobile (faster), 1.5s desktop
    const minDisplayTime = isMobileDevice ? 1000 : 1500
    
    // Absolute failsafe: 4s - content WILL show no matter what
    const failsafeTime = 4000
    
    // Check if we can show content (min time elapsed + data available)
    const checkReady = () => {
      const elapsed = Date.now() - loadStartTime.current
      if (elapsed >= minDisplayTime && events.length > 0) {
        setCanShowContent(true)
      }
    }
    
    // Timer 1: After minimum display time, check for data
    const minTimer = setTimeout(checkReady, minDisplayTime)
    
    // Timer 2: Absolute failsafe - show content at 4s no matter what
    const failsafe = setTimeout(() => setCanShowContent(true), failsafeTime)
    
    // Immediate check: if events already loaded and min time passed
    if (events.length > 0) {
      const elapsed = Date.now() - loadStartTime.current
      if (elapsed >= minDisplayTime) {
        setCanShowContent(true)
      }
    }
    
    return () => {
      clearTimeout(minTimer)
      clearTimeout(failsafe)
    }
  }, [events.length]) // Only re-run when events change
  
  // Simple, clear loading condition
  const isInitialLoading = !canShowContent && !degradedMode
  
  // Hard timeout: enter degraded mode after 15s without data
  // (API has 12s timeout, so 15s gives 3s of headroom)
  useEffect(() => {
    const hardTimeout = setTimeout(() => {
      if (events.length === 0) {
        // Enter degraded mode - show map without data
        setDegradedMode(true)
        setShowRetryPrompt(true)
      }
    }, 15000)
    
    return () => clearTimeout(hardTimeout)
  }, [events.length])
  
  // Clear retry prompt when data arrives
  useEffect(() => {
    if (events.length > 0) {
      setShowRetryPrompt(false)
      setDegradedMode(false)
    }
  }, [events.length])
  
  // Catastrophic failure: show error after 20s of degraded mode
  useEffect(() => {
    const errorTimer = setTimeout(() => {
      if (degradedMode && events.length === 0) {
        setHasError(true)
      }
    }, 20000)
    return () => clearTimeout(errorTimer)
  }, [degradedMode, events.length])

  return (
    <ErrorBoundary event={selectedEvent}>
      {/* ERROR STATE: Show reload option if loading fails */}
      {hasError && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white text-lg mb-2">Loading took too long</div>
          <div className="text-gray-400 text-sm mb-6 text-center max-w-xs">
            There might be a connection issue. Please try again.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Reload Page
          </button>
        </div>
      )}
      
      {/* LOADING SCREEN: Refined, world aligning */}
      <WorldAlignLoader 
        isVisible={isInitialLoading && !hasError} 
        progress={loadingProgress}
      />
      
      {/* DEGRADED MODE: Retry prompt (non-blocking) */}
      {showRetryPrompt && !hasError && (
        <div 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg flex items-center gap-3"
          style={{
            background: 'rgba(17, 24, 39, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-gray-300">Data loading slowly</span>
          <button
            onClick={() => { refetch(); setShowRetryPrompt(false); }}
            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        {/* Vox Terra Logo - Top Left */}
        <div 
          className="fixed top-4 left-4 z-40"
          style={{
            opacity: selectedEvent ? 0.4 : 0.9,
            transition: 'opacity 0.3s ease',
          }}
        >
          <VoxTerraLogo size="md" showTagline={false} />
        </div>

        {/* Trending Topics Sidebar */}
        <TrendingSidebar
          topics={topics}
          onTopicClick={(topic) => {
            enterCategoryBrowseMode(topic.keywords[0] || topic.name, topic.name, '')
          }}
          theme={theme}
          isHidden={!!selectedEvent || isSettingsPanelOpen}
        />

        {/* Theme Toggle - Top Right (hidden on mobile, moved to satellite settings) */}
        <div 
          className="fixed top-4 right-4 z-40 theme-toggle-desktop"
          style={{
            opacity: selectedEvent ? 0.4 : 0.9,
            transition: 'opacity 0.3s ease',
          }}
        >
          <ThemeToggle onThemeChange={setTheme} />
        </div>

        {/* Interaction Hint Modal - Center Overlay */}
        <InteractionHintModal
          isVisible={showInteractionHint}
          onDismiss={() => setShowInteractionHint(false)}
          onNeverShowAgain={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('neverShowInteractionHint', 'true')
            }
            setShowInteractionHint(false)
          }}
        />

        {/* Loading Overlay - only rendered when active */}
        {(loading || processing) && (
          <LoadingOverlay
            loading={loading}
            processing={processing}
            progress={loadingProgress}
            message={loading ? 'Fetching events...' : 'Processing data...'}
          />
        )}

        {/* Fun fact overlay - shown during initial data fetch */}
        {showFunFact && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
            style={{
              opacity: loading ? 1 : 0,
              transition: 'opacity 0.5s ease-out',
            }}
          >
            <div className="flex flex-col items-center gap-4 px-8 max-w-md text-center">
              <div
                className="w-10 h-10 rounded-full border-2 border-gray-700 border-t-blue-500"
                style={{ animation: 'spin 1s linear infinite' }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p className="text-gray-500 text-sm leading-relaxed">
                <span className="text-gray-400 font-medium">Did you know?</span>
                <br />
                {funFact.current}
              </p>
            </div>
          </div>
        )}

        {/* Main Globe Container - blurs when any panel is open */}
        <div className="absolute inset-0">
          <GlobeComponent
            events={geoEvents}
            onMarkerClick={handleMarkerClick}
            filters={filters}
            loading={loading}
            processing={processing}
            onZoomChange={handleZoomChange}
            isDetailPanelOpen={!!selectedEvent}
            isSettingsPanelOpen={isSettingsPanelOpen}
            isModalOpen={showInfoModal || showShortcutsHelp}
            flyToTarget={flyToTarget}
            highlightedEventIds={highlightedEventIds}
            isolatedEventIds={isolatedEventIds}
            theme={theme}
            showLabels={true}
          />
        </div>

        {/* ISS Satellite Control Panel */}
        <SatelliteControlPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          events={events}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          zoomLevel={globeZoom}
          globeAltitude={globeAltitude}
          theme={theme}
          onSettingsOpenChange={setIsSettingsPanelOpen}
          bookmarkedIds={bookmarkedIds}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
        />


        {/* Event Detail Panel - Full-screen slide-in with drill-down support */}
        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onClose={handleClosePanel}
            allEvents={filteredEvents}
            onNavigateToEvent={navigateToEvent}
            canGoBack={eventHistory.length > 0}
            onGoBack={goBackInHistory}
            isBookmarked={isBookmarked(selectedEvent.id)}
            onToggleBookmark={toggleBookmark}
            theme={theme}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Error: {error}
          </div>
        )}

        {/* Category Browse Mode Navigation - Mobile-friendly integrated UI */}
        {categoryBrowseMode && (
          <div 
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 mb-2"
            style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}
          >
            <div 
              className="relative overflow-hidden rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Top glow accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
              
              <div className="flex items-center justify-between p-3">
                {/* Left: Previous button */}
                <button
                  onClick={() => navigateCategoryPin('prev')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 active:scale-95"
                  style={{ color: '#a5b4fc' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Prev</span>
                </button>
                
                {/* Center: Category info */}
                <div className="flex-1 text-center px-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-white font-semibold text-sm uppercase tracking-wide">{categoryBrowseMode.categoryLabel}</span>
                  </div>
                  <div className="text-xs text-indigo-300 mt-0.5">
                    <span className="text-white font-medium">{categoryBrowseMode.currentIndex + 1}</span>
                    <span className="text-gray-400"> of </span>
                    <span className="text-white font-medium">{categoryBrowseMode.matchingEvents.length}</span>
                    {categoryBrowseMode.matchingEvents[categoryBrowseMode.currentIndex] && (
                      <span className="text-gray-500 ml-1 hidden sm:inline">
                        • {(categoryBrowseMode.matchingEvents[categoryBrowseMode.currentIndex].metadata?.locationName as string || 'Unknown').slice(0, 20)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Right: Next button */}
                <button
                  onClick={() => navigateCategoryPin('next')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 active:scale-95"
                  style={{ color: '#a5b4fc' }}
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Bottom: Exit button */}
              <div className="border-t border-white/10 px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">
                  Use ← → keys to navigate
                </span>
                <button
                  onClick={exitCategoryBrowseMode}
                  className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Slider - Right sidebar */}
        <TimelineSlider
          events={events}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          customRange={customTimeRange}
          onCustomRangeChange={setCustomTimeRange}
          theme={theme}
          isHidden={!!selectedEvent || isSettingsPanelOpen}
        />

        {/* Futuristic Search Bar - Professional Google Earth inspired */}
        <div 
          className={`fixed ${categoryBrowseMode ? 'bottom-36' : 'bottom-20'} left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 transition-all duration-300`}
          style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}
        >
          <div
            className="relative group"
            role="search"
            aria-label="Search events, regions, and categories"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.92) 0%, rgba(30, 41, 59, 0.92) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(241, 245, 249, 0.92) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '14px',
              border: `1px solid ${theme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.25)'}`,
              boxShadow: theme === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                : '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Neon glow effect on focus */}
            <div 
              className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                boxShadow: '0 0 30px rgba(99, 102, 241, 0.25), inset 0 0 15px rgba(99, 102, 241, 0.08)',
              }}
            />
            <div className="relative flex items-center gap-3 px-4 py-3">
              {/* Search icon with subtle animation */}
              <svg 
                className="w-5 h-5 text-indigo-400/70 group-focus-within:text-indigo-400 transition-colors flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="global-search"
                name="global-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, regions, categories..."
                aria-label="Search events, regions, and categories"
                className="flex-1 bg-transparent text-sm focus:outline-none tracking-wide"
                autoComplete="off"
                style={{ caretColor: '#818cf8', color: colors.textPrimary }}
              />
              {/* Keyboard shortcut hint - hides when typing */}
              {!searchQuery && (
                <kbd 
                  className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-gray-500 transition-opacity"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span>/</span>
                </kbd>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Smart suggestion chips */}
            {searchSuggestions.length > 0 && (
              <div
                className="px-4 py-2 border-t border-white/5"
                style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
              >
                <style>{`
                  @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                <div className="flex flex-wrap gap-1.5">
                  {searchSuggestions.map(suggestion => (
                    <button
                      key={suggestion.label}
                      onClick={() => enterCategoryBrowseMode(suggestion.searchTerm, suggestion.label, '')}
                      className="px-2.5 py-1 rounded text-[11px] font-medium transition-all hover:bg-white/10"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Search results indicator */}
            {searchQuery && (
              <div 
                className="px-4 py-2 border-t border-white/5 text-xs flex items-center justify-between"
              >
                {filteredEvents.length > 0 ? (
                  <span className="text-indigo-300">
                    <span className="text-white font-medium">{filteredEvents.length}</span> events found
                  </span>
                ) : (
                  <span className="italic text-gray-400">
                    No matches — <span className="text-indigo-400/80">Thank you for showing ME something new!</span>
                  </span>
                )}
                {filteredEvents.length > 0 && (
                  <span className="text-gray-500 text-[10px]">Press Esc to clear</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full text-xs"
          style={{
            bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
            background: colors.barBg,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${colors.barBorder}`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-gray-400">
              {loading ? 'Loading...' : `${filteredEvents.length} events`}
            </span>
          </div>
          {filters.eventTypes && filters.eventTypes.length > 0 && (
            <div className="flex items-center gap-1.5 text-blue-400">
              <span>⚡</span>
              <span>{filters.eventTypes.length} categories</span>
            </div>
          )}
          {filters.selectedCountries && filters.selectedCountries.length > 0 && (
            <div className="flex items-center gap-1.5 text-purple-400">
              <span>🌍</span>
              <span>{filters.selectedCountries.length} countries</span>
            </div>
          )}
          {filters.showDistances && filters.userLocation && (
            <div className="flex items-center gap-1.5 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>{filters.distanceRadius}mi</span>
            </div>
          )}
          <div className="text-gray-500 hidden sm:block">
            Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300">S</kbd> for settings
          </div>
        </div>

        {/* Creation Credit Footer with Info Button */}
        <div
          className="fixed right-4 z-20 flex items-center gap-2"
          style={{
            bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
            fontFamily: 'var(--font-exo2), system-ui, sans-serif',
          }}
        >
          {/* Info button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: colors.barBg,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${colors.borderSubtle}`,
              color: colors.textMuted,
            }}
            title="Press 'I' for info"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Shortcuts help button - HIDDEN ON MOBILE (#5) */}
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="keyboard-shortcuts p-2 rounded-lg transition-colors hidden sm:block"
            style={{
              background: colors.barBg,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${colors.borderSubtle}`,
              color: colors.textMuted,
            }}
            title="Press '?' for shortcuts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {/* Credit */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: colors.barBg,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${colors.borderSubtle}`,
              opacity: 0.7,
            }}
          >
            <span className="text-gray-500">by</span>
            <span className="text-gray-300 font-medium tracking-wide">Tyler Lucchi</span>
          </div>
        </div>

        {/* Info Modal - Weighting Details */}
        {showInfoModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <div className="absolute inset-0 backdrop-blur-md" style={{ background: colors.modalBackdrop }} />
            <div
              className="relative max-w-lg w-full rounded-2xl p-6 overflow-hidden"
              style={{
                background: colors.modalBg,
                border: `1px solid ${colors.modalBorder}`,
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(99, 102, 241, 0.1)',
                fontFamily: 'var(--font-exo2), system-ui, sans-serif',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Glow accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">🌍</span>
                How We Source & Weight News
              </h2>
              
              <div className="space-y-4 text-sm text-gray-300">
                <p className="leading-relaxed">
                  Our intelligent aggregation system pulls from <span className="text-indigo-400 font-medium">15+ global sources</span> including NY Times, BBC, Reuters, Al Jazeera, and humanitarian APIs like ReliefWeb.
                </p>
                
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <h3 className="text-white font-medium mb-2">Regional Weighting</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400"><span className="text-gray-500 mr-1">US</span>United States</span><span className="text-indigo-400">3.0x</span></div>
                    <div className="flex justify-between"><span className="text-gray-400"><span className="text-gray-500 mr-1">SA</span>South America</span><span className="text-emerald-400">2.5x</span></div>
                    <div className="flex justify-between"><span className="text-gray-400"><span className="text-gray-500 mr-1">MX</span>Mexico</span><span className="text-orange-400">2.4x</span></div>
                    <div className="flex justify-between"><span className="text-gray-400"><span className="text-gray-500 mr-1">CA</span>Canada</span><span className="text-red-400">2.3x</span></div>
                    <div className="flex justify-between"><span className="text-gray-400"><span className="text-gray-500 mr-1">CN</span>China</span><span className="text-yellow-400">2.3x</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Conflicts</span><span className="text-rose-400">2.5x</span></div>
                  </div>
                </div>
                
                <p className="text-gray-400 text-xs">
                  Events are balanced across regions with guaranteed quotas ensuring global coverage. Breaking news and armed conflicts receive priority boosting.
                </p>
              </div>
              
              <button
                onClick={() => setShowInfoModal(false)}
                className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600/80 hover:bg-indigo-600 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help Modal */}
        {showShortcutsHelp && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowShortcutsHelp(false)}
          >
            <div className="absolute inset-0 backdrop-blur-md" style={{ background: colors.modalBackdrop }} />
            <div
              className="relative max-w-md w-full rounded-2xl p-6 overflow-hidden"
              style={{
                background: colors.modalBg,
                border: `1px solid ${colors.modalBorder}`,
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(99, 102, 241, 0.1)',
                fontFamily: 'var(--font-exo2), system-ui, sans-serif',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">⌨️</span>
                Keyboard Shortcuts
              </h2>
              
              <div className="space-y-3 text-sm">
                {[
                  { key: '/', desc: 'Focus search bar' },
                  { key: 'Ctrl+F', desc: 'Focus search bar' },
                  { key: 'S', desc: 'Open settings' },
                  { key: 'I', desc: 'Show info' },
                  { key: '?', desc: 'Show this help' },
                  { key: 'Esc', desc: 'Close panel / Clear search' },
                ].map(({ key, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-300">{desc}</span>
                    <kbd className="px-2.5 py-1 rounded-lg text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600/80 hover:bg-indigo-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
