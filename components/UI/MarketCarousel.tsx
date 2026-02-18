/**
 * Market Carousel Component
 * 
 * Swipeable carousel for browsing multiple market indices.
 * Features smooth slide animations, touch gestures, and keyboard navigation.
 */

'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Sparkline, TrendIndicator } from './MicroCharts'
import { ChevronLeft, ChevronRight } from './Icons'

export interface MarketIndex {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
  history: number[]
}

interface MarketCarouselProps {
  markets: MarketIndex[]
  onMarketChange?: (market: MarketIndex) => void
}

function MarketCarousel({ markets, onMarketChange }: MarketCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % markets.length)
  }, [markets.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + markets.length) % markets.length)
  }, [markets.length])

  // Keyboard navigation - only when carousel is focused (not global)
  const handleCarouselKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goToPrevious()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goToNext()
    }
  }, [goToPrevious, goToNext])

  // Notify parent of market change
  useEffect(() => {
    if (markets[currentIndex] && onMarketChange) {
      onMarketChange(markets[currentIndex])
    }
  }, [currentIndex, markets, onMarketChange])

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].pageX - (carouselRef.current?.offsetLeft || 0))
    setScrollLeft(carouselRef.current?.scrollLeft || 0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.touches[0].pageX - (carouselRef.current?.offsetLeft || 0)
    const walk = (x - startX) * 2
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = scrollLeft - walk
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    if (!carouselRef.current) return
    
    const cardWidth = carouselRef.current.offsetWidth
    const scrollPosition = carouselRef.current.scrollLeft
    const newIndex = Math.round(scrollPosition / cardWidth)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < markets.length) {
      setCurrentIndex(newIndex)
      carouselRef.current.scrollTo({
        left: newIndex * cardWidth,
        behavior: 'smooth',
      })
    } else {
      // Snap back to current index
      carouselRef.current.scrollTo({
        left: currentIndex * cardWidth,
        behavior: 'smooth',
      })
    }
  }

  // Mouse drag handlers (for desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (carouselRef.current?.offsetLeft || 0))
    setScrollLeft(carouselRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return
    e.preventDefault()
    const x = e.pageX - (carouselRef.current.offsetLeft || 0)
    const walk = (x - startX) * 2
    carouselRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    handleTouchEnd()
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      if (carouselRef.current) {
        carouselRef.current.scrollTo({
          left: currentIndex * (carouselRef.current.offsetWidth),
          behavior: 'smooth',
        })
      }
    }
  }

  if (markets.length === 0) return null

  const currentMarket = markets[currentIndex]

  return (
    <div className="relative">
      {/* Navigation arrows */}
      {markets.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
            aria-label="Previous market"
          >
            <ChevronLeft size={14} color="rgba(255,255,255,0.8)" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
            aria-label="Next market"
          >
            <ChevronRight size={14} color="rgba(255,255,255,0.8)" />
          </button>
        </>
      )}

      {/* Market cards carousel */}
      <div
        ref={carouselRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide focus:outline-none"
        tabIndex={0}
        onKeyDown={handleCarouselKeyDown}
        role="region"
        aria-label="Market indices carousel"
        style={{
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          transform: 'translateZ(0)',
          willChange: 'transform, scroll-position',
          WebkitOverflowScrolling: 'touch',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {markets.map((market, index) => (
          <MarketCard
            key={market.symbol}
            market={market}
            isActive={index === currentIndex}
            style={{
              minWidth: '280px',
              scrollSnapAlign: 'start',
            }}
          />
        ))}
      </div>

      {/* Indicator dots */}
      {markets.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {markets.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                carouselRef.current?.scrollTo({
                  left: index * (carouselRef.current.offsetWidth),
                  behavior: 'smooth',
                })
              }}
              className="rounded-full transition-all"
              style={{
                width: index === currentIndex ? '8px' : '6px',
                height: '6px',
                background: index === currentIndex 
                  ? 'rgba(99, 102, 241, 0.8)' 
                  : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
              }}
              aria-label={`Go to ${markets[index].name}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MarketCardProps {
  market: MarketIndex
  isActive: boolean
  style?: React.CSSProperties
}

const MarketCard = memo(function MarketCard({ market, isActive, style }: MarketCardProps) {
  const isPositive = market.change >= 0

  return (
    <div
      className="shrink-0 p-4 rounded-lg transition-all"
      style={{
        ...style,
        background: isActive 
          ? 'rgba(99, 102, 241, 0.08)' 
          : 'rgba(255,255,255,0.02)',
        border: isActive
          ? '1px solid rgba(99, 102, 241, 0.2)'
          : '1px solid rgba(255,255,255,0.05)',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
        opacity: isActive ? 1 : 0.7,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {market.name}
          </div>
          <div className="text-lg font-bold text-white">{market.symbol}</div>
        </div>
        <TrendIndicator trend={isPositive ? 'up' : 'down'} size={16} />
      </div>

      {/* Value */}
      <div className="mb-3">
        <div className="text-2xl font-semibold text-white mb-1">
          {market.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: isPositive ? '#10b981' : '#ef4444' }}
          >
            {isPositive ? '+' : ''}{market.change.toFixed(2)}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: isPositive ? '#10b981' : '#ef4444' }}
          >
            ({isPositive ? '+' : ''}{market.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-3">
        <Sparkline
          data={market.history}
          width={240}
          height={32}
          color={isPositive ? '#10b981' : '#ef4444'}
          showFill={true}
        />
      </div>
    </div>
  )
})

export default memo(MarketCarousel)
