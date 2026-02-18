/**
 * Shared geocoding database and utilities
 *
 * Consolidates all city/country coordinate lookups used by
 * both the aggregation pipeline and the events fallback route.
 */

export interface CityCoords {
  lat: number
  lng: number
  country: string
  continent: string
}

export interface CountryCoords {
  lat: number
  lng: number
  continent: string
}

export interface GeoResult {
  lat: number
  lng: number
  location: string
  country: string
  continent: string
  quality: 'city' | 'country' | 'fallback'
}

// ============================================================================
// CITY COORDINATES - 270+ locations
// ============================================================================

export const CITY_COORDS: Record<string, CityCoords> = {
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
  // === Africa - Expanded ===
  'cairo': { lat: 30.0444, lng: 31.2357, country: 'egypt', continent: 'africa' },
  'lagos': { lat: 6.5244, lng: 3.3792, country: 'nigeria', continent: 'africa' },
  'abuja': { lat: 9.0579, lng: 7.4951, country: 'nigeria', continent: 'africa' },
  'johannesburg': { lat: -26.2041, lng: 28.0473, country: 'south africa', continent: 'africa' },
  'cape town': { lat: -33.9249, lng: 18.4241, country: 'south africa', continent: 'africa' },
  'durban': { lat: -29.8587, lng: 31.0218, country: 'south africa', continent: 'africa' },
  'pretoria': { lat: -25.7479, lng: 28.2293, country: 'south africa', continent: 'africa' },
  'nairobi': { lat: -1.2921, lng: 36.8219, country: 'kenya', continent: 'africa' },
  'mombasa': { lat: -4.0435, lng: 39.6682, country: 'kenya', continent: 'africa' },
  'addis ababa': { lat: 9.0320, lng: 38.7469, country: 'ethiopia', continent: 'africa' },
  'khartoum': { lat: 15.5007, lng: 32.5599, country: 'sudan', continent: 'africa' },
  'casablanca': { lat: 33.5731, lng: -7.5898, country: 'morocco', continent: 'africa' },
  'rabat': { lat: 34.0209, lng: -6.8416, country: 'morocco', continent: 'africa' },
  'algiers': { lat: 36.7372, lng: 3.0863, country: 'algeria', continent: 'africa' },
  'tunis': { lat: 36.8065, lng: 10.1815, country: 'tunisia', continent: 'africa' },
  'tripoli': { lat: 32.8872, lng: 13.1913, country: 'libya', continent: 'africa' },
  'accra': { lat: 5.6037, lng: -0.1870, country: 'ghana', continent: 'africa' },
  'kinshasa': { lat: -4.4419, lng: 15.2663, country: 'drc', continent: 'africa' },
  // West Africa
  'dakar': { lat: 14.7167, lng: -17.4677, country: 'senegal', continent: 'africa' },
  'abidjan': { lat: 5.3600, lng: -4.0083, country: 'ivory coast', continent: 'africa' },
  'bamako': { lat: 12.6392, lng: -8.0029, country: 'mali', continent: 'africa' },
  'ouagadougou': { lat: 12.3714, lng: -1.5197, country: 'burkina faso', continent: 'africa' },
  'niamey': { lat: 13.5127, lng: 2.1128, country: 'niger', continent: 'africa' },
  'conakry': { lat: 9.6412, lng: -13.5784, country: 'guinea', continent: 'africa' },
  'freetown': { lat: 8.4840, lng: -13.2299, country: 'sierra leone', continent: 'africa' },
  'monrovia': { lat: 6.2907, lng: -10.7605, country: 'liberia', continent: 'africa' },
  'lome': { lat: 6.1725, lng: 1.2314, country: 'togo', continent: 'africa' },
  'cotonou': { lat: 6.3703, lng: 2.3912, country: 'benin', continent: 'africa' },
  // East Africa
  'dar es salaam': { lat: -6.7924, lng: 39.2083, country: 'tanzania', continent: 'africa' },
  'kampala': { lat: 0.3476, lng: 32.5825, country: 'uganda', continent: 'africa' },
  'kigali': { lat: -1.9403, lng: 29.8739, country: 'rwanda', continent: 'africa' },
  'bujumbura': { lat: -3.3614, lng: 29.3599, country: 'burundi', continent: 'africa' },
  'mogadishu': { lat: 2.0469, lng: 45.3182, country: 'somalia', continent: 'africa' },
  'djibouti': { lat: 11.5880, lng: 43.1456, country: 'djibouti', continent: 'africa' },
  'asmara': { lat: 15.3229, lng: 38.9251, country: 'eritrea', continent: 'africa' },
  'juba': { lat: 4.8594, lng: 31.5713, country: 'south sudan', continent: 'africa' },
  // Central Africa
  'brazzaville': { lat: -4.2634, lng: 15.2429, country: 'congo', continent: 'africa' },
  'libreville': { lat: 0.4162, lng: 9.4673, country: 'gabon', continent: 'africa' },
  'yaounde': { lat: 3.8480, lng: 11.5021, country: 'cameroon', continent: 'africa' },
  'douala': { lat: 4.0511, lng: 9.7679, country: 'cameroon', continent: 'africa' },
  'bangui': { lat: 4.3947, lng: 18.5582, country: 'central african republic', continent: 'africa' },
  'ndjamena': { lat: 12.1348, lng: 15.0557, country: 'chad', continent: 'africa' },
  // Southern Africa
  'luanda': { lat: -8.8390, lng: 13.2894, country: 'angola', continent: 'africa' },
  'lusaka': { lat: -15.3875, lng: 28.3228, country: 'zambia', continent: 'africa' },
  'harare': { lat: -17.8252, lng: 31.0335, country: 'zimbabwe', continent: 'africa' },
  'maputo': { lat: -25.9692, lng: 32.5732, country: 'mozambique', continent: 'africa' },
  'lilongwe': { lat: -13.9626, lng: 33.7741, country: 'malawi', continent: 'africa' },
  'gaborone': { lat: -24.6282, lng: 25.9231, country: 'botswana', continent: 'africa' },
  'windhoek': { lat: -22.5609, lng: 17.0658, country: 'namibia', continent: 'africa' },
  'antananarivo': { lat: -18.8792, lng: 47.5079, country: 'madagascar', continent: 'africa' },
  // === Asia - Expanded ===
  'tokyo': { lat: 35.6762, lng: 139.6503, country: 'japan', continent: 'asia' },
  'osaka': { lat: 34.6937, lng: 135.5023, country: 'japan', continent: 'asia' },
  'beijing': { lat: 39.9042, lng: 116.4074, country: 'china', continent: 'asia' },
  'shanghai': { lat: 31.2304, lng: 121.4737, country: 'china', continent: 'asia' },
  'guangzhou': { lat: 23.1291, lng: 113.2644, country: 'china', continent: 'asia' },
  'shenzhen': { lat: 22.5431, lng: 114.0579, country: 'china', continent: 'asia' },
  'chengdu': { lat: 30.5728, lng: 104.0668, country: 'china', continent: 'asia' },
  'wuhan': { lat: 30.5928, lng: 114.3055, country: 'china', continent: 'asia' },
  'hong kong': { lat: 22.3193, lng: 114.1694, country: 'china', continent: 'asia' },
  'seoul': { lat: 37.5665, lng: 126.9780, country: 'south korea', continent: 'asia' },
  'busan': { lat: 35.1796, lng: 129.0756, country: 'south korea', continent: 'asia' },
  'singapore': { lat: 1.3521, lng: 103.8198, country: 'singapore', continent: 'asia' },
  'mumbai': { lat: 19.0760, lng: 72.8777, country: 'india', continent: 'asia' },
  'delhi': { lat: 28.6139, lng: 77.2090, country: 'india', continent: 'asia' },
  'new delhi': { lat: 28.6139, lng: 77.2090, country: 'india', continent: 'asia' },
  'bangalore': { lat: 12.9716, lng: 77.5946, country: 'india', continent: 'asia' },
  'chennai': { lat: 13.0827, lng: 80.2707, country: 'india', continent: 'asia' },
  'kolkata': { lat: 22.5726, lng: 88.3639, country: 'india', continent: 'asia' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, country: 'india', continent: 'asia' },
  'taipei': { lat: 25.0330, lng: 121.5654, country: 'taiwan', continent: 'asia' },
  'bangkok': { lat: 13.7563, lng: 100.5018, country: 'thailand', continent: 'asia' },
  'jakarta': { lat: -6.2088, lng: 106.8456, country: 'indonesia', continent: 'asia' },
  'surabaya': { lat: -7.2575, lng: 112.7521, country: 'indonesia', continent: 'asia' },
  'manila': { lat: 14.5995, lng: 120.9842, country: 'philippines', continent: 'asia' },
  'dubai': { lat: 25.2048, lng: 55.2708, country: 'uae', continent: 'asia' },
  'abu dhabi': { lat: 24.4539, lng: 54.3773, country: 'uae', continent: 'asia' },
  'tel aviv': { lat: 32.0853, lng: 34.7818, country: 'israel', continent: 'asia' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, country: 'israel', continent: 'asia' },
  'riyadh': { lat: 24.7136, lng: 46.6753, country: 'saudi arabia', continent: 'asia' },
  'jeddah': { lat: 21.4858, lng: 39.1925, country: 'saudi arabia', continent: 'asia' },
  'mecca': { lat: 21.3891, lng: 39.8579, country: 'saudi arabia', continent: 'asia' },
  'tehran': { lat: 35.6892, lng: 51.3890, country: 'iran', continent: 'asia' },
  'isfahan': { lat: 32.6546, lng: 51.6680, country: 'iran', continent: 'asia' },
  'istanbul': { lat: 41.0082, lng: 28.9784, country: 'turkey', continent: 'asia' },
  'ankara': { lat: 39.9334, lng: 32.8597, country: 'turkey', continent: 'asia' },
  'baghdad': { lat: 33.3152, lng: 44.3661, country: 'iraq', continent: 'asia' },
  'basra': { lat: 30.5085, lng: 47.7804, country: 'iraq', continent: 'asia' },
  'kabul': { lat: 34.5281, lng: 69.1723, country: 'afghanistan', continent: 'asia' },
  'damascus': { lat: 33.5138, lng: 36.2765, country: 'syria', continent: 'asia' },
  'aleppo': { lat: 36.2021, lng: 37.1343, country: 'syria', continent: 'asia' },
  'beirut': { lat: 33.8938, lng: 35.5018, country: 'lebanon', continent: 'asia' },
  'gaza': { lat: 31.3547, lng: 34.3088, country: 'palestine', continent: 'asia' },
  'west bank': { lat: 31.9474, lng: 35.2272, country: 'palestine', continent: 'asia' },
  'pyongyang': { lat: 39.0392, lng: 125.7625, country: 'north korea', continent: 'asia' },
  'hanoi': { lat: 21.0285, lng: 105.8542, country: 'vietnam', continent: 'asia' },
  'ho chi minh city': { lat: 10.8231, lng: 106.6297, country: 'vietnam', continent: 'asia' },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869, country: 'malaysia', continent: 'asia' },
  // Southeast Asia
  'phnom penh': { lat: 11.5564, lng: 104.9282, country: 'cambodia', continent: 'asia' },
  'yangon': { lat: 16.8661, lng: 96.1951, country: 'myanmar', continent: 'asia' },
  'naypyidaw': { lat: 19.7633, lng: 96.0785, country: 'myanmar', continent: 'asia' },
  'vientiane': { lat: 17.9757, lng: 102.6331, country: 'laos', continent: 'asia' },
  'colombo': { lat: 6.9271, lng: 79.8612, country: 'sri lanka', continent: 'asia' },
  'dhaka': { lat: 23.8103, lng: 90.4125, country: 'bangladesh', continent: 'asia' },
  'kathmandu': { lat: 27.7172, lng: 85.3240, country: 'nepal', continent: 'asia' },
  // Central Asia
  'tashkent': { lat: 41.2995, lng: 69.2401, country: 'uzbekistan', continent: 'asia' },
  'almaty': { lat: 43.2220, lng: 76.8512, country: 'kazakhstan', continent: 'asia' },
  'astana': { lat: 51.1694, lng: 71.4491, country: 'kazakhstan', continent: 'asia' },
  'bishkek': { lat: 42.8746, lng: 74.5698, country: 'kyrgyzstan', continent: 'asia' },
  'dushanbe': { lat: 38.5598, lng: 68.7740, country: 'tajikistan', continent: 'asia' },
  'ashgabat': { lat: 37.9601, lng: 58.3261, country: 'turkmenistan', continent: 'asia' },
  // Caucasus
  'baku': { lat: 40.4093, lng: 49.8671, country: 'azerbaijan', continent: 'asia' },
  'tbilisi': { lat: 41.7151, lng: 44.8271, country: 'georgia', continent: 'asia' },
  'yerevan': { lat: 40.1792, lng: 44.4991, country: 'armenia', continent: 'asia' },
  // Middle East extras
  'doha': { lat: 25.2854, lng: 51.5310, country: 'qatar', continent: 'asia' },
  'muscat': { lat: 23.5880, lng: 58.3829, country: 'oman', continent: 'asia' },
  'kuwait city': { lat: 29.3759, lng: 47.9774, country: 'kuwait', continent: 'asia' },
  'amman': { lat: 31.9454, lng: 35.9284, country: 'jordan', continent: 'asia' },
  'sanaa': { lat: 15.3694, lng: 44.1910, country: 'yemen', continent: 'asia' },
  'islamabad': { lat: 33.6844, lng: 73.0479, country: 'pakistan', continent: 'asia' },
  'karachi': { lat: 24.8607, lng: 67.0011, country: 'pakistan', continent: 'asia' },
  'lahore': { lat: 31.5204, lng: 74.3587, country: 'pakistan', continent: 'asia' },
  // === Central America & Caribbean ===
  'guatemala city': { lat: 14.6349, lng: -90.5069, country: 'guatemala', continent: 'north-america' },
  'san salvador': { lat: 13.6929, lng: -89.2182, country: 'el salvador', continent: 'north-america' },
  'tegucigalpa': { lat: 14.0723, lng: -87.1921, country: 'honduras', continent: 'north-america' },
  'managua': { lat: 12.1150, lng: -86.2362, country: 'nicaragua', continent: 'north-america' },
  'san jose': { lat: 9.9281, lng: -84.0907, country: 'costa rica', continent: 'north-america' },
  'panama city': { lat: 8.9824, lng: -79.5199, country: 'panama', continent: 'north-america' },
  'havana': { lat: 23.1136, lng: -82.3666, country: 'cuba', continent: 'north-america' },
  'kingston': { lat: 18.0179, lng: -76.8099, country: 'jamaica', continent: 'north-america' },
  'port-au-prince': { lat: 18.5944, lng: -72.3074, country: 'haiti', continent: 'north-america' },
  'santo domingo': { lat: 18.4861, lng: -69.9312, country: 'dominican republic', continent: 'north-america' },
  'san juan': { lat: 18.4655, lng: -66.1057, country: 'puerto rico', continent: 'north-america' },
  'nassau': { lat: 25.0343, lng: -77.3963, country: 'bahamas', continent: 'north-america' },
  'port of spain': { lat: 10.6596, lng: -61.5086, country: 'trinidad and tobago', continent: 'north-america' },
  'belize city': { lat: 17.5046, lng: -88.1962, country: 'belize', continent: 'north-america' },
  // === South America - Expanded ===
  'quito': { lat: -0.1807, lng: -78.4678, country: 'ecuador', continent: 'south-america' },
  'guayaquil': { lat: -2.1710, lng: -79.9224, country: 'ecuador', continent: 'south-america' },
  'la paz': { lat: -16.4897, lng: -68.1193, country: 'bolivia', continent: 'south-america' },
  'asuncion': { lat: -25.2637, lng: -57.5759, country: 'paraguay', continent: 'south-america' },
  'montevideo': { lat: -34.9011, lng: -56.1645, country: 'uruguay', continent: 'south-america' },
  'georgetown': { lat: 6.8013, lng: -58.1551, country: 'guyana', continent: 'south-america' },
  'paramaribo': { lat: 5.8520, lng: -55.2038, country: 'suriname', continent: 'south-america' },
  'brasilia': { lat: -15.7975, lng: -47.8919, country: 'brazil', continent: 'south-america' },
  'recife': { lat: -8.0476, lng: -34.8770, country: 'brazil', continent: 'south-america' },
  'salvador': { lat: -12.9714, lng: -38.5124, country: 'brazil', continent: 'south-america' },
  'belo horizonte': { lat: -19.9167, lng: -43.9345, country: 'brazil', continent: 'south-america' },
  // === Europe - Expanded ===
  'edinburgh': { lat: 55.9533, lng: -3.1883, country: 'uk', continent: 'europe' },
  'belfast': { lat: 54.5973, lng: -5.9301, country: 'uk', continent: 'europe' },
  'bucharest': { lat: 44.4268, lng: 26.1025, country: 'romania', continent: 'europe' },
  'sofia': { lat: 42.6977, lng: 23.3219, country: 'bulgaria', continent: 'europe' },
  'zagreb': { lat: 45.8150, lng: 15.9819, country: 'croatia', continent: 'europe' },
  'belgrade': { lat: 44.7866, lng: 20.4489, country: 'serbia', continent: 'europe' },
  'sarajevo': { lat: 43.8563, lng: 18.4131, country: 'bosnia', continent: 'europe' },
  'tirana': { lat: 41.3275, lng: 19.8187, country: 'albania', continent: 'europe' },
  'skopje': { lat: 41.9973, lng: 21.4280, country: 'north macedonia', continent: 'europe' },
  'bratislava': { lat: 48.1486, lng: 17.1077, country: 'slovakia', continent: 'europe' },
  'vilnius': { lat: 54.6872, lng: 25.2797, country: 'lithuania', continent: 'europe' },
  'riga': { lat: 56.9496, lng: 24.1052, country: 'latvia', continent: 'europe' },
  'tallinn': { lat: 59.4370, lng: 24.7536, country: 'estonia', continent: 'europe' },
  'minsk': { lat: 53.9006, lng: 27.5590, country: 'belarus', continent: 'europe' },
  'chisinau': { lat: 47.0105, lng: 28.8638, country: 'moldova', continent: 'europe' },
  // === Oceania - Expanded ===
  'sydney': { lat: -33.8688, lng: 151.2093, country: 'australia', continent: 'oceania' },
  'melbourne': { lat: -37.8136, lng: 144.9631, country: 'australia', continent: 'oceania' },
  'brisbane': { lat: -27.4698, lng: 153.0251, country: 'australia', continent: 'oceania' },
  'perth': { lat: -31.9505, lng: 115.8605, country: 'australia', continent: 'oceania' },
  'adelaide': { lat: -34.9285, lng: 138.6007, country: 'australia', continent: 'oceania' },
  'canberra': { lat: -35.2809, lng: 149.1300, country: 'australia', continent: 'oceania' },
  'darwin': { lat: -12.4634, lng: 130.8456, country: 'australia', continent: 'oceania' },
  'auckland': { lat: -36.8485, lng: 174.7633, country: 'new zealand', continent: 'oceania' },
  'wellington': { lat: -41.2865, lng: 174.7762, country: 'new zealand', continent: 'oceania' },
  'christchurch': { lat: -43.5321, lng: 172.6362, country: 'new zealand', continent: 'oceania' },
  'suva': { lat: -18.1416, lng: 178.4419, country: 'fiji', continent: 'oceania' },
  'port moresby': { lat: -6.3149, lng: 143.9556, country: 'papua new guinea', continent: 'oceania' },
  'noumea': { lat: -22.2558, lng: 166.4505, country: 'new caledonia', continent: 'oceania' },
  'honiara': { lat: -9.4456, lng: 159.9729, country: 'solomon islands', continent: 'oceania' },
  'apia': { lat: -13.8333, lng: -171.7500, country: 'samoa', continent: 'oceania' },
}

