'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Starfield background */}
      <div className="absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() > 0.8 ? '2px' : '1px',
              height: Math.random() > 0.8 ? '2px' : '1px',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.7,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      <div className="relative z-10 text-center px-6">
        {/* Globe icon */}
        <div className="relative inline-block mb-8" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <div className="w-24 h-24 rounded-full border-2 border-blue-500/40 flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full border-2 border-blue-500/30"
              style={{ animation: 'pulse-ring 2s ease-out infinite' }}
            />
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
        </div>

        {/* 404 text */}
        <h1 className="text-7xl font-bold text-white mb-2 tracking-wider">
          4<span className="text-blue-400">0</span>4
        </h1>
        <p className="text-gray-400 text-lg mb-2">
          Lost in orbit
        </p>
        <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
          This location doesn&apos;t exist on our map. Redirecting you back to Earth...
        </p>

        {/* Countdown */}
        <div className="mb-8">
          <span className="text-gray-500 text-sm">
            Returning in{' '}
            <span className="text-blue-400 font-mono text-lg font-bold">
              {countdown}
            </span>
            {countdown === 1 ? ' second' : ' seconds'}
          </span>
        </div>

        {/* Return button */}
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-300 hover:bg-blue-600/30 hover:border-blue-400/60 transition-all duration-300 text-sm font-medium tracking-wide"
        >
          Return to Earth
        </button>
      </div>
    </div>
  )
}
