/**
 * Topic Timeline - Horizontal Swipeable Timeline
 * 
 * Bloomberg-style horizontal timeline with:
 * - Swipeable cards chronologically ordered
 * - Momentum scrolling physics
 * - Date markers
 * - Severity indicators
 */

'use client'

import { memo, useRef, useCallback, useState } from 'react'
import { TimelineEvent, formatTimelineDate, getSeverityInfo } from '@/utils/topicAggregator'

interface TopicTimelineProps {
  events: TimelineEvent[]
  onEventClick?: (event: TimelineEvent) => void
}

function TopicTimeline({ events, onEventClick }: TopicTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Momentum scrolling state
  const dragState = useRef<{
    isDragging: boolean
    startX: number
    scrollLeft: number
    lastX: number
    lastTime: number
    velocity: number
  }>({ isDragging: false, startX: 0, scrollLeft: 0, lastX: 0, lastTime: 0, velocity: 0 })
  const momentumRAF = useRef<number | null>(null)
  
  // Momentum physics
  const MOMENTUM = { FRICTION: 0.95, MIN_VELOCITY: 0.5, VELOCITY_MULT: 1.5 }
  
  const applyMomentum = useCallback(() => {
    const container = scrollRef.current
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
  
  const handleDragStart = useCallback((clientX: number) => {
    const container = scrollRef.current
    if (!container) return
    
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
    
    container.style.cursor = 'grabbing'
  }, [])
  
  const handleDragMove = useCallback((clientX: number) => {
    if (!dragState.current.isDragging) return
    const container = scrollRef.current
    if (!container) return
    
    const now = Date.now()
    const dt = now - dragState.current.lastTime
    const dx = dragState.current.lastX - clientX
    
    if (dt > 0) {
      const instantVelocity = dx / dt * 16
      dragState.current.velocity = dragState.current.velocity * 0.7 + instantVelocity * 0.3
    }
    
    dragState.current.lastX = clientX
    dragState.current.lastTime = now
    
    const totalDx = dragState.current.startX - clientX
    container.scrollLeft = dragState.current.scrollLeft + totalDx
  }, [])
  
  const handleDragEnd = useCallback(() => {
    if (!dragState.current.isDragging) return
    const container = scrollRef.current
    if (!container) return
    
    dragState.current.isDragging = false
    container.style.cursor = 'grab'
    
    dragState.current.velocity *= MOMENTUM.VELOCITY_MULT
    if (Math.abs(dragState.current.velocity) > MOMENTUM.MIN_VELOCITY) {
      applyMomentum()
    }
  }, [applyMomentum])

  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500 text-sm">
        No timeline events available
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Timeline
        </h3>
        <span className="text-[10px] text-gray-600">
          {events.length} events
        </span>
      </div>
      
      {/* Timeline Track */}
      <div className="relative">
        {/* Date line */}
        <div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        />
        
        {/* Scrollable Timeline */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 pt-3 scrollbar-hide"
          style={{ cursor: 'grab' }}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => dragState.current.isDragging && handleDragEnd()}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
        >
          {events.map((event, index) => {
            const severityInfo = getSeverityInfo(event.severity)
            const isFirst = index === 0
            
            return (
              <div
                key={event.id}
                className="flex-shrink-0 relative"
                style={{ width: '260px' }}
              >
                {/* Date marker dot */}
                <div 
                  className="absolute -top-3 left-4 w-2 h-2 rounded-full"
                  style={{ 
                    background: severityInfo.color,
                    boxShadow: `0 0 6px ${severityInfo.color}60`,
                  }}
                />
                
                {/* Connecting line */}
                {!isFirst && (
                  <div 
                    className="absolute -top-2.5 -left-3 w-3 h-px"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  />
                )}
                
                {/* Card */}
                <button
                  onClick={() => onEventClick?.(event)}
                  className="w-full text-left p-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Date */}
                  <div 
                    className="text-[9px] font-medium mb-2 tabular-nums"
                    style={{ color: severityInfo.color }}
                  >
                    {formatTimelineDate(event.timestamp)}
                  </div>
                  
                  {/* Title */}
                  <h4 
                    className="text-[12px] font-medium leading-tight mb-2 line-clamp-2"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    {event.title}
                  </h4>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                      {event.source}
                    </span>
                    {event.location && (
                      <span className="text-[9px] text-gray-600 truncate max-w-[80px]">
                        {event.location}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}
          
          {/* End spacer */}
          <div className="flex-shrink-0 w-4" />
        </div>
      </div>
      
      {/* Scroll hint gradient */}
      <div 
        className="absolute top-0 right-0 bottom-0 w-12 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(10,14,20,0.9))',
        }}
      />
    </div>
  )
}

export default memo(TopicTimeline)