// ============================================================================
// COUNTRY COORDINATES
// ============================================================================

export const COUNTRY_COORDS: Record<string, CountryCoords> = {
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
  'somali': { lat: 5.1521, lng: 46.1996, continent: 'africa' },
  'senegal': { lat: 14.4974, lng: -14.4524, continent: 'africa' },
  'ivory coast': { lat: 7.5400, lng: -5.5471, continent: 'africa' },
  'mali': { lat: 17.5707, lng: -3.9962, continent: 'africa' },
  'burkina faso': { lat: 12.2383, lng: -1.5616, continent: 'africa' },
  'niger': { lat: 17.6078, lng: 8.0817, continent: 'africa' },
  'guinea': { lat: 9.9456, lng: -9.6966, continent: 'africa' },
  'sierra leone': { lat: 8.4606, lng: -11.7799, continent: 'africa' },
  'liberia': { lat: 6.4281, lng: -9.4295, continent: 'africa' },
  'togo': { lat: 8.6195, lng: 0.8248, continent: 'africa' },
  'benin': { lat: 9.3077, lng: 2.3158, continent: 'africa' },
  'cameroon': { lat: 7.3697, lng: 12.3547, continent: 'africa' },
  'chad': { lat: 15.4542, lng: 18.7322, continent: 'africa' },
  'central african republic': { lat: 6.6111, lng: 20.9394, continent: 'africa' },
  'gabon': { lat: -0.8037, lng: 11.6094, continent: 'africa' },
  'tanzania': { lat: -6.3690, lng: 34.8888, continent: 'africa' },
  'uganda': { lat: 1.3733, lng: 32.2903, continent: 'africa' },
  'rwanda': { lat: -1.9403, lng: 29.8739, continent: 'africa' },
  'burundi': { lat: -3.3731, lng: 29.9189, continent: 'africa' },
  'south sudan': { lat: 6.8770, lng: 31.3070, continent: 'africa' },
  'eritrea': { lat: 15.1794, lng: 39.7823, continent: 'africa' },
  'djibouti': { lat: 11.8251, lng: 42.5903, continent: 'africa' },
  'angola': { lat: -11.2027, lng: 17.8739, continent: 'africa' },
  'zambia': { lat: -13.1339, lng: 27.8493, continent: 'africa' },
  'zimbabwe': { lat: -19.0154, lng: 29.1549, continent: 'africa' },
  'mozambique': { lat: -18.6657, lng: 35.5296, continent: 'africa' },
  'malawi': { lat: -13.2543, lng: 34.3015, continent: 'africa' },
  'botswana': { lat: -22.3285, lng: 24.6849, continent: 'africa' },
  'namibia': { lat: -22.9576, lng: 18.4904, continent: 'africa' },
  'madagascar': { lat: -18.7669, lng: 46.8691, continent: 'africa' },
  // Central America & Caribbean
  'guatemala': { lat: 15.7835, lng: -90.2308, continent: 'north-america' },
  'el salvador': { lat: 13.7942, lng: -88.8965, continent: 'north-america' },
  'honduras': { lat: 15.2000, lng: -86.2419, continent: 'north-america' },
  'nicaragua': { lat: 12.8654, lng: -85.2072, continent: 'north-america' },
  'costa rica': { lat: 9.7489, lng: -83.7534, continent: 'north-america' },
  'panama': { lat: 8.5380, lng: -80.7821, continent: 'north-america' },
  'cuba': { lat: 21.5218, lng: -77.7812, continent: 'north-america' },
  'cuban': { lat: 21.5218, lng: -77.7812, continent: 'north-america' },
  'jamaica': { lat: 18.1096, lng: -77.2975, continent: 'north-america' },
  'haiti': { lat: 18.9712, lng: -72.2852, continent: 'north-america' },
  'haitian': { lat: 18.9712, lng: -72.2852, continent: 'north-america' },
  'dominican republic': { lat: 18.7357, lng: -70.1627, continent: 'north-america' },
  'puerto rico': { lat: 18.2208, lng: -66.5901, continent: 'north-america' },
  'trinidad': { lat: 10.6918, lng: -61.2225, continent: 'north-america' },
  // South America extras
  'ecuador': { lat: -1.8312, lng: -78.1834, continent: 'south-america' },
  'bolivia': { lat: -16.2902, lng: -63.5887, continent: 'south-america' },
  'paraguay': { lat: -23.4425, lng: -58.4438, continent: 'south-america' },
  'uruguay': { lat: -32.5228, lng: -55.7658, continent: 'south-america' },
  'guyana': { lat: 4.8604, lng: -58.9302, continent: 'south-america' },
  'suriname': { lat: 3.9193, lng: -56.0278, continent: 'south-america' },
  // Central Asia & Caucasus
  'uzbekistan': { lat: 41.3775, lng: 64.5853, continent: 'asia' },
  'kazakhstan': { lat: 48.0196, lng: 66.9237, continent: 'asia' },
  'kyrgyzstan': { lat: 41.2044, lng: 74.7661, continent: 'asia' },
  'tajikistan': { lat: 38.8610, lng: 71.2761, continent: 'asia' },
  'turkmenistan': { lat: 38.9697, lng: 59.5563, continent: 'asia' },
  'azerbaijan': { lat: 40.1431, lng: 47.5769, continent: 'asia' },
  'armenia': { lat: 40.0691, lng: 45.0382, continent: 'asia' },
  'cambodia': { lat: 12.5657, lng: 104.9910, continent: 'asia' },
  'laos': { lat: 19.8563, lng: 102.4955, continent: 'asia' },
  'sri lanka': { lat: 7.8731, lng: 80.7718, continent: 'asia' },
  'nepal': { lat: 28.3949, lng: 84.1240, continent: 'asia' },
  'qatar': { lat: 25.3548, lng: 51.1839, continent: 'asia' },
  'oman': { lat: 21.4735, lng: 55.9754, continent: 'asia' },
  'kuwait': { lat: 29.3117, lng: 47.4818, continent: 'asia' },
  'jordan': { lat: 30.5852, lng: 36.2384, continent: 'asia' },
  'uae': { lat: 23.4241, lng: 53.8478, continent: 'asia' },
  // Europe extras
  'romania': { lat: 45.9432, lng: 24.9668, continent: 'europe' },
  'bulgaria': { lat: 42.7339, lng: 25.4858, continent: 'europe' },
  'croatia': { lat: 45.1000, lng: 15.2000, continent: 'europe' },
  'serbia': { lat: 44.0165, lng: 21.0059, continent: 'europe' },
  'serbian': { lat: 44.0165, lng: 21.0059, continent: 'europe' },
  'bosnia': { lat: 43.9159, lng: 17.6791, continent: 'europe' },
  'albania': { lat: 41.1533, lng: 20.1683, continent: 'europe' },
  'slovakia': { lat: 48.6690, lng: 19.6990, continent: 'europe' },
  'lithuania': { lat: 55.1694, lng: 23.8813, continent: 'europe' },
  'latvia': { lat: 56.8796, lng: 24.6032, continent: 'europe' },
  'estonia': { lat: 58.5953, lng: 25.0136, continent: 'europe' },
  'belarus': { lat: 53.7098, lng: 27.9534, continent: 'europe' },
  'moldova': { lat: 47.4116, lng: 28.3699, continent: 'europe' },
  // Oceania extras
  'australia': { lat: -25.2744, lng: 133.7751, continent: 'oceania' },
  'australian': { lat: -25.2744, lng: 133.7751, continent: 'oceania' },
  'new zealand': { lat: -40.9006, lng: 174.8860, continent: 'oceania' },
  'fiji': { lat: -17.7134, lng: 178.0650, continent: 'oceania' },
  'papua new guinea': { lat: -6.3150, lng: 143.9555, continent: 'oceania' },
  'samoa': { lat: -13.7590, lng: -172.1046, continent: 'oceania' },
  'solomon islands': { lat: -9.6457, lng: 160.1562, continent: 'oceania' },
}

