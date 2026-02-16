/**
 * Situation Room - Topic-Based Intelligence Hub
 * 
 * Bloomberg Terminal-style interface with:
 * - Dynamic topic tabs (fixed geopolitical + trending)
 * - Digest format: key points, timeline, stats
 * - Horizontal swipeable timelines
 * - Single consolidated markets tab
 * - Session-cached data
 * 
 * Design: Professional, dense, institutional-grade
 */

'use client'

import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import { Event } from '@/types/event'
import { SignalIcon, CloseIcon, LiveIndicator } from './Icons'
import { useTopics } from '@/hooks/useTopics'
import TopicDigest from './TopicDigest'
import MarketSwitcher from './MarketSwitcher'
import { DetectedTopic } from '@/utils/topicDetector'
import { ArticleSummary } from '@/utils/topicAggregator'

interface ClusterContext {
  regionName: string
  eventIds: string[]
  initialCategory?: string
}

interface SituationRoomProps {
  events: Event[]
  isOpen: boolean
  onClose: () => void
  onEventClick?: (event: Event) => void
  selectedCountry?: string | null
  clusterContext?: ClusterContext | null
}

// Default market indices
const DEFAULT_MARKET_INDICES = [
  { symbol: 'SPX', name: 'S&P 500', value: 5892.58, change: +42.15, changePercent: 0.72, history: [5840, 5855, 5870, 5860, 5875, 5890, 5892] },
  { symbol: 'NASDAQ', name: 'NASDAQ', value: 21453.12, change: +124.56, changePercent: 0.58, history: [21200, 21280, 21350, 21320, 21400, 21430, 21453] },
  { symbol: 'DJI', name: 'Dow Jones', value: 43876.34, change: -42.18, changePercent: -0.10, history: [43920, 43900, 43880, 43890, 43870, 43860, 43876] },
  { symbol: 'VIX', name: 'VIX', value: 14.23, change: -0.87, changePercent: -5.76, history: [15.1, 14.9, 14.7, 14.5, 14.4, 14.3, 14.23] },
]

interface MarketIndex {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
  history: number[]
}

// Topic category colors
const CATEGORY_COLORS: Record<string, string> = {
  geopolitical: '#4F7CAC',
  crisis: '#C75146',
  trending: '#D4A84B',
  markets: '#10b981',
}

