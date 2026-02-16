/**
 * LoadingOverlay Component
 * 
 * A professional, sleek progress bar that appears at the top of the screen
 * during data fetching. Designed to match the dark theme and look like
 * professional graphic design work.
 * 
 * Features:
 * - Thin (3px) progress bar with blue gradient
 * - Backdrop blur for depth
 * - Smooth fill animation with ease-out timing
 * - Graceful fade-out on completion
 * - Optional status message
 */

import { useState, useEffect, useRef, useCallback } from 'react'

interface LoadingOverlayProps {
  /** Whether data is currently being loaded */
  loading: boolean
  /** Whether data is being processed after fetch */
  processing: boolean
  /** Progress percentage (0-100), if available */
  progress?: number
  /** Optional status message to display */
  message?: string
}

export default function LoadingOverlay({
  loading,
  processing,
  progress,
  message,
}: LoadingOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const animationRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number>(0)
  const progressRef = useRef(0)
  const barRef = useRef<HTMLDivElement>(null)
  const lastStateUpdateRef = useRef(0)

  // Determine if we should show the overlay
  const isActive = loading || processing

  // Direct DOM update for smooth progress (no React re-render)
  const updateBar = useCallback((value: number) => {
    progressRef.current = value
    if (barRef.current) {
      barRef.current.style.width = `${value}%`
    }
    // Throttle React state updates to ~5/sec (for ARIA + message display)
    const now = Date.now()
    if (now - lastStateUpdateRef.current > 200) {
      lastStateUpdateRef.current = now
      setDisplayProgress(value)
    }
  }, [])

  // Handle visibility and exit animation
  useEffect(() => {
    if (isActive) {
      setVisible(true)
      setIsExiting(false)
      startTimeRef.current = Date.now()
    } else if (visible) {
      setIsExiting(true)
      updateBar(100)
      setDisplayProgress(100)

      const exitTimer = setTimeout(() => {
        setVisible(false)
        setIsExiting(false)
        progressRef.current = 0
        setDisplayProgress(0)
      }, 500)

      return () => clearTimeout(exitTimer)
    }
  }, [isActive, visible, updateBar])

  // Animate progress smoothly via direct DOM manipulation
  useEffect(() => {
    if (!isActive || isExiting) return

    const animateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current
      const current = progressRef.current

      if (progress !== undefined) {
        const diff = progress - current
        updateBar(current + diff * 0.1)
      } else {
        let targetProgress: number

        if (loading && !processing) {
          targetProgress = Math.min(60, (elapsed / 2000) * 60)
        } else if (processing) {
          const processingProgress = Math.min(35, ((elapsed - 1000) / 3000) * 35)
          targetProgress = 60 + Math.max(0, processingProgress)
        } else {
          targetProgress = 0
        }

        const diff = targetProgress - current
        updateBar(current + diff * 0.08)
      }

      animationRef.current = requestAnimationFrame(animateProgress)
    }

    animationRef.current = requestAnimationFrame(animateProgress)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, isExiting, loading, processing, progress, updateBar])
  
  if (!visible) return null
  
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      role="progressbar"
      aria-valuenow={Math.round(displayProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={message || 'Loading'}
    >
      {/* Progress bar container */}
      <div
        className="h-[4px] w-full"
        style={{
          background: 'rgba(17, 24, 39, 0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(55, 65, 81, 0.6)',
        }}
      >
        {/* Progress fill with enhanced glow */}
        <div
          ref={barRef}
          className="h-full"
          style={{
            width: `${displayProgress}%`,
            background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 40%, #60a5fa 60%, #3b82f6 100%)',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.5), 0 0 24px rgba(59, 130, 246, 0.25)',
          }}
        />
      </div>
      
      {/* Optional status message */}
      {message && !isExiting && (
        <div
          className="absolute top-[3px] left-0 right-0 flex justify-center"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.9) 0%, transparent 100%)',
          }}
        >
          <span
            className="text-xs text-gray-400 py-2 px-4 font-medium"
            style={{
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
            }}
          >
            {message}
            {progress !== undefined && (
              <span className="ml-2 text-gray-500">
                {Math.round(displayProgress)}%
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
