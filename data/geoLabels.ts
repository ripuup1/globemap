/**
 * Vox Terra - Client-Side Geographic Labels Dataset
 * 
 * Pre-loaded major cities and countries for Google Earth-style labels.
 * Optimized for zoom-based visibility with futuristic styling.
 * 
 * Data includes ~200 major cities worldwide + country centroids
 * Total dataset: ~15KB (minimal bundle impact)
 */

export interface GeoLabel {
  name: string
  lat: number
  lng: number
  type: 'city' | 'country' | 'region'
  population?: number  // For priority/sizing
  minZoom: number      // Minimum zoom level to show (1-4, lower = shows at global view)
}

// Major world cities - visible at different zoom levels
export const CITIES: GeoLabel[] = [
  // Tier 1: Global cities - visible at any zoom
  { name: 'New York', lat: 40.7128, lng: -74.006, type: 'city', population: 8400000, minZoom: 1 },
  { name: 'London', lat: 51.5074, lng: -0.1278, type: 'city', population: 8900000, minZoom: 1 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, type: 'city', population: 13900000, minZoom: 1 },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, type: 'city', population: 21500000, minZoom: 1 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, type: 'city', population: 2100000, minZoom: 1 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, type: 'city', population: 3900000, minZoom: 1 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, type: 'city', population: 3400000, minZoom: 1 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, type: 'city', population: 5600000, minZoom: 1 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, type: 'city', population: 5300000, minZoom: 1 },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, type: 'city', population: 12500000, minZoom: 1 },
  
  // Tier 2: Major cities - visible at medium zoom
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, type: 'city', population: 12300000, minZoom: 1.5 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777, type: 'city', population: 20700000, minZoom: 1.5 },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, type: 'city', population: 26300000, minZoom: 1.5 },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, type: 'city', population: 21800000, minZoom: 1.5 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, type: 'city', population: 20900000, minZoom: 1.5 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, type: 'city', population: 14400000, minZoom: 1.5 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, type: 'city', population: 15500000, minZoom: 1.5 },
  { name: 'Seoul', lat: 37.5665, lng: 126.978, type: 'city', population: 9700000, minZoom: 1.5 },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, type: 'city', population: 10600000, minZoom: 1.5 },
  { name: 'Berlin', lat: 52.52, lng: 13.405, type: 'city', population: 3600000, minZoom: 1.5 },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, type: 'city', population: 3200000, minZoom: 1.5 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, type: 'city', population: 2800000, minZoom: 1.5 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, type: 'city', population: 2900000, minZoom: 1.5 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694, type: 'city', population: 7500000, minZoom: 1.5 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, type: 'city', population: 10500000, minZoom: 1.5 },
  
  // Tier 3: Important cities - visible at closer zoom
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, type: 'city', population: 2700000, minZoom: 2 },
  { name: 'Houston', lat: 29.7604, lng: -95.3698, type: 'city', population: 2300000, minZoom: 2 },
  { name: 'Miami', lat: 25.7617, lng: -80.1918, type: 'city', population: 450000, minZoom: 2 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, type: 'city', population: 880000, minZoom: 2 },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321, type: 'city', population: 750000, minZoom: 2 },
  { name: 'Denver', lat: 39.7392, lng: -104.9903, type: 'city', population: 720000, minZoom: 2 },
  { name: 'Boston', lat: 42.3601, lng: -71.0589, type: 'city', population: 690000, minZoom: 2 },
  { name: 'Atlanta', lat: 33.749, lng: -84.388, type: 'city', population: 500000, minZoom: 2 },
  { name: 'Dallas', lat: 32.7767, lng: -96.797, type: 'city', population: 1300000, minZoom: 2 },
  { name: 'Phoenix', lat: 33.4484, lng: -112.074, type: 'city', population: 1600000, minZoom: 2 },
  { name: 'Washington', lat: 38.9072, lng: -77.0369, type: 'city', population: 700000, minZoom: 2 },
  { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, type: 'city', population: 1600000, minZoom: 2 },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207, type: 'city', population: 630000, minZoom: 2 },
  { name: 'Montreal', lat: 45.5017, lng: -73.5673, type: 'city', population: 1700000, minZoom: 2 },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, type: 'city', population: 2900000, minZoom: 2 },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, type: 'city', population: 6700000, minZoom: 2 },
  { name: 'Lima', lat: -12.0464, lng: -77.0428, type: 'city', population: 10700000, minZoom: 2 },
  { name: 'Bogotá', lat: 4.711, lng: -74.0721, type: 'city', population: 7400000, minZoom: 2 },
  { name: 'Santiago', lat: -33.4489, lng: -70.6693, type: 'city', population: 6300000, minZoom: 2 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209, type: 'city', population: 29400000, minZoom: 2 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946, type: 'city', population: 12300000, minZoom: 2 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, type: 'city', population: 5600000, minZoom: 2 },
  { name: 'Cape Town', lat: -33.9249, lng: 18.4241, type: 'city', population: 4600000, minZoom: 2 },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, type: 'city', population: 4400000, minZoom: 2 },
  { name: 'Tel Aviv', lat: 32.0853, lng: 34.7818, type: 'city', population: 450000, minZoom: 2 },
  { name: 'Riyadh', lat: 24.7136, lng: 46.6753, type: 'city', population: 7600000, minZoom: 2 },
  { name: 'Tehran', lat: 35.6892, lng: 51.389, type: 'city', population: 8700000, minZoom: 2 },
  { name: 'Baghdad', lat: 33.3152, lng: 44.3661, type: 'city', population: 7200000, minZoom: 2 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, type: 'city', population: 15400000, minZoom: 2 },
  { name: 'Manila', lat: 14.5995, lng: 120.9842, type: 'city', population: 1800000, minZoom: 2 },
  { name: 'Kuala Lumpur', lat: 3.139, lng: 101.6869, type: 'city', population: 1800000, minZoom: 2 },
  { name: 'Ho Chi Minh', lat: 10.8231, lng: 106.6297, type: 'city', population: 9000000, minZoom: 2 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, type: 'city', population: 5000000, minZoom: 2 },
  { name: 'Auckland', lat: -36.8485, lng: 174.7633, type: 'city', population: 1700000, minZoom: 2 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, type: 'city', population: 870000, minZoom: 2 },
  { name: 'Brussels', lat: 50.8503, lng: 4.3517, type: 'city', population: 1200000, minZoom: 2 },
  { name: 'Vienna', lat: 48.2082, lng: 16.3738, type: 'city', population: 1900000, minZoom: 2 },
  { name: 'Zurich', lat: 47.3769, lng: 8.5417, type: 'city', population: 430000, minZoom: 2 },
  { name: 'Munich', lat: 48.1351, lng: 11.582, type: 'city', population: 1500000, minZoom: 2 },
  { name: 'Barcelona', lat: 41.3851, lng: 2.1734, type: 'city', population: 1600000, minZoom: 2 },
  { name: 'Milan', lat: 45.4642, lng: 9.19, type: 'city', population: 1400000, minZoom: 2 },
  { name: 'Lisbon', lat: 38.7223, lng: -9.1393, type: 'city', population: 550000, minZoom: 2 },
  { name: 'Dublin', lat: 53.3498, lng: -6.2603, type: 'city', population: 550000, minZoom: 2 },
  { name: 'Stockholm', lat: 59.3293, lng: 18.0686, type: 'city', population: 970000, minZoom: 2 },
  { name: 'Oslo', lat: 59.9139, lng: 10.7522, type: 'city', population: 700000, minZoom: 2 },
  { name: 'Copenhagen', lat: 55.6761, lng: 12.5683, type: 'city', population: 630000, minZoom: 2 },
  { name: 'Helsinki', lat: 60.1699, lng: 24.9384, type: 'city', population: 650000, minZoom: 2 },
  { name: 'Warsaw', lat: 52.2297, lng: 21.0122, type: 'city', population: 1800000, minZoom: 2 },
  { name: 'Prague', lat: 50.0755, lng: 14.4378, type: 'city', population: 1300000, minZoom: 2 },
  { name: 'Budapest', lat: 47.4979, lng: 19.0402, type: 'city', population: 1800000, minZoom: 2 },
  { name: 'Athens', lat: 37.9838, lng: 23.7275, type: 'city', population: 660000, minZoom: 2 },
  { name: 'Kyiv', lat: 50.4501, lng: 30.5234, type: 'city', population: 2900000, minZoom: 2 },
  { name: 'St Petersburg', lat: 59.9343, lng: 30.3351, type: 'city', population: 5400000, minZoom: 2 },
  
  // Tier 4: Regional cities - visible when zoomed in
  { name: 'Osaka', lat: 34.6937, lng: 135.5023, type: 'city', population: 2700000, minZoom: 2.5 },
  { name: 'Guangzhou', lat: 23.1291, lng: 113.2644, type: 'city', population: 18700000, minZoom: 2.5 },
  { name: 'Shenzhen', lat: 22.5431, lng: 114.0579, type: 'city', population: 17600000, minZoom: 2.5 },
  { name: 'Chengdu', lat: 30.5728, lng: 104.0668, type: 'city', population: 16300000, minZoom: 2.5 },
  { name: 'Taipei', lat: 25.033, lng: 121.5654, type: 'city', population: 2600000, minZoom: 2.5 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, type: 'city', population: 10900000, minZoom: 2.5 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, type: 'city', population: 14700000, minZoom: 2.5 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, type: 'city', population: 10000000, minZoom: 2.5 },
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898, type: 'city', population: 3700000, minZoom: 2.5 },
  { name: 'Algiers', lat: 36.7538, lng: 3.0588, type: 'city', population: 2900000, minZoom: 2.5 },
  { name: 'Addis Ababa', lat: 9.0054, lng: 38.7636, type: 'city', population: 5000000, minZoom: 2.5 },
  { name: 'Accra', lat: 5.6037, lng: -0.187, type: 'city', population: 2500000, minZoom: 2.5 },
  { name: 'Kinshasa', lat: -4.4419, lng: 15.2663, type: 'city', population: 14500000, minZoom: 2.5 },
  { name: 'Dar es Salaam', lat: -6.7924, lng: 39.2083, type: 'city', population: 6700000, minZoom: 2.5 },
  { name: 'Caracas', lat: 10.4806, lng: -66.9036, type: 'city', population: 2100000, minZoom: 2.5 },
  { name: 'Medellín', lat: 6.2476, lng: -75.5658, type: 'city', population: 2500000, minZoom: 2.5 },
  { name: 'Havana', lat: 23.1136, lng: -82.3666, type: 'city', population: 2100000, minZoom: 2.5 },
  { name: 'Santo Domingo', lat: 18.4861, lng: -69.9312, type: 'city', population: 3300000, minZoom: 2.5 },
  { name: 'Doha', lat: 25.2854, lng: 51.531, type: 'city', population: 2400000, minZoom: 2.5 },
  { name: 'Abu Dhabi', lat: 24.4539, lng: 54.3773, type: 'city', population: 1500000, minZoom: 2.5 },
  { name: 'Hanoi', lat: 21.0285, lng: 105.8542, type: 'city', population: 8000000, minZoom: 2.5 },
  { name: 'Yangon', lat: 16.8661, lng: 96.1951, type: 'city', population: 5300000, minZoom: 2.5 },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, type: 'city', population: 21700000, minZoom: 2.5 },
  { name: 'Lahore', lat: 31.5497, lng: 74.3436, type: 'city', population: 12600000, minZoom: 2.5 },
  { name: 'Brisbane', lat: -27.4698, lng: 153.0251, type: 'city', population: 2500000, minZoom: 2.5 },
  { name: 'Perth', lat: -31.9505, lng: 115.8605, type: 'city', population: 2100000, minZoom: 2.5 },

  // Additional Tier 4 cities - better global coverage
  // Americas
  { name: 'Monterrey', lat: 25.6866, lng: -100.3161, type: 'city', population: 5300000, minZoom: 2.5 },
  { name: 'Quito', lat: -0.1807, lng: -78.4678, type: 'city', population: 2800000, minZoom: 2.5 },
  { name: 'Guadalajara', lat: 20.6597, lng: -103.3496, type: 'city', population: 5300000, minZoom: 2.5 },
  { name: 'Panama City', lat: 8.9824, lng: -79.5199, type: 'city', population: 1500000, minZoom: 2.5 },
  { name: 'San Juan', lat: 18.4655, lng: -66.1057, type: 'city', population: 320000, minZoom: 2.5 },
  { name: 'Montevideo', lat: -34.9011, lng: -56.1645, type: 'city', population: 1900000, minZoom: 2.5 },
  { name: 'Minneapolis', lat: 44.9778, lng: -93.2650, type: 'city', population: 430000, minZoom: 2.5 },
  { name: 'Detroit', lat: 42.3314, lng: -83.0458, type: 'city', population: 640000, minZoom: 2.5 },
  { name: 'Las Vegas', lat: 36.1699, lng: -115.1398, type: 'city', population: 650000, minZoom: 2.5 },
  { name: 'Portland', lat: 45.5152, lng: -122.6784, type: 'city', population: 650000, minZoom: 2.5 },
  { name: 'Nashville', lat: 36.1627, lng: -86.7816, type: 'city', population: 690000, minZoom: 2.5 },
  { name: 'New Orleans', lat: 29.9511, lng: -90.0715, type: 'city', population: 390000, minZoom: 2.5 },
  { name: 'Ottawa', lat: 45.4215, lng: -75.6972, type: 'city', population: 1000000, minZoom: 2.5 },
  { name: 'Calgary', lat: 51.0447, lng: -114.0719, type: 'city', population: 1300000, minZoom: 2.5 },

  // Europe
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883, type: 'city', population: 520000, minZoom: 2.5 },
  { name: 'Bucharest', lat: 44.4268, lng: 26.1025, type: 'city', population: 1800000, minZoom: 2.5 },
  { name: 'Belgrade', lat: 44.7866, lng: 20.4489, type: 'city', population: 1400000, minZoom: 2.5 },
  { name: 'Tbilisi', lat: 41.7151, lng: 44.8271, type: 'city', population: 1100000, minZoom: 2.5 },
  { name: 'Riga', lat: 56.9496, lng: 24.1052, type: 'city', population: 630000, minZoom: 2.5 },
  { name: 'Vilnius', lat: 54.6872, lng: 25.2797, type: 'city', population: 580000, minZoom: 2.5 },

  // Middle East & Central Asia
  { name: 'Beirut', lat: 33.8938, lng: 35.5018, type: 'city', population: 2400000, minZoom: 2.5 },
  { name: 'Amman', lat: 31.9454, lng: 35.9284, type: 'city', population: 4000000, minZoom: 2.5 },
  { name: 'Damascus', lat: 33.5138, lng: 36.2765, type: 'city', population: 2500000, minZoom: 2.5 },
  { name: 'Muscat', lat: 23.5880, lng: 58.3829, type: 'city', population: 1500000, minZoom: 2.5 },
  { name: 'Kuwait City', lat: 29.3759, lng: 47.9774, type: 'city', population: 2900000, minZoom: 2.5 },
  { name: 'Kabul', lat: 34.5553, lng: 69.2075, type: 'city', population: 4600000, minZoom: 2.5 },
  { name: 'Tashkent', lat: 41.2995, lng: 69.2401, type: 'city', population: 2600000, minZoom: 2.5 },
  { name: 'Baku', lat: 40.4093, lng: 49.8671, type: 'city', population: 2300000, minZoom: 2.5 },

  // Africa
  { name: 'Abuja', lat: 9.0579, lng: 7.4951, type: 'city', population: 3500000, minZoom: 2.5 },
  { name: 'Luanda', lat: -8.8390, lng: 13.2894, type: 'city', population: 8300000, minZoom: 2.5 },
  { name: 'Maputo', lat: -25.9692, lng: 32.5732, type: 'city', population: 1100000, minZoom: 2.5 },
  { name: 'Khartoum', lat: 15.5007, lng: 32.5599, type: 'city', population: 5700000, minZoom: 2.5 },
  { name: 'Tunis', lat: 36.8065, lng: 10.1815, type: 'city', population: 2700000, minZoom: 2.5 },
  { name: 'Dakar', lat: 14.7167, lng: -17.4677, type: 'city', population: 3900000, minZoom: 2.5 },
  { name: 'Kampala', lat: 0.3476, lng: 32.5825, type: 'city', population: 3500000, minZoom: 2.5 },

  // Asia-Pacific
  { name: 'Phnom Penh', lat: 11.5564, lng: 104.9282, type: 'city', population: 2100000, minZoom: 2.5 },
  { name: 'Colombo', lat: 6.9271, lng: 79.8612, type: 'city', population: 5600000, minZoom: 2.5 },
  { name: 'Islamabad', lat: 33.6844, lng: 73.0479, type: 'city', population: 1100000, minZoom: 2.5 },
  { name: 'Wuhan', lat: 30.5928, lng: 114.3055, type: 'city', population: 12300000, minZoom: 2.5 },
  { name: 'Xi\'an', lat: 34.3416, lng: 108.9398, type: 'city', population: 13000000, minZoom: 2.5 },
  { name: 'Surabaya', lat: -7.2575, lng: 112.7521, type: 'city', population: 3000000, minZoom: 2.5 },
  { name: 'Busan', lat: 35.1796, lng: 129.0756, type: 'city', population: 3400000, minZoom: 2.5 },
  { name: 'Wellington', lat: -41.2866, lng: 174.7756, type: 'city', population: 215000, minZoom: 2.5 },
]

