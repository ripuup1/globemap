/**
 * Main Page Component
 *
 * Orchestrates the globe, panels, and modals.
 * State is managed via Zustand (store/useAppStore).
 */

'use client'

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Event } from '@/types/event'
import { useEvents } from '@/hooks/useEvents'
import { useBookmarks } from '@/hooks/useBookmarks'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuth } from '@/hooks/useAuth'
import { useTopics } from '@/hooks/useTopics'
import { useAppStore } from '@/store/useAppStore'
import { balanceCategories } from '@/utils/categoryBalance'
import { extractCountriesFromEvents, getCountryKey } from '@/utils/countryExtractor'
import { calculateDistance } from '@/utils/geo'
import { SEARCH_SYNONYMS } from '@/utils/searchSynonyms'
import { themeColors } from '@/utils/themeColors'
import ErrorBoundary from '@/components/UI/ErrorBoundary'
import LoadingOverlay from '@/components/UI/LoadingOverlay'
import EventDetailPanel from '@/components/UI/EventDetailPanel'
import SatelliteControlPanel from '@/components/UI/SatelliteControlPanel'
import InteractionHintModal from '@/components/UI/InteractionHintModal'
import VoxTerraLogo from '@/components/UI/VoxTerraLogo'
import TrendingSidebar from '@/components/UI/TrendingSidebar'
import WorldAlignLoader from '@/components/UI/WorldAlignLoader'
import SearchBar from '@/components/UI/SearchBar'
import CategoryBrowseNav from '@/components/UI/CategoryBrowseNav'
import InstallPrompt from '@/components/UI/InstallPrompt'
import AuthModal from '@/components/Auth/AuthModal'

// Globe facts shown during initial load
const GLOBE_FACTS = [
  "Earth's core is as hot as the surface of the Sun — about 5,500°C.",
  "There are more trees on Earth than stars in the Milky Way.",
  "Russia spans 11 time zones, more than any other country.",
  "The Pacific Ocean is larger than all the land on Earth combined.",
  "Antarctica contains about 70% of Earth's fresh water.",
  "A day on Earth was only 6 hours long 4.5 billion years ago.",
  "Lightning strikes Earth about 8 million times per day.",
  "The Amazon Rainforest produces 20% of the world's oxygen.",
  "Mount Everest grows about 4mm taller every year.",
  "Australia is wider than the Moon — 4,000 km vs 3,400 km.",
  "Canada has more lakes than the rest of the world combined.",
  "The ISS orbits Earth about 16 times every day.",
  "Africa is the only continent in all four hemispheres.",
]

// Dynamic import for Globe (Three.js requires browser)
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
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-12 h-12 rounded-full border-2 border-gray-700 border-t-blue-500" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}

