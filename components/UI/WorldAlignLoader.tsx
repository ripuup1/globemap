/**
 * WorldAlignLoader - Bulletproof Loading Screen
 *
 * Shows when isVisible=true, fades out via CSS when isVisible=false,
 * completely unmounts after fade completes. Progress bar always animates.
 */

'use client'

import { useState, useEffect } from 'react'

const GLOBAL_FACTS = [
  "Over half the world's population now lives in urban areas.",
  "Most global conflicts are reported within 12 hours of escalation.",
  "The Earth rotates at roughly 1,000 miles per hour at the equator.",
  "News travels faster than weather systems across most continents.",
  "There are more than 7,000 languages spoken worldwide.",
  "International shipping moves 90% of global trade.",
  "The world gains approximately 200,000 people each day.",
  "Earthquakes occur somewhere on Earth every 11 seconds.",
  "More data is created daily than in all of human history before 2003.",
  "Satellites orbit Earth at 17,500 miles per hour.",
]

interface WorldAlignLoaderProps {
  isVisible: boolean
  progress: number
}

export default function WorldAlignLoader({ isVisible, progress }: WorldAlignLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0)
  const [currentFact, setCurrentFact] = useState(0)
  const [factOpacity, setFactOpacity] = useState(1)
  const [shouldRender, setShouldRender] = useState(true)

  useEffect(() => {
    setCurrentFact(Math.floor(Math.random() * GLOBAL_FACTS.length))
  }, [])

  useEffect(() => {
    if (!isVisible) {
      const unmountTimer = setTimeout(() => setShouldRender(false), 600)
      return () => clearTimeout(unmountTimer)
    } else if (!shouldRender) {
      const showTimer = setTimeout(() => setShouldRender(true), 0)
      return () => clearTimeout(showTimer)
    }
  }, [isVisible]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shouldRender) return
    const cycleFact = () => {
      setFactOpacity(0)
      setTimeout(() => {
        setCurrentFact(prev => (prev + 1) % GLOBAL_FACTS.length)
        setFactOpacity(1)
      }, 300)
    }
    const interval = setInterval(cycleFact, 3500)
    return () => clearInterval(interval)
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender) return
    const autonomousStep = () => {
      setInternalProgress(prev => {
        const dataTarget = Math.min(progress, 95)
        const autonomousMin = Math.min(prev + 0.4, 90)
        const target = Math.max(dataTarget, autonomousMin)
        if (!isVisible) return 100
        const diff = target - prev
        if (Math.abs(diff) < 0.1) return target
        const easeFactor = 0.08 + (prev / 100) * 0.04
        return prev + diff * easeFactor
      })
    }
    const interval = setInterval(autonomousStep, 50)
    return () => clearInterval(interval)
  }, [progress, isVisible, shouldRender])

  if (!shouldRender) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: '#0a0a0b',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="flex flex-col items-center gap-6 w-full max-w-md px-8">
        <div
          className="text-center h-12 flex items-center justify-center"
          style={{ opacity: factOpacity, transition: 'opacity 0.3s ease' }}
        >
          <p
            className="text-[13px] text-gray-500 leading-relaxed max-w-xs"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {GLOBAL_FACTS[currentFact]}
          </p>
        </div>
        <div className="relative w-full">
          <div
            className="relative h-[3px] rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, #1c1c22 0%, #252530 50%, #1c1c22 100%)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
              style={{
                width: `${internalProgress}%`,
                background: 'linear-gradient(90deg, #3a4a65 0%, #4a5d75 40%, #5a6a7a 70%, #6a757a 100%)',
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                }}
              />
            </div>
            <div
              className="absolute inset-y-0 w-24 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(140, 160, 180, 0.15) 50%, transparent 100%)',
                animation: 'sweepShimmer 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        <div className="text-center" style={{ opacity: 0.4 }}>
          <span
            className="text-[11px] font-medium tracking-[0.35em] text-gray-600 uppercase"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            Vox Terra
          </span>
        </div>
      </div>
      <style>{`
        @keyframes sweepShimmer {
          0% { left: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
