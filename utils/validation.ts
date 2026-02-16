/**
 * Validation utilities for data quality checks
 */

/**
 * Capitalize location names professionally
 * Handles cities, countries, regions with proper title case
 * Preserves acronyms (USA, UK, UAE) and special cases
 */
export function capitalizeLocation(location: string | null | undefined): string {
  if (!location || typeof location !== 'string') return 'Unknown'
  
  const trimmed = location.trim()
  if (!trimmed) return 'Unknown'
  
  // Special cases: acronyms and abbreviations to preserve
  const acronyms = ['usa', 'uk', 'uae', 'ussr', 'eu', 'un', 'nato', 'dc', 'd.c.']
  const preserveUpper = new Set(['USA', 'UK', 'UAE', 'USSR', 'EU', 'UN', 'NATO', 'DC', 'D.C.'])
  
  // Words that should stay lowercase (unless first word)
  const lowercaseWords = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'de', 'la', 'del', 'el'])
  
  return trimmed
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      
      // Check if it's an acronym
      if (acronyms.includes(lower)) {
        return preserveUpper.has(word.toUpperCase()) ? word.toUpperCase() : word.toUpperCase()
      }
      
      // Keep lowercase words lowercase (except first word)
      if (index > 0 && lowercaseWords.has(lower)) {
        return lower
      }
      
      // Title case: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lng).toFixed(2)}°${lngDir}`
}

/**
 * Validate URL format and basic structure
 */
export function validateUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  // Check for empty string or just '#'
  if (url.trim() === '' || url.trim() === '#') {
    return false
  }

  try {
    // Try to create URL object (works for http/https and relative URLs)
    const urlObj = new URL(url, window.location.origin)
    
    // Basic validation: must have protocol or be a valid relative path
    return urlObj.protocol === 'http:' || 
           urlObj.protocol === 'https:' || 
           url.startsWith('/') ||
           url.startsWith('./')
  } catch {
    // If URL constructor fails, it's invalid
    return false
  }
}

/**
 * Validate geographic coordinates
 */
export function validateCoordinates(
  lat: number | null | undefined,
  lon: number | null | undefined
): { valid: boolean; error?: string } {
  // Check for null/undefined
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return { valid: false, error: 'Coordinates are null or undefined' }
  }

  // Check for NaN
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Coordinates are NaN' }
  }

  // Check for valid ranges
  if (lat < -90 || lat > 90) {
    return { valid: false, error: `Latitude ${lat} is outside valid range (-90 to 90)` }
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, error: `Longitude ${lon} is outside valid range (-180 to 180)` }
  }

  return { valid: true }
}

/**
 * Basic country validation
 * Checks if country name is not empty and not "Unknown"
 */
export function validateCountry(
  country: string | null | undefined,
  lat?: number,
  lon?: number
): { valid: boolean; error?: string } {
  if (!country || typeof country !== 'string') {
    return { valid: false, error: 'Country is missing or invalid' }
  }

  const trimmed = country.trim()
  
  if (trimmed === '' || trimmed.toLowerCase() === 'unknown' || trimmed.toLowerCase() === 'unknown country') {
    return { valid: false, error: 'Country is empty or unknown' }
  }

  // Basic sanity check: country should not be coordinates
  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    return { valid: false, error: 'Country appears to be a number (possibly coordinates)' }
  }

  return { valid: true }
}

/**
 * Validate event data structure
 */
export function validateEventData(event: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!event) {
    return { valid: false, errors: ['Event is null or undefined'] }
  }

  // Check required fields
  if (!event.id || typeof event.id !== 'string') {
    errors.push('Event ID is missing or invalid')
  }

  if (typeof event.timestamp !== 'number' || isNaN(event.timestamp)) {
    errors.push('Event timestamp is missing or invalid')
  }

  // Validate coordinates
  const coordValidation = validateCoordinates(event.latitude, event.longitude)
  if (!coordValidation.valid) {
    errors.push(`Coordinate validation failed: ${coordValidation.error}`)
  }

  // Validate URL if present
  if (event.metadata?.url && !validateUrl(event.metadata.url)) {
    errors.push('Event URL is invalid')
  }

  // Validate country if present
  if (event.metadata?.country) {
    const countryValidation = validateCountry(
      event.metadata.country,
      event.latitude,
      event.longitude
    )
    if (!countryValidation.valid) {
      errors.push(`Country validation failed: ${countryValidation.error}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validation result for event rendering
 */
export interface EventRenderValidation {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
  sanitizedEvent: any
}

/**
 * Validate event for UI rendering
 * Checks required fields: title, severity, source, timestamp
 * Returns sanitized event with safe defaults for missing fields
 */
export function validateEventForRender(event: any): EventRenderValidation {
  const missingFields: string[] = []
  const warnings: string[] = []
  const sanitizedEvent = { ...event }

  if (!event) {
    return {
      isValid: false,
      missingFields: ['event'],
      warnings: ['Event is null or undefined'],
      sanitizedEvent: null,
    }
  }

  // Validate title
  if (!event.title || typeof event.title !== 'string' || event.title.trim() === '') {
    missingFields.push('title')
    warnings.push('Event title is missing or empty')
    sanitizedEvent.title = 'Untitled Event'
  }

  // Validate severity
  if (
    event.severity === null ||
    event.severity === undefined ||
    typeof event.severity !== 'number' ||
    isNaN(event.severity) ||
    event.severity < 0 ||
    event.severity > 10
  ) {
    missingFields.push('severity')
    warnings.push(`Event severity is missing or invalid (got: ${event.severity})`)
    sanitizedEvent.severity = 5 // Default to medium severity
  }

  // Validate source
  if (!event.source || typeof event.source !== 'string' || event.source.trim() === '') {
    missingFields.push('source')
    warnings.push('Event source is missing or empty')
    sanitizedEvent.source = 'unknown'
  }

  // Validate timestamp
  if (
    typeof event.timestamp !== 'number' ||
    isNaN(event.timestamp) ||
    event.timestamp <= 0
  ) {
    missingFields.push('timestamp')
    warnings.push(`Event timestamp is missing or invalid (got: ${event.timestamp})`)
    sanitizedEvent.timestamp = Date.now() // Default to current time
  }

  // Additional validation warnings (non-critical)
  if (!event.id || typeof event.id !== 'string') {
    warnings.push('Event ID is missing or invalid')
    sanitizedEvent.id = sanitizedEvent.id || `event-${Date.now()}`
  }

  if (!event.type) {
    warnings.push('Event type is missing')
    sanitizedEvent.type = 'other'
  }

  if (!event.latitude || !event.longitude) {
    warnings.push('Event coordinates are missing')
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
    sanitizedEvent,
  }
}
