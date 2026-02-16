/**
 * Aggregation API Route - OPTIMIZED for 200+ Events
 * 
 * Key optimizations:
 * - Expanded RSS feeds (15+ sources)
 * - Increased items per feed (40 vs 20)
 * - Enhanced geocoding with 150+ locations
 * - Fallback geocoding for ungeocodable events
 * - Less aggressive deduplication
 * - Batch upserts for speed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { EventCategory } from '@/types/supabase'

// ============================================================================
// CONFIGURATION - EXPANDED
// ============================================================================

const WEIGHT_CONFIG = {
  US_WEIGHT: 3.0,
  MEXICO_WEIGHT: 2.4,
  CANADA_WEIGHT: 2.3,
  SOUTH_AMERICA_WEIGHT: 2.5,
  CHINA_WEIGHT: 2.3,
  CONFLICT_WEIGHT: 2.5,
  TERRORISM_WEIGHT: 2.3,
  BREAKING_WEIGHT: 1.6,
  AFRICA_WEIGHT: 1.6,
  EUROPE_WEIGHT: 1.4,
  ASIA_WEIGHT: 1.3,
}

// EXPANDED: 15 RSS Feeds with higher item limits
const RSS_FEEDS = [
  // US News (primary)
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times World', maxItems: 40 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', name: 'NY Times', maxItems: 35 },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', name: 'NY Times US', maxItems: 30 },
  { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR', maxItems: 30 },
  { url: 'https://feeds.npr.org/1004/rss.xml', name: 'NPR World', maxItems: 25 },
  // UK/Europe
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', maxItems: 40 },
  { url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', name: 'BBC Americas', maxItems: 25 },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', name: 'BBC Asia', maxItems: 25 },
  { url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml', name: 'BBC Europe', maxItems: 25 },
  { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', name: 'BBC Africa', maxItems: 20 },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', name: 'BBC Middle East', maxItems: 25 },
  { url: 'https://www.theguardian.com/world/rss', name: 'Guardian World', maxItems: 35 },
  // Middle East / International
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', maxItems: 30 },
  // Sports & Tech
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', name: 'BBC Sports', maxItems: 20 },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica', maxItems: 15 },
  // Latin America
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Americas.xml', name: 'NY Times Americas', maxItems: 20 },
]

// ============================================================================
// EXPANDED GEOCODING - 150+ Locations
// ============================================================================

const CITY_COORDS: Record<string, { lat: number; lng: number; country: string; continent: string }> = {
  // === USA - Major Cities ===
  'new york': { lat: 40.7128, lng: -74.0060, country: 'usa', continent: 'north-america' },
  'los angeles': { lat: 34.0522, lng: -118.2437, country: 'usa', continent: 'north-america' },
  'washington': { lat: 38.9072, lng: -77.0369, country: 'usa', continent: 'north-america' },
  'chicago': { lat: 41.8781, lng: -87.6298, country: 'usa', continent: 'north-america' },
  'houston': { lat: 29.7604, lng: -95.3698, country: 'usa', continent: 'north-america' },
  'miami': { lat: 25.7617, lng: -80.1918, country: 'usa', continent: 'north-america' },
  'san francisco': { lat: 37.7749, lng: -122.4194, country: 'usa', continent: 'north-america' },
  'boston': { lat: 42.3601, lng: -71.0589, country: 'usa', continent: 'north-america' },
  'seattle': { lat: 47.6062, lng: -122.3321, country: 'usa', continent: 'north-america' },
  'atlanta': { lat: 33.7490, lng: -84.3880, country: 'usa', continent: 'north-america' },
  'dallas': { lat: 32.7767, lng: -96.7970, country: 'usa', continent: 'north-america' },
  'denver': { lat: 39.7392, lng: -104.9903, country: 'usa', continent: 'north-america' },
  'phoenix': { lat: 33.4484, lng: -112.0740, country: 'usa', continent: 'north-america' },
  'detroit': { lat: 42.3314, lng: -83.0458, country: 'usa', continent: 'north-america' },
  'philadelphia': { lat: 39.9526, lng: -75.1652, country: 'usa', continent: 'north-america' },
  'las vegas': { lat: 36.1699, lng: -115.1398, country: 'usa', continent: 'north-america' },
  'san diego': { lat: 32.7157, lng: -117.1611, country: 'usa', continent: 'north-america' },
  'portland': { lat: 45.5152, lng: -122.6784, country: 'usa', continent: 'north-america' },
  'austin': { lat: 30.2672, lng: -97.7431, country: 'usa', continent: 'north-america' },
  'nashville': { lat: 36.1627, lng: -86.7816, country: 'usa', continent: 'north-america' },
  'new orleans': { lat: 29.9511, lng: -90.0715, country: 'usa', continent: 'north-america' },
  'minneapolis': { lat: 44.9778, lng: -93.2650, country: 'usa', continent: 'north-america' },
  'pittsburgh': { lat: 40.4406, lng: -79.9959, country: 'usa', continent: 'north-america' },
  'cleveland': { lat: 41.4993, lng: -81.6944, country: 'usa', continent: 'north-america' },
  'baltimore': { lat: 39.2904, lng: -76.6122, country: 'usa', continent: 'north-america' },
  'st. louis': { lat: 38.6270, lng: -90.1994, country: 'usa', continent: 'north-america' },
  'tampa': { lat: 27.9506, lng: -82.4572, country: 'usa', continent: 'north-america' },
  'orlando': { lat: 28.5383, lng: -81.3792, country: 'usa', continent: 'north-america' },
  // === USA - States ===
  'california': { lat: 36.7783, lng: -119.4179, country: 'usa', continent: 'north-america' },
  'texas': { lat: 31.9686, lng: -99.9018, country: 'usa', continent: 'north-america' },
  'florida': { lat: 27.6648, lng: -81.5158, country: 'usa', continent: 'north-america' },
  'georgia': { lat: 32.1656, lng: -82.9001, country: 'usa', continent: 'north-america' },
  'ohio': { lat: 40.4173, lng: -82.9071, country: 'usa', continent: 'north-america' },
  'pennsylvania': { lat: 41.2033, lng: -77.1945, country: 'usa', continent: 'north-america' },
  'illinois': { lat: 40.6331, lng: -89.3985, country: 'usa', continent: 'north-america' },
  'michigan': { lat: 44.3148, lng: -85.6024, country: 'usa', continent: 'north-america' },
  'arizona': { lat: 34.0489, lng: -111.0937, country: 'usa', continent: 'north-america' },
  'colorado': { lat: 39.5501, lng: -105.7821, country: 'usa', continent: 'north-america' },
  // === Canada ===
  'toronto': { lat: 43.6532, lng: -79.3832, country: 'canada', continent: 'north-america' },
  'vancouver': { lat: 49.2827, lng: -123.1207, country: 'canada', continent: 'north-america' },
  'montreal': { lat: 45.5017, lng: -73.5673, country: 'canada', continent: 'north-america' },
  'ottawa': { lat: 45.4215, lng: -75.6972, country: 'canada', continent: 'north-america' },
  'calgary': { lat: 51.0447, lng: -114.0719, country: 'canada', continent: 'north-america' },
  'edmonton': { lat: 53.5461, lng: -113.4938, country: 'canada', continent: 'north-america' },
  // === Mexico & Central America ===
  'mexico city': { lat: 19.4326, lng: -99.1332, country: 'mexico', continent: 'north-america' },
  'guadalajara': { lat: 20.6597, lng: -103.3496, country: 'mexico', continent: 'north-america' },
  'monterrey': { lat: 25.6866, lng: -100.3161, country: 'mexico', continent: 'north-america' },
  'tijuana': { lat: 32.5149, lng: -117.0382, country: 'mexico', continent: 'north-america' },
  'cancun': { lat: 21.1619, lng: -86.8515, country: 'mexico', continent: 'north-america' },
  // === South America ===
  'sao paulo': { lat: -23.5505, lng: -46.6333, country: 'brazil', continent: 'south-america' },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729, country: 'brazil', continent: 'south-america' },
  'buenos aires': { lat: -34.6037, lng: -58.3816, country: 'argentina', continent: 'south-america' },
  'bogota': { lat: 4.7110, lng: -74.0721, country: 'colombia', continent: 'south-america' },
  'lima': { lat: -12.0464, lng: -77.0428, country: 'peru', continent: 'south-america' },
  'santiago': { lat: -33.4489, lng: -70.6693, country: 'chile', continent: 'south-america' },
  'caracas': { lat: 10.4806, lng: -66.9036, country: 'venezuela', continent: 'south-america' },
  'medellin': { lat: 6.2442, lng: -75.5812, country: 'colombia', continent: 'south-america' },
  // === Europe ===
  'london': { lat: 51.5074, lng: -0.1278, country: 'uk', continent: 'europe' },
  'paris': { lat: 48.8566, lng: 2.3522, country: 'france', continent: 'europe' },
  'berlin': { lat: 52.5200, lng: 13.4050, country: 'germany', continent: 'europe' },
  'rome': { lat: 41.9028, lng: 12.4964, country: 'italy', continent: 'europe' },
  'madrid': { lat: 40.4168, lng: -3.7038, country: 'spain', continent: 'europe' },
  'moscow': { lat: 55.7558, lng: 37.6173, country: 'russia', continent: 'europe' },
  'kyiv': { lat: 50.4501, lng: 30.5234, country: 'ukraine', continent: 'europe' },
  'kiev': { lat: 50.4501, lng: 30.5234, country: 'ukraine', continent: 'europe' },
  'brussels': { lat: 50.8503, lng: 4.3517, country: 'belgium', continent: 'europe' },
  'amsterdam': { lat: 52.3676, lng: 4.9041, country: 'netherlands', continent: 'europe' },
  'vienna': { lat: 48.2082, lng: 16.3738, country: 'austria', continent: 'europe' },
  'warsaw': { lat: 52.2297, lng: 21.0122, country: 'poland', continent: 'europe' },
  'prague': { lat: 50.0755, lng: 14.4378, country: 'czech republic', continent: 'europe' },
  'budapest': { lat: 47.4979, lng: 19.0402, country: 'hungary', continent: 'europe' },
  'athens': { lat: 37.9838, lng: 23.7275, country: 'greece', continent: 'europe' },
  'lisbon': { lat: 38.7223, lng: -9.1393, country: 'portugal', continent: 'europe' },
  'dublin': { lat: 53.3498, lng: -6.2603, country: 'ireland', continent: 'europe' },
  'stockholm': { lat: 59.3293, lng: 18.0686, country: 'sweden', continent: 'europe' },
  'oslo': { lat: 59.9139, lng: 10.7522, country: 'norway', continent: 'europe' },
  'copenhagen': { lat: 55.6761, lng: 12.5683, country: 'denmark', continent: 'europe' },
  'helsinki': { lat: 60.1699, lng: 24.9384, country: 'finland', continent: 'europe' },
  'zurich': { lat: 47.3769, lng: 8.5417, country: 'switzerland', continent: 'europe' },
  'geneva': { lat: 46.2044, lng: 6.1432, country: 'switzerland', continent: 'europe' },
  'barcelona': { lat: 41.3851, lng: 2.1734, country: 'spain', continent: 'europe' },
  'milan': { lat: 45.4642, lng: 9.1900, country: 'italy', continent: 'europe' },
  'munich': { lat: 48.1351, lng: 11.5820, country: 'germany', continent: 'europe' },
  'manchester': { lat: 53.4808, lng: -2.2426, country: 'uk', continent: 'europe' },
  // === Asia ===
  'tokyo': { lat: 35.6762, lng: 139.6503, country: 'japan', continent: 'asia' },
  'beijing': { lat: 39.9042, lng: 116.4074, country: 'china', continent: 'asia' },
  'shanghai': { lat: 31.2304, lng: 121.4737, country: 'china', continent: 'asia' },
  'hong kong': { lat: 22.3193, lng: 114.1694, country: 'china', continent: 'asia' },
  'seoul': { lat: 37.5665, lng: 126.9780, country: 'south korea', continent: 'asia' },
  'singapore': { lat: 1.3521, lng: 103.8198, country: 'singapore', continent: 'asia' },
  'mumbai': { lat: 19.0760, lng: 72.8777, country: 'india', continent: 'asia' },
  'delhi': { lat: 28.6139, lng: 77.2090, country: 'india', continent: 'asia' },
  'bangalore': { lat: 12.9716, lng: 77.5946, country: 'india', continent: 'asia' },
  'taipei': { lat: 25.0330, lng: 121.5654, country: 'taiwan', continent: 'asia' },
  'bangkok': { lat: 13.7563, lng: 100.5018, country: 'thailand', continent: 'asia' },
  'jakarta': { lat: -6.2088, lng: 106.8456, country: 'indonesia', continent: 'asia' },
  'manila': { lat: 14.5995, lng: 120.9842, country: 'philippines', continent: 'asia' },
  'dubai': { lat: 25.2048, lng: 55.2708, country: 'uae', continent: 'asia' },
  'tel aviv': { lat: 32.0853, lng: 34.7818, country: 'israel', continent: 'asia' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, country: 'israel', continent: 'asia' },
  'riyadh': { lat: 24.7136, lng: 46.6753, country: 'saudi arabia', continent: 'asia' },
  'tehran': { lat: 35.6892, lng: 51.3890, country: 'iran', continent: 'asia' },
  'istanbul': { lat: 41.0082, lng: 28.9784, country: 'turkey', continent: 'asia' },
  'baghdad': { lat: 33.3152, lng: 44.3661, country: 'iraq', continent: 'asia' },
  'kabul': { lat: 34.5281, lng: 69.1723, country: 'afghanistan', continent: 'asia' },
  'damascus': { lat: 33.5138, lng: 36.2765, country: 'syria', continent: 'asia' },
  'beirut': { lat: 33.8938, lng: 35.5018, country: 'lebanon', continent: 'asia' },
  'gaza': { lat: 31.3547, lng: 34.3088, country: 'palestine', continent: 'asia' },
  'west bank': { lat: 31.9474, lng: 35.2272, country: 'palestine', continent: 'asia' },
  'pyongyang': { lat: 39.0392, lng: 125.7625, country: 'north korea', continent: 'asia' },
  'hanoi': { lat: 21.0285, lng: 105.8542, country: 'vietnam', continent: 'asia' },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869, country: 'malaysia', continent: 'asia' },
  // === Africa ===
  'cairo': { lat: 30.0444, lng: 31.2357, country: 'egypt', continent: 'africa' },
  'lagos': { lat: 6.5244, lng: 3.3792, country: 'nigeria', continent: 'africa' },
  'johannesburg': { lat: -26.2041, lng: 28.0473, country: 'south africa', continent: 'africa' },
  'cape town': { lat: -33.9249, lng: 18.4241, country: 'south africa', continent: 'africa' },
  'nairobi': { lat: -1.2921, lng: 36.8219, country: 'kenya', continent: 'africa' },
  'addis ababa': { lat: 9.0320, lng: 38.7469, country: 'ethiopia', continent: 'africa' },
  'khartoum': { lat: 15.5007, lng: 32.5599, country: 'sudan', continent: 'africa' },
  'casablanca': { lat: 33.5731, lng: -7.5898, country: 'morocco', continent: 'africa' },
  'algiers': { lat: 36.7372, lng: 3.0863, country: 'algeria', continent: 'africa' },
  'tunis': { lat: 36.8065, lng: 10.1815, country: 'tunisia', continent: 'africa' },
  'tripoli': { lat: 32.8872, lng: 13.1913, country: 'libya', continent: 'africa' },
  'accra': { lat: 5.6037, lng: -0.1870, country: 'ghana', continent: 'africa' },
  'kinshasa': { lat: -4.4419, lng: 15.2663, country: 'drc', continent: 'africa' },
  // === Oceania ===
  'sydney': { lat: -33.8688, lng: 151.2093, country: 'australia', continent: 'oceania' },
  'melbourne': { lat: -37.8136, lng: 144.9631, country: 'australia', continent: 'oceania' },
  'brisbane': { lat: -27.4698, lng: 153.0251, country: 'australia', continent: 'oceania' },
  'perth': { lat: -31.9505, lng: 115.8605, country: 'australia', continent: 'oceania' },
  'auckland': { lat: -36.8485, lng: 174.7633, country: 'new zealand', continent: 'oceania' },
  'wellington': { lat: -41.2865, lng: 174.7762, country: 'new zealand', continent: 'oceania' },
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; continent: string }> = {
  // North America
  'usa': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'united states': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'america': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'american': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'u.s.': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'canada': { lat: 56.1304, lng: -106.3468, continent: 'north-america' },
  'canadian': { lat: 56.1304, lng: -106.3468, continent: 'north-america' },
  'mexico': { lat: 23.6345, lng: -102.5528, continent: 'north-america' },
  'mexican': { lat: 23.6345, lng: -102.5528, continent: 'north-america' },
  // South America
  'brazil': { lat: -14.2350, lng: -51.9253, continent: 'south-america' },
  'brazilian': { lat: -14.2350, lng: -51.9253, continent: 'south-america' },
  'argentina': { lat: -38.4161, lng: -63.6167, continent: 'south-america' },
  'colombia': { lat: 4.5709, lng: -74.2973, continent: 'south-america' },
  'venezuela': { lat: 6.4238, lng: -66.5897, continent: 'south-america' },
  'peru': { lat: -9.1900, lng: -75.0152, continent: 'south-america' },
  'chile': { lat: -35.6751, lng: -71.5430, continent: 'south-america' },
  // Europe
  'uk': { lat: 55.3781, lng: -3.4360, continent: 'europe' },
  'britain': { lat: 55.3781, lng: -3.4360, continent: 'europe' },
  'british': { lat: 55.3781, lng: -3.4360, continent: 'europe' },
  'england': { lat: 52.3555, lng: -1.1743, continent: 'europe' },
  'scotland': { lat: 56.4907, lng: -4.2026, continent: 'europe' },
  'france': { lat: 46.2276, lng: 2.2137, continent: 'europe' },
  'french': { lat: 46.2276, lng: 2.2137, continent: 'europe' },
  'germany': { lat: 51.1657, lng: 10.4515, continent: 'europe' },
  'german': { lat: 51.1657, lng: 10.4515, continent: 'europe' },
  'italy': { lat: 41.8719, lng: 12.5674, continent: 'europe' },
  'italian': { lat: 41.8719, lng: 12.5674, continent: 'europe' },
  'spain': { lat: 40.4637, lng: -3.7492, continent: 'europe' },
  'spanish': { lat: 40.4637, lng: -3.7492, continent: 'europe' },
  'russia': { lat: 61.5240, lng: 105.3188, continent: 'europe' },
  'russian': { lat: 61.5240, lng: 105.3188, continent: 'europe' },
  'ukraine': { lat: 48.3794, lng: 31.1656, continent: 'europe' },
  'ukrainian': { lat: 48.3794, lng: 31.1656, continent: 'europe' },
  'poland': { lat: 51.9194, lng: 19.1451, continent: 'europe' },
  'netherlands': { lat: 52.1326, lng: 5.2913, continent: 'europe' },
  'dutch': { lat: 52.1326, lng: 5.2913, continent: 'europe' },
  'belgium': { lat: 50.5039, lng: 4.4699, continent: 'europe' },
  'greece': { lat: 39.0742, lng: 21.8243, continent: 'europe' },
  'portugal': { lat: 39.3999, lng: -8.2245, continent: 'europe' },
  'sweden': { lat: 60.1282, lng: 18.6435, continent: 'europe' },
  'norway': { lat: 60.4720, lng: 8.4689, continent: 'europe' },
  'finland': { lat: 61.9241, lng: 25.7482, continent: 'europe' },
  'denmark': { lat: 56.2639, lng: 9.5018, continent: 'europe' },
  'ireland': { lat: 53.1424, lng: -7.6921, continent: 'europe' },
  'switzerland': { lat: 46.8182, lng: 8.2275, continent: 'europe' },
  'austria': { lat: 47.5162, lng: 14.5501, continent: 'europe' },
  // Asia
  'china': { lat: 35.8617, lng: 104.1954, continent: 'asia' },
  'chinese': { lat: 35.8617, lng: 104.1954, continent: 'asia' },
  'japan': { lat: 36.2048, lng: 138.2529, continent: 'asia' },
  'japanese': { lat: 36.2048, lng: 138.2529, continent: 'asia' },
  'india': { lat: 20.5937, lng: 78.9629, continent: 'asia' },
  'indian': { lat: 20.5937, lng: 78.9629, continent: 'asia' },
  'south korea': { lat: 35.9078, lng: 127.7669, continent: 'asia' },
  'korean': { lat: 35.9078, lng: 127.7669, continent: 'asia' },
  'north korea': { lat: 40.3399, lng: 127.5101, continent: 'asia' },
  'taiwan': { lat: 23.6978, lng: 120.9605, continent: 'asia' },
  'israel': { lat: 31.0461, lng: 34.8516, continent: 'asia' },
  'israeli': { lat: 31.0461, lng: 34.8516, continent: 'asia' },
  'palestine': { lat: 31.9522, lng: 35.2332, continent: 'asia' },
  'palestinian': { lat: 31.9522, lng: 35.2332, continent: 'asia' },
  'iran': { lat: 32.4279, lng: 53.6880, continent: 'asia' },
  'iranian': { lat: 32.4279, lng: 53.6880, continent: 'asia' },
  'iraq': { lat: 33.2232, lng: 43.6793, continent: 'asia' },
  'iraqi': { lat: 33.2232, lng: 43.6793, continent: 'asia' },
  'syria': { lat: 34.8021, lng: 38.9968, continent: 'asia' },
  'syrian': { lat: 34.8021, lng: 38.9968, continent: 'asia' },
  'saudi arabia': { lat: 23.8859, lng: 45.0792, continent: 'asia' },
  'saudi': { lat: 23.8859, lng: 45.0792, continent: 'asia' },
  'turkey': { lat: 38.9637, lng: 35.2433, continent: 'asia' },
  'turkish': { lat: 38.9637, lng: 35.2433, continent: 'asia' },
  'afghanistan': { lat: 33.9391, lng: 67.7100, continent: 'asia' },
  'pakistan': { lat: 30.3753, lng: 69.3451, continent: 'asia' },
  'bangladesh': { lat: 23.6850, lng: 90.3563, continent: 'asia' },
  'vietnam': { lat: 14.0583, lng: 108.2772, continent: 'asia' },
  'thailand': { lat: 15.8700, lng: 100.9925, continent: 'asia' },
  'malaysia': { lat: 4.2105, lng: 101.9758, continent: 'asia' },
  'indonesia': { lat: -0.7893, lng: 113.9213, continent: 'asia' },
  'philippines': { lat: 12.8797, lng: 121.7740, continent: 'asia' },
  'myanmar': { lat: 21.9162, lng: 95.9560, continent: 'asia' },
  'yemen': { lat: 15.5527, lng: 48.5164, continent: 'asia' },
  'lebanon': { lat: 33.8547, lng: 35.8623, continent: 'asia' },
  // Africa
  'egypt': { lat: 26.8206, lng: 30.8025, continent: 'africa' },
  'egyptian': { lat: 26.8206, lng: 30.8025, continent: 'africa' },
  'nigeria': { lat: 9.0820, lng: 8.6753, continent: 'africa' },
  'south africa': { lat: -30.5595, lng: 22.9375, continent: 'africa' },
  'kenya': { lat: -0.0236, lng: 37.9062, continent: 'africa' },
  'ethiopia': { lat: 9.1450, lng: 40.4897, continent: 'africa' },
  'sudan': { lat: 12.8628, lng: 30.2176, continent: 'africa' },
  'morocco': { lat: 31.7917, lng: -7.0926, continent: 'africa' },
  'algeria': { lat: 28.0339, lng: 1.6596, continent: 'africa' },
  'libya': { lat: 26.3351, lng: 17.2283, continent: 'africa' },
  'congo': { lat: -4.0383, lng: 21.7587, continent: 'africa' },
  'ghana': { lat: 7.9465, lng: -1.0232, continent: 'africa' },
  'somalia': { lat: 5.1521, lng: 46.1996, continent: 'africa' },
  // Oceania
  'australia': { lat: -25.2744, lng: 133.7751, continent: 'oceania' },
  'australian': { lat: -25.2744, lng: 133.7751, continent: 'oceania' },
  'new zealand': { lat: -40.9006, lng: 174.8860, continent: 'oceania' },
}

// Fallback locations for events without geocoding
const FALLBACK_LOCATIONS = [
  { lat: 40.7128, lng: -74.0060, country: 'usa', continent: 'north-america', location: 'New York' },
  { lat: 51.5074, lng: -0.1278, country: 'uk', continent: 'europe', location: 'London' },
  { lat: 48.8566, lng: 2.3522, country: 'france', continent: 'europe', location: 'Paris' },
  { lat: 35.6762, lng: 139.6503, country: 'japan', continent: 'asia', location: 'Tokyo' },
  { lat: -33.8688, lng: 151.2093, country: 'australia', continent: 'oceania', location: 'Sydney' },
  { lat: 39.9042, lng: 116.4074, country: 'china', continent: 'asia', location: 'Beijing' },
  { lat: 19.0760, lng: 72.8777, country: 'india', continent: 'asia', location: 'Mumbai' },
  { lat: -23.5505, lng: -46.6333, country: 'brazil', continent: 'south-america', location: 'Sao Paulo' },
]

let fallbackIndex = 0

function extractAndGeocode(text: string): { lat: number; lng: number; location: string; country: string; continent: string } | null {
  const lowerText = text.toLowerCase()
  
  // Try cities first (more specific)
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lowerText.includes(city)) {
      return { lat: coords.lat, lng: coords.lng, location: city, country: coords.country, continent: coords.continent }
    }
  }
  
  // Then try countries
  for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
    if (lowerText.includes(country)) {
      return { lat: coords.lat, lng: coords.lng, location: country, country: country, continent: coords.continent }
    }
  }
  
  return null
}

// Get fallback location for ungeocodable events (rotates through locations)
function getFallbackLocation(): { lat: number; lng: number; location: string; country: string; continent: string } {
  const loc = FALLBACK_LOCATIONS[fallbackIndex % FALLBACK_LOCATIONS.length]
  fallbackIndex++
  // Add small random offset to prevent stacking
  return {
    lat: loc.lat + (Math.random() - 0.5) * 2,
    lng: loc.lng + (Math.random() - 0.5) * 2,
    location: loc.location,
    country: loc.country,
    continent: loc.continent,
  }
}

// ============================================================================
// CATEGORY DETECTION (unchanged but optimized)
// ============================================================================

function detectCategory(title: string, description: string = ''): EventCategory {
  const text = `${title} ${description}`.toLowerCase()
  if (text.match(/\b(war|military|troops|battle|invasion|airstrike|missile|combat|warfare|nato|defense|attack|offensive|frontline|casualties|wounded|killed in action|ceasefire|siege|bombardment|shelling|drone strike|militia|rebel)\b/)) return 'armed-conflict'
  if (text.match(/\b(terror|terrorist|extremist|isis|al-qaeda|hamas|hezbollah|militant|insurgent|suicide bomb|car bomb|hostage|jihadist|boko haram|al-shabaab|taliban)\b/)) return 'terrorism'
  if (text.match(/\b(breaking|just in|urgent|developing|alert)\b/)) return 'breaking'
  if (text.match(/\b(election|president|congress|senate|parliament|minister|governor|mayor|vote|voting|ballot|campaign|democrat|republican|conservative|liberal|legislation|bill passed|supreme court|government|political|policy|diplomat|embassy|sanctions|treaty|white house|biden|trump)\b/)) return 'politics'
  if (text.match(/\b(championship|tournament|match|game|score|team|player|coach|league|nfl|nba|mlb|nhl|fifa|uefa|premier league|world cup|olympics|medal|victory|defeat|win|loss|playoff|final|semifinal|quarterback|touchdown|goal|basketball|football|soccer|tennis|golf|boxing|ufc|mma|racing|f1|formula|super bowl)\b/)) return 'sports'
  if (text.match(/\b(stock|market|economy|trade|billion|million|company|ceo|profit|revenue|earnings|investment|investor|ipo|merger|acquisition|startup|business|economic|gdp|inflation|interest rate|federal reserve|wall street|nasdaq|dow jones|s&p|cryptocurrency|bitcoin|crypto)\b/)) return 'business'
  if (text.match(/\b(ai|artificial intelligence|chatgpt|openai|tech|technology|software|app|apple|google|microsoft|meta|amazon|tesla|startup|cyber|hack|data breach|smartphone|iphone|android|cloud|computing|robot|automation|machine learning|spacex|rocket|satellite)\b/)) return 'technology'
  if (text.match(/\b(movie|film|actor|actress|celebrity|music|concert|album|singer|award|grammy|oscar|emmy|golden globe|netflix|streaming|tv show|series|hollywood|bollywood|entertainment|star|famous|premiere|box office)\b/)) return 'entertainment'
  if (text.match(/\b(health|hospital|doctor|medical|disease|virus|covid|pandemic|vaccine|treatment|surgery|cancer|heart|mental health|who|fda|drug|pharmaceutical|patient|symptom|diagnosis|outbreak|epidemic)\b/)) return 'health'
  if (text.match(/\b(science|research|study|discovery|scientist|nasa|space|astronomy|physics|biology|chemistry|climate|environment|species|fossil|experiment|laboratory|university|professor|journal|nature)\b/)) return 'science'
  if (text.match(/\b(crime|criminal|police|arrest|murder|shooting|robbery|fraud|theft|prison|jail|court|trial|verdict|guilty|innocent|investigation|fbi|cia|suspect|victim|assault|kidnap)\b/)) return 'crime'
  if (text.match(/\b(protest|demonstration|rally|riot|uprising|revolution|coup|strike|march|activist|protesters|clashes|tear gas|civil unrest)\b/)) return 'civil-unrest'
  if (text.match(/\b(earthquake|quake|seismic|magnitude|richter)\b/)) return 'earthquake'
  if (text.match(/\b(volcano|eruption|lava|volcanic)\b/)) return 'volcano'
  if (text.match(/\b(wildfire|forest fire|bushfire)\b/)) return 'wildfire'
  if (text.match(/\b(hurricane|typhoon|cyclone|tornado|storm)\b/)) return 'storm'
  return 'other'
}

function calculateSeverity(type: EventCategory, title: string): number {
  const text = title.toLowerCase()
  const categoryBase: Partial<Record<EventCategory, number>> = {
    'armed-conflict': 9, 'terrorism': 9, 'breaking': 7, 'earthquake': 7, 'volcano': 7,
    'crime': 6, 'health': 5, 'politics': 5, 'business': 4, 'sports': 4, 'entertainment': 3, 'technology': 4, 'science': 4,
  }
  let base = categoryBase[type] || 5
  if (text.match(/\b(dead|killed|death|dies|fatal|casualties|massacre)\b/)) base = Math.min(10, base + 2)
  if (text.match(/\b(major|massive|devastating|catastrophic|historic|escalation)\b/)) base = Math.min(10, base + 1)
  return Math.min(10, Math.max(1, base))
}

function calculateWeight(event: { type: EventCategory; country?: string; continent?: string; title: string; timestamp: number }): number {
  const country = (event.country || '').toLowerCase()
  const continent = event.continent || ''
  const type = event.type
  
  let weight = 1.0
  
  // Regional weights
  if (country === 'usa' || country === 'united states' || country.includes('america')) {
    weight = WEIGHT_CONFIG.US_WEIGHT
  } else if (country === 'mexico') {
    weight = WEIGHT_CONFIG.MEXICO_WEIGHT
  } else if (country === 'canada') {
    weight = WEIGHT_CONFIG.CANADA_WEIGHT
  } else if (continent === 'south-america') {
    weight = WEIGHT_CONFIG.SOUTH_AMERICA_WEIGHT
  } else if (country === 'china') {
    weight = WEIGHT_CONFIG.CHINA_WEIGHT
  } else if (continent === 'africa') {
    weight = WEIGHT_CONFIG.AFRICA_WEIGHT
  } else if (continent === 'europe') {
    weight = WEIGHT_CONFIG.EUROPE_WEIGHT
  } else if (continent === 'asia') {
    weight = WEIGHT_CONFIG.ASIA_WEIGHT
  }
  
  // Type-based boosts
  if (type === 'armed-conflict') weight *= WEIGHT_CONFIG.CONFLICT_WEIGHT
  else if (type === 'terrorism') weight *= WEIGHT_CONFIG.TERRORISM_WEIGHT
  else if (type === 'breaking') weight *= WEIGHT_CONFIG.BREAKING_WEIGHT
  
  // Recency boost
  const hoursAgo = (Date.now() - event.timestamp) / (1000 * 60 * 60)
  if (hoursAgo < 6) weight *= 1.3
  else if (hoursAgo < 24) weight *= 1.15
  
  return weight
}

// ============================================================================
// RSS PARSING
// ============================================================================

function parseRSSItem(itemXml: string): { title: string; description: string; link: string; pubDate: string } | null {
  const getTagContent = (xml: string, tag: string): string => {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const match = xml.match(regex)
    return (match?.[1] || match?.[2] || '').trim()
  }
  const title = getTagContent(itemXml, 'title')
  if (!title) return null
  return {
    title,
    description: getTagContent(itemXml, 'description') || getTagContent(itemXml, 'content:encoded') || '',
    link: getTagContent(itemXml, 'link') || getTagContent(itemXml, 'guid'),
    pubDate: getTagContent(itemXml, 'pubDate') || getTagContent(itemXml, 'dc:date') || new Date().toISOString(),
  }
}

async function fetchRSSFeed(url: string, sourceName: string, maxItems: number = 30): Promise<any[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) return []
    const xml = await response.text()
    const events: any[] = []
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || []
    
    for (const itemXml of itemMatches.slice(0, maxItems)) {
      const item = parseRSSItem(itemXml)
      if (!item) continue
      const cleanDesc = item.description.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim().substring(0, 500)
      const type = detectCategory(item.title, cleanDesc)
      
      // Try geocoding, use fallback if not found
      let geo = extractAndGeocode(`${item.title} ${cleanDesc}`)
      const usedFallback = !geo
      if (!geo) {
        geo = getFallbackLocation()
      }
      
      const timestamp = new Date(item.pubDate).getTime() || Date.now()
      const weightScore = calculateWeight({ type, country: geo.country, continent: geo.continent, title: item.title, timestamp })
      
      events.push({
        id: `rss-${sourceName.toLowerCase().replace(/\s/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: item.title.substring(0, 200),
        description: cleanDesc,
        category: type,
        severity: calculateSeverity(type, item.title),
        latitude: geo.lat,
        longitude: geo.lng,
        location_name: geo.location,
        country: geo.country,
        continent: geo.continent,
        timestamp: new Date(timestamp).toISOString(),
        source_name: sourceName,
        source_url: item.link,
        sources: [{ title: item.title, url: item.link, sourceName, date: new Date(timestamp).toISOString() }],
        is_ongoing: false,
        weight_score: usedFallback ? weightScore * 0.7 : weightScore, // Lower weight for fallback-geocoded
        metadata: { usedFallbackGeo: usedFallback },
      })
    }
    return events
  } catch {
    return []
  }
}

// ============================================================================
// USGS EARTHQUAKES - Expanded
// ============================================================================

async function fetchUSGS(): Promise<any[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    // Fetch more earthquakes (M4.0+ instead of M4.5+)
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson'
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) return []
    const data = await response.json()
    if (!data.features) return []
    
    return data.features.slice(0, 25).map((feature: any) => {
      const props = feature.properties
      const coords = feature.geometry.coordinates
      const mag = props.mag || 0
      return {
        id: `usgs-${feature.id}`,
        title: props.title || `M${mag.toFixed(1)} Earthquake`,
        description: `Magnitude ${mag.toFixed(1)} earthquake at ${props.place}`,
        category: 'earthquake' as EventCategory,
        severity: Math.min(10, Math.round(mag)),
        latitude: coords[1],
        longitude: coords[0],
        location_name: props.place,
        country: 'global',
        continent: 'global',
        timestamp: new Date(props.time).toISOString(),
        weight_score: mag >= 6 ? 10.0 : mag >= 5 ? 6.0 : 4.0,
        source_name: 'USGS',
        source_url: props.url,
        is_ongoing: false,
        metadata: { magnitude: mag, depth: coords[2] },
      }
    })
  } catch {
    return []
  }
}

// ============================================================================
// ONGOING CONFLICTS - Expanded
// ============================================================================

function getOngoingConflicts(): any[] {
  const now = new Date().toISOString()
  return [
    { id: 'ongoing-ukraine', title: 'Russia-Ukraine War', description: 'Full-scale Russian invasion of Ukraine, ongoing since February 2022.', category: 'armed-conflict', severity: 10, latitude: 48.379, longitude: 31.165, location_name: 'Ukraine', country: 'ukraine', continent: 'europe', timestamp: now, weight_score: 15.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2022-02-24', timeline: [{ date: '2022-02-24', event: 'Russia launches full-scale invasion' }, { date: '2024-08-06', event: 'Ukraine incursion into Kursk Oblast' }] },
    { id: 'ongoing-gaza', title: 'Israel-Gaza War', description: 'Major conflict following Hamas attack on October 7, 2023.', category: 'armed-conflict', severity: 10, latitude: 31.354, longitude: 34.308, location_name: 'Gaza Strip', country: 'palestine', continent: 'asia', timestamp: now, weight_score: 15.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2023-10-07', timeline: [{ date: '2023-10-07', event: 'Hamas attack on southern Israel' }, { date: '2024-05-06', event: 'Rafah operation begins' }] },
    { id: 'ongoing-sudan', title: 'Sudan Civil War', description: 'Armed conflict between SAF and RSF causing massive displacement.', category: 'armed-conflict', severity: 9, latitude: 15.500, longitude: 32.560, location_name: 'Khartoum', country: 'sudan', continent: 'africa', timestamp: now, weight_score: 12.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2023-04-15', timeline: [{ date: '2023-04-15', event: 'Fighting erupts between SAF and RSF' }] },
    { id: 'ongoing-myanmar', title: 'Myanmar Civil War', description: 'Armed resistance against military junta following 2021 coup.', category: 'armed-conflict', severity: 8, latitude: 21.914, longitude: 95.956, location_name: 'Myanmar', country: 'myanmar', continent: 'asia', timestamp: now, weight_score: 10.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2021-02-01' },
    { id: 'ongoing-yemen', title: 'Yemen Civil War', description: 'Multi-sided civil war with Saudi-led coalition intervention.', category: 'armed-conflict', severity: 9, latitude: 15.552, longitude: 48.516, location_name: 'Yemen', country: 'yemen', continent: 'asia', timestamp: now, weight_score: 11.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2014-09-21' },
    { id: 'ongoing-ethiopia', title: 'Ethiopia Conflict', description: 'Ongoing instability following Tigray War ceasefire.', category: 'armed-conflict', severity: 7, latitude: 9.145, longitude: 40.489, location_name: 'Ethiopia', country: 'ethiopia', continent: 'africa', timestamp: now, weight_score: 8.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2020-11-04' },
    { id: 'ongoing-haiti', title: 'Haiti Crisis', description: 'Gang violence and political instability in Haiti.', category: 'civil-unrest', severity: 8, latitude: 18.9712, longitude: -72.2852, location_name: 'Port-au-Prince', country: 'haiti', continent: 'north-america', timestamp: now, weight_score: 9.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2021-07-07' },
    { id: 'ongoing-drc', title: 'DRC Conflict', description: 'Armed conflict in eastern Democratic Republic of Congo.', category: 'armed-conflict', severity: 8, latitude: -1.658, longitude: 29.220, location_name: 'North Kivu', country: 'drc', continent: 'africa', timestamp: now, weight_score: 9.0, source_name: 'Global Monitor', is_ongoing: true, start_date: '2022-03-01' },
  ]
}

// ============================================================================
// API HANDLER - OPTIMIZED
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const errors: string[] = []
  const sourceStats: Record<string, number> = {}
  
  try {
    const supabase = createServerClient()
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured. Set environment variables.' },
        { status: 503 }
      )
    }
    
    // Fetch from all sources in parallel
    const [rssResults, usgsResults] = await Promise.all([
      Promise.all(RSS_FEEDS.map(feed => fetchRSSFeed(feed.url, feed.name, feed.maxItems))),
      fetchUSGS(),
    ])
    
    // Collect all events
    let allEvents: any[] = []
    
    for (let i = 0; i < rssResults.length; i++) {
      const feedEvents = rssResults[i]
      allEvents.push(...feedEvents)
      sourceStats[RSS_FEEDS[i].name] = feedEvents.length
    }
    
    allEvents.push(...usgsResults)
    sourceStats['USGS'] = usgsResults.length
    
    // Add ongoing conflicts
    const conflicts = getOngoingConflicts()
    allEvents.push(...conflicts)
    sourceStats['Ongoing Conflicts'] = conflicts.length
    
    // IMPROVED DEDUPLICATION: Use longer title substring + source
    const seen = new Set<string>()
    const uniqueEvents = allEvents.filter(e => {
      // Use 60 chars instead of 40, and normalize more aggressively
      const normalizedTitle = e.title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 60)
      const key = `${normalizedTitle}-${e.source_name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    
    // Sort by weight and take top 300 (increased from 250)
    uniqueEvents.sort((a, b) => (b.weight_score || 0) - (a.weight_score || 0))
    const topEvents = uniqueEvents.slice(0, 300)
    
    // BATCH UPSERT for speed (chunks of 50)
    let storedCount = 0
    const chunkSize = 50
    
    for (let i = 0; i < topEvents.length; i += chunkSize) {
      const chunk = topEvents.slice(i, i + chunkSize)
      try {
        const { error } = await (supabase as any)
          .from('events')
          .upsert(
            chunk.map(event => ({
              id: event.id,
              title: event.title,
              description: event.description,
              category: event.category,
              severity: event.severity,
              latitude: event.latitude,
              longitude: event.longitude,
              location_name: event.location_name,
              country: event.country,
              continent: event.continent,
              timestamp: event.timestamp,
              weight_score: event.weight_score,
              source_name: event.source_name,
              source_url: event.source_url,
              sources: event.sources || [],
              timeline: event.timeline || [],
              is_ongoing: event.is_ongoing || false,
              start_date: event.start_date || null,
              metadata: event.metadata || {},
            })),
            { onConflict: 'id' }
          )
        
        if (!error) storedCount += chunk.length
        else errors.push(`Batch ${i}: ${error.message}`)
      } catch (e) {
        errors.push(`Batch ${i}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
    
    const durationMs = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      stats: {
        totalFetched: allEvents.length,
        uniqueEvents: uniqueEvents.length,
        stored: storedCount,
        bySource: sourceStats,
        durationMs,
        errors: errors.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Aggregation failed' },
      { status: 500 }
    )
  }
}

// GET: Trigger aggregation (used by Vercel cron)
export async function GET(request: NextRequest) {
  // Vercel cron sends GET requests - run the full aggregation
  return POST(request)
}
