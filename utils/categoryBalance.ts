/**
 * Category Balance System
 * 
 * Ensures even distribution of events across categories with specific focus areas:
 * - Sports (American focus): 10-15 events
 * - Science/Breakthrough: 10-15 events
 * - Entertainment/Feel-good: 8-12 events globally
 * - All other categories: 8-12 events each
 * 
 * Also handles deduplication to prevent overlapping stories.
 */

import { Event, EventType } from '@/types/event'
import { extractCountriesFromEvents } from './countryExtractor'
import { fetchGoogleTrendsByCountry } from './googleTrendsByCountry'

// ============================================================================
// CATEGORY TARGETS
// ============================================================================

export interface CategoryTarget {
  category: EventType
  minCount: number
  maxCount: number
  priority: number // Higher = more important to fill
}

const CATEGORY_TARGETS: CategoryTarget[] = [
  // High priority categories (user-requested focus)
  { category: 'sports', minCount: 10, maxCount: 15, priority: 10 },
  { category: 'science', minCount: 10, maxCount: 15, priority: 10 },
  { category: 'entertainment', minCount: 8, maxCount: 12, priority: 9 },
  
  // Standard categories
  { category: 'breaking', minCount: 8, maxCount: 12, priority: 8 },
  { category: 'politics', minCount: 8, maxCount: 12, priority: 8 },
  { category: 'business', minCount: 8, maxCount: 12, priority: 8 },
  { category: 'technology', minCount: 8, maxCount: 12, priority: 8 },
  { category: 'health', minCount: 8, maxCount: 12, priority: 8 },
  
  // Lower priority but still represented
  { category: 'crime', minCount: 6, maxCount: 10, priority: 6 },
  { category: 'armed-conflict', minCount: 6, maxCount: 10, priority: 6 },
  { category: 'terrorism', minCount: 4, maxCount: 8, priority: 5 },
  { category: 'civil-unrest', minCount: 4, maxCount: 8, priority: 5 },
  
  // Disaster categories (less frequent but important)
  { category: 'natural-disaster', minCount: 4, maxCount: 8, priority: 6 },
  { category: 'earthquake', minCount: 2, maxCount: 5, priority: 5 }, // Reduced: max 5 earthquakes
  { category: 'volcano', minCount: 2, maxCount: 6, priority: 4 },
  { category: 'wildfire', minCount: 3, maxCount: 7, priority: 5 },
  { category: 'storm', minCount: 3, maxCount: 7, priority: 5 },
  { category: 'tsunami', minCount: 2, maxCount: 6, priority: 4 },
  { category: 'flood', minCount: 3, maxCount: 7, priority: 5 },
  
  // Fallback
  { category: 'other', minCount: 4, maxCount: 8, priority: 4 },
]

// ============================================================================
// GEOGRAPHIC REGIONS (for regional story distribution)
// ============================================================================

interface GeographicRegion {
  name: string
  latRange: [number, number]
  lngRange: [number, number]
}

// Major regions with weighted distribution for balanced global coverage
// Weighted: Americas (30%), Europe (25%), Asia-Pacific (20%), Middle East (15%), Africa (10%)
interface WeightedRegion extends GeographicRegion {
  weight: number // Percentage of markers (0.0 - 1.0)
  minStories: number // Minimum stories for this region
  targetStories: number // Target stories for this region
}

const MAJOR_REGIONS: WeightedRegion[] = [
  { name: 'Americas', latRange: [-60, 75], lngRange: [-180, -30], weight: 0.25, minStories: 5, targetStories: 10 },
  { name: 'Europe', latRange: [35, 75], lngRange: [-15, 40], weight: 0.20, minStories: 4, targetStories: 8 },
  { name: 'Asia-Pacific', latRange: [-50, 75], lngRange: [60, 180], weight: 0.20, minStories: 4, targetStories: 10 }, // Increased
  { name: 'Middle East', latRange: [12, 42], lngRange: [25, 60], weight: 0.12, minStories: 2, targetStories: 5 },
  { name: 'Africa', latRange: [-35, 35], lngRange: [-20, 55], weight: 0.15, minStories: 4, targetStories: 8 }, // Increased
  { name: 'Oceania', latRange: [-50, 0], lngRange: [110, 180], weight: 0.08, minStories: 2, targetStories: 5 }, // NEW
]

