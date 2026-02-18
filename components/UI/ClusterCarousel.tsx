/**
 * ClusterCarousel - Horizontal Intelligence Card Carousel
 * 
 * Professional carousel interface for browsing cluster events.
 * Events are grouped by category (Politics, Markets, Security, etc.)
 * with full article titles (NEVER truncated).
 * 
 * Design: Bloomberg Terminal / Reuters dashboard aesthetic
 * Performance: CSS transforms only, no layout reflows
 */

'use client'

import { useState, useMemo, useCallback, useRef, memo, useEffect } from 'react'
import { Event } from '@/types/event'
import {
  SignalIcon,
  MarketIcon,
  PoliticsIcon,
  TechIcon,
  SecurityIcon,
  EnergyIcon,
  ClimateIcon,
  DiplomacyIcon,
  HealthIcon,
  EconomyIcon,
  AlertIcon,
  CloseIcon,
  ExternalLinkIcon,
} from './Icons'
import { capitalizeCountry, capitalizeCity } from '@/utils/capitalization'

// Virtualization threshold
const VIRTUALIZATION_THRESHOLD = 20

interface ClusterCarouselProps {
  events: Event[]
  regionName: string
  position: { lat: number; lng: number }
  onSelectEvent: (event: Event) => void
  onClose: () => void
}

// Category definitions
const CATEGORIES = [
  { id: 'all', label: 'All', icon: SignalIcon, color: '#6366f1' },
  { id: 'politics', label: 'Politics', icon: PoliticsIcon, color: '#4F7CAC' },
  { id: 'markets', label: 'Markets', icon: MarketIcon, color: '#D4A84B' },
  { id: 'security', label: 'Security', icon: SecurityIcon, color: '#C75146' },
  { id: 'technology', label: 'Technology', icon: TechIcon, color: '#7BA4DB' },
  { id: 'economy', label: 'Economy', icon: EconomyIcon, color: '#10b981' },
  { id: 'energy', label: 'Energy', icon: EnergyIcon, color: '#D97B4A' },
  { id: 'climate', label: 'Climate', icon: ClimateIcon, color: '#5B9A8B' },
  { id: 'diplomacy', label: 'Diplomacy', icon: DiplomacyIcon, color: '#6366f1' },
  { id: 'health', label: 'Health', icon: HealthIcon, color: '#E08D9D' },
] as const

// Map event types to categories
function getEventCategory(event: Event): string {
  const typeMap: Record<string, string> = {
    'business': 'markets',
    'armed-conflict': 'security',
    'terrorism': 'security',
    'crime': 'security',
    'civil-unrest': 'security',
    'earthquake': 'climate',
    'volcano': 'climate',
    'wildfire': 'climate',
    'storm': 'climate',
    'tsunami': 'climate',
    'flood': 'climate',
    'science': 'technology',
  }
  return typeMap[event.type] || event.type
}

