/**
 * Event Type Definitions
 * 
 * Comprehensive news categories covering global events from
 * breaking news to sports, politics, business, and disasters.
 */

export type EventType = 
  // News Categories
  | 'breaking'            // Breaking/urgent news
  | 'politics'            // Elections, government, policy
  | 'sports'              // Sports events, championships
  | 'business'            // Economy, markets, companies
  | 'technology'          // Tech news, startups, AI
  | 'entertainment'       // Movies, music, celebrities
  | 'health'              // Medical, healthcare, disease
  | 'science'             // Research, discoveries, space
  | 'crime'               // Crime, investigations, justice
  
  // Conflict Categories
  | 'armed-conflict'      // War, military operations
  | 'terrorism'           // Terror attacks, extremism
  | 'civil-unrest'        // Protests, riots, uprisings
  
  // Disaster Categories
  | 'natural-disaster'    // General natural disasters
  | 'earthquake'          // Seismic events
  | 'volcano'             // Volcanic activity
  | 'wildfire'            // Forest/bush fires
  | 'storm'               // Hurricanes, typhoons, cyclones
  | 'tsunami'             // Tsunami events
  | 'flood'               // Flooding events
  
  // Fallback
  | 'other'               // Uncategorized

export type SeverityLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type EventDuration = 'single' | 'ongoing'

export interface Article {
  id: string
  title: string
  description?: string
  timestamp: number
  source: string
  url: string
  sourceName: string
  publishedAt: string
  type: EventType
  severity: SeverityLevel
  metadata: Record<string, any>
}

export interface Event {
  id: string
  timestamp: number
  latitude: number
  longitude: number
  type: EventType
  severity: SeverityLevel
  title: string
  description?: string
  source: string
  metadata: Record<string, any>
  articles: Article[]
  articleCount: number
  duration?: EventDuration
  isOngoing?: boolean
  startedAt?: number
  lastUpdated?: number
  resolvedAt?: number
}
