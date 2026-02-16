/**
 * Capital Context Markers
 * 
 * Each capital marker represents non-geo national-level events.
 * Instead of 50 DC clusters, show one US Capital Marker linking 
 * to all national political activity.
 */

export interface CapitalMarker {
  country: string
  countryCode: string
  capital: string
  lat: number
  lng: number
  region: 'americas' | 'europe' | 'asia' | 'africa' | 'oceania' | 'middle-east'
}

export const CAPITALS: CapitalMarker[] = [
  // Americas
  { country: 'United States', countryCode: 'us', capital: 'Washington D.C.', lat: 38.9072, lng: -77.0369, region: 'americas' },
  { country: 'Canada', countryCode: 'ca', capital: 'Ottawa', lat: 45.4215, lng: -75.6972, region: 'americas' },
  { country: 'Mexico', countryCode: 'mx', capital: 'Mexico City', lat: 19.4326, lng: -99.1332, region: 'americas' },
  { country: 'Brazil', countryCode: 'br', capital: 'Brasília', lat: -15.7975, lng: -47.8919, region: 'americas' },
  { country: 'Argentina', countryCode: 'ar', capital: 'Buenos Aires', lat: -34.6037, lng: -58.3816, region: 'americas' },
  { country: 'Colombia', countryCode: 'co', capital: 'Bogotá', lat: 4.7110, lng: -74.0721, region: 'americas' },
  { country: 'Chile', countryCode: 'cl', capital: 'Santiago', lat: -33.4489, lng: -70.6693, region: 'americas' },
  { country: 'Peru', countryCode: 'pe', capital: 'Lima', lat: -12.0464, lng: -77.0428, region: 'americas' },
  { country: 'Venezuela', countryCode: 've', capital: 'Caracas', lat: 10.4806, lng: -66.9036, region: 'americas' },
  
  // Europe
  { country: 'United Kingdom', countryCode: 'uk', capital: 'London', lat: 51.5074, lng: -0.1278, region: 'europe' },
  { country: 'France', countryCode: 'fr', capital: 'Paris', lat: 48.8566, lng: 2.3522, region: 'europe' },
  { country: 'Germany', countryCode: 'de', capital: 'Berlin', lat: 52.5200, lng: 13.4050, region: 'europe' },
  { country: 'Italy', countryCode: 'it', capital: 'Rome', lat: 41.9028, lng: 12.4964, region: 'europe' },
  { country: 'Spain', countryCode: 'es', capital: 'Madrid', lat: 40.4168, lng: -3.7038, region: 'europe' },
  { country: 'Poland', countryCode: 'pl', capital: 'Warsaw', lat: 52.2297, lng: 21.0122, region: 'europe' },
  { country: 'Ukraine', countryCode: 'ua', capital: 'Kyiv', lat: 50.4501, lng: 30.5234, region: 'europe' },
  { country: 'Netherlands', countryCode: 'nl', capital: 'Amsterdam', lat: 52.3676, lng: 4.9041, region: 'europe' },
  { country: 'Belgium', countryCode: 'be', capital: 'Brussels', lat: 50.8503, lng: 4.3517, region: 'europe' },
  { country: 'Sweden', countryCode: 'se', capital: 'Stockholm', lat: 59.3293, lng: 18.0686, region: 'europe' },
  { country: 'Norway', countryCode: 'no', capital: 'Oslo', lat: 59.9139, lng: 10.7522, region: 'europe' },
  { country: 'Switzerland', countryCode: 'ch', capital: 'Bern', lat: 46.9480, lng: 7.4474, region: 'europe' },
  { country: 'Austria', countryCode: 'at', capital: 'Vienna', lat: 48.2082, lng: 16.3738, region: 'europe' },
  { country: 'Greece', countryCode: 'gr', capital: 'Athens', lat: 37.9838, lng: 23.7275, region: 'europe' },
  { country: 'Portugal', countryCode: 'pt', capital: 'Lisbon', lat: 38.7223, lng: -9.1393, region: 'europe' },
  
  // Asia
  { country: 'China', countryCode: 'cn', capital: 'Beijing', lat: 39.9042, lng: 116.4074, region: 'asia' },
  { country: 'Japan', countryCode: 'jp', capital: 'Tokyo', lat: 35.6762, lng: 139.6503, region: 'asia' },
  { country: 'South Korea', countryCode: 'kr', capital: 'Seoul', lat: 37.5665, lng: 126.9780, region: 'asia' },
  { country: 'India', countryCode: 'in', capital: 'New Delhi', lat: 28.6139, lng: 77.2090, region: 'asia' },
  { country: 'Indonesia', countryCode: 'id', capital: 'Jakarta', lat: -6.2088, lng: 106.8456, region: 'asia' },
  { country: 'Thailand', countryCode: 'th', capital: 'Bangkok', lat: 13.7563, lng: 100.5018, region: 'asia' },
  { country: 'Vietnam', countryCode: 'vn', capital: 'Hanoi', lat: 21.0285, lng: 105.8542, region: 'asia' },
  { country: 'Philippines', countryCode: 'ph', capital: 'Manila', lat: 14.5995, lng: 120.9842, region: 'asia' },
  { country: 'Malaysia', countryCode: 'my', capital: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869, region: 'asia' },
  { country: 'Singapore', countryCode: 'sg', capital: 'Singapore', lat: 1.3521, lng: 103.8198, region: 'asia' },
  { country: 'Pakistan', countryCode: 'pk', capital: 'Islamabad', lat: 33.6844, lng: 73.0479, region: 'asia' },
  { country: 'Bangladesh', countryCode: 'bd', capital: 'Dhaka', lat: 23.8103, lng: 90.4125, region: 'asia' },
  { country: 'Taiwan', countryCode: 'tw', capital: 'Taipei', lat: 25.0330, lng: 121.5654, region: 'asia' },
  { country: 'North Korea', countryCode: 'kp', capital: 'Pyongyang', lat: 39.0392, lng: 125.7625, region: 'asia' },
  
  // Middle East
  { country: 'Israel', countryCode: 'il', capital: 'Jerusalem', lat: 31.7683, lng: 35.2137, region: 'middle-east' },
  { country: 'Iran', countryCode: 'ir', capital: 'Tehran', lat: 35.6892, lng: 51.3890, region: 'middle-east' },
  { country: 'Saudi Arabia', countryCode: 'sa', capital: 'Riyadh', lat: 24.7136, lng: 46.6753, region: 'middle-east' },
  { country: 'Turkey', countryCode: 'tr', capital: 'Ankara', lat: 39.9334, lng: 32.8597, region: 'middle-east' },
  { country: 'Iraq', countryCode: 'iq', capital: 'Baghdad', lat: 33.3152, lng: 44.3661, region: 'middle-east' },
  { country: 'Syria', countryCode: 'sy', capital: 'Damascus', lat: 33.5138, lng: 36.2765, region: 'middle-east' },
  { country: 'United Arab Emirates', countryCode: 'ae', capital: 'Abu Dhabi', lat: 24.4539, lng: 54.3773, region: 'middle-east' },
  { country: 'Qatar', countryCode: 'qa', capital: 'Doha', lat: 25.2854, lng: 51.5310, region: 'middle-east' },
  { country: 'Lebanon', countryCode: 'lb', capital: 'Beirut', lat: 33.8938, lng: 35.5018, region: 'middle-east' },
  { country: 'Jordan', countryCode: 'jo', capital: 'Amman', lat: 31.9454, lng: 35.9284, region: 'middle-east' },
  
  // Africa
  { country: 'Egypt', countryCode: 'eg', capital: 'Cairo', lat: 30.0444, lng: 31.2357, region: 'africa' },
  { country: 'South Africa', countryCode: 'za', capital: 'Pretoria', lat: -25.7479, lng: 28.2293, region: 'africa' },
  { country: 'Nigeria', countryCode: 'ng', capital: 'Abuja', lat: 9.0579, lng: 7.4951, region: 'africa' },
  { country: 'Kenya', countryCode: 'ke', capital: 'Nairobi', lat: -1.2921, lng: 36.8219, region: 'africa' },
  { country: 'Ethiopia', countryCode: 'et', capital: 'Addis Ababa', lat: 9.0320, lng: 38.7469, region: 'africa' },
  { country: 'Morocco', countryCode: 'ma', capital: 'Rabat', lat: 34.0209, lng: -6.8416, region: 'africa' },
  { country: 'Algeria', countryCode: 'dz', capital: 'Algiers', lat: 36.7538, lng: 3.0588, region: 'africa' },
  { country: 'Sudan', countryCode: 'sd', capital: 'Khartoum', lat: 15.5007, lng: 32.5599, region: 'africa' },
  { country: 'Ghana', countryCode: 'gh', capital: 'Accra', lat: 5.6037, lng: -0.1870, region: 'africa' },
  { country: 'Tanzania', countryCode: 'tz', capital: 'Dodoma', lat: -6.1630, lng: 35.7516, region: 'africa' },
  
  // Oceania
  { country: 'Australia', countryCode: 'au', capital: 'Canberra', lat: -35.2809, lng: 149.1300, region: 'oceania' },
  { country: 'New Zealand', countryCode: 'nz', capital: 'Wellington', lat: -41.2865, lng: 174.7762, region: 'oceania' },
  
  // Russia (spans regions)
  { country: 'Russia', countryCode: 'ru', capital: 'Moscow', lat: 55.7558, lng: 37.6173, region: 'europe' },
]