function SituationRoom({
  events,
  isOpen,
  onClose,
  onEventClick,
  selectedCountry,
  clusterContext,
}: SituationRoomProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Swipe-to-close: swipe down on mobile, swipe left on desktop
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    // Mobile: swipe down to close (full-screen overlay)
    if (dy > 80 && Math.abs(dx) < 60 && window.innerWidth < 768) {
      onClose()
      return
    }
    // Desktop: swipe left to close (left sidebar)
    if (dx < -80 && Math.abs(dy) < 60 && window.innerWidth >= 768) {
      onClose()
    }
  }, [onClose])
  
  // Topic management with session caching
  const { 
    topics, 
    digests, 
    getDigest, 
    activeTopic, 
    setActiveTopic, 
    isLoading,
    refresh,
    lastRefresh,
  } = useTopics(events)
  
  // Markets state
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>(DEFAULT_MARKET_INDICES)
  const [marketSource, setMarketSource] = useState<string>('default')
  
  // Fetch market data - live updates when Economy tab is active
  useEffect(() => {
    if (!isOpen) return
    
    let isMounted = true
    
    async function fetchMarketData() {
      try {
        const response = await fetch('/api/markets')
        if (!response.ok) throw new Error('Markets API error')
        const data = await response.json()
        if (isMounted && data.data) {
          setMarketIndices(data.data)
          setMarketSource(data.source || 'unknown')
        }
      } catch (err) {
        void err
      }
    }
    
    // Initial fetch
    fetchMarketData()
    
    // Live updates every 60 seconds when Economy tab is active
    const interval = setInterval(() => {
      if (activeTopic === 'economy-finance') {
        fetchMarketData()
      }
    }, 60000)
    
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isOpen, activeTopic])
  
  // Get active digest
  const activeDigest = useMemo(() => {
    if (!activeTopic) return null
    return getDigest(activeTopic)
  }, [activeTopic, getDigest])
  
  // Handle article click
  const handleArticleClick = useCallback((article: ArticleSummary) => {
    if (article.url) {
      window.open(article.url, '_blank', 'noopener,noreferrer')
    }
  }, [])
  
  // Get topic color (module-level pure function)
  const getTopicColor = (topic: DetectedTopic): string => {
    return CATEGORY_COLORS[topic.category] || '#6366f1'
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        style={{ backdropFilter: isOpen ? 'blur(4px)' : 'none' }}
      />
      
      {/* Main panel - CSS responsive */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Situation Room"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed z-50 flex flex-col bg-[#0a0e14]
          transition-transform duration-300 ease-out
          inset-0 w-full h-full
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          shadow-[0_-8px_40px_rgba(0,0,0,0.6)]
          md:inset-auto md:left-0 md:top-0 md:h-full md:w-[460px] md:max-w-[100vw]
          md:border-r md:border-white/[0.06]
          md:shadow-[8px_0_40px_rgba(0,0,0,0.6)]
          ${isOpen ? 'md:translate-x-0 md:translate-y-0' : 'md:-translate-x-full md:translate-y-0'}
        `}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-2 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {/* Header - respects safe area for iOS notch/dynamic island */}
        <header
          className="shrink-0 px-4 py-3"
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SignalIcon size={16} color="rgba(255,255,255,0.6)" />
              <h1 
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2em' }}
              >
                Situation Room
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                className="text-[10px] text-gray-400 hover:text-white transition-colors"
              >
                Refresh
              </button>
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <LiveIndicator />
                <span>LIVE</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                aria-label="Close panel"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Topic Tabs - Scrollable */}
        <div 
          ref={tabsRef}
          className="shrink-0 overflow-x-auto scrollbar-hide"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-1 p-2 min-w-max" role="tablist" aria-label="Topics">
            {topics.map((topic) => {
              const isActive = activeTopic === topic.id
              const color = getTopicColor(topic)
              const isEconomy = topic.id === 'economy-finance'

              return (
                <button
                  key={topic.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTopic(topic.id)}
                  className={`
                    px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap
                    transition-all duration-200
                    ${isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-white/[0.03]'
                    }
                    ${isEconomy ? 'ring-1 ring-green-500/30' : ''}
                  `}
                  style={{
                    background: isActive ? `${color}20` : 'transparent',
                    border: isActive ? `1px solid ${color}40` : '1px solid transparent',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {topic.name}
                    {isEconomy && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                    {topic.eventCount > 0 && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] tabular-nums"
                        style={{ 
                          background: isActive ? `${color}30` : 'rgba(255,255,255,0.1)',
                          color: isActive ? color : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {topic.eventCount}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden" role="tabpanel">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Processing topics...</p>
              </div>
            </div>
          ) : activeDigest ? (
            <>
              {/* Markets Ticker - Only show for Economy & Finance tab */}
              {activeTopic === 'economy-finance' && (
                <div 
                  className="shrink-0 px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {marketSource === 'yahoo_finance' || marketSource === 'cache' ? 'Live Markets' : 'Markets'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[9px]" style={{
                      color: marketSource.includes('simulated') || marketSource === 'default'
                        ? 'rgba(234, 179, 8, 0.6)'
                        : 'rgba(107, 114, 128, 1)',
                    }}>
                      {marketSource.includes('simulated') || marketSource === 'default' ? (
                        <span>SIMULATED</span>
                      ) : (
                        <>
                          <LiveIndicator />
                          <span>LIVE</span>
                        </>
                      )}
                    </div>
                  </div>
                  <MarketSwitcher
                  markets={marketIndices}
                />
                </div>
              )}
              <TopicDigest 
                digest={activeDigest}
                onArticleClick={handleArticleClick}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <SignalIcon size={32} color="rgba(255,255,255,0.2)" />
                <p className="text-sm text-gray-400 mt-4">Select a topic to view intelligence</p>
                <p className="text-xs text-gray-600 mt-1">{topics.length} topics available</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - respects safe area for iOS home indicator */}
        <footer
          className="shrink-0 px-4 py-2 flex items-center justify-between"
          style={{
            paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <span className="text-[9px] text-gray-600">
            {topics.length} topics • {events.length} events
          </span>
          <span className="text-[9px] text-gray-600 tabular-nums">
            {lastRefresh > 0 ? `Last updated: ${new Date(lastRefresh).toLocaleTimeString()}` : 'Loading...'}
          </span>
        </footer>
      </div>
    </>
  )
}

export default memo(SituationRoom)