// Legacy regions (for feel-good story distribution)
const GEOGRAPHIC_REGIONS: GeographicRegion[] = [
  { name: 'North America', latRange: [15, 75], lngRange: [-180, -50] },
  { name: 'South America', latRange: [-60, 15], lngRange: [-90, -30] },
  { name: 'Europe', latRange: [35, 75], lngRange: [-15, 40] },
  { name: 'Africa', latRange: [-35, 35], lngRange: [-20, 55] },
  { name: 'Asia', latRange: [-10, 75], lngRange: [40, 180] },
  { name: 'Oceania', latRange: [-50, 0], lngRange: [110, 180] },
]

function isInRegion(event: Event, region: GeographicRegion): boolean {
  const { latitude, longitude } = event
  
  return (
    latitude >= region.latRange[0] &&
    latitude <= region.latRange[1] &&
    longitude >= region.lngRange[0] &&
    longitude <= region.lngRange[1]
  )
}

function getGeographicRegion(event: Event): string {
  const { latitude, longitude } = event
  
  for (const region of GEOGRAPHIC_REGIONS) {
    if (isInRegion(event, region)) {
      return region.name
    }
  }
  
  return 'Other'
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Calculate title similarity (0-1, where 1 is identical)
 */
function titleSimilarity(title1: string, title2: string): number {
  const normalized1 = title1.toLowerCase().trim()
  const normalized2 = title2.toLowerCase().trim()
  
  if (normalized1 === normalized2) return 1.0
  
  const maxLen = Math.max(normalized1.length, normalized2.length)
  if (maxLen === 0) return 1.0
  
  const distance = levenshteinDistance(normalized1, normalized2)
  return 1 - (distance / maxLen)
}

/**
 * Extract key subject keywords from title
 */
function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
  ])
  
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5) // Top 5 keywords
}

/**
 * Check if two events are about the same subject
 */
function areSameSubject(event1: Event, event2: Event): boolean {
  // Check title similarity
  const similarity = titleSimilarity(event1.title, event2.title)
  if (similarity > 0.7) return true // Very similar titles
  
  // Check keyword overlap
  const keywords1 = extractKeywords(event1.title)
  const keywords2 = extractKeywords(event2.title)
  const commonKeywords = keywords1.filter(k => keywords2.includes(k))
  if (commonKeywords.length >= 2) return true // At least 2 common keywords
  
  // Check location proximity (< 50 miles) and time window (< 24 hours)
  const timeDiff = Math.abs(event1.timestamp - event2.timestamp)
  const timeWindow = 24 * 60 * 60 * 1000 // 24 hours
  
  if (timeDiff < timeWindow) {
    const distance = haversineDistance(
      event1.latitude,
      event1.longitude,
      event2.latitude,
      event2.longitude
    )
    
    if (distance < 50) {
      // Same location and time window - likely same subject
      return true
    }
  }
  
  return false
}

/**
 * Haversine distance calculation (miles)
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const toRad = (deg: number) => deg * (Math.PI / 180)
  
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Deduplicate events - remove overlapping stories
 */
