/**
 * Event Detail Panel
 * 
 * Premium slide-out panel with futuristic design:
 * - Multiple aggregated sources with modal view
 * - Timeline section for ongoing conflicts
 * - Related/similar events section
 * - Holographic glassmorphism effects
 * - Smooth slide-in animations
 */

import { memo, useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Event, Article } from '@/types/event'
import { getSeverityLabel, getSeverityColor } from '@/utils/severity'
import { validateUrl, validateEventForRender, formatCoordinates } from '@/utils/validation'
import { capitalizeCountry, capitalizeCity, capitalizeLocation } from '@/utils/capitalization'
import { getCategoryColor, getIconInfo } from '../Globe/markerIcons'
import { getThemeColors } from '@/utils/themeColors'

interface EventDetailPanelProps {
  event: Event | null
  onClose: () => void
  allEvents?: Event[] // For related events
  onNavigateToEvent?: (event: Event) => void // For drill-down navigation
  canGoBack?: boolean // Show back button if there's history
  onGoBack?: () => void // Go back in navigation history
  isBookmarked?: boolean
  onToggleBookmark?: (eventId: string) => void
  theme?: 'dark' | 'light'
}

interface AggregatedSource {
  title: string
  url: string
  sourceName: string
  date: string
}

interface TimelineItem {
  date: string
  event: string
}

interface WikipediaData {
  title: string
  summary: string
  thumbnail?: string
  url: string
}

