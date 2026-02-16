/**
 * Country Extractor Utility
 * 
 * Dynamically extracts all unique countries from events and normalizes them.
 * Handles country name variations and generates keywords for matching.
 */

import { Event } from '@/types/event'
import { capitalizeCountry } from './capitalization'

export interface CountryOption {
  value: string
  label: string
  code: string
  keywords: string[]
}

// Country name normalization map (handles variations)
const COUNTRY_NORMALIZATION: Record<string, { normalized: string; code: string; aliases: string[] }> = {
  'united states': { normalized: 'United States', code: 'US', aliases: ['usa', 'us', 'america', 'u.s.', 'u.s.a'] },
  'usa': { normalized: 'United States', code: 'US', aliases: ['united states', 'america', 'u.s.', 'u.s.a'] },
  'us': { normalized: 'United States', code: 'US', aliases: ['usa', 'united states', 'america'] },
  'america': { normalized: 'United States', code: 'US', aliases: ['usa', 'united states', 'u.s.'] },
  'united kingdom': { normalized: 'United Kingdom', code: 'UK', aliases: ['uk', 'britain', 'great britain', 'england'] },
  'uk': { normalized: 'United Kingdom', code: 'UK', aliases: ['united kingdom', 'britain', 'great britain'] },
  'britain': { normalized: 'United Kingdom', code: 'UK', aliases: ['uk', 'united kingdom', 'great britain'] },
  'united arab emirates': { normalized: 'United Arab Emirates', code: 'AE', aliases: ['uae', 'emirates'] },
  'uae': { normalized: 'United Arab Emirates', code: 'AE', aliases: ['united arab emirates', 'emirates'] },
  'russian federation': { normalized: 'Russia', code: 'RU', aliases: ['russia', 'russian'] },
  'russia': { normalized: 'Russia', code: 'RU', aliases: ['russian federation', 'russian'] },
  "people's republic of china": { normalized: 'China', code: 'CN', aliases: ['china', 'prc', 'chinese'] },
  'china': { normalized: 'China', code: 'CN', aliases: ["people's republic of china", 'prc', 'chinese'] },
  'south korea': { normalized: 'South Korea', code: 'KR', aliases: ['korea', 'republic of korea', 'rok'] },
  'north korea': { normalized: 'North Korea', code: 'KP', aliases: ['dprk', 'democratic people\'s republic of korea'] },
  'south africa': { normalized: 'South Africa', code: 'ZA', aliases: ['southafrica'] },
  'new zealand': { normalized: 'New Zealand', code: 'NZ', aliases: ['nz'] },
  'sri lanka': { normalized: 'Sri Lanka', code: 'LK', aliases: ['ceylon'] },
}

// ISO country code lookup (fallback for countries not in normalization map)
const ISO_COUNTRY_CODES: Record<string, string> = {
  'afghanistan': 'AF',
  'albania': 'AL',
  'algeria': 'DZ',
  'argentina': 'AR',
  'australia': 'AU',
  'austria': 'AT',
  'bangladesh': 'BD',
  'belgium': 'BE',
  'brazil': 'BR',
  'bulgaria': 'BG',
  'cambodia': 'KH',
  'canada': 'CA',
  'chile': 'CL',
  'colombia': 'CO',
  'croatia': 'HR',
  'cuba': 'CU',
  'czech republic': 'CZ',
  'denmark': 'DK',
  'egypt': 'EG',
  'estonia': 'EE',
  'ethiopia': 'ET',
  'finland': 'FI',
  'france': 'FR',
  'germany': 'DE',
  'ghana': 'GH',
  'greece': 'GR',
  'hungary': 'HU',
  'iceland': 'IS',
  'india': 'IN',
  'indonesia': 'ID',
  'iran': 'IR',
  'iraq': 'IQ',
  'ireland': 'IE',
  'israel': 'IL',
  'italy': 'IT',
  'japan': 'JP',
  'jordan': 'JO',
  'kenya': 'KE',
  'kuwait': 'KW',
  'lebanon': 'LB',
  'libya': 'LY',
  'malaysia': 'MY',
  'mexico': 'MX',
  'morocco': 'MA',
  'myanmar': 'MM',
  'netherlands': 'NL',
  'new zealand': 'NZ',
  'nigeria': 'NG',
  'norway': 'NO',
  'oman': 'OM',
  'pakistan': 'PK',
  'palestine': 'PS',
  'peru': 'PE',
  'philippines': 'PH',
  'poland': 'PL',
  'portugal': 'PT',
  'qatar': 'QA',
  'romania': 'RO',
  'saudi arabia': 'SA',
  'singapore': 'SG',
  'slovakia': 'SK',
  'slovenia': 'SI',
  'somalia': 'SO',
  'south africa': 'ZA',
  'south korea': 'KR',
  'spain': 'ES',
  'sri lanka': 'LK',
  'sudan': 'SD',
  'sweden': 'SE',
  'switzerland': 'CH',
  'syria': 'SY',
  'taiwan': 'TW',
  'thailand': 'TH',
  'tunisia': 'TN',
  'turkey': 'TR',
  'ukraine': 'UA',
  'united arab emirates': 'AE',
  'united kingdom': 'GB',
  'united states': 'US',
  'venezuela': 'VE',
  'vietnam': 'VN',
  'yemen': 'YE',
  'zimbabwe': 'ZW',
}

