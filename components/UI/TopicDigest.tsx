/**
 * Topic Digest Component
 * 
 * Bloomberg-style digest display with:
 * - Key points summary
 * - Statistics panel
 * - Article list
 * - Professional dense layout
 */

'use client'

import { memo, useState, useEffect } from 'react'
import { TopicDigest as TopicDigestType, ArticleSummary, formatTimeAgo, getSeverityInfo, TimelineEvent } from '@/utils/topicAggregator'
import { formatSearchVolume } from '@/utils/googleTrendsReal'
import TopicTimeline from './TopicTimeline'

interface TopicDigestProps {
  digest: TopicDigestType
  onArticleClick?: (article: ArticleSummary) => void
}

function TopicDigest({ digest, onArticleClick }: TopicDigestProps) {
  const avgSeverityInfo = getSeverityInfo(digest.stats.avgSeverity)
  const [timeline, setTimeline] = useState<TimelineEvent[]>(digest.timeline)
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false)
  const [articles, setArticles] = useState<ArticleSummary[]>(digest.articles)
  const [isLoadingArticles, setIsLoadingArticles] = useState(false)
  
  // Fetch extended timeline from API (origin to current, max 40 events, no duplicates)
  useEffect(() => {
    setIsLoadingTimeline(true)
    
    async function fetchTimeline() {
      try {
        const response = await fetch(`/api/topics/${digest.id}/timeline`)
        if (!response.ok) throw new Error('Timeline fetch failed')
        const data = await response.json()
        if (data.success && data.timeline) {
          setTimeline(data.timeline)
        }
      } catch (error) {
        void error
        // Fallback to digest timeline
        setTimeline(digest.timeline)
      } finally {
        setIsLoadingTimeline(false)
      }
    }
    
    fetchTimeline()
  }, [digest.id, digest.timeline])
  
  // Fetch intelligent sources from API (AI-powered: keyword + NewsAPI + Google Search)
  useEffect(() => {
    setIsLoadingArticles(true)
    
    async function fetchIntelligentSources() {
      try {
        const response = await fetch(`/api/sources/intelligent?topicId=${digest.id}`)
        if (!response.ok) throw new Error('Intelligent sources fetch failed')
        const data = await response.json()
        if (data.success && data.sources && data.sources.length > 0) {
          // Merge with existing articles, prioritizing intelligent sources
          const intelligentSources = data.sources as ArticleSummary[]
          const merged = [...intelligentSources, ...digest.articles]
          // Deduplicate by title and keep top 20 most relevant
          const { deduplicateByTitleSimilarity } = await import('@/utils/articleDeduplicator')
          const unique = deduplicateByTitleSimilarity(merged, 0.85).slice(0, 20)
          setArticles(unique)
        } else {
          // Fallback to digest articles
          setArticles(digest.articles)
        }
      } catch (error) {
        void error
        setArticles(digest.articles)
      } finally {
        setIsLoadingArticles(false)
      }
    }
    
    fetchIntelligentSources()
  }, [digest.id, digest.articles])
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with Key Points */}
      <div 
        className="px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Topic Title & Last Updated */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">{digest.name}</h2>
          <span className="text-[9px] text-gray-500 tabular-nums">
            Updated {formatTimeAgo(digest.lastUpdated)}
          </span>
        </div>
        
        {/* Summary Paragraph */}
        {digest.summary && (
          <div className="mb-4">
            <p 
              className="text-[12px] leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {digest.summary}
            </p>
          </div>
        )}
        
        {/* Key Points */}
        {digest.keyPoints.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Key Developments
            </h3>
            <ul className="space-y-1.5">
              {digest.keyPoints.map((point, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-2 text-[12px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  <span 
                    className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                    style={{ background: 'rgba(99, 102, 241, 0.6)' }}
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Stats Panel - Bloomberg Style */}
      <div 
        className="px-4 py-3 shrink-0"
        style={{ 
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="grid grid-cols-4 gap-3">
          {/* Events */}
          <div className="text-center">
            <div className="text-lg font-semibold text-white tabular-nums">
              {digest.stats.eventCount}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Events</div>
          </div>
          
          {/* Sources */}
          <div className="text-center">
            <div className="text-lg font-semibold text-white tabular-nums">
              {digest.stats.sourceCount}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Sources</div>
          </div>
          
          {/* Severity */}
          <div className="text-center">
            <div 
              className="text-lg font-semibold tabular-nums"
              style={{ color: avgSeverityInfo.color }}
            >
              {avgSeverityInfo.label}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Severity</div>
          </div>
          
          {/* Regions */}
          <div className="text-center">
            <div className="text-lg font-semibold text-white tabular-nums">
              {digest.stats.geographicSpread.length}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wide">Regions</div>
          </div>
        </div>
        
        {/* Google Search Volume & Pulse Indicator */}
        {(digest.searchVolume24h || digest.searchVolume7d) && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Pulse Indicator */}
                <div className="relative">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      digest.trendDirection === 'up' ? 'bg-green-500' :
                      digest.trendDirection === 'down' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}
                    style={{
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                  <style jsx>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 1; transform: scale(1); }
                      50% { opacity: 0.5; transform: scale(1.2); }
                    }
                  `}</style>
                </div>
                
                {/* Search Volume Text */}
                <div className="flex items-center gap-3 text-[10px]">
                  {digest.searchVolume24h && (
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {formatSearchVolume(digest.searchVolume24h)} searches (24h)
                    </span>
                  )}
                  {digest.searchVolume7d && (
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {formatSearchVolume(digest.searchVolume7d)} searches (7d)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Trend Direction Badge */}
              {digest.trendDirection && (
                <span 
                  className="px-2 py-0.5 rounded text-[8px] font-medium uppercase"
                  style={{
                    background: digest.trendDirection === 'up' ? 'rgba(34, 197, 94, 0.15)' :
                                digest.trendDirection === 'down' ? 'rgba(239, 68, 68, 0.15)' :
                                'rgba(234, 179, 8, 0.15)',
                    color: digest.trendDirection === 'up' ? '#22c55e' :
                           digest.trendDirection === 'down' ? '#ef4444' :
                           '#eab308',
                    border: `1px solid ${
                      digest.trendDirection === 'up' ? 'rgba(34, 197, 94, 0.3)' :
                      digest.trendDirection === 'down' ? 'rgba(239, 68, 68, 0.3)' :
                      'rgba(234, 179, 8, 0.3)'
                    }`,
                  }}
                >
                  {digest.trendDirection === 'up' ? '↑ Trending' :
                   digest.trendDirection === 'down' ? '↓ Declining' :
                   '→ Stable'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin smooth-scroll">
        {/* Timeline Section */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {isLoadingTimeline ? (
            <div className="py-6 text-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading timeline...</p>
            </div>
          ) : timeline.length > 0 ? (
            <TopicTimeline 
              events={timeline}
              onEventClick={(event) => {
                const article = articles.find(a => a.id === event.id) || digest.articles.find(a => a.id === event.id)
                if (article) onArticleClick?.(article)
              }}
            />
          ) : (
            <div className="py-6 text-center text-gray-500 text-sm">
              No timeline events available
            </div>
          )}
        </div>
        
        {/* Articles List */}
        <div className="px-4 py-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Latest Articles ({articles.length})
          </h3>
          
          {isLoadingArticles ? (
            <div className="py-4 text-center">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading sources...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {articles.map((article) => {
              const severityInfo = getSeverityInfo(article.severity)
              
              return (
                <button
                  key={article.id}
                  onClick={() => onArticleClick?.(article)}
                  className="w-full text-left p-3 rounded-lg transition-all hover:bg-white/[0.03]"
                  style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity indicator */}
                    <div 
                      className="w-1 h-full min-h-[40px] rounded-full shrink-0 mt-0.5"
                      style={{ background: severityInfo.color }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h4 
                        className="text-[12px] font-medium leading-tight mb-1.5 line-clamp-2"
                        style={{ color: 'rgba(255,255,255,0.9)' }}
                      >
                        {article.title}
                      </h4>
                      
                      {/* Excerpt */}
                      {article.excerpt && (
                        <p 
                          className="text-[11px] leading-relaxed mb-2 line-clamp-2"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          {article.excerpt}
                        </p>
                      )}
                      
                      {/* Meta */}
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="font-medium">{article.source}</span>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
                        <span className="tabular-nums">{formatTimeAgo(article.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
              })}
            </div>
          )}
          
          {!isLoadingArticles && articles.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-sm">
              No articles available for this topic
            </div>
          )}
        </div>
        
        {/* Related Info Section */}
        {digest.stats.geographicSpread.length > 0 && (
          <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Geographic Coverage
            </h3>
            <div className="flex flex-wrap gap-2">
              {digest.stats.geographicSpread.map((region, index) => (
                <span
                  key={index}
                  className="px-2 py-1 rounded text-[10px]"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {region}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(TopicDigest)
