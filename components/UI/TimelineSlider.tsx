import { memo, useMemo, useCallback, useState } from 'react'
import { Event } from '@/types/event'
import { getThemeColors, ThemeMode } from '@/utils/themeColors'

interface TimelineSliderProps {
  events: Event[]
  timeRange: string
  onTimeRangeChange: (range: string) => void
  customRange: { start: number; end: number } | null
  onCustomRangeChange: (range: { start: number; end: number } | null) => void
  theme: ThemeMode
  isHidden?: boolean
}

const BUCKETS = 20
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
  isHidden = false,
}: TimelineSliderProps) {
  const colors = getThemeColors(theme)
  const [isCollapsed, setIsCollapsed] = useState(false)

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
    return { minTime: min, maxTime: max, histogram: buckets, maxCount: Math.max(...buckets, 1) }
  }, [events])

  const sliderValue = useMemo(() => {
    if (!customRange || maxTime === minTime) return 100
    return Math.round(((customRange.start - minTime) / (maxTime - minTime)) * 100)
  }, [customRange, minTime, maxTime])

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    if (val >= 100) {
      onCustomRangeChange(null)
      onTimeRangeChange('all')
      return
    }
    const start = minTime + (val / 100) * (maxTime - minTime)
    onCustomRangeChange({ start, end: maxTime })
    onTimeRangeChange('custom')
  }, [minTime, maxTime, onCustomRangeChange, onTimeRangeChange])

  const handleQuickRange = useCallback((range: string) => {
    onCustomRangeChange(null)
    onTimeRangeChange(range)
  }, [onCustomRangeChange, onTimeRangeChange])

  const rangeLabel = useMemo(() => {
    if (timeRange === 'custom' && customRange) {
      return new Date(customRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return ''
  }, [timeRange, customRange])

  const activeLabel = QUICK_RANGES.find(r => r.value === timeRange)?.label || rangeLabel || 'All'
  const inactiveBar = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const inactiveTrack = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  if (events.length === 0 || maxTime === minTime) return null

  return (
    <>
      {/* ─── Desktop: Vertical right sidebar ─── */}
      <div
        className="fixed z-20 hidden sm:flex flex-col items-end transition-all duration-300"
        style={{
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: isHidden ? 0.2 : 1,
          pointerEvents: isHidden ? 'none' : 'auto',
          fontFamily: 'var(--font-exo2), system-ui, sans-serif',
        }}
      >
        {/* Toggle header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-[10px] font-medium uppercase tracking-wider transition-colors"
          style={{
            background: colors.barBg,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${colors.barBorder}`,
            borderBottom: 'none',
            color: colors.textSecondary,
          }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Timeline
          <svg
            className={`w-2.5 h-2.5 transition-transform duration-200 ${isCollapsed ? 'rotate-90' : '-rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Collapsible body */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: isCollapsed ? '0px' : '380px', opacity: isCollapsed ? 0 : 1 }}
        >
          <div
            className="flex flex-col rounded-b-lg rounded-tl-lg"
            style={{
              background: colors.barBg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${colors.barBorder}`,
              borderTop: 'none',
              width: '52px',
            }}
          >
            {/* Vertical histogram (bottom=oldest, top=newest) */}
            <div className="flex flex-col-reverse gap-px px-1.5 pt-2 pb-1">
              {histogram.map((count, i) => {
                const w = Math.max(6, (count / maxCount) * 100)
                const inRange = !customRange || (minTime + (i / BUCKETS) * (maxTime - minTime) >= customRange.start)
                return (
                  <div key={i} className="flex items-center h-[8px]">
                    <div
                      className="rounded-r-sm transition-all duration-150"
                      style={{
                        width: `${w}%`,
                        height: '5px',
                        backgroundColor: inRange ? '#6366f1' : inactiveBar,
                        opacity: inRange ? 0.85 : 0.3,
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Vertical range slider */}
            <div className="flex justify-center py-1.5 px-1">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={handleSliderChange}
                className="timeline-slider-v appearance-none cursor-pointer"
                style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '14px', height: '100px', background: 'transparent' }}
              />
            </div>

            {/* Stacked quick-range buttons */}
            <div className="flex flex-col gap-0.5 px-1 pb-2">
              {QUICK_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleQuickRange(r.value)}
                  className="py-1 rounded text-[9px] font-medium uppercase tracking-wider transition-all text-center"
                  style={{
                    background: timeRange === r.value ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: timeRange === r.value ? '#818cf8' : colors.textMuted,
                    border: timeRange === r.value ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {rangeLabel && (
              <div className="text-center pb-1.5 px-1">
                <span className="text-[8px] leading-none" style={{ color: '#818cf8' }}>{rangeLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile: collapsible pill (top-right, below logo row) ─── */}
      <div
        className="fixed z-20 sm:hidden transition-all duration-300"
        style={{
          top: '12px',
          right: '12px',
          opacity: isHidden ? 0 : 1,
          pointerEvents: isHidden ? 'none' : 'auto',
          fontFamily: 'var(--font-exo2), system-ui, sans-serif',
        }}
      >
        {isCollapsed ? (
          /* Collapsed pill */
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: colors.barBg, backdropFilter: 'blur(12px)', border: `1px solid ${colors.barBorder}` }}
          >
            <svg className="w-3.5 h-3.5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] font-medium" style={{ color: '#818cf8' }}>{activeLabel}</span>
          </button>
        ) : (
          /* Expanded card */
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: colors.barBg, backdropFilter: 'blur(12px)', border: `1px solid ${colors.barBorder}`, width: '180px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>Timeline</span>
              </div>
              <button onClick={() => setIsCollapsed(true)} className="p-1 rounded" style={{ color: colors.textMuted }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mini histogram */}
            <div className="flex items-end gap-px px-3 h-6">
              {histogram.map((count, i) => {
                const h = Math.max(2, (count / maxCount) * 100)
                const inRange = !customRange || (minTime + (i / BUCKETS) * (maxTime - minTime) >= customRange.start)
                return (
                  <div key={i} className="flex-1 rounded-t-sm transition-all duration-150"
                    style={{ height: `${h}%`, backgroundColor: inRange ? '#6366f1' : inactiveBar, opacity: inRange ? 0.8 : 0.3 }}
                  />
                )
              })}
            </div>

            {/* Horizontal slider */}
            <div className="px-3 py-2">
              <input
                type="range" min="0" max="100" value={sliderValue} onChange={handleSliderChange}
                className="w-full h-1 rounded-full appearance-none cursor-pointer timeline-slider"
                style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${sliderValue}%, ${inactiveTrack} ${sliderValue}%, ${inactiveTrack} 100%)` }}
              />
            </div>

            {/* Quick buttons */}
            <div className="flex gap-1 px-2 pb-2">
              {QUICK_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleQuickRange(r.value)}
                  className="flex-1 py-1.5 rounded text-[10px] font-medium uppercase tracking-wider transition-all active:scale-95"
                  style={{
                    background: timeRange === r.value ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: timeRange === r.value ? '#818cf8' : colors.textMuted,
                    border: timeRange === r.value ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {rangeLabel && (
              <div className="text-center pb-2">
                <span className="text-[10px]" style={{ color: '#818cf8' }}>{rangeLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .timeline-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: #6366f1; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;
        }
        .timeline-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: #6366f1; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;
        }
        .timeline-slider-v::-webkit-slider-runnable-track {
          width: 4px; border-radius: 2px;
          background: linear-gradient(to bottom, #6366f1 0%, ${inactiveTrack} 100%);
        }
        .timeline-slider-v::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
          background: #6366f1; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer; margin-left: -5px;
        }
        .timeline-slider-v::-moz-range-track {
          width: 4px; border-radius: 2px;
          background: linear-gradient(to bottom, #6366f1 0%, ${inactiveTrack} 100%);
        }
        .timeline-slider-v::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #6366f1; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;
        }
      `}</style>
    </>
  )
}

export default memo(TimelineSlider)
