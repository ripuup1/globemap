/**
 * ISS Satellite Component
 *
 * Zoom-Aware Positioning for Professional News Context:
 * - When zoomed IN: Small, subtle, positioned near edge
 * - When zoomed OUT: Floats farther from Earth, occupies negative space
 * - Smooth cinematic transitions between states
 *
 * PERFORMANCE FIX: Uses direct DOM manipulation for orbital animation
 * instead of React state, eliminating ~120 re-renders/sec.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react'

interface ISSSatelliteProps {
  onClick: () => void
  isExpanded: boolean
  activeFiltersCount: number
  zoomLevel?: number
  globeAltitude?: number
  theme?: 'dark' | 'light'
}

const ZOOM_CONFIG = {
  zoomedInThreshold: 1.5,
  zoomedOutThreshold: 3.0,
  minScale: 0.35,
  maxScale: 0.85,
  minOpacity: 0.5,
  maxOpacity: 0.9,
  minRadiusMultiplier: 0.32,
  maxRadiusMultiplier: 0.45,
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

function interpolateByAltitude(
  altitude: number,
  minVal: number,
  maxVal: number
): number {
  const { zoomedInThreshold, zoomedOutThreshold } = ZOOM_CONFIG
  const clampedAlt = Math.max(zoomedInThreshold, Math.min(zoomedOutThreshold, altitude))
  const range = zoomedOutThreshold - zoomedInThreshold
  const progress = easeOutQuart((clampedAlt - zoomedInThreshold) / range)
  return minVal + progress * (maxVal - minVal)
}

function ISSSatellite({
  onClick,
  isExpanded,
  activeFiltersCount,
  globeAltitude = 2.5,
  theme = 'dark',
}: ISSSatelliteProps) {
  const solarPanelStyles = theme === 'light'
    ? {
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0a0a0a 100%)',
        gridPattern: 'linear-gradient(rgba(100,150,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(100,150,255,0.08) 1px, transparent 1px)',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        boxShadow: 'inset 0 1px 0 rgba(100, 150, 255, 0.15), inset 0 -1px 0 rgba(0,0,0,0.6), 0 0 15px rgba(100, 150, 255, 0.2), 0 2px 8px rgba(0,0,0,0.5)',
        trussColor: 'linear-gradient(180deg, #e2e8f0 0%, #f8fafc 30%, #ffffff 50%, #f8fafc 70%, #e2e8f0 100%)',
        glowFilter: 'drop-shadow(0 0 8px rgba(100, 150, 255, 0.3)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))',
      }
    : {
        background: 'linear-gradient(135deg, #1e2433 0%, #353f55 15%, #d4a829 28%, #353f55 42%, #1e2433 55%, #9a8060 75%, #1e2433 100%)',
        gridPattern: 'linear-gradient(rgba(212,168,41,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,41,0.15) 1px, transparent 1px)',
        border: '1px solid rgba(212, 168, 41, 0.35)',
        boxShadow: 'inset 0 1px 0 rgba(212, 168, 41, 0.45), inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 20px rgba(212, 168, 41, 0.35), 0 2px 10px rgba(0,0,0,0.5)',
        trussColor: 'linear-gradient(180deg, #e2e8f0 0%, #f8fafc 30%, #ffffff 50%, #f8fafc 70%, #e2e8f0 100%)',
        glowFilter: 'drop-shadow(0 0 8px rgba(201, 162, 39, 0.3)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))',
      }

  // Refs for direct DOM manipulation (no re-renders)
  const containerRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)
  const blinkRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const timeRef = useRef<number>(0)
  const smoothAltitudeRef = useRef(globeAltitude)

  // Only re-render for light blink state (every 4s, not 60fps)
  const [lightBlink, setLightBlink] = useState(false)

  // Smooth altitude tracking (via ref, not state)
  useEffect(() => {
    const targetAlt = globeAltitude
    const interval = setInterval(() => {
      const diff = targetAlt - smoothAltitudeRef.current
      if (Math.abs(diff) < 0.01) {
        smoothAltitudeRef.current = targetAlt
      } else {
        smoothAltitudeRef.current += diff * 0.08
      }
    }, 16)
    return () => clearInterval(interval)
  }, [globeAltitude])

  // Orbital animation - updates DOM directly, zero React re-renders
  useEffect(() => {
    const ORBIT_PERIOD = 60
    const INCLINATION = 51.6 * (Math.PI / 180)
    let lastTimestamp = 0

    const animate = (timestamp: number) => {
      const deltaTime = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0.016
      lastTimestamp = timestamp
      timeRef.current += deltaTime

      const width = window.innerWidth
      const height = window.innerHeight

      // Calculate orbit params using current smooth altitude
      const alt = smoothAltitudeRef.current
      const radiusMultiplier = interpolateByAltitude(alt, ZOOM_CONFIG.minRadiusMultiplier, ZOOM_CONFIG.maxRadiusMultiplier)
      const radius = Math.min(width, height) * radiusMultiplier
      const centerX = width / 2
      const centerY = height / 2

      const phase = (timeRef.current / ORBIT_PERIOD) * 2 * Math.PI
      const x = centerX + radius * Math.cos(phase)
      const y = centerY + radius * Math.sin(phase) * Math.cos(INCLINATION)
      const depthFactor = Math.sin(phase) * Math.sin(INCLINATION)
      const rotation = phase * (180 / Math.PI)

      // Calculate zoom-aware scale and opacity
      const zoomAwareScale = interpolateByAltitude(alt, ZOOM_CONFIG.minScale, ZOOM_CONFIG.maxScale)
      const depthScale = 1 + depthFactor * 0.1
      const finalScale = zoomAwareScale * depthScale
      const zoomAwareOpacity = interpolateByAltitude(alt, ZOOM_CONFIG.minOpacity, ZOOM_CONFIG.maxOpacity)
      const depthOpacity = zoomAwareOpacity + depthFactor * 0.05

      // Direct DOM update - compositor-only transform (no layout thrashing)
      if (containerRef.current) {
        containerRef.current.style.transform = `translate(${x - window.innerWidth / 2}px, ${y - window.innerHeight / 2}px) scale(${finalScale})`
        containerRef.current.style.opacity = String(depthOpacity)
      }

      if (modelRef.current) {
        modelRef.current.style.transform = `rotateZ(${-5 + Math.sin(rotation * Math.PI / 180) * 3}deg)`
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Navigation light blinking (low frequency - every 4s)
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setLightBlink(true)
      setTimeout(() => setLightBlink(false), 100)
    }, 4000)
    return () => clearInterval(blinkInterval)
  }, [])

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      data-iss-trigger
      role="button"
      tabIndex={0}
      aria-label="Open ISS Control settings panel"
      className="fixed z-40 cursor-pointer group"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        willChange: 'transform, opacity',
        filter: solarPanelStyles.glowFilter,
        padding: '12px', // Expand touch target for mobile
      }}
    >
      {/* ISS Model Container */}
      <div
        ref={modelRef}
        className="relative"
        style={{
          width: '180px',
          height: '60px',
        }}
      >
        {/* Main Truss */}
        <div
          className="absolute"
          style={{
            left: '10px',
            top: '26px',
            width: '160px',
            height: '8px',
            background: solarPanelStyles.trussColor,
            borderRadius: '2px',
            boxShadow: '0 1px 0 rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.3), 0 0 20px rgba(255, 255, 255, 0.3)',
            transition: 'background 0.5s ease-out',
          }}
        />

        {/* Left Solar Array Group */}
        <div className="absolute" style={{ left: '0px', top: '0px' }}>
          <div
            className="absolute"
            style={{
              left: '3px',
              top: '0px',
              width: '40px',
              height: '24px',
              background: solarPanelStyles.background,
              backgroundImage: solarPanelStyles.gridPattern,
              backgroundSize: '3px 3px',
              borderRadius: '2px',
              border: solarPanelStyles.border,
              boxShadow: solarPanelStyles.boxShadow,
              transform: 'perspective(100px) rotateY(-5deg)',
              transition: 'background 0.5s ease-out, box-shadow 0.5s ease-out, border 0.5s ease-out',
            }}
          />
          <div
            className="absolute"
            style={{
              left: '3px',
              top: '36px',
              width: '40px',
              height: '24px',
              background: solarPanelStyles.background,
              backgroundImage: solarPanelStyles.gridPattern,
              backgroundSize: '3px 3px',
              borderRadius: '2px',
              border: solarPanelStyles.border,
              boxShadow: solarPanelStyles.boxShadow,
              transform: 'perspective(100px) rotateY(-5deg)',
              transition: 'background 0.5s ease-out, box-shadow 0.5s ease-out, border 0.5s ease-out',
            }}
          />
          <div className="absolute" style={{ left: '42px', top: '9px', width: '10px', height: '5px', background: 'linear-gradient(90deg, #2a2a3a 0%, #4a4a5a 50%, #2a2a3a 100%)', borderRadius: '1px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
          <div className="absolute" style={{ left: '42px', top: '46px', width: '10px', height: '5px', background: 'linear-gradient(90deg, #2a2a3a 0%, #4a4a5a 50%, #2a2a3a 100%)', borderRadius: '1px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
        </div>

        {/* Right Solar Array Group */}
        <div className="absolute" style={{ right: '0px', top: '0px' }}>
          <div
            className="absolute"
            style={{
              right: '3px',
              top: '0px',
              width: '40px',
              height: '24px',
              background: solarPanelStyles.background.replace('135deg', '225deg'),
              backgroundImage: solarPanelStyles.gridPattern,
              backgroundSize: '3px 3px',
              borderRadius: '2px',
              border: solarPanelStyles.border,
              boxShadow: solarPanelStyles.boxShadow,
              transform: 'perspective(100px) rotateY(5deg)',
              transition: 'background 0.5s ease-out, box-shadow 0.5s ease-out, border 0.5s ease-out',
            }}
          />
          <div
            className="absolute"
            style={{
              right: '3px',
              top: '36px',
              width: '40px',
              height: '24px',
              background: solarPanelStyles.background.replace('135deg', '225deg'),
              backgroundImage: solarPanelStyles.gridPattern,
              backgroundSize: '3px 3px',
              borderRadius: '2px',
              border: solarPanelStyles.border,
              boxShadow: solarPanelStyles.boxShadow,
              transform: 'perspective(100px) rotateY(5deg)',
              transition: 'background 0.5s ease-out, box-shadow 0.5s ease-out, border 0.5s ease-out',
            }}
          />
          <div className="absolute" style={{ right: '42px', top: '9px', width: '10px', height: '5px', background: 'linear-gradient(90deg, #2a2a3a 0%, #4a4a5a 50%, #2a2a3a 100%)', borderRadius: '1px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
          <div className="absolute" style={{ right: '42px', top: '46px', width: '10px', height: '5px', background: 'linear-gradient(90deg, #2a2a3a 0%, #4a4a5a 50%, #2a2a3a 100%)', borderRadius: '1px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
        </div>

        {/* Central Modules */}
        <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="absolute" style={{ left: '-25px', top: '-8px', width: '22px', height: '16px', background: 'linear-gradient(180deg, #64748b 0%, #94a3b8 30%, #cbd5e1 50%, #94a3b8 70%, #64748b 100%)', borderRadius: '3px', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), 0 3px 8px rgba(0,0,0,0.4), 0 0 8px rgba(148,163,184,0.2)' }} />
          <div className="absolute" style={{ left: '-5px', top: '-8px', width: '10px', height: '16px', background: 'linear-gradient(180deg, #71717a 0%, #a1a1aa 30%, #d4d4d8 50%, #a1a1aa 70%, #71717a 100%)', borderRadius: '2px', boxShadow: '0 0 6px rgba(161,161,170,0.2)' }} />
          <div className="absolute" style={{ left: '8px', top: '-8px', width: '20px', height: '16px', background: 'linear-gradient(180deg, #57534e 0%, #78716c 30%, #a8a29e 50%, #78716c 70%, #57534e 100%)', borderRadius: '3px', boxShadow: '0 0 6px rgba(120,113,108,0.2)' }} />
        </div>

        {/* Radiator Panels */}
        <div className="absolute" style={{ left: '55px', top: '10px', width: '20px', height: '6px', background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)', borderRadius: '1px', boxShadow: '0 0 6px rgba(241,245,249,0.3)' }} />
        <div className="absolute" style={{ left: '55px', top: '44px', width: '20px', height: '6px', background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)', borderRadius: '1px', boxShadow: '0 0 6px rgba(241,245,249,0.3)' }} />
        <div className="absolute" style={{ left: '105px', top: '10px', width: '20px', height: '6px', background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)', borderRadius: '1px', boxShadow: '0 0 6px rgba(241,245,249,0.3)' }} />
        <div className="absolute" style={{ left: '105px', top: '44px', width: '20px', height: '6px', background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)', borderRadius: '1px', boxShadow: '0 0 6px rgba(241,245,249,0.3)' }} />

        {/* Navigation Lights */}
        <div className="absolute" style={{ left: '2px', top: '28px', width: '5px', height: '5px', borderRadius: '50%', background: 'radial-gradient(circle, #f87171 0%, #dc2626 60%, #991b1b 100%)', boxShadow: '0 0 8px rgba(248,113,113,0.6), 0 0 4px rgba(248,113,113,0.8)' }} />
        <div className="absolute" style={{ right: '2px', top: '28px', width: '5px', height: '5px', borderRadius: '50%', background: 'radial-gradient(circle, #4ade80 0%, #22c55e 60%, #16a34a 100%)', boxShadow: '0 0 8px rgba(74,222,128,0.6), 0 0 4px rgba(74,222,128,0.8)' }} />
        <div
          ref={blinkRef}
          className="absolute"
          style={{
            left: '50%',
            top: '18px',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            transform: 'translateX(-50%)',
            background: lightBlink ? 'radial-gradient(circle, #ffffff 0%, #f8fafc 60%, #e2e8f0 100%)' : 'radial-gradient(circle, #cbd5e1 0%, #94a3b8 60%, #64748b 100%)',
            boxShadow: lightBlink ? '0 0 12px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,1)' : '0 0 4px rgba(203,213,225,0.4)',
            transition: 'all 0.05s ease-out',
          }}
        />

        {/* Badge for active filters */}
        {activeFiltersCount > 0 && (
          <div className="absolute -top-3 -right-3 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-blue-400 z-10" style={{ boxShadow: '0 0 8px rgba(59,130,246,0.5)' }}>
            {activeFiltersCount}
          </div>
        )}
      </div>

      {/* Tooltip on hover */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div
          className="relative bg-gray-900/95 backdrop-blur-md text-white px-4 py-3 rounded-lg border border-gray-600/50 shadow-2xl"
          style={{ minWidth: '140px' }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid rgba(17, 24, 39, 0.95)' }} />
          <div className="font-semibold text-sm tracking-wide">ISS Control</div>
          <div className="text-gray-400 text-[11px] mt-1 leading-relaxed">Click to open settings</div>
        </div>
      </div>
    </div>
  )
}

export default memo(ISSSatellite)