/**
 * Normalize country name to standard form
 */
function normalizeCountryName(country: string): { normalized: string; code: string; aliases: string[] } {
  const lower = country.toLowerCase().trim()
  
  // Check normalization map first
  if (COUNTRY_NORMALIZATION[lower]) {
    return COUNTRY_NORMALIZATION[lower]
  }
  
  // Try capitalized version
  const capitalized = capitalizeCountry(country)
  const lowerCapitalized = capitalized.toLowerCase()
  if (COUNTRY_NORMALIZATION[lowerCapitalized]) {
    return COUNTRY_NORMALIZATION[lowerCapitalized]
  }
  
  // Use capitalized name and generate code
  const code = ISO_COUNTRY_CODES[lower] || ISO_COUNTRY_CODES[lowerCapitalized] || generateCountryCode(capitalized)
  
  return {
    normalized: capitalized,
    code,
    aliases: [lower, lowerCapitalized],
  }
}

/**
 * Generate a 2-letter country code from country name (fallback)
 */
function generateCountryCode(country: string): string {
  // Simple heuristic: take first two letters of first two words
  const words = country.split(/\s+/).filter(w => w.length > 0)
  if (words.length >= 2) {
    return (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase()
  }
  return country.substring(0, 2).toUpperCase()
}

/**
 * Generate keywords for country matching
 */
function generateKeywords(normalized: string, aliases: string[]): string[] {
  const keywords = new Set<string>()
  
  // Add normalized name (lowercase)
  keywords.add(normalized.toLowerCase())
  
  // Add all aliases
  aliases.forEach(alias => keywords.add(alias.toLowerCase()))
  
  // Add individual words from normalized name
  normalized.split(/\s+/).forEach(word => {
    if (word.length > 2) {
      keywords.add(word.toLowerCase())
    }
  })
  
  // Special cases for common country references
  if (normalized === 'United States') {
    keywords.add('washington')
    keywords.add('dc')
    keywords.add('white house')
    keywords.add('congress')
    keywords.add('pentagon')
  }
  if (normalized === 'United Kingdom') {
    keywords.add('london')
    keywords.add('westminster')
  }
  if (normalized === 'Israel') {
    keywords.add('gaza')
    keywords.add('palestine')
    keywords.add('west bank')
  }
  if (normalized === 'Russia') {
    keywords.add('moscow')
    keywords.add('kremlin')
  }
  if (normalized === 'China') {
    keywords.add('beijing')
    keywords.add('hong kong')
  }
  
  return Array.from(keywords)
}

/**
 * Extract all unique countries from events
 */
export function extractCountriesFromEvents(events: Event[]): CountryOption[] {
  const countryMap = new Map<string, { normalized: string; code: string; aliases: string[]; count: number }>()
  
  // Extract countries from events
  for (const event of events) {
    const country = event.metadata?.country as string
    if (!country || typeof country !== 'string') continue
    
    const normalized = normalizeCountryName(country)
    const key = normalized.normalized.toLowerCase()
    
    if (countryMap.has(key)) {
      countryMap.get(key)!.count++
    } else {
      countryMap.set(key, {
        ...normalized,
        count: 1,
      })
    }
  }
  
  // Convert to CountryOption array
  const options: CountryOption[] = Array.from(countryMap.entries())
    .map(([key, data]) => ({
      value: key,
      label: data.normalized,
      code: data.code,
      keywords: generateKeywords(data.normalized, data.aliases),
    }))
    .sort((a, b) => {
      // Sort by count (descending), then alphabetically
      const countDiff = (countryMap.get(b.value)?.count || 0) - (countryMap.get(a.value)?.count || 0)
      if (countDiff !== 0) return countDiff
      return a.label.localeCompare(b.label)
    })
  
  return options
}
