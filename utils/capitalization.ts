/**
 * Capitalization Utility
 * 
 * Proper noun capitalization following standard rules:
 * - Handle common words: "of", "the", "and", "de", "la", "el", "del"
 * - Handle special cases: "New York", "United States", "United Kingdom"
 * - Handle abbreviations: "USA", "UK", "UAE"
 * - Handle compound names: "Los Angeles", "San Francisco"
 */

// Common words that should remain lowercase (unless first word)
const COMMON_WORDS = new Set([
  'of', 'the', 'and', 'de', 'del', 'van', 'von', 'da', 'di', 'du',
  'la', 'le', 'les', 'el', 'los', 'las', 'al', 'a', 'an', 'in', 'on', 'at',
])

// Prefixes that should be capitalized
const PREFIXES = new Set([
  'new', 'san', 'santa', 'saint', 'st', 'los', 'las', 'el', 'la',
  'mount', 'mt', 'fort', 'ft', 'port', 'pt', 'saint', 'st',
])

// Known abbreviations (should stay uppercase)
const ABBREVIATIONS = new Set([
  'usa', 'uk', 'uae', 'eu', 'nato', 'un', 'who', 'fbi', 'cia',
  'nyc', 'la', 'sf', 'dc', 'ny', 'ca', 'tx', 'fl',
])

/**
 * Capitalize a single word, handling prefixes and special cases
 */
function capitalizeWord(word: string, prefixList: string[] = []): string {
  if (!word) return word
  
  const lower = word.toLowerCase()
  
  // Abbreviations stay uppercase
  if (ABBREVIATIONS.has(lower)) {
    return word.toUpperCase()
  }
  
  // Handle prefixes
  for (const prefix of prefixList) {
    if (lower.startsWith(prefix)) {
      return prefix.charAt(0).toUpperCase() + prefix.slice(1) + 
             word.slice(prefix.length).charAt(0).toUpperCase() + 
             word.slice(prefix.length + 1).toLowerCase()
    }
  }
  
  // Standard capitalization
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Capitalize location names following proper noun rules
 */
export function capitalizeLocation(location: string | undefined): string {
  if (!location) return ''
  
  // Handle abbreviations (already uppercase)
  const upperLocation = location.toUpperCase()
  if (ABBREVIATIONS.has(location.toLowerCase())) {
    return upperLocation
  }
  
  // Split by common delimiters
  const words = location.split(/[\s,\-]+/).filter(w => w.length > 0)
  
  if (words.length === 0) return location
  
  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      
      // First word always capitalized
      if (index === 0) {
        // Check if it's a prefix
        if (PREFIXES.has(lower)) {
          return capitalizeWord(word, [lower])
        }
        return capitalizeWord(word)
      }
      
      // Common words stay lowercase (unless part of a known compound)
      if (COMMON_WORDS.has(lower)) {
        // Special cases: "of" in "United States of America" stays lowercase
        // But "The" at start of second word should be capitalized
        if (lower === 'the' && index === 1 && words[0].toLowerCase() === 'united') {
          return 'The'
        }
        return lower
      }
      
      // Prefixes get capitalized
      if (PREFIXES.has(lower)) {
        return capitalizeWord(word)
      }
      
      // Standard capitalization
      return capitalizeWord(word)
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Capitalize country names with special handling
 */
export function capitalizeCountry(country: string | undefined): string {
  if (!country) return ''
  
  // Known country name mappings
  const countryMappings: Record<string, string> = {
    'united states': 'United States',
    'united states of america': 'United States of America',
    'usa': 'United States',
    'united kingdom': 'United Kingdom',
    'uk': 'United Kingdom',
    'great britain': 'Great Britain',
    'russian federation': 'Russian Federation',
    'russia': 'Russia',
    "people's republic of china": "People's Republic of China",
    'china': 'China',
    'south korea': 'South Korea',
    'north korea': 'North Korea',
    'united arab emirates': 'United Arab Emirates',
    'uae': 'United Arab Emirates',
    'saudi arabia': 'Saudi Arabia',
    'new zealand': 'New Zealand',
    'south africa': 'South Africa',
    'sri lanka': 'Sri Lanka',
  }
  
  const normalized = country.toLowerCase().trim()
  if (countryMappings[normalized]) {
    return countryMappings[normalized]
  }
  
  return capitalizeLocation(country)
}

/**
 * Capitalize city names with special handling
 */
export function capitalizeCity(city: string | undefined): string {
  if (!city) return ''
  
  // Known city name mappings
  const cityMappings: Record<string, string> = {
    'new york': 'New York',
    'new york city': 'New York City',
    'los angeles': 'Los Angeles',
    'san francisco': 'San Francisco',
    'san diego': 'San Diego',
    'las vegas': 'Las Vegas',
    'rio de janeiro': 'Rio de Janeiro',
    'são paulo': 'São Paulo',
    'buenos aires': 'Buenos Aires',
    'mexico city': 'Mexico City',
    'hong kong': 'Hong Kong',
    'kuala lumpur': 'Kuala Lumpur',
    'new delhi': 'New Delhi',
  }
  
  const normalized = city.toLowerCase().trim()
  if (cityMappings[normalized]) {
    return cityMappings[normalized]
  }
  
  return capitalizeLocation(city)
}

/**
 * Capitalize any location-related string (country, city, or general location)
 */
export function capitalizePlace(place: string | undefined): string {
  if (!place) return ''
  
  // Try country first
  const countryResult = capitalizeCountry(place)
  if (countryResult !== place) {
    return countryResult
  }
  
  // Try city
  const cityResult = capitalizeCity(place)
  if (cityResult !== place) {
    return cityResult
  }
  
  // Fallback to general location capitalization
  return capitalizeLocation(place)
}
