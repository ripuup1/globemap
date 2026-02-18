'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import VoxTerraLogo from './VoxTerraLogo'

export default function SiteNav() {
  const [newsOpen, setNewsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNewsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        background: 'linear-gradient(180deg, rgba(8, 12, 24, 0.95) 0%, rgba(8, 12, 24, 0.85) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        fontFamily: 'var(--font-exo2), system-ui, sans-serif',
      }}
    >
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <VoxTerraLogo size="sm" />
      </Link>

      <div className="flex items-center gap-6">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNewsOpen(!newsOpen)}
            className="flex items-center gap-1.5 text-sm font-medium tracking-wider uppercase transition-colors"
            style={{ color: newsOpen ? '#a5b4fc' : '#9ca3af' }}
            aria-expanded={newsOpen}
            aria-haspopup="true"
          >
            News
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${newsOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {newsOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
              }}
              role="menu"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
              <Link
                href="/"
                className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setNewsOpen(false)}
                role="menuitem"
              >
                <div className="font-medium">Blog / Latest Posts</div>
                <div className="text-xs text-gray-500 mt-0.5">Explore the interactive globe</div>
              </Link>
              <div className="h-px bg-white/5" />
              <Link
                href="/news/in-the-news"
                className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setNewsOpen(false)}
                role="menuitem"
              >
                <div className="font-medium">As Seen In The News</div>
                <div className="text-xs text-gray-500 mt-0.5">Media appearances &amp; coverage</div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
