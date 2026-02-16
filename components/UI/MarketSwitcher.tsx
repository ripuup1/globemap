/**
 * Market Switcher Component
 * 
 * Hybrid UI: Horizontal carousel + dropdown for quick market access
 * Smooth transitions between markets
 */

'use client'

import { useState, useRef, useEffect, memo } from 'react'
import MarketCarousel, { MarketIndex } from './MarketCarousel'
import { ChevronDown } from './Icons'

interface MarketSwitcherProps {
  markets: MarketIndex[]
  onMarketChange?: (market: MarketIndex) => void
}

function MarketSwitcher({ markets, onMarketChange }: MarketSwitcherProps) {
  const [selectedMarket, setSelectedMarket] = useState<MarketIndex>(markets[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])
  
  const handleMarketSelect = (market: MarketIndex) => {
    setSelectedMarket(market)
    setIsDropdownOpen(false)
    onMarketChange?.(market)
  }
  
  const handleCarouselChange = (market: MarketIndex) => {
    setSelectedMarket(market)
    onMarketChange?.(market)
  }
  
  if (markets.length === 0) return null
  
  return (
    <div className="w-full">
      {/* Dropdown Selector (Quick Access) */}
      <div className="relative mb-3" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full px-3 py-2 rounded-lg flex items-center justify-between transition-all hover:bg-white/5"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{selectedMarket.symbol}</span>
            <span className="text-xs text-gray-400">{selectedMarket.name}</span>
          </div>
          <div
            style={{
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <ChevronDown 
              size={14} 
              color="rgba(255,255,255,0.6)"
            />
          </div>
        </button>
        
        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(12px)',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {markets.map((market) => (
              <button
                key={market.symbol}
                onClick={() => handleMarketSelect(market)}
                className="w-full px-3 py-2.5 text-left flex items-center justify-between transition-all hover:bg-white/5"
                style={{
                  background: market.symbol === selectedMarket.symbol 
                    ? 'rgba(99, 102, 241, 0.15)' 
                    : 'transparent',
                }}
              >
                <div>
                  <div className="text-sm font-medium text-white">{market.symbol}</div>
                  <div className="text-xs text-gray-400">{market.name}</div>
                </div>
                {market.symbol === selectedMarket.symbol && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Carousel (Swipeable) */}
      <MarketCarousel 
        markets={markets}
        onMarketChange={handleCarouselChange}
      />
    </div>
  )
}

export default memo(MarketSwitcher)