// Country centroids - visible at global view
export const COUNTRIES: GeoLabel[] = [
  { name: 'UNITED STATES', lat: 39.8283, lng: -98.5795, type: 'country', minZoom: 1 },
  { name: 'CANADA', lat: 56.1304, lng: -106.3468, type: 'country', minZoom: 1 },
  { name: 'MEXICO', lat: 23.6345, lng: -102.5528, type: 'country', minZoom: 1.5 },
  { name: 'BRAZIL', lat: -14.235, lng: -51.9253, type: 'country', minZoom: 1 },
  { name: 'ARGENTINA', lat: -38.4161, lng: -63.6167, type: 'country', minZoom: 1.5 },
  { name: 'RUSSIA', lat: 61.524, lng: 105.3188, type: 'country', minZoom: 1 },
  { name: 'CHINA', lat: 35.8617, lng: 104.1954, type: 'country', minZoom: 1 },
  { name: 'INDIA', lat: 20.5937, lng: 78.9629, type: 'country', minZoom: 1 },
  { name: 'AUSTRALIA', lat: -25.2744, lng: 133.7751, type: 'country', minZoom: 1 },
  { name: 'INDONESIA', lat: -0.7893, lng: 113.9213, type: 'country', minZoom: 1.5 },
  { name: 'JAPAN', lat: 36.2048, lng: 138.2529, type: 'country', minZoom: 1.5 },
  { name: 'SOUTH KOREA', lat: 35.9078, lng: 127.7669, type: 'country', minZoom: 2 },
  { name: 'FRANCE', lat: 46.6034, lng: 1.8883, type: 'country', minZoom: 2 },
  { name: 'GERMANY', lat: 51.1657, lng: 10.4515, type: 'country', minZoom: 2 },
  { name: 'UNITED KINGDOM', lat: 55.3781, lng: -3.436, type: 'country', minZoom: 2 },
  { name: 'ITALY', lat: 41.8719, lng: 12.5674, type: 'country', minZoom: 2 },
  { name: 'SPAIN', lat: 40.4637, lng: -3.7492, type: 'country', minZoom: 2 },
  { name: 'NIGERIA', lat: 9.082, lng: 8.6753, type: 'country', minZoom: 1.5 },
  { name: 'SOUTH AFRICA', lat: -30.5595, lng: 22.9375, type: 'country', minZoom: 1.5 },
  { name: 'EGYPT', lat: 26.8206, lng: 30.8025, type: 'country', minZoom: 1.5 },
  { name: 'SAUDI ARABIA', lat: 23.8859, lng: 45.0792, type: 'country', minZoom: 1.5 },
  { name: 'IRAN', lat: 32.4279, lng: 53.688, type: 'country', minZoom: 2 },
  { name: 'PAKISTAN', lat: 30.3753, lng: 69.3451, type: 'country', minZoom: 2 },
  { name: 'UKRAINE', lat: 48.3794, lng: 31.1656, type: 'country', minZoom: 2 },
  { name: 'POLAND', lat: 51.9194, lng: 19.1451, type: 'country', minZoom: 2.5 },
  { name: 'TURKEY', lat: 38.9637, lng: 35.2433, type: 'country', minZoom: 2 },
  { name: 'THAILAND', lat: 15.87, lng: 100.9925, type: 'country', minZoom: 2 },
  { name: 'VIETNAM', lat: 14.0583, lng: 108.2772, type: 'country', minZoom: 2 },
  { name: 'PHILIPPINES', lat: 12.8797, lng: 121.774, type: 'country', minZoom: 2 },
  { name: 'MALAYSIA', lat: 4.2105, lng: 101.9758, type: 'country', minZoom: 2 },
  { name: 'COLOMBIA', lat: 4.5709, lng: -74.2973, type: 'country', minZoom: 2 },
  { name: 'PERU', lat: -9.19, lng: -75.0152, type: 'country', minZoom: 2 },
  { name: 'CHILE', lat: -35.6751, lng: -71.543, type: 'country', minZoom: 2 },
  { name: 'VENEZUELA', lat: 6.4238, lng: -66.5897, type: 'country', minZoom: 2 },
  { name: 'KENYA', lat: -0.0236, lng: 37.9062, type: 'country', minZoom: 2 },
  { name: 'ETHIOPIA', lat: 9.145, lng: 40.4897, type: 'country', minZoom: 2 },
  { name: 'DR CONGO', lat: -4.0383, lng: 21.7587, type: 'country', minZoom: 2 },
  { name: 'MOROCCO', lat: 31.7917, lng: -7.0926, type: 'country', minZoom: 2 },
  { name: 'ALGERIA', lat: 28.0339, lng: 1.6596, type: 'country', minZoom: 2 },

  // Additional countries
  { name: 'BANGLADESH', lat: 23.685, lng: 90.3563, type: 'country', minZoom: 2.5 },
  { name: 'MYANMAR', lat: 19.7633, lng: 96.0785, type: 'country', minZoom: 2.5 },
  { name: 'AFGHANISTAN', lat: 33.9391, lng: 67.7100, type: 'country', minZoom: 2.5 },
  { name: 'IRAQ', lat: 33.2232, lng: 43.6793, type: 'country', minZoom: 2 },
  { name: 'SYRIA', lat: 34.8021, lng: 38.9968, type: 'country', minZoom: 2.5 },
  { name: 'ISRAEL', lat: 31.0461, lng: 34.8516, type: 'country', minZoom: 2.5 },
  { name: 'SUDAN', lat: 12.8628, lng: 30.2176, type: 'country', minZoom: 2 },
  { name: 'TAIWAN', lat: 23.6978, lng: 120.9605, type: 'country', minZoom: 2.5 },
  { name: 'NORTH KOREA', lat: 40.3399, lng: 127.5101, type: 'country', minZoom: 2.5 },
  { name: 'GREECE', lat: 39.0742, lng: 21.8243, type: 'country', minZoom: 2.5 },
  { name: 'SWEDEN', lat: 60.1282, lng: 18.6435, type: 'country', minZoom: 2.5 },
  { name: 'NORWAY', lat: 60.472, lng: 8.4689, type: 'country', minZoom: 2.5 },
  { name: 'FINLAND', lat: 61.9241, lng: 25.7482, type: 'country', minZoom: 2.5 },
  { name: 'ROMANIA', lat: 45.9432, lng: 24.9668, type: 'country', minZoom: 2.5 },
  { name: 'CUBA', lat: 21.5218, lng: -77.7812, type: 'country', minZoom: 2.5 },
  { name: 'SOMALIA', lat: 5.1521, lng: 46.1996, type: 'country', minZoom: 2.5 },
  { name: 'LIBYA', lat: 26.3351, lng: 17.2283, type: 'country', minZoom: 2 },
  { name: 'TANZANIA', lat: -6.369, lng: 34.8888, type: 'country', minZoom: 2.5 },
  { name: 'GHANA', lat: 7.9465, lng: -1.0232, type: 'country', minZoom: 2.5 },
  { name: 'MOZAMBIQUE', lat: -18.6657, lng: 35.5296, type: 'country', minZoom: 2.5 },
  { name: 'ANGOLA', lat: -11.2027, lng: 17.8739, type: 'country', minZoom: 2.5 },
  { name: 'KAZAKHSTAN', lat: 48.0196, lng: 66.9237, type: 'country', minZoom: 2 },
  { name: 'MONGOLIA', lat: 46.8625, lng: 103.8467, type: 'country', minZoom: 2 },
  { name: 'NEW ZEALAND', lat: -40.9006, lng: 174.886, type: 'country', minZoom: 2 },
  { name: 'ECUADOR', lat: -1.8312, lng: -78.1834, type: 'country', minZoom: 2.5 },
  { name: 'BOLIVIA', lat: -16.2902, lng: -63.5887, type: 'country', minZoom: 2.5 },
  { name: 'PARAGUAY', lat: -23.4425, lng: -58.4438, type: 'country', minZoom: 2.5 },
  { name: 'URUGUAY', lat: -32.5228, lng: -55.7658, type: 'country', minZoom: 2.5 },

  // New countries from geocoding expansion
  { name: 'SENEGAL', lat: 14.4974, lng: -14.4524, type: 'country', minZoom: 2.5 },
  { name: 'IVORY COAST', lat: 7.5400, lng: -5.5471, type: 'country', minZoom: 2.5 },
  { name: 'MALI', lat: 17.5707, lng: -3.9962, type: 'country', minZoom: 2.5 },
  { name: 'BURKINA FASO', lat: 12.2383, lng: -1.5616, type: 'country', minZoom: 2.5 },
  { name: 'CAMEROON', lat: 7.3697, lng: 12.3547, type: 'country', minZoom: 2.5 },
  { name: 'CHAD', lat: 15.4542, lng: 18.7322, type: 'country', minZoom: 2.5 },
  { name: 'UGANDA', lat: 1.3733, lng: 32.2903, type: 'country', minZoom: 2.5 },
  { name: 'RWANDA', lat: -1.9403, lng: 29.8739, type: 'country', minZoom: 2.5 },
  { name: 'SOUTH SUDAN', lat: 6.8770, lng: 31.3070, type: 'country', minZoom: 2.5 },
  { name: 'ZAMBIA', lat: -13.1339, lng: 27.8493, type: 'country', minZoom: 2.5 },
  { name: 'ZIMBABWE', lat: -19.0154, lng: 29.1549, type: 'country', minZoom: 2.5 },
  { name: 'BOTSWANA', lat: -22.3285, lng: 24.6849, type: 'country', minZoom: 2.5 },
  { name: 'NAMIBIA', lat: -22.9576, lng: 18.4904, type: 'country', minZoom: 2.5 },
  { name: 'MADAGASCAR', lat: -18.7669, lng: 46.8691, type: 'country', minZoom: 2.5 },
  { name: 'GUATEMALA', lat: 15.7835, lng: -90.2308, type: 'country', minZoom: 2.5 },
  { name: 'HONDURAS', lat: 15.2000, lng: -86.2419, type: 'country', minZoom: 2.5 },
  { name: 'NICARAGUA', lat: 12.8654, lng: -85.2072, type: 'country', minZoom: 2.5 },
  { name: 'COSTA RICA', lat: 9.7489, lng: -83.7534, type: 'country', minZoom: 2.5 },
  { name: 'PANAMA', lat: 8.5380, lng: -80.7821, type: 'country', minZoom: 2.5 },
  { name: 'JAMAICA', lat: 18.1096, lng: -77.2975, type: 'country', minZoom: 2.5 },
  { name: 'HAITI', lat: 18.9712, lng: -72.2852, type: 'country', minZoom: 2.5 },
  { name: 'DOM. REPUBLIC', lat: 18.7357, lng: -70.1627, type: 'country', minZoom: 2.5 },
  { name: 'UZBEKISTAN', lat: 41.3775, lng: 64.5853, type: 'country', minZoom: 2.5 },
  { name: 'AZERBAIJAN', lat: 40.1431, lng: 47.5769, type: 'country', minZoom: 2.5 },
  { name: 'GEORGIA', lat: 41.7151, lng: 44.8271, type: 'country', minZoom: 2.5 },
  { name: 'CAMBODIA', lat: 12.5657, lng: 104.9910, type: 'country', minZoom: 2.5 },
  { name: 'LAOS', lat: 19.8563, lng: 102.4955, type: 'country', minZoom: 2.5 },
  { name: 'SRI LANKA', lat: 7.8731, lng: 80.7718, type: 'country', minZoom: 2.5 },
  { name: 'NEPAL', lat: 28.3949, lng: 84.1240, type: 'country', minZoom: 2.5 },
  { name: 'QATAR', lat: 25.3548, lng: 51.1839, type: 'country', minZoom: 2.5 },
  { name: 'JORDAN', lat: 30.5852, lng: 36.2384, type: 'country', minZoom: 2.5 },
  { name: 'SERBIA', lat: 44.0165, lng: 21.0059, type: 'country', minZoom: 2.5 },
  { name: 'CROATIA', lat: 45.1000, lng: 15.2000, type: 'country', minZoom: 2.5 },
  { name: 'BULGARIA', lat: 42.7339, lng: 25.4858, type: 'country', minZoom: 2.5 },
  { name: 'BELARUS', lat: 53.7098, lng: 27.9534, type: 'country', minZoom: 2.5 },
  { name: 'FIJI', lat: -17.7134, lng: 178.0650, type: 'country', minZoom: 2.5 },
  { name: 'PAPUA NEW GUINEA', lat: -6.3150, lng: 143.9555, type: 'country', minZoom: 2.5 },
]

