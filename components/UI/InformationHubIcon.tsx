/**
 * Information Hub Icon - Mobile
 * 
 * Sleek, minimal icon for mobile that replaces the large orbital render.
 * Features animated micro-hint to indicate interactivity.
 * Preserves screen real estate while maintaining functionality.
 */

'use client'

import { memo, useState, useEffect } from 'react'
import { SignalIcon } from './Icons'

interface InformationHubIconProps {
  /** Click handler */
  onClick?: () => void
  /** Whether to show animated hint */
  animated?: boolean
  /** Position in viewport */
  position?: 'top-left' | 'top-right'
}

function InformationHubIcon({
  onClick,
  animated = true,
  position = 'top-left',
}: InformationHubIconProps) {
  const [showHint, setShowHint] = useState(true)
  const [pulsePhase, setPulsePhase] = useState(0)

  // Animated micro-hint: subtle pulse every 3 seconds
  useEffect(() => {
    if (!animated) return

    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 2)
    }, 3000)

    return () => clearInterval(interval)
  }, [animated])

  // Auto-hide hint after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  const positionClasses = position === 'top-left' 
    ? 'top-4 left-4' 
    : 'top-4 right-4'
  
  // Adjust hint position for top-right
  const hintPosition = position === 'top-right'
    ? { top: '-8px', right: '0', left: 'auto', transform: 'translateX(0)' }
    : { top: '-8px', left: '50%', transform: 'translateX(-50%)' }

  return (
    <div className={`fixed ${positionClasses} z-40`}>
      {/* Hint tooltip - shows initially, then fades */}
      {showHint && (
        <div
          className="absolute whitespace-nowrap px-2 py-1 rounded text-[10px] font-medium transition-opacity duration-500"
          style={{
            ...hintPosition,
            background: 'rgba(99, 102, 241, 0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'rgba(255, 255, 255, 0.8)',
            opacity: showHint ? 1 : 0,
            animation: 'fadeOut 8s ease-out forwards',
          }}
        >
          Tap for Signals
          <style>{`
            @keyframes fadeOut {
              0%, 70% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Icon button */}
      <button
        onClick={onClick}
        className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all active:scale-95"
        style={{
          background: 'rgba(10, 14, 20, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: animated && pulsePhase === 0
            ? '0 0 20px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'box-shadow 1.5s ease-in-out, transform 0.2s',
        }}
        aria-label="Open Situation Room"
      >
        <SignalIcon 
          size={20} 
          color={animated && pulsePhase === 0 ? '#818cf8' : '#6366f1'} 
        />
        
        {/* Subtle pulse ring */}
        {animated && (
          <div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: 'rgba(99, 102, 241, 0.3)',
              animation: 'pulseRing 3s ease-in-out infinite',
            }}
          />
        )}
      </button>

      <style>{`
        @keyframes pulseRing {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default memo(InformationHubIcon)
