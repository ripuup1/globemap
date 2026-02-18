import { memo, useMemo, useCallback } from 'react'
import { Event } from '@/types/event'
import { getThemeColors, ThemeMode } from '@/utils/themeColors'

interface TimelineSliderProps {
  events: Event[]
  timeRange: string
  onTimeRangeChange: (range: string) => void
  customRange: { start: number; end: number } | null
  onCustomRangeChange: (range: { start: number; end: number } | null) => void
  theme: ThemeMode
}

const BUCKETS = 30
const QUICK_RANGES = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: 'All', value: 'all' },
]

function TimelineSlider({
  events,
  timeRange,
  onTimeRangeChange,
  customRange,
  onCustomRangeChange,
  theme,
}: TimelineSliderProps) {
  const colors = getThemeColors(theme)

  // Compute time boundaries and histogram
  const { minTime, maxTime, histogram, maxCount } = useMemo(() => {
    if (events.length === 0) return { minTime: 0, maxTime: 0, histogram: [], maxCount: 0 }

    const timestamps = events.map(e => e.timestamp).sort((a, b) => a - b)
    const min = timestamps[0]
    const max = timestamps[timestamps.length - 1]
    const range = max - min || 1

    const buckets = new Array(BUCKETS).fill(0)
    for (const ts of timestamps) {
      const idx = Math.min(Math.floor(((ts - min) / range) * BUCKETS), BUCKETS - 1)
      buckets[idx]++
    }
    const mc = Math.max(...buckets, 1)

    return { minTime: min, maxTime: max, histogram: buckets, maxCount: mc }
  }, [events])

  // Current slider position (0-100)
  const sliderValue = useMemo(() => {
    if (!customRange || maxTime === minTime) return 100
    const range = maxTime - minTime
    return Math.round(((customRange.start - minTime) / range) * 100)
  }, [customRange, minTime, maxTime])

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    if (val >= 100) {
      onCustomRangeChange(null)
      onTimeRangeChange('all')
      return
    }
    const range = maxTime - minTime
    const start = minTime + (val / 100) * range
    onCustomRangeChange({ start, end: maxTime })
    onTimeRangeChange('custom')
  }, [minTime, maxTime, onCustomRangeChange, onTimeRangeChange])

  const handleQuickRange = useCallback((range: string) => {
    onCustomRangeChange(null)
    onTimeRangeChange(range)
  }, [onCustomRangeChange, onTimeRangeChange])

  // Format range label
  const rangeLabel = useMemo(() => {
    if (timeRange === 'all' || !customRange) return ''
    if (timeRange !== 'custom') return ''
    const start = new Date(customRange.start)
    return `From ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }, [timeRange, customRange])

  if (events.length === 0 || maxTime === minTime) return null

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-25 w-full max-w-lg px-4 transition-all duration-300"
      style={{
        bottom: 'calc(max(16px, env(safe-area-inset-bottom, 16px)) + 100px)',
        fontFamily: 'var(--font-exo2), system-ui, sans-serif',
      }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: colors.barBg,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${colors.barBorder}`,
        }}
      >
        {/* Mini histogram */}
        <div className="flex items-end gap-px px-3 pt-2 h-8">
          {histogram.map((count, i) => {
            const height = Math.max(2, (count / maxCount) * 100)
            const isInRange = !customRange || (
              minTime + (i / BUCKETS) * (maxTime - minTime) >= customRange.start
            )
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all duration-150"
                style={{
                  height: `${height}%`,
                  backgroundColor: isInRange
                    ? '#6366f1'
                    : theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  opacity: isInRange ? 0.8 : 0.3,
                }}
              />
            )
          })}
        </div>

        {/* Slider */}
        <div className="px-3 py-1.5">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            className="w-full h-1 rounded-full appearance-none cursor-pointer timeline-slider"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${sliderValue}%, ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} ${sliderValue}%, ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 100%)`,
            }}
          />
        </div>

        {/* Quick buttons + range label */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex gap-1">
            {QUICK_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => handleQuickRange(r.value)}
                className="px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-all"
                style={{
                  background: timeRange === r.value
                    ? 'rgba(99, 102, 241, 0.2)'
                    : 'transparent',
                  color: timeRange === r.value
                    ? '#818cf8'
                    : colors.textMuted,
                  border: timeRange === r.value
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid transparent',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          {rangeLabel && (
            <span className="text-[10px]" style={{ color: colors.textMuted }}>{rangeLabel}</span>
          )}
        </div>
      </div>

      <style>{`
        .timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        .timeline-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        @media (max-width: 640px) {
          .timeline-slider::-webkit-slider-thumb {
            width: 22px;
            height: 22px;
          }
          .timeline-slider::-moz-range-thumb {
            width: 22px;
            height: 22px;
          }
        }
      `}</style>
    </div>
  )
}

export default memo(TimelineSlider)
