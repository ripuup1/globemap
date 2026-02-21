/**
 * AuthModal - Sign in / Sign up modal
 *
 * Supports email/password and Google OAuth.
 * Matches the app's dark glassmorphism design.
 */

'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

type AuthView = 'sign-in' | 'sign-up' | 'forgot-password' | 'check-email'

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, loading, error, clearError } = useAuth()

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (view === 'sign-in') {
      await signInWithEmail(email, password)
    } else if (view === 'sign-up') {
      await signUpWithEmail(email, password)
    } else if (view === 'forgot-password') {
      const success = await resetPassword(email)
      if (success) setView('check-email')
    }
  }, [view, email, password, signInWithEmail, signUpWithEmail, resetPassword])

  const switchView = useCallback((newView: AuthView) => {
    setView(newView)
    clearError()
    setPassword('')
  }, [clearError])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: 'rgba(0, 0, 0, 0.6)' }} />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.1)',
          fontFamily: 'var(--font-exo2), system-ui, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🌍</div>
          <h2 className="text-lg font-bold text-white">
            {view === 'sign-in' && 'Welcome Back'}
            {view === 'sign-up' && 'Create Account'}
            {view === 'forgot-password' && 'Reset Password'}
            {view === 'check-email' && 'Check Your Email'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {view === 'sign-in' && 'Sign in to sync your bookmarks & preferences'}
            {view === 'sign-up' && 'Join Vox Terra for a personalized experience'}
            {view === 'forgot-password' && "Enter your email and we'll send a reset link"}
            {view === 'check-email' && 'We sent a password reset link to your email'}
          </p>
        </div>

        {view === 'check-email' ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-300 mb-4">{email}</p>
            <button
              onClick={() => switchView('sign-in')}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* Google Sign In */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white transition-all hover:bg-white/10 disabled:opacity-50"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
              </div>
              {view !== 'forgot-password' && (
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    autoComplete={view === 'sign-up' ? 'new-password' : 'current-password'}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <>
                    {view === 'sign-in' && 'Sign In'}
                    {view === 'sign-up' && 'Create Account'}
                    {view === 'forgot-password' && 'Send Reset Link'}
                  </>
                )}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-4 text-center space-y-2">
              {view === 'sign-in' && (
                <>
                  <button
                    onClick={() => switchView('forgot-password')}
                    className="block w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                  <p className="text-xs text-gray-500">
                    Don&apos;t have an account?{' '}
                    <button onClick={() => switchView('sign-up')} className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                      Sign up
                    </button>
                  </p>
                </>
              )}
              {view === 'sign-up' && (
                <p className="text-xs text-gray-500">
                  Already have an account?{' '}
                  <button onClick={() => switchView('sign-in')} className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                    Sign in
                  </button>
                </p>
              )}
              {view === 'forgot-password' && (
                <button
                  onClick={() => switchView('sign-in')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
