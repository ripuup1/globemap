/**
 * Supabase Edge Function: News Aggregation
 * 
 * Runs on a cron schedule (every 5-15 minutes) to:
 * 1. Fetch news from RSS feeds
 * 2. Geocode and weight events
 * 3. Store in Supabase
 * 
 * Deploy with: supabase functions deploy aggregate-news
 * Set up cron in Supabase Dashboard > Database > Scheduled Jobs
 * 
 * Cron example (every 10 minutes):
 * SELECT net.http_post(
 *   url:='https://yzxxxfwjdaieqgkdidlb.supabase.co/functions/v1/aggregate-news',
 *   headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
 * );
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RSS Feeds to aggregate
const RSS_FEEDS = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
  { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR' },
]

// Simplified geocoding
const CITY_COORDS: Record<string, { lat: number; lng: number; country: string; continent: string }> = {
  'new york': { lat: 40.7128, lng: -74.0060, country: 'usa', continent: 'north-america' },
  'washington': { lat: 38.9072, lng: -77.0369, country: 'usa', continent: 'north-america' },
  'london': { lat: 51.5074, lng: -0.1278, country: 'uk', continent: 'europe' },
  'paris': { lat: 48.8566, lng: 2.3522, country: 'france', continent: 'europe' },
  'berlin': { lat: 52.5200, lng: 13.4050, country: 'germany', continent: 'europe' },
  'tokyo': { lat: 35.6762, lng: 139.6503, country: 'japan', continent: 'asia' },
  'beijing': { lat: 39.9042, lng: 116.4074, country: 'china', continent: 'asia' },
  'moscow': { lat: 55.7558, lng: 37.6173, country: 'russia', continent: 'europe' },
  'kyiv': { lat: 50.4501, lng: 30.5234, country: 'ukraine', continent: 'europe' },
  'gaza': { lat: 31.3547, lng: 34.3088, country: 'palestine', continent: 'asia' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, country: 'israel', continent: 'asia' },
  'cairo': { lat: 30.0444, lng: 31.2357, country: 'egypt', continent: 'africa' },
  'mexico city': { lat: 19.4326, lng: -99.1332, country: 'mexico', continent: 'north-america' },
  'sao paulo': { lat: -23.5505, lng: -46.6333, country: 'brazil', continent: 'south-america' },
  'sydney': { lat: -33.8688, lng: 151.2093, country: 'australia', continent: 'oceania' },
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; continent: string }> = {
  'usa': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'united states': { lat: 39.8283, lng: -98.5795, continent: 'north-america' },
  'uk': { lat: 55.3781, lng: -3.4360, continent: 'europe' },
  'china': { lat: 35.8617, lng: 104.1954, continent: 'asia' },
  'russia': { lat: 61.5240, lng: 105.3188, continent: 'europe' },
  'ukraine': { lat: 48.3794, lng: 31.1656, continent: 'europe' },
  'israel': { lat: 31.0461, lng: 34.8516, continent: 'asia' },
  'brazil': { lat: -14.2350, lng: -51.9253, continent: 'south-america' },
  'mexico': { lat: 23.6345, lng: -102.5528, continent: 'north-america' },
}

function extractAndGeocode(text: string) {
  const lowerText = text.toLowerCase()
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lowerText.includes(city)) return { ...coords, location: city }
  }
  for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
    if (lowerText.includes(country)) return { ...coords, location: country, country }
  }
  return null
}

function detectCategory(title: string) {
  const text = title.toLowerCase()

  // Conflict & Security
  if (text.match(/\b(war|military|troops|battle|invasion|airstrike|missile|drone strike|artillery|ceasefire|offensive|soldiers|shelling)\b/)) return 'armed-conflict'
  if (text.match(/\b(terror|terrorist|extremist|isis|hamas|hezbollah|al.?qaeda|jihadist|suicide bomb|car bomb|hostage|militant)\b/)) return 'terrorism'
  if (text.match(/\b(protest|riot|uprising|demonstrat|civil unrest|coup|revolution|clashes|tear gas|crackdown)\b/)) return 'civil-unrest'

  // Natural Disasters
  if (text.match(/\b(earthquake|quake|seismic|tremor|aftershock)\b/)) return 'earthquake'
  if (text.match(/\b(volcano|eruption|volcanic|lava)\b/)) return 'volcano'
  if (text.match(/\b(wildfire|bushfire|forest fire|blaze)\b/)) return 'wildfire'
  if (text.match(/\b(hurricane|typhoon|cyclone|tropical storm|tornado|blizzard)\b/)) return 'storm'
  if (text.match(/\b(tsunami|tidal wave)\b/)) return 'tsunami'
  if (text.match(/\b(flood|flooding|flash flood|mudslide|landslide)\b/)) return 'flood'

  // News Categories
  if (text.match(/\b(breaking|just in|urgent|developing story)\b/)) return 'breaking'
  if (text.match(/\b(election|president|congress|parliament|vote|government|senator|governor|prime minister|diplomatic|treaty|sanctions|nato)\b/)) return 'politics'
  if (text.match(/\b(murder|arrest|suspect|convicted|sentenced|robbery|fraud|shooting|stabbing|homicide|drug bust|trafficking|prison|fbi|indicted|assault)\b/)) return 'crime'
  if (text.match(/\b(championship|tournament|match|game|nfl|nba|mlb|nhl|world cup|olympics|soccer|football|tennis|golf|cricket|rugby)\b/)) return 'sports'
  if (text.match(/\b(stock|market|economy|trade|billion|company|ipo|merger|gdp|inflation|recession|earnings|nasdaq|dow|tariff|bankruptcy)\b/)) return 'business'
  if (text.match(/\b(ai|artificial intelligence|tech|software|app|apple|google|microsoft|meta|nvidia|openai|semiconductor|cybersecurity|hack|spacex)\b/)) return 'technology'
  if (text.match(/\b(health|medical|hospital|disease|virus|pandemic|vaccine|outbreak|cancer|surgery|fda|epidemic)\b/)) return 'health'
  if (text.match(/\b(science|research|discovery|breakthrough|nasa|space|mars|moon|telescope|genome|dna|fossil)\b/)) return 'science'
  if (text.match(/\b(movie|film|celebrity|oscar|grammy|emmy|album|concert|netflix|disney|entertainment|music|singer|band|festival)\b/)) return 'entertainment'

  return 'other'
}

function calculateWeight(event: any): number {
  let weight = 1.0
  if (event.country === 'usa') weight = 3.0
  else if (event.country === 'mexico') weight = 2.4
  else if (event.country === 'canada') weight = 2.3
  else if (event.continent === 'south-america') weight = 2.5
  
  if (event.category === 'armed-conflict') weight *= 2.5
  else if (event.category === 'terrorism') weight *= 2.3
  else if (event.category === 'breaking') weight *= 1.6
  
  return weight
}

function parseRSSItem(itemXml: string) {
  const getTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return (match?.[1] || match?.[2] || '').trim()
  }
  const title = getTag(itemXml, 'title')
  if (!title) return null
  return {
    title,
    description: getTag(itemXml, 'description').replace(/<[^>]+>/g, '').substring(0, 300),
    link: getTag(itemXml, 'link'),
    pubDate: getTag(itemXml, 'pubDate') || new Date().toISOString(),
  }
}

async function fetchRSS(url: string, sourceName: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) return []
    const xml = await response.text()
    const events: any[] = []
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []
    
    for (const itemXml of items.slice(0, 15)) {
      const item = parseRSSItem(itemXml)
      if (!item) continue
      const geo = extractAndGeocode(`${item.title} ${item.description}`)
      if (!geo) continue
      
      const category = detectCategory(item.title)
      const event = {
        id: `rss-${sourceName.toLowerCase().replace(/\s/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: item.title.substring(0, 200),
        description: item.description,
        category,
        severity: category === 'armed-conflict' ? 9 : category === 'breaking' ? 7 : 5,
        latitude: geo.lat,
        longitude: geo.lng,
        location_name: geo.location,
        country: geo.country,
        continent: geo.continent,
        timestamp: new Date(item.pubDate).toISOString(),
        source_name: sourceName,
        source_url: item.link,
        sources: [{ title: item.title, url: item.link, sourceName, date: new Date(item.pubDate).toISOString() }],
        is_ongoing: false,
      }
      event.weight_score = calculateWeight(event)
      events.push(event)
    }
    return events
  } catch {
    return []
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch from all RSS feeds
    const results = await Promise.all(RSS_FEEDS.map(f => fetchRSS(f.url, f.name)))
    const allEvents = results.flat()
    
    // Deduplicate
    const seen = new Set<string>()
    const unique = allEvents.filter(e => {
      const key = e.title.toLowerCase().substring(0, 40).replace(/[^a-z0-9]/g, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    
    // Sort by weight and take top 150
    unique.sort((a, b) => b.weight_score - a.weight_score)
    const top = unique.slice(0, 150)
    
    // Upsert to Supabase
    let stored = 0
    for (const event of top) {
      const { error } = await supabase.from('events').upsert(event, { onConflict: 'id' })
      if (!error) stored++
    }
    
    return new Response(
      JSON.stringify({ success: true, fetched: allEvents.length, stored }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