function formatTimestamp(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ClusterCarousel({
  events,
  regionName,
  position,
  onSelectEvent,
  onClose,
}: ClusterCarouselProps) {
  const [activeCategory, setActiveCategory] = useState('all')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 })
  
  // ========== FLUID MOMENTUM SCROLLING ==========
  // High momentum, long coast (like iOS scroll)
  const dragState = useRef<{
    isDragging: boolean
    startX: number
    scrollLeft: number
    lastX: number
    lastTime: number
    velocity: number
  }>({ isDragging: false, startX: 0, scrollLeft: 0, lastX: 0, lastTime: 0, velocity: 0 })
  const momentumRAF = useRef<number | null>(null)
  
  // Momentum physics constants (fluid, high momentum)
  const MOMENTUM = {
    FRICTION: 0.95,        // High value = longer coast
    MIN_VELOCITY: 0.5,     // Stop when velocity is below this
    VELOCITY_MULT: 1.5,    // Amplify initial velocity
  }
  
  // Apply momentum animation
  const applyMomentum = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    let velocity = dragState.current.velocity
    
    const animate = () => {
      if (Math.abs(velocity) < MOMENTUM.MIN_VELOCITY) {
        momentumRAF.current = null
        return
      }
      
      container.scrollLeft += velocity
      velocity *= MOMENTUM.FRICTION
      
      momentumRAF.current = requestAnimationFrame(animate)
    }
    
    momentumRAF.current = requestAnimationFrame(animate)
  }, [])
  
  // Mouse/touch drag handlers
  const handleDragStart = useCallback((clientX: number) => {
    const container = scrollContainerRef.current
    if (!container) return
    
    // Cancel any ongoing momentum
    if (momentumRAF.current) {
      cancelAnimationFrame(momentumRAF.current)
      momentumRAF.current = null
    }
    
    dragState.current = {
      isDragging: true,
      startX: clientX,
      scrollLeft: container.scrollLeft,
      lastX: clientX,
      lastTime: Date.now(),
      velocity: 0,
    }
    
    container.style.scrollBehavior = 'auto'
    container.style.cursor = 'grabbing'
  }, [])
  
  const handleDragMove = useCallback((clientX: number) => {
    if (!dragState.current.isDragging) return
    const container = scrollContainerRef.current
    if (!container) return
    
    const now = Date.now()
    const dt = now - dragState.current.lastTime
    const dx = dragState.current.lastX - clientX
    
    // Track velocity (exponential smoothing)
    if (dt > 0) {
      const instantVelocity = dx / dt * 16 // Normalize to ~60fps
      dragState.current.velocity = dragState.current.velocity * 0.7 + instantVelocity * 0.3
    }
    
    dragState.current.lastX = clientX
    dragState.current.lastTime = now
    
    const totalDx = dragState.current.startX - clientX
    container.scrollLeft = dragState.current.scrollLeft + totalDx
  }, [])
  
  const handleDragEnd = useCallback(() => {
    if (!dragState.current.isDragging) return
    const container = scrollContainerRef.current
    if (!container) return
    
    dragState.current.isDragging = false
    container.style.cursor = 'grab'
    container.style.scrollBehavior = ''
    
    // Apply momentum with amplified velocity
    dragState.current.velocity *= MOMENTUM.VELOCITY_MULT
    if (Math.abs(dragState.current.velocity) > MOMENTUM.MIN_VELOCITY) {
      applyMomentum()
    }
  }, [applyMomentum])
  
  // Mouse event handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientX)
  }, [handleDragStart])
  
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX)
  }, [handleDragMove])
  
  const onMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])
  
  const onMouseLeave = useCallback(() => {
    if (dragState.current.isDragging) {
      handleDragEnd()
    }
  }, [handleDragEnd])
  
  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX)
  }, [handleDragStart])
  
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX)
  }, [handleDragMove])
  
  const onTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])
  
  // Cleanup momentum on unmount
  useEffect(() => {
    return () => {
      if (momentumRAF.current) {
        cancelAnimationFrame(momentumRAF.current)
      }
    }
  }, [])
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Group events by category
  const eventsByCategory = useMemo(() => {
    const groups: Record<string, Event[]> = { all: events }
    
    events.forEach(event => {
      const category = getEventCategory(event)
      if (!groups[category]) groups[category] = []
      groups[category].push(event)
    })
    
    // Sort each category by timestamp (newest first)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.timestamp - a.timestamp)
    })
    
    return groups
  }, [events])

  // Get categories with events, sorted by count
  const availableCategories = useMemo(() => {
    return CATEGORIES.filter(cat => 
      cat.id === 'all' || (eventsByCategory[cat.id]?.length || 0) > 0
    ).sort((a, b) => {
      if (a.id === 'all') return -1
      if (b.id === 'all') return 1
      return (eventsByCategory[b.id]?.length || 0) - (eventsByCategory[a.id]?.length || 0)
    })
  }, [eventsByCategory])

  // Current events to display (with virtualization)
  const currentEvents = useMemo(() => {
    const all = eventsByCategory[activeCategory] || []
    
    // Virtualize if > threshold
    if (all.length > VIRTUALIZATION_THRESHOLD) {
      return all.slice(visibleRange.start, visibleRange.end)
    }
    
    return all
  }, [eventsByCategory, activeCategory, visibleRange])
  
  // Total count for virtualization
  const totalEventsInCategory = useMemo(() => {
    return eventsByCategory[activeCategory]?.length || 0
  }, [eventsByCategory, activeCategory])
  
  const needsVirtualization = totalEventsInCategory > VIRTUALIZATION_THRESHOLD
  
  // Update visible range on scroll (for virtualization)
  useEffect(() => {
    if (!needsVirtualization || !scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const cardWidth = 320 + 12 // card width + gap
      const visibleCards = Math.ceil(container.clientWidth / cardWidth)
      const start = Math.max(0, Math.floor(scrollLeft / cardWidth) - 2)
      const end = Math.min(totalEventsInCategory, start + visibleCards + 4)
      
      setVisibleRange({ start, end })
    }
    
    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation
    
    return () => container.removeEventListener('scroll', handleScroll)
  }, [needsVirtualization, totalEventsInCategory])

  // Check scroll state
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10)
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    container.addEventListener('scroll', updateScrollState, { passive: true })
    updateScrollState()

    return () => container.removeEventListener('scroll', updateScrollState)
  }, [updateScrollState, currentEvents])

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' })
  }, [])

  const scrollRight = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })
  }, [])

  const getCategoryColor = (categoryId: string): string => {
    const category = CATEGORIES.find(c => c.id === categoryId)
    return category?.color || '#6366f1'
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'linear-gradient(to top, rgba(10, 14, 20, 0.98) 0%, rgba(10, 14, 20, 0.95) 100%)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.5)',
        transform: 'translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SignalIcon size={16} color="#6366f1" />
            <h2 className="text-sm font-semibold text-white">{regionName}</h2>
          </div>
          <span 
            className="px-2 py-0.5 text-[10px] font-medium rounded"
            style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
          >
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
          <span className="text-[10px] text-gray-500">
            {position.lat.toFixed(2)}, {position.lng.toFixed(2)}
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 rounded transition-colors hover:bg-white/5"
          aria-label="Close carousel"
        >
          <CloseIcon size={16} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      {/* Category Tabs */}
      <div 
        className="flex items-center gap-1 px-4 py-2 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
      >
        {availableCategories.map(category => {
          const Icon = category.icon
          const count = eventsByCategory[category.id]?.length || 0
          const isActive = activeCategory === category.id
          
          return (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id)
                scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
              style={isActive ? { 
                background: `${category.color}20`,
                color: category.color,
                border: `1px solid ${category.color}40`,
              } : {
                border: '1px solid transparent',
              }}
            >
              <Icon size={12} color={isActive ? category.color : 'currentColor'} />
              <span>{category.label}</span>
              <span 
                className="px-1.5 py-0.5 rounded text-[9px]"
                style={{ 
                  background: isActive ? `${category.color}30` : 'rgba(255,255,255,0.05)',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Cards Container */}
      <div className="relative">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Scroll Right Button */}
        {canScrollRight && currentEvents.length > 3 && (
          <button
            onClick={scrollRight}
            aria-label="Scroll right"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Scrollable Cards with Fluid Momentum */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide"
          style={{ 
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            transform: 'translateZ(0)',
            cursor: 'grab',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Virtualized rendering: only render visible cards */}
          {needsVirtualization && visibleRange.start > 0 && (
            <div style={{ width: `${visibleRange.start * 332}px`, flexShrink: 0 }} />
          )}
          
          {currentEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              categoryColor={getCategoryColor(getEventCategory(event))}
              onClick={() => onSelectEvent(event)}
              isMobile={isMobile}
            />
          ))}
          
          {/* Spacer for virtualization */}
          {needsVirtualization && visibleRange.end < totalEventsInCategory && (
            <div style={{ width: `${(totalEventsInCategory - visibleRange.end) * 332}px`, flexShrink: 0 }} />
          )}
          
          {currentEvents.length === 0 && (
            <div className="flex items-center justify-center w-full py-8 text-gray-500 text-sm">
              No events in this category
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div 
        className="text-center py-2 text-[9px] uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.03)' }}
      >
        Swipe to browse | Click card for details
      </div>
    </div>
  )
}

// Event card component
interface EventCardProps {
  event: Event
  categoryColor: string
  onClick: () => void
  isMobile?: boolean
}

const EventCard = memo(function EventCard({ event, categoryColor, onClick, isMobile = false }: EventCardProps) {
  const source = event.metadata?.source as string
  const url = event.metadata?.url as string
  const country = capitalizeCountry(event.metadata?.country as string)
  const location = capitalizeCity(event.metadata?.locationName as string)
  const category = getEventCategory(event)
  const CategoryIcon = CATEGORIES.find(c => c.id === category)?.icon || SignalIcon
  
  const cardWidth = isMobile ? 280 : 320

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      tabIndex={0}
      role="button"
      className="flex-shrink-0 cursor-pointer rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
      style={{
        width: `${cardWidth}px`,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        scrollSnapAlign: 'start',
        // Smooth animations with CSS transforms (GPU acceleration)
        transform: 'translateZ(0)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}
      onMouseEnter={(e) => {
        if (!isMobile) {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)'
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <div className="p-4">
        {/* Category & Meta */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center justify-center w-6 h-6 rounded"
              style={{ background: `${categoryColor}15` }}
            >
              <CategoryIcon size={12} color={categoryColor} />
            </div>
            <span 
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: categoryColor }}
            >
              {category.replace('-', ' ')}
            </span>
          </div>
          <span className="text-[10px] text-gray-500">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>

        {/* Title - FULL, NEVER TRUNCATED */}
        <h3 className="text-[13px] leading-[1.5] font-medium text-white mb-3">
          {event.title}
        </h3>

        {/* Source & Location */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          {source && (
            <span className="truncate max-w-[120px]">{source}</span>
          )}
          {(country || location) && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
              <span>{country || location}</span>
            </>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[10px] text-gray-600">Click for details</span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLinkIcon size={10} />
              Source
            </a>
          )}
        </div>
      </div>
    </article>
  )
})

export default memo(ClusterCarousel)