function EventDetailPanel({
  event: eventProp,
  onClose,
  allEvents = [],
  onNavigateToEvent,
  canGoBack = false,
  onGoBack,
  isBookmarked = false,
  onToggleBookmark,
  theme = 'dark',
}: EventDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [showAllSources, setShowAllSources] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [wikiData, setWikiData] = useState<WikipediaData | null>(null)
  const [wikiLoading, setWikiLoading] = useState(false)
  const [showWiki, setShowWiki] = useState(false)

  // Swipe-to-close: swipe right to close (right-side panel)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    // Swipe right to close
    if (dx > 80 && Math.abs(dy) < 60) {
      onClose()
    }
  }, [onClose])

  // Trigger slide-in animation
  useEffect(() => {
    if (eventProp) {
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
    }
  }, [eventProp])

  // ESC key handler - only for closing the sources sub-modal
  // Main panel close is handled by page.tsx's unified ESC handler
  useEffect(() => {
    if (!eventProp) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAllSources) {
        e.stopImmediatePropagation()
        setShowAllSources(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    closeButtonRef.current?.focus()
    return () => document.removeEventListener('keydown', handleEscape)
  }, [eventProp, showAllSources])

  // Reset sources modal, wiki, and scroll position when event changes
  useEffect(() => {
    setShowAllSources(false)
    setWikiData(null)
    setShowWiki(false)
    // Reset scroll to top on new event
    if (panelRef.current) {
      panelRef.current.scrollTop = 0
    }
  }, [eventProp?.id])

  // Fetch Wikipedia data for context
  const fetchWikipedia = useCallback(async () => {
    if (!eventProp || wikiLoading || wikiData) return
    
    setWikiLoading(true)
    
    // Option 6C: Content-aware Wikipedia linking
    // Pass title and event type for intelligent entity extraction
    const params = new URLSearchParams({
      q: eventProp.title,
      title: eventProp.title,
      type: eventProp.type || 'other',
    })
    
    try {
      const response = await fetch(`/api/wikipedia?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setWikiData(data)
      }
    } catch {
      // Silently fail - Wikipedia is supplemental
    } finally {
      setWikiLoading(false)
    }
  }, [eventProp, wikiLoading, wikiData])

  // Memoized event processing
  const processedEvent = useMemo(() => {
    if (!eventProp) return null
    
    const validationResult = validateEventForRender(eventProp)
    if (!validationResult.isValid) return null
    
    const event = validationResult.sanitizedEvent as Event
    
    // Get aggregated sources from metadata (from API)
    const aggregatedSources: AggregatedSource[] = (event.metadata?.sources as AggregatedSource[]) || []
    
    // Fallback to articles if no aggregated sources
    let articles: Article[] = []
    if (event.articles?.length > 0) {
      articles = event.articles
    } else {
      articles = [{
        id: event.id,
        title: event.title,
        description: event.description,
        timestamp: event.timestamp,
        source: event.source,
        url: event.metadata?.url || '#',
        sourceName: event.metadata?.sourceName || 'Unknown source',
        publishedAt: event.metadata?.publishedAt || new Date(event.timestamp).toISOString(),
        type: event.type,
        severity: event.severity,
        metadata: event.metadata || {},
      }]
    }
    
    const primaryArticle = articles[0]
    if (!primaryArticle) return null
    
    const primaryUrl = primaryArticle.url || primaryArticle.metadata?.url || '#'
    
    // Merge sources: use aggregatedSources if available, else use articles
    const allSources: AggregatedSource[] = aggregatedSources.length > 0 
      ? aggregatedSources 
      : articles.map(a => ({
          title: a.title,
          url: a.url || '#',
          sourceName: a.sourceName || 'Unknown',
          date: a.publishedAt || new Date(a.timestamp).toISOString(),
        }))

    // Extract timeline data for conflicts
    const timeline = (event.metadata?.timeline as TimelineItem[]) || []
    const startDate = event.metadata?.startDate as string | undefined
    const isOngoing = event.isOngoing || event.metadata?.isOngoing || false
    const continent = event.metadata?.continent as string || ''
    
    // Source diversity classification
    const sourceCount = allSources.length
    const sourceDiversity = sourceCount >= 4
      ? { label: 'Well-covered', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
      : sourceCount >= 2
        ? { label: 'Verified', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' }
        : { label: 'Single source', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' }

    return {
      event,
      articles,
      allSources,
      primaryArticle,
      hasMultipleSources: allSources.length > 1,
      severityLabel: getSeverityLabel(event.severity),
      severityColor: getSeverityColor(event.severity),
      categoryColor: getCategoryColor(event.type),
      locationName: capitalizeCity(event.metadata?.locationName as string),
      country: capitalizeCountry(event.metadata?.country as string),
      primarySourceName: primaryArticle.sourceName || 'Unknown source',
      formattedCoords: formatCoordinates(event.latitude, event.longitude),
      primaryUrl,
      isPrimaryUrlValid: validateUrl(primaryUrl),
      locationConfidence: (event.metadata?.locationConfidence as number) ?? 0.8,
      weightScore: event.metadata?.weightScore as number | undefined,
      timeline,
      startDate,
      isOngoing,
      continent,
      iconInfo: getIconInfo(event.type, event.severity),
      sourceDiversity,
    }
  }, [eventProp])

  // Find related events (same type or nearby) - optimized with early filtering
  const relatedEvents = useMemo(() => {
    if (!processedEvent || !allEvents.length) return []
    const { event } = processedEvent
    
    // Quick bounding box filter first (roughly 500 miles = ~7 degrees)
    const latRange = 7
    const lngRange = 7 / Math.cos(Math.min(Math.abs(event.latitude), 89) * Math.PI / 180)
    
    // Pre-filter by bounding box for performance
    const candidates = allEvents.filter(e => 
      e.id !== event.id && (
        e.type === event.type || // Same type always included
        (Math.abs(e.latitude - event.latitude) <= latRange && 
         Math.abs(e.longitude - event.longitude) <= lngRange)
      )
    )
    
    // Only calculate exact distance for candidates
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 3959
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLng = (lng2 - lng1) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
    
    return candidates
      .map(e => ({
        ...e,
        distance: getDistance(event.latitude, event.longitude, e.latitude, e.longitude),
        sameType: e.type === event.type,
      }))
      .filter(e => e.sameType || e.distance < 500)
      .sort((a, b) => {
        if (a.sameType && !b.sameType) return -1
        if (!a.sameType && b.sameType) return 1
        return a.distance - b.distance
      })
      .slice(0, 4)
  }, [processedEvent, allEvents])

  const tc = getThemeColors(theme)

  if (!processedEvent) return null

  const {
    event, allSources, hasMultipleSources, severityLabel, severityColor,
    categoryColor, locationName, country, primarySourceName,
    primaryUrl, isPrimaryUrlValid, locationConfidence, weightScore,
    timeline, startDate, isOngoing, continent, iconInfo, formattedCoords,
    sourceDiversity
  } = processedEvent

  const formatTime = (ts: number | string) => {
    const date = new Date(ts)
    if (isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const formatSourceDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const confidencePercent = Math.round(locationConfidence * 100)

  // Parse category color into RGB for effects
  const parseColor = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 100, g: 150, b: 255 }
  }
  const rgb = parseColor(categoryColor)

  return (
    <>
      {/* Backdrop with enhanced blur */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel with futuristic slide animation - Exo 2 font */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`event-detail-panel fixed right-0 top-0 h-full w-full sm:max-w-md z-50 overflow-y-auto transition-transform duration-300 ease-out ${isVisible ? 'translate-x-0 panel-open' : 'translate-x-full panel-closed'}`}
        style={{
          fontFamily: 'var(--font-exo2), system-ui, sans-serif',
          background: theme === 'dark'
            ? `linear-gradient(180deg, rgba(8, 12, 24, 0.98) 0%, rgba(15, 23, 42, 0.98) 50%, rgba(20, 30, 55, 0.98) 100%)`
            : `linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(241, 245, 249, 0.98) 100%)`,
          backdropFilter: 'blur(20px)',
          boxShadow: theme === 'dark'
            ? `-12px 0 40px rgba(0, 0, 0, 0.6), inset 1px 0 0 rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
            : `-12px 0 40px rgba(0, 0, 0, 0.1), inset 1px 0 0 rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
          borderLeft: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
      >
        {/* Holographic edge glow */}
        <div 
          className="absolute top-0 left-0 w-1 h-full pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 50%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5) 100%)`,
            filter: 'blur(2px)',
          }}
        />

        <div className="p-5 pb-8">
          {/* Header with category icon and color accent */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              {/* Category icon badge */}
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 100%)`,
                  border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
                  boxShadow: `0 4px 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
                }}
              >
                {iconInfo.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: categoryColor }}
                  >
                    {event.type.replace('-', ' ')}
                  </span>
                  {isOngoing && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      Ongoing
                    </span>
                  )}
                </div>
                <h2 id="event-detail-title" className="text-lg font-bold leading-tight line-clamp-2" style={{ color: tc.textPrimary }}>
                  {event.title}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Back button - shown when there's navigation history */}
              {canGoBack && onGoBack && (
                <button
                  onClick={onGoBack}
                  className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-lg transition-all flex items-center gap-1"
                  aria-label="Go back"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-xs hidden sm:inline">Back</span>
                </button>
              )}
              {/* Bookmark star */}
              {onToggleBookmark && eventProp && (
                <button
                  onClick={() => onToggleBookmark(eventProp.id)}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    color: isBookmarked ? '#f59e0b' : '#6b7280',
                  }}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              )}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all hover:rotate-90"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Compact Geo-Card with Mini World Visualization */}
          <div 
            className="relative rounded-xl overflow-hidden mb-5"
            style={{
              background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 0%, rgba(10, 15, 30, 0.95) 100%)`,
              border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
            }}
          >
            {/* Animated scan line effect */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ opacity: 0.15 }}
            >
              <div
                className="absolute w-full h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8), transparent)`,
                  animation: 'edp-scanLine 3s ease-in-out infinite',
                }}
              />
            </div>

            <div className="flex items-stretch">
              {/* Mini Globe Visualization */}
              <div 
                className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(60, 80, 120, 0.4) 0%, rgba(10, 15, 30, 0.8) 70%)',
                }}
              >
                {/* Animated globe circles */}
                <div className="relative w-16 h-16">
                  {/* Globe base */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3) 0%, rgba(20, 30, 50, 0.9) 70%)`,
                      border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
                      boxShadow: `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2), inset 0 0 15px rgba(0,0,0,0.5)`,
                    }}
                  />
                  {/* Latitude lines */}
                  <div className="absolute inset-1 rounded-full overflow-hidden opacity-30">
                    <div className="absolute w-full h-[1px] top-1/4 bg-white/40" />
                    <div className="absolute w-full h-[1px] top-1/2 bg-white/60" />
                    <div className="absolute w-full h-[1px] top-3/4 bg-white/40" />
                  </div>
                  {/* Rotating longitude arc */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
                      borderRightColor: 'transparent',
                      borderBottomColor: 'transparent',
                      animation: 'edp-globeRotate 8s linear infinite',
                    }}
                  />
                  {/* Location ping */}
                  <div 
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: categoryColor,
                      boxShadow: `0 0 8px ${categoryColor}`,
                      top: `${50 - (event.latitude / 90) * 35}%`,
                      left: `${50 + (event.longitude / 180) * 35}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Pulse ring */}
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `2px solid ${categoryColor}`,
                        animation: 'edp-pulseRing 2s ease-out infinite',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Location Info */}
              <div className="flex-1 p-3 flex flex-col justify-center">
                {/* Location Name */}
                <div 
                  className="text-base font-semibold text-white mb-1 tracking-wide"
                  style={{ textShadow: `0 0 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` }}
                >
                  {locationName}
                </div>
                
                {/* Country & Region */}
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  {country && country !== 'Unknown' && country !== locationName && (
                    <span className="font-medium">{country}</span>
                  )}
                  {continent && (
                    <>
                      {country && country !== 'Unknown' && country !== locationName && <span className="text-gray-600">•</span>}
                      <span className="text-gray-500">{capitalizeLocation(continent.replace('-', ' '))}</span>
                    </>
                  )}
                </div>

                {/* Coordinates with glow effect */}
                <div 
                  className="flex items-center gap-2 text-[11px] font-mono tracking-wider"
                  style={{ color: categoryColor }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{formattedCoords}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description - Enhanced */}
          {event.description && (
            <div className="mb-5">
              <p className="text-sm leading-relaxed line-clamp-6" style={{ color: tc.textSecondary }}>
                {event.description}
              </p>
            </div>
          )}

          {/* Info Grid - Futuristic cards with Exo 2 */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {/* Severity */}
            <div
              className="rounded-xl p-3 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05) 0%, ${tc.cardBg} 100%)`,
                border: `1px solid ${tc.borderSubtle}`,
              }}
            >
              <div className="text-[9px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: tc.textMuted }}>Severity</div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: severityColor,
                    boxShadow: `0 0 10px ${severityColor}60`,
                  }}
                />
                <span className="text-sm font-semibold" style={{ color: tc.textPrimary }}>{event.severity}</span>
                <span className="text-[10px]" style={{ color: tc.textMuted }}>/10</span>
              </div>
            </div>

            {/* Sources Count + Diversity */}
            <div
              className="rounded-xl p-3 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05) 0%, ${tc.cardBg} 100%)`,
                border: `1px solid ${tc.borderSubtle}`,
              }}
            >
              <div className="text-[9px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: tc.textMuted }}>Sources</div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold" style={{ color: tc.textPrimary }}>{allSources.length}</span>
                <span
                  className="text-[8px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: sourceDiversity.bg, color: sourceDiversity.color }}
                >
                  {sourceDiversity.label}
                </span>
              </div>
            </div>
            
            {/* Accuracy */}
            <div
              className="rounded-xl p-3 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05) 0%, ${tc.cardBg} 100%)`,
                border: `1px solid ${tc.borderSubtle}`,
              }}
            >
              <div className="text-[9px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: tc.textMuted }}>Accuracy</div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: theme === 'dark' ? '#1f2937' : '#e2e8f0' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${confidencePercent}%`,
                      backgroundColor: confidencePercent > 70 ? '#22c55e' : confidencePercent > 40 ? '#eab308' : '#ef4444',
                      boxShadow: `0 0 6px ${confidencePercent > 70 ? '#22c55e' : confidencePercent > 40 ? '#eab308' : '#ef4444'}50`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono" style={{ color: tc.textSecondary }}>{confidencePercent}%</span>
              </div>
            </div>
          </div>

          {/* Read Article Button - Enhanced */}
          {isPrimaryUrlValid && (
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}cc 100%)`,
                boxShadow: `0 4px 20px ${categoryColor}40`,
              }}
            >
              <span>Read Full Article</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {/* Timeline Section - For conflicts */}
          {timeline.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="text-base">📅</span>
                  Timeline
                </h4>
                {startDate && (
                  <span className="text-xs text-gray-400">Since {startDate}</span>
                )}
              </div>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500/50 via-blue-500/30 to-transparent" />
                
                <div className="space-y-4">
                  {timeline.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 relative">
                      {/* Timeline dot */}
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                        style={{
                          background: idx === 0 
                            ? `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}80 100%)`
                            : 'rgba(100, 150, 255, 0.3)',
                          border: idx === 0 ? `2px solid ${categoryColor}` : '2px solid rgba(100, 150, 255, 0.5)',
                          boxShadow: idx === 0 ? `0 0 10px ${categoryColor}50` : 'none',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-gray-400 font-mono mb-0.5">{item.date}</div>
                        <div className="text-sm text-white leading-tight">{item.event}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Multiple Sources Section */}
          {hasMultipleSources && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="text-base">📰</span>
                  Sources ({allSources.length})
                </h4>
                {allSources.length > 3 && (
                  <button
                    onClick={() => setShowAllSources(true)}
                    className="text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ 
                      color: categoryColor,
                      background: `${categoryColor}15`,
                    }}
                  >
                    View All →
                  </button>
                )}
              </div>
              
              {/* Source List (compact) */}
              <div className="space-y-2">
                {allSources.slice(0, 3).map((source, idx) => {
                  const isValid = validateUrl(source.url)
                  return (
                    <a
                      key={`${source.url}-${idx}`}
                      href={isValid ? source.url : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block p-3 rounded-xl transition-all duration-200 ${isValid ? 'hover:bg-white/10 hover:translate-x-1 cursor-pointer' : 'cursor-default opacity-60'}`}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Source Badge */}
                        <div 
                          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                          style={{ 
                            background: `linear-gradient(135deg, ${categoryColor}30 0%, ${categoryColor}10 100%)`,
                            border: `1px solid ${categoryColor}30`,
                          }}
                        >
                          {source.sourceName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white line-clamp-1 mb-1">{source.title}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-medium" style={{ color: categoryColor }}>{source.sourceName}</span>
                            <span>•</span>
                            <span>{formatSourceDate(source.date)}</span>
                          </div>
                        </div>
                        {isValid && (
                          <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Related Events Section - Clickable for drill-down navigation */}
          {relatedEvents.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <span className="text-base">🔗</span>
                Related Events
                <span className="text-[10px] text-gray-500 font-normal ml-auto">Click to explore</span>
              </h4>
              <div className="space-y-2">
                {relatedEvents.map((related) => {
                  const relatedColor = getCategoryColor(related.type)
                  const relatedIcon = getIconInfo(related.type, related.severity).icon
                  return (
                    <button 
                      key={related.id}
                      onClick={() => onNavigateToEvent?.(related)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] text-left"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: `${relatedColor}20` }}
                      >
                        {relatedIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white line-clamp-1">{related.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span style={{ color: relatedColor }}>{related.type.replace('-', ' ')}</span>
                          {related.distance && (
                            <>
                              <span>•</span>
                              <span>{Math.round(related.distance)} mi away</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Navigate arrow */}
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Wikipedia Learn More Section */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <button
              onClick={() => {
                setShowWiki(!showWiki)
                if (!showWiki && !wikiData) {
                  fetchWikipedia()
                }
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-white/5"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📚</span>
                <span className="text-sm font-medium text-white">Learn More</span>
                <span className="text-[10px] text-gray-500">via Grokipedia</span>
              </div>
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showWiki ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Expandable Wikipedia Content */}
            {showWiki && (
              <div 
                className="mt-3 p-4 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  animation: 'edp-fadeIn 0.2s ease-out',
                }}
              >
                
                {wikiLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-gray-400">Loading context...</span>
                  </div>
                ) : wikiData ? (
                  <div>
                    {wikiData.thumbnail && (
                      <img 
                        src={wikiData.thumbnail} 
                        alt={wikiData.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h5 className="text-sm font-semibold text-white mb-2">{wikiData.title}</h5>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-6">
                      {wikiData.summary}
                    </p>
                    <a
                      href={wikiData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Read full article on Grokipedia
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">
                    No additional context available
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Priority Score (subtle) */}
          {weightScore && (
            <div className="mt-5 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-[10px] text-gray-600">
                <span className="uppercase tracking-wider">Priority Score</span>
                <span className="font-mono">{weightScore.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyframes - single injection */}
      <style>{`
        @keyframes edp-scanLine { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes edp-pulseRing { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
        @keyframes edp-globeRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes edp-fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes edp-modalIn { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* Full Sources Modal - Futuristic */}
      {showAllSources && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAllSources(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sources-modal-title"
            className="fixed sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:max-h-[80vh] z-[70] rounded-2xl overflow-hidden"
            style={{
              animation: 'edp-modalIn 0.25s ease-out',
              background: 'linear-gradient(180deg, rgba(8, 12, 24, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
              border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
              boxShadow: `0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
              top: '16px',
              left: '16px',
              right: '16px',
              bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
            }}
          >
            
            {/* Modal Header */}
            <div 
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📰</span>
                <h3 id="sources-modal-title" className="text-lg font-bold text-white">All Sources</h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ 
                    background: `${categoryColor}20`,
                    color: categoryColor,
                  }}
                >
                  {allSources.length}
                </span>
              </div>
              <button
                onClick={() => setShowAllSources(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all hover:rotate-90"
                aria-label="Close sources modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 70px)' }}>
              <div className="space-y-3">
                {allSources.map((source, idx) => {
                  const isValid = validateUrl(source.url)
                  return (
                    <a
                      key={`modal-${source.url}-${idx}`}
                      href={isValid ? source.url : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block p-4 rounded-xl transition-all duration-200 ${isValid ? 'hover:translate-x-1 cursor-pointer' : 'cursor-default opacity-60'}`}
                      style={{
                        background: isValid ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                      onMouseEnter={(e) => isValid && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                      onMouseLeave={(e) => isValid && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                          style={{ 
                            background: `linear-gradient(135deg, ${categoryColor}40 0%, ${categoryColor}20 100%)`,
                            border: `1px solid ${categoryColor}30`,
                          }}
                        >
                          {source.sourceName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white line-clamp-2 mb-2 font-medium leading-tight">{source.title}</div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold" style={{ color: categoryColor }}>{source.sourceName}</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-500">{formatSourceDate(source.date)}</span>
                          </div>
                        </div>
                        {isValid && (
                          <svg className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default memo(EventDetailPanel)