// Ocean labels for context
export const OCEANS: GeoLabel[] = [
  { name: 'Pacific Ocean', lat: 0, lng: -160, type: 'region', minZoom: 1 },
  { name: 'Atlantic Ocean', lat: 25, lng: -40, type: 'region', minZoom: 1 },
  { name: 'Indian Ocean', lat: -20, lng: 75, type: 'region', minZoom: 1 },
  { name: 'Arctic Ocean', lat: 80, lng: 0, type: 'region', minZoom: 1.5 },
  { name: 'Southern Ocean', lat: -65, lng: 0, type: 'region', minZoom: 1.5 },
]

// All labels combined
export const ALL_GEO_LABELS: GeoLabel[] = [
  ...CITIES,
  ...COUNTRIES,
  ...OCEANS,
]

/**
 * Get visible labels based on current zoom level
 * Lower altitude (zoomed in) = more labels visible
 */
export function getVisibleLabels(altitude: number): GeoLabel[] {
  // Convert altitude to our zoom scale (inverse relationship)
  // altitude 4 = global view (zoom 1), altitude 0.5 = close up (zoom 3)
  const zoomLevel = 4 - altitude
  
  return ALL_GEO_LABELS.filter(label => {
    // Show label if current zoom meets or exceeds minZoom
    return zoomLevel >= label.minZoom
  })
}

