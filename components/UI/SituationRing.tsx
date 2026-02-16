/**
 * SituationRing - Rotating Category Ring around Orbital Command
 *
 * Categories orbit the command hub as a slow-rotating ring.
 * Each category is a sleek segment with clean label and subtle iconography.
 *
 * FIXED: Counter-rotation now uses JS-driven transform instead of
 * CSS custom properties (which can't be animated via @keyframes).
 */

'use client'

import { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react'
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
} from './Icons'

interface CategorySegment {
  id: string
  label: string
  shortLabel: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  color: string
  count: number
}

interface SituationRingProps {
  categoryCounts: Record<string, number>
  size?: number
  onCategoryClick?: (categoryId: string) => void
  animated?: boolean
}

const CATEGORIES: Omit<CategorySegment, 'count'>[] = [
  { id: 'markets', label: 'Markets', shortLabel: 'MKT', icon: MarketIcon, color: '#D4A84B' },
  { id: 'economy', label: 'Economy', shortLabel: 'ECO', icon: EconomyIcon, color: '#10b981' },
  { id: 'politics', label: 'Politics', shortLabel: 'POL', icon: PoliticsIcon, color: '#4F7CAC' },
  { id: 'security', label: 'Security', shortLabel: 'SEC', icon: SecurityIcon, color: '#C75146' },
  { id: 'technology', label: 'Technology', shortLabel: 'TEC', icon: TechIcon, color: '#7BA4DB' },
  { id: 'energy', label: 'Energy', shortLabel: 'NRG', icon: EnergyIcon, color: '#D97B4A' },
  { id: 'climate', label: 'Climate', shortLabel: 'CLM', icon: ClimateIcon, color: '#5B9A8B' },
  { id: 'diplomacy', label: 'Diplomacy', shortLabel: 'DIP', icon: DiplomacyIcon, color: '#6366f1' },
]

// Rotation speed: 0.5 deg/sec
const ROTATION_SPEED = 0.5

function SituationRing({
  categoryCounts,
  size = 280,
  onCategoryClick,
  animated = true,
}: SituationRingProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  // JS-driven rotation for proper counter-rotation of labels
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const rotationRef = useRef(0)
  const rafRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef(0)

  const segments = useMemo(() => {
    return CATEGORIES.map(cat => ({
      ...cat,
      count: categoryCounts[cat.id] || 0,
    }))
  }, [categoryCounts])

  const segmentPositions = useMemo(() => {
    const radius = size * 0.42
    const totalSegments = segments.length

    return segments.map((segment, i) => {
      const angle = (i * 360 / totalSegments) - 90
      const radian = angle * (Math.PI / 180)
      const x = Math.cos(radian) * radius
      const y = Math.sin(radian) * radius

      return { ...segment, x, y, angle }
    })
  }, [segments, size])

  // JS animation loop for ring rotation + label counter-rotation
  useEffect(() => {
    const shouldAnimate = animated && !isPaused

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      if (shouldAnimate) {
        rotationRef.current = (rotationRef.current + ROTATION_SPEED * delta) % 360
      }

      // Apply ring rotation
      if (ringRef.current) {
        ringRef.current.style.transform = `rotate(${rotationRef.current}deg)`
      }

      // Counter-rotate labels to keep them upright
      labelRefs.current.forEach((el) => {
        if (el) {
          el.style.transform = `rotate(${-rotationRef.current}deg)`
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = 0
    }
  }, [animated, isPaused])

  const handleMouseEnter = useCallback((id: string) => {
    setHoveredCategory(id)
    setIsPaused(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredCategory(null)
    setIsPaused(false)
  }, [])

  const handleClick = useCallback((id: string) => {
    onCategoryClick?.(id)
  }, [onCategoryClick])

  const setLabelRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      labelRefs.current.set(id, el)
    } else {
      labelRefs.current.delete(id)
    }
  }, [])

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Rotating container - driven by JS */}
      <div
        ref={ringRef}
        className="absolute inset-0"
        style={{ transformOrigin: 'center center' }}
      >
        {/* Ring track */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(99, 102, 241, 0.08)" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(99, 102, 241, 0.05)" strokeWidth="0.2" />
        </svg>

        {/* Category segments */}
        {segmentPositions.map((segment) => {
          const Icon = segment.icon
          const isHovered = hoveredCategory === segment.id
          const hasEvents = segment.count > 0

          return (
            <div
              key={segment.id}
              className={`absolute cursor-pointer transition-all duration-200 ${
                isHovered ? 'scale-110 z-10' : 'scale-100'
              }`}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${segment.x}px), calc(-50% + ${segment.y}px))`,
              }}
              onMouseEnter={() => handleMouseEnter(segment.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(segment.id)}
            >
              {/* Segment node - counter-rotated via JS ref */}
              <div
                ref={(el) => setLabelRef(segment.id, el)}
                className="relative flex flex-col items-center"
              >
                {/* Icon container */}
                <div
                  className="flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    width: isHovered ? 36 : 28,
                    height: isHovered ? 36 : 28,
                    background: isHovered
                      ? `${segment.color}20`
                      : 'rgba(15, 23, 42, 0.9)',
                    border: `1px solid ${isHovered ? segment.color : 'rgba(99, 102, 241, 0.2)'}`,
                    boxShadow: isHovered
                      ? `0 0 12px ${segment.color}30`
                      : '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <Icon
                    size={isHovered ? 16 : 12}
                    color={isHovered ? segment.color : 'rgba(255,255,255,0.5)'}
                  />
                </div>

                {/* Label */}
                <div
                  className={`mt-1 text-center transition-all duration-200 ${
                    isHovered ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div
                    className="text-[8px] font-semibold tracking-wider uppercase whitespace-nowrap"
                    style={{ color: isHovered ? segment.color : 'rgba(255,255,255,0.5)' }}
                  >
                    {segment.shortLabel}
                  </div>

                  {hasEvents && (
                    <div
                      className="text-[7px] font-medium tabular-nums"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {segment.count}
                    </div>
                  )}
                </div>

                {/* Tooltip on hover */}
                {isHovered && (
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded whitespace-nowrap pointer-events-none"
                    style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: `1px solid ${segment.color}40`,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div
                      className="text-[10px] font-medium"
                      style={{ color: segment.color }}
                    >
                      {segment.label}
                    </div>
                    <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {segment.count} {segment.count === 1 ? 'signal' : 'signals'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(SituationRing)