function HomePageContent() {
  // ========== QUERY PARAMS (deep links) ==========
  const searchParams = useSearchParams()

  // ========== DATA HOOKS ==========
  const { events, loading, processing, error, loadingProgress, refetch } = useEvents()
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks()
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications()
  const { user, isAuthenticated, signOut } = useAuth()
  const { topics } = useTopics(events)

  // ========== STORE ==========
  const store = useAppStore()
  const {
    selectedEvent, selectEvent, navigateToEvent, goBack, eventHistory,
    filters, searchQuery, timeRange, setFilters, setSearchQuery, setTimeRange,
    globeZoom, globeAltitude, flyToTarget, setGlobeZoom, setFlyToTarget,
    categoryBrowseMode, setCategoryBrowseMode, navigateCategoryPin, exitCategoryBrowseMode,
    isSettingsPanelOpen, setSettingsPanelOpen,
    showInteractionHint, setShowInteractionHint,
    showInfoModal, setShowInfoModal,
    showShortcutsHelp, setShowShortcutsHelp,
    showAuthModal, setShowAuthModal,
    canShowContent, degradedMode, showRetryPrompt, hasError,
    setCanShowContent, setDegradedMode, setShowRetryPrompt, setHasError,
    isMobile, setIsMobile,
  } = store

  const colors = themeColors

  // ========== FUN FACT OVERLAY ==========
  const [funFact, setFunFactState] = useState('')
  const [showFunFact, setShowFunFact] = useState(true)

  useEffect(() => {
    setFunFactState(GLOBE_FACTS[Math.floor(Math.random() * GLOBE_FACTS.length)])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && events.length > 0 && showFunFact) {
      const timer = setTimeout(() => setShowFunFact(false), 600)
      return () => clearTimeout(timer)
    }
  }, [loading, events.length, showFunFact]) // eslint-disable-line react-hooks/exhaustive-deps

  // ========== FIRST VISIT HINT ==========
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const neverShowHint = localStorage.getItem('neverShowInteractionHint')
      if (!neverShowHint) {
        const timer = setTimeout(() => setShowInteractionHint(true), 2000)
        return () => clearTimeout(timer)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ========== VIEW COUNTER ==========
  useEffect(() => {
    fetch('/api/views', { method: 'POST' }).catch(() => {})
  }, [])

  // ========== FILTERING ==========
  const filteredEvents = useMemo(() => {
    let result = events.filter(event => {
      if (timeRange !== 'all') {
        const now = Date.now()
        const ranges: Record<string, number> = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        }
        const cutoff = now - (ranges[timeRange] || 0)
        if (event.timestamp < cutoff) return false
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const searchableText = `${event.title || ''} ${event.description || ''} ${event.metadata?.locationName || ''} ${event.metadata?.country || ''} ${(event.type || '').replace('-', ' ')} ${event.source || ''} ${event.metadata?.continent || ''}`.toLowerCase()
        let matchesSearch = searchableText.includes(query)
        if (!matchesSearch) {
          for (const key of Object.keys(SEARCH_SYNONYMS)) {
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

      if (filters.eventTypes && filters.eventTypes.length > 0) {
        if (!filters.eventTypes.includes(event.type || 'other')) return false
      }

      if (filters.selectedCountries && filters.selectedCountries.length > 0) {
        const normalizedKey = getCountryKey((event.metadata?.country as string) || '')
        if (!normalizedKey || !filters.selectedCountries.includes(normalizedKey)) return false
      }

      return true
    })

    if (filters.showDistances && filters.userLocation) {
      const { lat, lng } = filters.userLocation
      const radius = filters.distanceRadius || 500
      result = result
        .map(event => ({
          ...event,
          metadata: { ...event.metadata, distance: calculateDistance(lat, lng, event.latitude, event.longitude) },
        }))
        .filter(event => (event.metadata?.distance as number) <= radius)
    }

    return result
  }, [events, timeRange, searchQuery, filters.eventTypes, filters.selectedCountries, filters.showDistances, filters.userLocation, filters.distanceRadius])

  const balancedEvents = useMemo(() => {
    if (filteredEvents.length === 0) return filteredEvents
    return balanceCategories(filteredEvents)
  }, [filteredEvents])

  const countryOptions = useMemo(() => extractCountriesFromEvents(events), [events])

  const isolatedEventIds = useMemo(() => {
    if (!filters.selectedCountries || filters.selectedCountries.length === 0) return null
    const matchingIds: string[] = []
    events.forEach(event => {
      const normalizedKey = getCountryKey((event.metadata?.country as string) || '')
      if (normalizedKey && filters.selectedCountries!.includes(normalizedKey)) matchingIds.push(event.id)
    })
    return matchingIds
  }, [events, filters.selectedCountries])

  const geoEvents = useMemo(() => balancedEvents.filter(e => e.latitude && e.longitude), [balancedEvents])
  const highlightedEventIds = useMemo(() => categoryBrowseMode?.matchingEvents.map(e => e.id) || [], [categoryBrowseMode])

  // ========== CATEGORY BROWSE ==========
  const enterCategoryBrowseMode = useCallback((category: string, label: string, icon: string) => {
    const matching = filteredEvents.filter(e => {
      const searchText = `${e.title} ${e.description} ${e.type} ${e.metadata?.locationName || ''} ${e.metadata?.country || ''}`.toLowerCase()
      const synonyms = SEARCH_SYNONYMS[category.toLowerCase()] || [category.toLowerCase()]
      return synonyms.some(term => searchText.includes(term)) || e.type.toLowerCase().includes(category.toLowerCase())
    })
    if (matching.length > 0) {
      setCategoryBrowseMode({ active: true, category, categoryLabel: label, categoryIcon: icon, matchingEvents: matching, currentIndex: 0 })
      const first = matching[0]
      setFlyToTarget({
        lat: first.latitude, lng: first.longitude,
        onComplete: () => {
          const marker = document.querySelector(`[data-event-id="${first.id}"]`)
          if (marker) { marker.classList.add('target-pulse'); setTimeout(() => marker.classList.remove('target-pulse'), 1200) }
        }
      })
    }
  }, [filteredEvents, setCategoryBrowseMode, setFlyToTarget])

  const handleNavigateCategoryPin = useCallback((direction: 'next' | 'prev') => {
    const targetEvent = navigateCategoryPin(direction)
    if (targetEvent) {
      setFlyToTarget({
        lat: targetEvent.latitude, lng: targetEvent.longitude,
        onComplete: () => {
          const marker = document.querySelector(`[data-event-id="${targetEvent.id}"]`)
          if (marker) { marker.classList.add('target-pulse'); setTimeout(() => marker.classList.remove('target-pulse'), 1200) }
        }
      })
    }
  }, [navigateCategoryPin, setFlyToTarget])

  const handleNavigateToEvent = useCallback((event: Event, addToHistory: boolean = true) => {
    if (addToHistory) navigateToEvent(event)
    else selectEvent(event)
    setFlyToTarget({
      lat: event.latitude, lng: event.longitude,
      onComplete: () => {
        selectEvent(event)
        const marker = document.querySelector(`[data-event-id="${event.id}"]`)
        if (marker) { marker.classList.add('target-pulse'); setTimeout(() => marker.classList.remove('target-pulse'), 1200) }
      }
    })
  }, [navigateToEvent, selectEvent, setFlyToTarget])

  const handleGoBack = useCallback(() => {
    const previous = goBack()
    if (previous) {
      setFlyToTarget({ lat: previous.latitude, lng: previous.longitude, onComplete: () => selectEvent(previous) })
    }
  }, [goBack, setFlyToTarget, selectEvent])

  // ========== KEYBOARD SHORTCUTS ==========
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isInputFocused = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA'
      if (e.key === 'Escape') {
        if (showInfoModal) setShowInfoModal(false)
        else if (showShortcutsHelp) setShowShortcutsHelp(false)
        else if (categoryBrowseMode) exitCategoryBrowseMode()
        else if (selectedEvent) { if (eventHistory.length > 0) handleGoBack(); else { selectEvent(null) } }
        else if (searchQuery) setSearchQuery('')
        return
      }
      if (categoryBrowseMode && !isInputFocused) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); handleNavigateCategoryPin('prev'); return }
        if (e.key === 'ArrowRight') { e.preventDefault(); handleNavigateCategoryPin('next'); return }
        if (e.key === 'Enter') {
          e.preventDefault()
          const current = categoryBrowseMode.matchingEvents[categoryBrowseMode.currentIndex]
          if (current) { selectEvent(current); exitCategoryBrowseMode() }
          return
        }
      }
      if (isInputFocused) return
      if (e.key === '/' || (e.ctrlKey && e.key === 'f')) {
        e.preventDefault()
        const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (input) input.focus()
        return
      }
      if (e.key === 's' || e.key === 'S') { const btn = document.querySelector('[data-iss-trigger]') as HTMLElement; if (btn) btn.click(); return }
      if (e.key === 'i' || e.key === 'I') { setShowInfoModal(!showInfoModal); return }
      if (e.key === '?') { setShowShortcutsHelp(!showShortcutsHelp); return }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedEvent, searchQuery, categoryBrowseMode, eventHistory, showInfoModal, showShortcutsHelp, exitCategoryBrowseMode, handleNavigateCategoryPin, handleGoBack, selectEvent, setSearchQuery, setShowInfoModal, setShowShortcutsHelp])

  // ========== MOBILE DETECTION ==========
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const check = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => setIsMobile(window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)), 150)
    }
    setIsMobile(window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => { clearTimeout(timeout); window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [setIsMobile])

  // ========== LOADING SYSTEM ==========
  const loadStartTime = useRef(Date.now())

  useEffect(() => {
    const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    const minDisplayTime = isMobileDevice ? 1000 : 1500
    const failsafeTime = 4000
    const checkReady = () => { if (Date.now() - loadStartTime.current >= minDisplayTime && events.length > 0) setCanShowContent(true) }
    const minTimer = setTimeout(checkReady, minDisplayTime)
    const failsafe = setTimeout(() => setCanShowContent(true), failsafeTime)
    if (events.length > 0 && Date.now() - loadStartTime.current >= minDisplayTime) setCanShowContent(true)
    return () => { clearTimeout(minTimer); clearTimeout(failsafe) }
  }, [events.length, setCanShowContent])

  useEffect(() => {
    const hardTimeout = setTimeout(() => { if (events.length === 0) { setDegradedMode(true); setShowRetryPrompt(true) } }, 15000)
    return () => clearTimeout(hardTimeout)
  }, [events.length, setDegradedMode, setShowRetryPrompt])

  useEffect(() => { if (events.length > 0) { setShowRetryPrompt(false); setDegradedMode(false) } }, [events.length, setShowRetryPrompt, setDegradedMode])

  useEffect(() => {
    const errorTimer = setTimeout(() => { if (degradedMode && events.length === 0) setHasError(true) }, 20000)
    return () => clearTimeout(errorTimer)
  }, [degradedMode, events.length, setHasError])

  const isInitialLoading = !canShowContent && !degradedMode

  // ========== DEEP-LINK HANDLING ==========
  const deepLinkHandled = useRef(false)

  useEffect(() => {
    if (deepLinkHandled.current || events.length === 0) return

    const eventId = searchParams.get('event')
    const topicSlug = searchParams.get('topic')

    if (eventId) {
      const matched = events.find(e => e.id === eventId)
      if (matched) {
        deepLinkHandled.current = true
        selectEvent(matched)
        setFlyToTarget({ lat: matched.latitude, lng: matched.longitude })
      }
    } else if (topicSlug) {
      deepLinkHandled.current = true
      const topicName = topicSlug.replace(/-/g, ' ')
      setSearchQuery(topicName)
      enterCategoryBrowseMode(topicName, topicName.replace(/\b\w/g, c => c.toUpperCase()), '')
    }
  }, [events, searchParams, selectEvent, setFlyToTarget, setSearchQuery, enterCategoryBrowseMode])

  // ========== RENDER ==========
  return (
    <ErrorBoundary event={selectedEvent}>
      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Error State */}
      {hasError && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-white text-lg mb-2">Loading took too long</div>
          <div className="text-gray-400 text-sm mb-6 text-center max-w-xs">There might be a connection issue. Please try again.</div>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Reload Page</button>
        </div>
      )}

      {/* Loading Screen */}
      <WorldAlignLoader isVisible={isInitialLoading && !hasError} progress={loadingProgress} />

      {/* Retry Prompt */}
      {showRetryPrompt && !hasError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg flex items-center gap-3" style={{ background: 'rgba(17, 24, 39, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-gray-300">Data loading slowly</span>
          <button onClick={() => { refetch(); setShowRetryPrompt(false) }} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors">Retry</button>
        </div>
      )}

      <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        {/* Logo */}
        <div className="fixed left-4 z-40" style={{ top: 'max(16px, env(safe-area-inset-top, 16px))', opacity: selectedEvent ? 0.4 : 0.9, transition: 'opacity 0.3s ease' }}>
          <VoxTerraLogo size="md" showWordmark={false} />
        </div>

        {/* Trending Sidebar */}
        <TrendingSidebar
          topics={topics}
          onTopicClick={(topic) => enterCategoryBrowseMode(topic.keywords[0] || topic.name, topic.name, '')}
          isHidden={!!selectedEvent || isSettingsPanelOpen}
        />

        {/* Interaction Hint */}
        <InteractionHintModal
          isVisible={showInteractionHint}
          onDismiss={() => setShowInteractionHint(false)}
          onNeverShowAgain={() => { if (typeof window !== 'undefined') localStorage.setItem('neverShowInteractionHint', 'true'); setShowInteractionHint(false) }}
        />

        {/* Background Loading Indicator */}
        {(loading || processing) && <LoadingOverlay loading={loading} processing={processing} progress={loadingProgress} message={loading ? 'Fetching events...' : 'Processing data...'} />}

        {/* Fun Fact Overlay */}
        {showFunFact && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none" style={{ opacity: loading ? 1 : 0, transition: 'opacity 0.5s ease-out' }}>
            <div className="flex flex-col items-center gap-4 px-8 max-w-md text-center">
              <div className="w-10 h-10 rounded-full border-2 border-gray-700 border-t-blue-500" style={{ animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p className="text-gray-500 text-sm leading-relaxed"><span className="text-gray-400 font-medium">Did you know?</span><br />{funFact}</p>
            </div>
          </div>
        )}

        {/* Globe */}
        <div className="absolute inset-0">
          <GlobeComponent
            events={geoEvents}
            onMarkerClick={(event: Event) => { if (event?.id) selectEvent(event) }}
            filters={filters}
            loading={loading}
            processing={processing}
            onZoomChange={setGlobeZoom}
            isDetailPanelOpen={!!selectedEvent}
            isSettingsPanelOpen={isSettingsPanelOpen}
            isModalOpen={showInfoModal || showShortcutsHelp}
            flyToTarget={flyToTarget}
            highlightedEventIds={highlightedEventIds}
            isolatedEventIds={isolatedEventIds}
            showLabels={true}
          />
        </div>

        {/* ISS Settings Panel */}
        <SatelliteControlPanel
          filters={filters}
          onFiltersChange={setFilters}
          events={events}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          zoomLevel={globeZoom}
          globeAltitude={globeAltitude}
          onSettingsOpenChange={setSettingsPanelOpen}
          bookmarkedIds={bookmarkedIds}
          onSelectEvent={selectEvent}
        />

        {/* Event Detail Panel */}
        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onClose={() => selectEvent(null)}
            allEvents={filteredEvents}
            onNavigateToEvent={handleNavigateToEvent}
            canGoBack={eventHistory.length > 0}
            onGoBack={handleGoBack}
            isBookmarked={isBookmarked(selectedEvent.id)}
            onToggleBookmark={toggleBookmark}
          />
        )}

        {/* Error Display */}
        {error && <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">Error: {error}</div>}

        {/* Category Browse Nav */}
        <CategoryBrowseNav onNavigate={handleNavigateCategoryPin} onExit={exitCategoryBrowseMode} />

        {/* Search Bar */}
        <SearchBar filteredEventsCount={filteredEvents.length} onEnterBrowseMode={enterCategoryBrowseMode} />

        {/* Bottom Stats Bar */}
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full text-xs"
          style={{ bottom: 'max(16px, env(safe-area-inset-bottom, 16px))', background: colors.barBg, backdropFilter: 'blur(12px)', border: `1px solid ${colors.barBorder}` }}
        >
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-gray-400">{loading ? 'Loading...' : `${filteredEvents.length} events`}</span>
          </div>
          {filters.eventTypes && filters.eventTypes.length > 0 && (
            <div className="flex items-center gap-1.5 text-blue-400">
              <span>⚡</span>
              <span className="hidden sm:inline">{filters.eventTypes.length} categories</span>
              <span className="sm:hidden">{filters.eventTypes.length}</span>
            </div>
          )}
          {filters.selectedCountries && filters.selectedCountries.length > 0 && (
            <div className="flex items-center gap-1.5 text-purple-400">
              <span>🌍</span>
              <span className="hidden sm:inline">{filters.selectedCountries.length} countries</span>
              <span className="sm:hidden">{filters.selectedCountries.length}</span>
            </div>
          )}
          {filters.showDistances && filters.userLocation && (
            <div className="flex items-center gap-1.5 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>{filters.distanceRadius}mi</span>
            </div>
          )}
          {pushSupported && (
            <button onClick={pushSubscribed ? pushUnsubscribe : pushSubscribe} className="p-1 rounded transition-colors" style={{ color: pushSubscribed ? '#818cf8' : colors.textMuted }} aria-label={pushSubscribed ? 'Disable notifications' : 'Enable notifications'} title={pushSubscribed ? 'Notifications on' : 'Enable notifications'}>
              <svg className="w-3.5 h-3.5" fill={pushSubscribed ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
          )}
          {isAuthenticated ? (
            <button onClick={signOut} className="p-1 rounded transition-colors group" style={{ color: '#818cf8' }} aria-label="Sign out" title={`Signed in as ${user?.email}`}>
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white group-hover:bg-indigo-500 transition-colors">
                {(user?.email?.[0] || 'U').toUpperCase()}
              </div>
            </button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="p-1 rounded transition-colors" style={{ color: colors.textMuted }} aria-label="Sign in" title="Sign in">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </button>
          )}
          <div className="text-gray-500 hidden sm:block">Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-gray-300">S</kbd> for settings</div>
          <button onClick={() => { const btn = document.querySelector('[data-iss-trigger]') as HTMLElement; if (btn) btn.click() }} className="sm:hidden p-1 rounded transition-colors" style={{ color: colors.textMuted }} aria-label="Open settings">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button onClick={() => setShowInfoModal(true)} className="sm:hidden p-1 rounded transition-colors" style={{ color: colors.textMuted }} aria-label="Show info">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>

        {/* Footer */}
        <div className="fixed right-4 z-20 hidden sm:flex items-center gap-2" style={{ bottom: 'max(16px, env(safe-area-inset-bottom, 16px))', fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}>
          <button onClick={() => setShowInfoModal(true)} className="p-2 rounded-lg transition-colors" style={{ background: colors.barBg, backdropFilter: 'blur(8px)', border: `1px solid ${colors.borderSubtle}`, color: colors.textMuted }} title="Press 'I' for info">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button onClick={() => setShowShortcutsHelp(true)} className="keyboard-shortcuts p-2 rounded-lg transition-colors hidden sm:block" style={{ background: colors.barBg, backdropFilter: 'blur(8px)', border: `1px solid ${colors.borderSubtle}`, color: colors.textMuted }} title="Press '?' for shortcuts">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: colors.barBg, backdropFilter: 'blur(8px)', border: `1px solid ${colors.borderSubtle}`, opacity: 0.7 }}>
            <span className="text-gray-500">by</span>
            <span className="text-gray-300 font-medium tracking-wide">Tyler Lucchi</span>
          </div>
        </div>

        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowInfoModal(false)}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ background: colors.modalBackdrop }} />
            <div className="relative max-w-lg w-full rounded-2xl p-6 overflow-hidden" style={{ background: colors.modalBg, border: `1px solid ${colors.modalBorder}`, boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(99, 102, 241, 0.1)', fontFamily: 'var(--font-exo2), system-ui, sans-serif' }} onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">🌍</span> How We Source & Weight News
              </h2>
              <div className="space-y-4 text-sm text-gray-300">
                <p className="leading-relaxed">Our intelligent aggregation system pulls from <span className="text-indigo-400 font-medium">15+ global sources</span> including NY Times, BBC, Reuters, Al Jazeera, and humanitarian APIs like ReliefWeb.</p>
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
                <p className="text-gray-400 text-xs">Events are balanced across regions with guaranteed quotas ensuring global coverage. Breaking news and armed conflicts receive priority boosting.</p>
              </div>
              <button onClick={() => setShowInfoModal(false)} className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600/80 hover:bg-indigo-600 transition-colors">Got it</button>
            </div>
          </div>
        )}

        {/* Shortcuts Modal */}
        {showShortcutsHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowShortcutsHelp(false)}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ background: colors.modalBackdrop }} />
            <div className="relative max-w-md w-full rounded-2xl p-6 overflow-hidden" style={{ background: colors.modalBg, border: `1px solid ${colors.modalBorder}`, boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(99, 102, 241, 0.1)', fontFamily: 'var(--font-exo2), system-ui, sans-serif' }} onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <span className="text-2xl">⌨️</span> Keyboard Shortcuts
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
                    <kbd className="px-2.5 py-1 rounded-lg text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20">{key}</kbd>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowShortcutsHelp(false)} className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600/80 hover:bg-indigo-600 transition-colors">Close</button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

