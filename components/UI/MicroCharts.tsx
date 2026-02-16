/**
 * MicroCharts - Lightweight inline SVG charts
 * 
 * Charts appear ONLY when they add signal, not decoration.
 * Design: Professional, minimal, institutional-grade.
 * 
 * Components:
 * - Sparkline: 24hr trend line
 * - DeltaBar: Green/red change indicator
 * - SeverityBar: Horizontal stacked bar
 * - HeatIndicator: Regional activity gradient
 */

'use client'

import { memo, useMemo } from 'react'

// ============================================================================
// SPARKLINE - 24hr trend visualization
// ============================================================================

interface SparklineProps {
  /** Data points (normalized 0-100 or will be auto-normalized) */
  data: number[]
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Line color */
  color?: string
  /** Show fill gradient */
  showFill?: boolean
}

export const Sparkline = memo(function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#6366f1',
  showFill = true,
}: SparklineProps) {
  const pathData = useMemo(() => {
    if (data.length < 2) return ''
    
    // Normalize data
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const normalized = data.map(v => ((v - min) / range) * (height - 4) + 2)
    
    // Build path
    const stepX = width / (data.length - 1)
    const points = normalized.map((y, i) => `${i * stepX},${height - y}`)
    
    return `M${points.join(' L')}`
  }, [data, width, height])
  
  const fillPath = useMemo(() => {
    if (!showFill || data.length < 2) return ''
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const normalized = data.map(v => ((v - min) / range) * (height - 4) + 2)
    
    const stepX = width / (data.length - 1)
    const points = normalized.map((y, i) => `${i * stepX},${height - y}`)
    
    return `M0,${height} L${points.join(' L')} L${width},${height} Z`
  }, [data, width, height, showFill])
  
  if (data.length < 2) return null

  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2)}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      {showFill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
})

// ============================================================================
// DELTA BAR - Change indicator (green/red)
// ============================================================================

interface DeltaBarProps {
  /** Change value (positive or negative) */
  value: number
  /** Maximum expected change (for scaling) */
  maxValue?: number
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Show numeric label */
  showLabel?: boolean
  /** Format as percentage */
  isPercent?: boolean
}

export const DeltaBar = memo(function DeltaBar({
  value,
  maxValue = 10,
  width = 60,
  height = 16,
  showLabel = true,
  isPercent = false,
}: DeltaBarProps) {
  const isPositive = value >= 0
  const color = isPositive ? '#10b981' : '#ef4444'
  const absValue = Math.abs(value)
  const normalizedWidth = Math.min(absValue / maxValue, 1) * (width / 2 - 4)
  
  const label = isPercent 
    ? `${isPositive ? '+' : ''}${value.toFixed(2)}%`
    : `${isPositive ? '+' : ''}${value.toFixed(1)}`

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height}>
        {/* Center line */}
        <line
          x1={width / 2}
          y1={2}
          x2={width / 2}
          y2={height - 2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        
        {/* Delta bar */}
        <rect
          x={isPositive ? width / 2 : width / 2 - normalizedWidth}
          y={4}
          width={normalizedWidth}
          height={height - 8}
          fill={color}
          rx={2}
        />
      </svg>
      
      {showLabel && (
        <span 
          className="text-[10px] font-medium tabular-nums"
          style={{ color, minWidth: '40px' }}
        >
          {label}
        </span>
      )}
    </div>
  )
})

// ============================================================================
// SEVERITY BAR - Horizontal stacked distribution
// ============================================================================

interface SeveritySegment {
  value: number
  color: string
  label?: string
}

interface SeverityBarProps {
  segments: SeveritySegment[]
  width?: number
  height?: number
  showLabels?: boolean
}

export const SeverityBar = memo(function SeverityBar({
  segments,
  width = 100,
  height = 8,
  showLabels = false,
}: SeverityBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) return null
  
  let currentX = 0
  
  return (
    <div className="flex flex-col gap-1">
      <svg width={width} height={height}>
        {segments.map((segment, i) => {
          const segmentWidth = (segment.value / total) * width
          const x = currentX
          currentX += segmentWidth
          
          return (
            <rect
              key={i}
              x={x}
              y={0}
              width={Math.max(segmentWidth - 1, 0)}
              height={height}
              fill={segment.color}
              rx={i === 0 ? 2 : 0}
              style={{ 
                borderTopRightRadius: i === segments.length - 1 ? 2 : 0,
                borderBottomRightRadius: i === segments.length - 1 ? 2 : 0,
              }}
            />
          )
        })}
      </svg>
      
      {showLabels && (
        <div className="flex gap-2 text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {segments.map((segment, i) => (
            <div key={i} className="flex items-center gap-1">
              <div 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ background: segment.color }} 
              />
              <span>{segment.label || segment.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// ============================================================================
// HEAT INDICATOR - Regional activity gradient
// ============================================================================

interface HeatIndicatorProps {
  /** Activity level 0-100 */
  level: number
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Show numeric label */
  showLabel?: boolean
}

export const HeatIndicator = memo(function HeatIndicator({
  level,
  width = 40,
  height = 12,
  showLabel = true,
}: HeatIndicatorProps) {
  // Color interpolation: green (low) -> yellow (medium) -> red (high)
  const getColor = (l: number): string => {
    if (l < 33) return '#10b981'  // Green
    if (l < 66) return '#f59e0b'  // Yellow/amber
    return '#ef4444'              // Red
  }
  
  const color = getColor(level)
  const fillWidth = (level / 100) * width

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height}>
        {/* Background */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="rgba(255,255,255,0.05)"
          rx={2}
        />
        
        {/* Fill */}
        <rect
          x={0}
          y={0}
          width={fillWidth}
          height={height}
          fill={color}
          rx={2}
          opacity={0.8}
        />
      </svg>
      
      {showLabel && (
        <span 
          className="text-[10px] font-medium"
          style={{ color }}
        >
          {level}%
        </span>
      )}
    </div>
  )
})

// ============================================================================
// MINI BAR CHART - Simple vertical bars
// ============================================================================

interface MiniBarChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  barGap?: number
}

export const MiniBarChart = memo(function MiniBarChart({
  data,
  width = 60,
  height = 20,
  color = '#6366f1',
  barGap = 2,
}: MiniBarChartProps) {
  if (data.length === 0) return null
  
  const max = Math.max(...data) || 1
  const barWidth = (width - (data.length - 1) * barGap) / data.length

  return (
    <svg width={width} height={height}>
      {data.map((value, i) => {
        const barHeight = (value / max) * (height - 2)
        return (
          <rect
            key={i}
            x={i * (barWidth + barGap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill={color}
            opacity={0.7 + (value / max) * 0.3}
            rx={1}
          />
        )
      })}
    </svg>
  )
})

// ============================================================================
// TREND INDICATOR - Simple up/down/neutral indicator
// ============================================================================

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'neutral'
  size?: number
}

export const TrendIndicator = memo(function TrendIndicator({
  trend,
  size = 12,
}: TrendIndicatorProps) {
  const color = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'
  
  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      {trend === 'up' && (
        <path d="M6 2L10 8H2L6 2Z" fill={color} />
      )}
      {trend === 'down' && (
        <path d="M6 10L2 4H10L6 10Z" fill={color} />
      )}
      {trend === 'neutral' && (
        <rect x="2" y="5" width="8" height="2" fill={color} rx="1" />
      )}
    </svg>
  )
})
