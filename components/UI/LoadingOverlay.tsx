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

import { useState, useEffect, useRef } from 'react'

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
  
  // Determine if we should show the overlay
  const isActive = loading || processing
  
  // Handle visibility and exit animation
  useEffect(() => {
    if (isActive) {
      setVisible(true)
      setIsExiting(false)
      startTimeRef.current = Date.now()
    } else if (visible) {
      // Start exit animation
      setIsExiting(true)
      // Complete the progress bar before fading out
      setDisplayProgress(100)
      
      // Fade out after progress completes
      const exitTimer = setTimeout(() => {
        setVisible(false)
        setIsExiting(false)
        setDisplayProgress(0)
      }, 500) // 200ms for progress completion + 300ms fade
      
      return () => clearTimeout(exitTimer)
    }
  }, [isActive, visible])
  
  // Animate progress smoothly
  useEffect(() => {
    if (!isActive || isExiting) return
    
    const animateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current
      
      if (progress !== undefined) {
        // Use provided progress, but animate smoothly towards it
        setDisplayProgress(prev => {
          const diff = progress - prev
          return prev + diff * 0.1 // Smooth interpolation
        })
      } else {
        // Simulate progress based on loading/processing state
        // Loading: 0-60%, Processing: 60-95%
        let targetProgress: number
        
        if (loading && !processing) {
          // During fetch: animate from 0 to 60 over ~2 seconds
          targetProgress = Math.min(60, (elapsed / 2000) * 60)
        } else if (processing) {
          // During processing: animate from 60 to 95
          const processingStart = 60
          const processingProgress = Math.min(35, ((elapsed - 1000) / 3000) * 35)
          targetProgress = processingStart + Math.max(0, processingProgress)
        } else {
          targetProgress = 0
        }
        
        setDisplayProgress(prev => {
          const diff = targetProgress - prev
          return prev + diff * 0.08 // Smooth easing
        })
      }
      
      animationRef.current = requestAnimationFrame(animateProgress)
    }
    
    animationRef.current = requestAnimationFrame(animateProgress)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, isExiting, loading, processing, progress])
  
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
          className="h-full transition-all duration-150 ease-out"
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