function deduplicateEvents(events: Event[]): Event[] {
  const deduplicated: Event[] = []
  const seen = new Set<string>()
  
  // Sort by priority (severity + recency) to keep best version of duplicate
  const sorted = [...events].sort((a, b) => {
    const scoreA = (a.severity || 0) + (Date.now() - a.timestamp) / (1000 * 60 * 60 * 24)
    const scoreB = (b.severity || 0) + (Date.now() - b.timestamp) / (1000 * 60 * 60 * 24)
    return scoreB - scoreA
  })
  
  for (const event of sorted) {
    if (seen.has(event.id)) continue
    
    // Check if this event is a duplicate of any already included
    let isDuplicate = false
    for (const existing of deduplicated) {
      if (areSameSubject(event, existing)) {
        isDuplicate = true
        break
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(event)
      seen.add(event.id)
    }
  }
  
  return deduplicated
}

// ============================================================================
// CATEGORY BALANCING
// ============================================================================

/**
 * Balance events across categories according to targets
 */
export function balanceCategories(events: Event[]): Event[] {
  if (events.length === 0) return events
  
  // Step 1: Deduplicate overlapping stories
  const deduplicated = deduplicateEvents(events)
  
  // Step 2: Group events by category
  const eventsByCategory = new Map<EventType, Event[]>()
  for (const event of deduplicated) {
    const category = event.type
    if (!eventsByCategory.has(category)) {
      eventsByCategory.set(category, [])
    }
    eventsByCategory.get(category)!.push(event)
  }
  
  // Step 3: Sort events within each category by priority (severity + recency)
  for (const [category, categoryEvents] of eventsByCategory.entries()) {
    categoryEvents.sort((a, b) => {
      const scoreA = (a.severity || 0) * 10 + (Date.now() - a.timestamp) / (1000 * 60 * 60)
      const scoreB = (b.severity || 0) * 10 + (Date.now() - b.timestamp) / (1000 * 60 * 60)
      return scoreB - scoreA
    })
  }
  
  // Step 3.5: Natural disaster cap (max 10 total)
  const naturalDisasterTypes: EventType[] = ['earthquake', 'volcano', 'wildfire', 'storm', 'tsunami', 'flood', 'natural-disaster']
  const MAX_NATURAL_DISASTERS = 10
  let naturalDisasterCount = 0
  
  // Step 4: Apply category targets with natural disaster cap
  const selected: Event[] = []
  const categoryCounts = new Map<EventType, number>()
  
  // First pass: Fill minimums for each category (respecting natural disaster cap)
  for (const target of CATEGORY_TARGETS) {
    const categoryEvents = eventsByCategory.get(target.category) || []
    const isNaturalDisaster = naturalDisasterTypes.includes(target.category)
    
    let minToTake = Math.min(target.minCount, categoryEvents.length)
    
    // Enforce natural disaster cap
    if (isNaturalDisaster) {
      const remainingDisasterSlots = MAX_NATURAL_DISASTERS - naturalDisasterCount
      minToTake = Math.min(minToTake, remainingDisasterSlots)
    }
    
    const taken = categoryEvents.slice(0, minToTake)
    selected.push(...taken)
    categoryCounts.set(target.category, taken.length)
    
    if (isNaturalDisaster) {
      naturalDisasterCount += taken.length
    }
  }
  
  // Step 5: Hard regional quota enforcement - block until goals are met
  // Initialize regional quotas
  const regionalQuotas = new Map<string, { current: number; target: number; min: number }>()
  for (const region of MAJOR_REGIONS) {
    regionalQuotas.set(region.name, { current: 0, target: region.targetStories, min: region.minStories })
  }
  
  // Count current regional distribution
  const allSelectedIds = new Set(selected.map(e => e.id))
  for (const event of selected) {
    for (const region of MAJOR_REGIONS) {
      if (isInRegion(event, region)) {
        const quota = regionalQuotas.get(region.name)!
        quota.current++
        break
      }
    }
  }
  
  // Function to check if event can be added based on regional quotas
  function canAddEvent(event: Event): boolean {
    for (const region of MAJOR_REGIONS) {
      if (isInRegion(event, region)) {
        const quota = regionalQuotas.get(region.name)!
        // If region has met target, block new events from this region
        if (quota.current >= quota.target) {
          return false
        }
        // If region is below minimum, prioritize it
        return true
      }
    }
    return true // Unknown region, allow
  }
  
  // Fill regional minimums first (hard enforcement)
  for (const region of MAJOR_REGIONS) {
    const quota = regionalQuotas.get(region.name)!
    if (quota.current < quota.min) {
      const needed = quota.min - quota.current
      
      // Find events from this region (respecting natural disaster cap)
      const availableFromRegion = deduplicated
        .filter(e => {
          if (allSelectedIds.has(e.id)) return false
          if (!isInRegion(e, region)) return false
          
          // Check natural disaster cap
          if (naturalDisasterTypes.includes(e.type)) {
            if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) return false
          }
          
          return true
        })
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, needed)
      
      for (const event of availableFromRegion) {
        if (naturalDisasterTypes.includes(event.type)) {
          if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) break
          naturalDisasterCount++
        }
        selected.push(event)
        allSelectedIds.add(event.id)
        quota.current++
      }
    }
  }
  
  // Fill regional targets (still respecting quotas)
  for (const region of MAJOR_REGIONS) {
    const quota = regionalQuotas.get(region.name)!
    if (quota.current < quota.target) {
      const needed = quota.target - quota.current
      
      const availableFromRegion = deduplicated
        .filter(e => {
          if (allSelectedIds.has(e.id)) return false
          if (!isInRegion(e, region)) return false
          
          // Check natural disaster cap
          if (naturalDisasterTypes.includes(e.type)) {
            if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) return false
          }
          
          return true
        })
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, needed)
      
      for (const event of availableFromRegion) {
        if (naturalDisasterTypes.includes(event.type)) {
          if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) break
          naturalDisasterCount++
        }
        selected.push(event)
        allSelectedIds.add(event.id)
        quota.current++
      }
    }
  }
  
  // Also ensure minimum per category per region for key categories
  const keyCategories: EventType[] = ['politics', 'business', 'technology', 'sports', 'entertainment']
  
  for (const category of keyCategories) {
    const categoryEvents = eventsByCategory.get(category) || []
    const selectedFromCategory = selected.filter(e => e.type === category)
    
    for (const region of MAJOR_REGIONS) {
      const regionEventsInCategory = selectedFromCategory.filter(e => isInRegion(e, region))
      
      // Ensure at least 1 event per key category per major region (if available)
      if (regionEventsInCategory.length < 1) {
        const availableInRegion = categoryEvents
          .filter(e => !allSelectedIds.has(e.id) && isInRegion(e, region))
          .slice(0, 2)
        
        selected.push(...availableInRegion)
        availableInRegion.forEach(e => allSelectedIds.add(e.id))
      }
    }
  }
  
  // Step 6: Special handling for feel-good stories (entertainment) - ensure geographic diversity
  const entertainmentEvents = eventsByCategory.get('entertainment') || []
  const entertainmentSelected = selected.filter(e => e.type === 'entertainment')
  const entertainmentRegions = new Set(entertainmentSelected.map(getGeographicRegion))
  
  // Add entertainment events from underrepresented regions
  const entertainmentTarget = CATEGORY_TARGETS.find(t => t.category === 'entertainment')!
  const currentEntertainmentCount = categoryCounts.get('entertainment') || 0
  const remainingSlots = entertainmentTarget.maxCount - currentEntertainmentCount
  
  if (remainingSlots > 0) {
    const remainingEntertainment = entertainmentEvents
      .filter(e => !selected.find(sel => sel.id === e.id))
      .slice(0, remainingSlots)
    
    const regionGroups = new Map<string, Event[]>()
    
    for (const event of remainingEntertainment) {
      const region = getGeographicRegion(event)
      if (!regionGroups.has(region)) {
        regionGroups.set(region, [])
      }
      regionGroups.get(region)!.push(event)
    }
    
    // Prioritize events from regions not yet represented
    const underrepresentedRegions = Array.from(regionGroups.entries())
      .filter(([region]) => !entertainmentRegions.has(region))
      .sort((a, b) => b[1].length - a[1].length)
    
    let added = 0
    for (const [, regionEvents] of underrepresentedRegions) {
      if (added >= remainingSlots) break
      for (const event of regionEvents) {
        if (added >= remainingSlots) break
        if (!selected.find(e => e.id === event.id)) {
          selected.push(event)
          added++
          categoryCounts.set('entertainment', (categoryCounts.get('entertainment') || 0) + 1)
        }
      }
    }
    
    // Fill remaining slots with any entertainment events
    for (const event of remainingEntertainment) {
      if (added >= remainingSlots) break
      if (!selected.find(e => e.id === event.id)) {
        selected.push(event)
        added++
        categoryCounts.set('entertainment', (categoryCounts.get('entertainment') || 0) + 1)
      }
    }
  }
  
  // Step 7: Fill remaining slots up to maxCount for each category (respecting quotas and caps)
  for (const target of CATEGORY_TARGETS) {
    const currentCount = categoryCounts.get(target.category) || 0
    const remaining = target.maxCount - currentCount
    const isNaturalDisaster = naturalDisasterTypes.includes(target.category)
    
    if (remaining > 0) {
      const categoryEvents = eventsByCategory.get(target.category) || []
      const alreadySelected = selected.filter(e => e.type === target.category)
      const alreadySelectedIds = new Set(alreadySelected.map(e => e.id))
      
      let remainingEvents = categoryEvents.filter(e => {
        if (alreadySelectedIds.has(e.id)) return false
        if (!canAddEvent(e)) return false // Respect regional quotas
        return true
      })
      
      // Enforce natural disaster cap
      if (isNaturalDisaster) {
        const remainingDisasterSlots = MAX_NATURAL_DISASTERS - naturalDisasterCount
        remainingEvents = remainingEvents.slice(0, remainingDisasterSlots)
      }
      
      const toAdd = remainingEvents.slice(0, remaining)
      
      for (const event of toAdd) {
        if (isNaturalDisaster) {
          if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) break
          naturalDisasterCount++
        }
        selected.push(event)
        allSelectedIds.add(event.id)
        
        // Update regional quota
        for (const region of MAJOR_REGIONS) {
          if (isInRegion(event, region)) {
            const quota = regionalQuotas.get(region.name)!
            quota.current++
            break
          }
        }
      }
      
      categoryCounts.set(target.category, currentCount + toAdd.length)
    }
  }
  
  // Step 8: Fill any remaining slots with highest priority events (respecting all quotas)
  const maxTotalEvents = 150 // Reasonable cap
  if (selected.length < maxTotalEvents) {
    const remaining = maxTotalEvents - selected.length
    const selectedIds = new Set(selected.map(e => e.id))
    
    const remainingEvents = deduplicated
      .filter(e => {
        if (selectedIds.has(e.id)) return false
        if (!canAddEvent(e)) return false // Respect regional quotas
        
        // Check natural disaster cap
        if (naturalDisasterTypes.includes(e.type)) {
          if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) return false
        }
        
        return true
      })
      .sort((a, b) => {
        const scoreA = (a.severity || 0) * 10 + (Date.now() - a.timestamp) / (1000 * 60 * 60)
        const scoreB = (b.severity || 0) * 10 + (Date.now() - b.timestamp) / (1000 * 60 * 60)
        return scoreB - scoreA
      })
    
    for (const event of remainingEvents.slice(0, remaining)) {
      if (naturalDisasterTypes.includes(event.type)) {
        if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) break
        naturalDisasterCount++
      }
      selected.push(event)
      
      // Update regional quota
      for (const region of MAJOR_REGIONS) {
        if (isInRegion(event, region)) {
          const quota = regionalQuotas.get(region.name)!
          quota.current++
          break
        }
      }
    }
  }
  
  // Log distribution for debugging
  const finalDistribution = new Map<EventType, number>()
  const regionalDistribution = new Map<string, Map<EventType, number>>()
  
  for (const event of selected) {
    finalDistribution.set(event.type, (finalDistribution.get(event.type) || 0) + 1)
    
    // Track regional distribution
    for (const region of MAJOR_REGIONS) {
      if (isInRegion(event, region)) {
        if (!regionalDistribution.has(region.name)) {
          regionalDistribution.set(region.name, new Map())
        }
        const regionMap = regionalDistribution.get(region.name)!
        regionMap.set(event.type, (regionMap.get(event.type) || 0) + 1)
        break
      }
    }
  }
  
  // Step 9: Country-level balance enforcement
  // Ensure each country has at least 1-2 stories
  const countryQuotas = new Map<string, { current: number; min: number; target: number }>()
  const countryOptions = extractCountriesFromEvents(selected)
  const allCountries = countryOptions.map(c => c.value.toLowerCase())
  
  // Initialize quotas: each country needs at least 1 story, target 2-3
  for (const country of allCountries) {
    if (!countryQuotas.has(country)) {
      countryQuotas.set(country, { current: 0, min: 1, target: 2 })
    }
  }
  
  // Also add countries from all events (not just selected) to ensure coverage
  const allEventCountries = extractCountriesFromEvents(deduplicated)
  for (const countryOpt of allEventCountries) {
    const country = countryOpt.value.toLowerCase()
    if (!countryQuotas.has(country)) {
      countryQuotas.set(country, { current: 0, min: 1, target: 2 })
    }
  }
  
  // Count current country distribution
  for (const event of selected) {
    const country = event.metadata?.country as string | undefined
    if (country) {
      const countryLower = country.toLowerCase()
      const quota = countryQuotas.get(countryLower)
      if (quota) {
        quota.current++
      } else {
        // New country found, add to quotas
        countryQuotas.set(countryLower, { current: 1, min: 1, target: 2 })
      }
    }
  }
  
  // Fill country minimums (if we have events available)
  const selectedIds = new Set(selected.map(e => e.id))
  for (const [country, quota] of countryQuotas.entries()) {
    if (quota.current < quota.min) {
      const needed = quota.min - quota.current
      
      // Find events from this country
      const availableFromCountry = deduplicated
        .filter(e => {
          if (selectedIds.has(e.id)) return false
          const eventCountry = e.metadata?.country as string | undefined
          if (!eventCountry) return false
          const eventCountryLower = eventCountry.toLowerCase()
          const countryLower = country.toLowerCase()
          
          // Direct match
          if (eventCountryLower === countryLower) return true
          
          // Match via country options (keywords/aliases)
          const countryOpt = allEventCountries.find(c => 
            c.value.toLowerCase() === countryLower
          )
          if (countryOpt) {
            const matches = countryOpt.keywords.some(kw => 
              eventCountryLower.includes(kw.toLowerCase()) || 
              kw.toLowerCase().includes(eventCountryLower) ||
              eventCountryLower === kw.toLowerCase()
            )
            if (matches) return true
          }
          
          return false
          
          // Check natural disaster cap
          if (naturalDisasterTypes.includes(e.type)) {
            if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) return false
          }
          
          return true
        })
        .sort((a, b) => (b.severity || 0) - (a.severity || 0))
        .slice(0, needed)
      
      for (const event of availableFromCountry) {
        if (naturalDisasterTypes.includes(event.type)) {
          if (naturalDisasterCount >= MAX_NATURAL_DISASTERS) break
          naturalDisasterCount++
        }
        selected.push(event)
        selectedIds.add(event.id)
        quota.current++
      }
    }
  }
  
  console.log('[CategoryBalance] Final distribution:', Object.fromEntries(finalDistribution))
  console.log('[CategoryBalance] Regional distribution:', 
    Object.fromEntries(Array.from(regionalDistribution.entries()).map(([region, cats]) => 
      [region, Object.fromEntries(cats)]
    ))
  )
  console.log('[CategoryBalance] Natural disasters:', naturalDisasterCount, '/', MAX_NATURAL_DISASTERS)
  console.log('[CategoryBalance] Regional quotas:', 
    Object.fromEntries(Array.from(regionalQuotas.entries()).map(([region, quota]) => 
      [region, `${quota.current}/${quota.target} (min: ${quota.min})`]
    ))
  )
  console.log('[CategoryBalance] Country distribution:', 
    Object.fromEntries(Array.from(countryQuotas.entries())
      .filter(([_, quota]) => quota.current > 0)
      .map(([country, quota]) => 
        [country, `${quota.current}/${quota.target} (min: ${quota.min})`]
      )
    )
  )
  
  return selected
}
