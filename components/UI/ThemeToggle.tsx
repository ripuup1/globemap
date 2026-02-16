/**
 * Vox Terra - Dark/Light Mode Toggle
 * 
 * Premium theme toggle with:
 * - Sun/Moon icon with holographic glow
 * - System preference auto-detection
 * - Smooth animated transitions
 * - Persists preference to localStorage
 */

import { memo, useEffect, useRef, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

interface ThemeToggleProps {
  onThemeChange?: (theme: ThemeMode) => void
  className?: string
}

function ThemeToggle({ onThemeChange, className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true)

    // Check localStorage first
    const stored = localStorage.getItem('voxtera-theme') as ThemeMode | null
    if (stored) {
      setTheme(stored)
      return
    }

    // Fall back to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }, [])

  // Sync with theme changes from other sources (e.g. SatelliteControlPanel)
  const isExternalUpdate = useRef(false)
  useEffect(() => {
    const handleExternalThemeChange = (e: CustomEvent<ThemeMode>) => {
      if (e.detail !== theme) {
        isExternalUpdate.current = true
        setTheme(e.detail)
      }
    }
    window.addEventListener('theme-change', handleExternalThemeChange as EventListener)
    return () => window.removeEventListener('theme-change', handleExternalThemeChange as EventListener)
  }, [theme])

  // Persist theme and notify parent
  useEffect(() => {
    if (!mounted) return

    localStorage.setItem('voxtera-theme', theme)
    onThemeChange?.(theme)
    document.documentElement.classList.toggle('light-mode', theme === 'light')

    // Only dispatch if this was a local change (not from external event)
    if (!isExternalUpdate.current) {
      window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }))
    }
    isExternalUpdate.current = false
  }, [theme, onThemeChange, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`w-10 h-10 rounded-xl bg-white/5 ${className}`} />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group ${className}`}
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.3) 100%)',
        border: isDark 
          ? '1px solid rgba(99, 102, 241, 0.3)'
          : '1px solid rgba(251, 191, 36, 0.5)',
        boxShadow: isDark
          ? '0 4px 15px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.15)'
          : '0 4px 15px rgba(251, 191, 36, 0.2), 0 0 25px rgba(251, 191, 36, 0.15)',
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Animated glow ring */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }}
      />
      
      {/* Icon container with rotation animation */}
      <div 
        className="relative w-5 h-5 transition-transform duration-500"
        style={{
          transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
        }}
      >
        {/* Moon icon (dark mode) */}
        <svg
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          style={{ color: '#a5b4fc' }}
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
        
        {/* Sun icon (light mode) */}
        <svg
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${!isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          style={{ color: '#fbbf24' }}
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      
      {/* Tooltip */}
      <div 
        className="absolute right-full mr-2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        {isDark ? 'Light mode' : 'Dark mode'}
      </div>
    </button>
  )
}

export default memo(ThemeToggle)