/**
 * Get label style based on type, zoom, and news activity
 * 
 * Option 2B: Dynamic Zoom-Scaled + Context-Aware Priority
 * - Labels scale and fade based on zoom level
 * - Bolder labels near high-activity news regions
 * - Natural information hierarchy
 */
export function getLabelStyle(
  label: GeoLabel, 
  altitude: number,
  activeRegions?: { lat: number; lng: number }[] // News marker positions for context-awareness
): {
  fontSize: number
  fontWeight: number
  opacity: number
  color: string
  textShadow: string
  letterSpacing: string
  textTransform: 'none' | 'uppercase'
  fontStyle: 'normal' | 'italic'
} {
  const zoomLevel = 4 - altitude
  const zoomProgress = Math.max(0, Math.min(1, (zoomLevel - label.minZoom) / 2))
  
  // ==========================================================================
  // OPTION 2B: Dynamic Zoom-Scaled + Context-Aware Priority
  // Labels grow with zoom AND get bolder near news activity
  // ==========================================================================
  
  // Check if this label is near active news regions
  const isNearActiveRegion = activeRegions?.some(region => {
    const distance = Math.sqrt(
      Math.pow(label.lat - region.lat, 2) + 
      Math.pow(label.lng - region.lng, 2)
    )
    return distance < 15 // Within ~15 degrees (~1000 miles)
  }) ?? false
  
  // Context-aware boost for labels near news activity
  const activityBoost = isNearActiveRegion ? 1.2 : 1.0
  const activityOpacityBoost = isNearActiveRegion ? 0.15 : 0
  
  // Tier 1 countries (major powers) get enhanced visibility
  const isTier1Country = label.type === 'country' && label.minZoom === 1
  
  if (label.type === 'country') {
    // Country labels: Google Earth style - always visible, professional
    // Enhanced visibility for geographic context
    // Tier 1 countries (USA, Russia, China, etc.) get larger, bolder labels
    // Increased opacity: 0.35 → 0.55-0.70 (per plan)
    const baseOpacity = 0.65 + zoomProgress * 0.20 + activityOpacityBoost
    const baseFontSize = isTier1Country 
      ? 15 + zoomProgress * 5  // Larger for Tier 1 countries
      : 12 + zoomProgress * 4
    
    return {
      fontSize: Math.round(baseFontSize * activityBoost),
      fontWeight: isTier1Country ? 700 : (isNearActiveRegion ? 700 : 600),
      opacity: Math.min(0.90, baseOpacity),
      color: isNearActiveRegion 
        ? 'rgba(220, 230, 245, 1)'    // Brighter near activity
        : isTier1Country
          ? 'rgba(210, 220, 235, 1)'  // Slightly brighter for Tier 1
          : 'rgba(200, 210, 225, 1)', // Visible but not harsh
      textShadow: isTier1Country
        ? '0 1px 4px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)'
        : '0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.3)',
      letterSpacing: isTier1Country ? '0.18em' : '0.15em',
      textTransform: 'uppercase',
      fontStyle: 'normal',
    }
  } else if (label.type === 'region') {
    // Ocean/region labels: Always visible at global view, subtle italic
    // Enhanced visibility so oceans are always labeled
    // Increased opacity for better visibility
    const baseOceanOpacity = 0.50 + zoomProgress * 0.20 + activityOpacityBoost
    return {
      fontSize: Math.round(13 + zoomProgress * 3),
      fontWeight: 400,
      opacity: Math.min(0.70, baseOceanOpacity),
      color: 'rgba(160, 180, 210, 1)',
      textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.2)',
      letterSpacing: '0.22em',
      textTransform: 'none',
      fontStyle: 'italic',
    }
  } else {
    // City labels: Dynamic scaling + context-aware priority
    // Enhanced for Google Earth style visibility
    const isLargeCity = label.population && label.population > 10000000
    const isMediumCity = label.population && label.population > 5000000
    
    // Base size increases with zoom - larger for better readability
    const baseSize = isLargeCity ? 12 : isMediumCity ? 11 : 10
    const scaledSize = baseSize + zoomProgress * 3
    
    // Opacity increases with zoom AND activity - more visible overall
    // Increased from 0.55 to 0.60 base
    const baseOpacity = 0.60 + zoomProgress * 0.3 + activityOpacityBoost
    
    // Weight increases for large cities AND near activity
    const fontWeight = (isLargeCity || isNearActiveRegion) ? 600 : 500
    
    return {
      fontSize: Math.round(scaledSize * activityBoost),
      fontWeight,
      opacity: Math.min(0.95, baseOpacity),
      color: isNearActiveRegion 
        ? 'rgba(255, 255, 255, 1)'    // Bright white near activity
        : 'rgba(240, 245, 250, 1)',   // Clean white
      textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.4)',
      letterSpacing: '0.03em',
      textTransform: 'none',
      fontStyle: 'normal',
    }
  }
}
