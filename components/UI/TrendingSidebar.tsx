import { memo, useState } from 'react'
import { DetectedTopic } from '@/utils/topicDetector'
import { themeColors } from '@/utils/themeColors'

interface TrendingSidebarProps {
  topics: DetectedTopic[]
  onTopicClick: (topic: DetectedTopic) => void
  isHidden?: boolean // Hide when panels are open
}

const CATEGORY_COLORS: Record<string, string> = {
  geopolitical: '#6366f1',
  crisis: '#ef4444',
  trending: '#f59e0b',
  markets: '#10b981',
}

function TrendingSidebar({ topics, onTopicClick, isHidden = false }: TrendingSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const colors = themeColors

  // Show top 8 topics sorted by priority
  const displayTopics = topics
    .filter(t => t.eventCount > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8)

  if (displayTopics.length === 0) return null

  const trendArrow = (dir?: 'up' | 'down' | 'stable') => {
    if (dir === 'up') return '\u2191'
    if (dir === 'down') return '\u2193'
    return ''
  }

  return (
    <>
      {/* Desktop: Vertical sidebar */}
      <div
        className="fixed z-20 hidden sm:block transition-all duration-300"
        style={{
          top: '80px',
          left: '16px',
          opacity: isHidden ? 0.3 : 1,
          pointerEvents: isHidden ? 'none' : 'auto',
          fontFamily: 'var(--font-exo2), system-ui, sans-serif',
        }}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-medium uppercase tracking-wider transition-colors w-full"
          style={{
            background: colors.barBg,
            backdropFilter: 'blur(12px)',
            border: `1px solid ${colors.barBorder}`,
            borderBottom: 'none',
            color: colors.textSecondary,
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Trending
          <svg
            className={`w-3 h-3 ml-auto transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: isCollapsed ? '0px' : '400px',
            opacity: isCollapsed ? 0 : 1,
          }}
        >
          <div
            className="flex flex-col gap-1 p-2 rounded-b-xl"
            style={{
              background: colors.barBg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${colors.barBorder}`,
              borderTop: 'none',
            }}
          >
            {displayTopics.map(topic => (
              <button
                key={topic.id}
                onClick={() => onTopicClick(topic)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all group"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = colors.cardHoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[topic.category] || '#6366f1' }}
                />
                <span
                  className="text-xs font-medium truncate flex-1"
                  style={{ color: colors.textPrimary, maxWidth: '120px' }}
                >
                  {topic.name}
                </span>
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: colors.textMuted }}>
                  {topic.eventCount}
                </span>
                {topic.trendDirection && topic.trendDirection !== 'stable' && (
                  <span
                    className="text-[10px] flex-shrink-0"
                    style={{ color: topic.trendDirection === 'up' ? '#22c55e' : '#ef4444' }}
                  >
                    {trendArrow(topic.trendDirection)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Horizontal scrollable pill row */}
      <div
        className="fixed z-20 sm:hidden transition-all duration-300"
        style={{
          top: '56px',
          left: 0,
          right: 0,
          opacity: isHidden ? 0 : 1,
          pointerEvents: isHidden ? 'none' : 'auto',
          fontFamily: 'var(--font-exo2), system-ui, sans-serif',
        }}
      >
        <div
          className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide"
          style={{
            background: `linear-gradient(180deg, ${colors.barBg} 0%, transparent 100%)`,
          }}
        >
          {displayTopics.map(topic => (
            <button
              key={topic.id}
              onClick={() => onTopicClick(topic)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.borderSubtle}`,
                color: colors.textPrimary,
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[topic.category] || '#6366f1' }}
              />
              {topic.name}
              <span style={{ color: colors.textMuted }}>{topic.eventCount}</span>
              {topic.trendDirection === 'up' && (
                <span style={{ color: '#22c55e' }}>{trendArrow('up')}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default memo(TrendingSidebar)