// ============================================================================
// FALLBACK LOCATIONS (rotates through major cities for ungeocodable events)
// ============================================================================

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

// ============================================================================
// GEOCODING FUNCTIONS
// ============================================================================

/**
 * Extract location from text and return coordinates with quality indicator.
 * Tries cities first (most specific), then countries, then returns null.
 */
export function extractAndGeocode(text: string): GeoResult | null {
  const lowerText = text.toLowerCase()

  // Try cities first (more specific)
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lowerText.includes(city)) {
      return { lat: coords.lat, lng: coords.lng, location: city, country: coords.country, continent: coords.continent, quality: 'city' }
    }
  }

  // Then try countries
  for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
    if (lowerText.includes(country)) {
      return { lat: coords.lat, lng: coords.lng, location: country, country: country, continent: coords.continent, quality: 'country' }
    }
  }

  return null
}

/**
 * Get a fallback location for ungeocodable events.
 * Rotates through major world cities with random offset to prevent stacking.
 */
export function getFallbackLocation(): GeoResult {
  const loc = FALLBACK_LOCATIONS[fallbackIndex % FALLBACK_LOCATIONS.length]
  fallbackIndex++
  return {
    lat: loc.lat + (Math.random() - 0.5) * 2,
    lng: loc.lng + (Math.random() - 0.5) * 2,
    location: loc.location,
    country: loc.country,
    continent: loc.continent,
    quality: 'fallback',
  }
}