// Country name aliases for matching
export const COUNTRY_ALIASES: Record<string, string> = {
  'usa': 'us',
  'united states': 'us',
  'america': 'us',
  'britain': 'uk',
  'england': 'uk',
  'united kingdom': 'uk',
  'korea': 'kr',
  'south korea': 'kr',
  'uae': 'ae',
}

/**
 * Find capital marker for a country
 */
export function findCapitalForCountry(countryName: string): CapitalMarker | null {
  const normalized = countryName.toLowerCase().trim()
  const code = COUNTRY_ALIASES[normalized] || normalized
  
  return CAPITALS.find(c => 
    c.countryCode === code || 
    c.country.toLowerCase() === normalized ||
    c.capital.toLowerCase() === normalized
  ) || null
}

/**
 * Check if an event should be a "capital context" event
 * (i.e., national-level, non-specific-location)
 */
export function isCapitalContextEvent(event: { 
  latitude?: number
  longitude?: number
  metadata?: { country?: string; locationName?: string }
}): boolean {
  // If no coordinates, it's definitely non-geo
  if (!event.latitude || !event.longitude) return true
  
  const country = event.metadata?.country as string
  const location = event.metadata?.locationName as string
  
  if (!country) return false
  
  // Find the capital for this country
  const capital = findCapitalForCountry(country)
  if (!capital) return false
  
  // Check if the event is very close to the capital (within ~50km)
  const latDiff = Math.abs(event.latitude - capital.lat)
  const lngDiff = Math.abs(event.longitude - capital.lng)
  const isNearCapital = latDiff < 0.5 && lngDiff < 0.5
  
  // If near capital and location name is generic or matches capital, it's context
  if (isNearCapital) {
    const locationLower = (location || '').toLowerCase()
    const capitalLower = capital.capital.toLowerCase()
    const countryLower = capital.country.toLowerCase()
    
    // Generic location names that suggest national-level news
    const genericLocations = [
      countryLower,
      capitalLower,
      'white house', 'congress', 'parliament', 'kremlin',
      'government', 'ministry', 'embassy', 'federal'
    ]
    
    return genericLocations.some(g => locationLower.includes(g)) || !location
  }
  
  return false
}

/**
 * Group events by their associated capital
 */
export function groupEventsByCapital(events: Array<{
  id: string
  latitude?: number
  longitude?: number
  type: string
  severity: number
  metadata?: { country?: string; locationName?: string }
}>): Map<string, typeof events> {
  const groups = new Map<string, typeof events>()
  
  events.forEach(event => {
    const country = event.metadata?.country as string
    if (!country) return
    
    const capital = findCapitalForCountry(country)
    if (!capital) return
    
    const key = capital.countryCode
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(event)
  })
  
  return groups
}
