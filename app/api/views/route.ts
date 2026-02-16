/**
 * Private View Counter API
 * 
 * Backend-only view tracking:
 * - Tracks total visits and daily uniques
 * - Accessible only via hidden admin endpoint
 * - Not exposed in public UI
 * - Lightweight and low-overhead
 */

import { NextRequest, NextResponse } from 'next/server'

// In-memory storage (resets on server restart)
// For production, use a database like Redis, PostgreSQL, or a file-based store
interface ViewStats {
  total: number
  today: number
  todayDate: string
  uniqueIPs: Set<string>
  todayUniqueIPs: Set<string>
  lastViewed: string
  history: Array<{ date: string; views: number; uniques: number }>
}

// Initialize stats
const stats: ViewStats = {
  total: 0,
  today: 0,
  todayDate: new Date().toISOString().split('T')[0],
  uniqueIPs: new Set(),
  todayUniqueIPs: new Set(),
  lastViewed: new Date().toISOString(),
  history: [],
}

// Admin key for accessing stats (should be env variable in production)
const ADMIN_KEY = process.env.VIEW_COUNTER_KEY || 'vox-terra-admin-2024'

// Reset daily stats at midnight
function checkDayRollover() {
  const today = new Date().toISOString().split('T')[0]
  if (stats.todayDate !== today) {
    // Store yesterday's stats in history
    stats.history.push({
      date: stats.todayDate,
      views: stats.today,
      uniques: stats.todayUniqueIPs.size,
    })
    // Keep only last 30 days
    if (stats.history.length > 30) {
      stats.history.shift()
    }
    // Reset today's stats
    stats.todayDate = today
    stats.today = 0
    stats.todayUniqueIPs.clear()
  }
}

// GET - Record a view (public) or get stats (admin only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const adminKey = searchParams.get('key')
  const action = searchParams.get('action')
  
  // Check for day rollover
  checkDayRollover()
  
  // Admin stats access
  if (adminKey === ADMIN_KEY && action === 'stats') {
    return NextResponse.json({
      total: stats.total,
      totalUniques: stats.uniqueIPs.size,
      today: stats.today,
      todayUniques: stats.todayUniqueIPs.size,
      lastViewed: stats.lastViewed,
      history: stats.history.slice(-7), // Last 7 days
    })
  }
  
  // Public: Record a view
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown'
  
  // Increment counters
  stats.total++
  stats.today++
  stats.lastViewed = new Date().toISOString()
  
  // Track unique IPs
  const ipHash = Buffer.from(ip).toString('base64').slice(0, 16) // Simple hash for privacy
  stats.uniqueIPs.add(ipHash)
  stats.todayUniqueIPs.add(ipHash)
  
  // Return minimal response (just acknowledge)
  return NextResponse.json({ ok: true }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}

// POST - Alternative view recording endpoint
export async function POST(request: NextRequest) {
  checkDayRollover()
  
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown'
  
  stats.total++
  stats.today++
  stats.lastViewed = new Date().toISOString()
  
  const ipHash = Buffer.from(ip).toString('base64').slice(0, 16)
  stats.uniqueIPs.add(ipHash)
  stats.todayUniqueIPs.add(ipHash)
  
  return NextResponse.json({ ok: true })
}
