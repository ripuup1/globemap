/**
 * useAuth Hook
 *
 * Manages Supabase authentication state.
 * Supports email/password and Google OAuth.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [state, setState] = useState<AuthState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setState(session ? 'authenticated' : 'unauthenticated')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setState(session ? 'authenticated' : 'unauthenticated')
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } catch {
      setError('Sign in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError(null)
    } catch {
      setError('Sign up failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      })
      if (error) setError(error.message)
    } catch {
      setError('Google sign in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setError(error.message)
    } catch {
      setError('Sign out failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}?reset=true` : undefined,
      })
      if (error) setError(error.message)
      return !error
    } catch {
      setError('Password reset failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    session,
    state,
    error,
    loading,
    isAuthenticated: state === 'authenticated',
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError: () => setError(null),
  }
}
