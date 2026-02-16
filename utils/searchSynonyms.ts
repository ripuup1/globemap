/**
 * Search Synonyms & Country Keywords
 *
 * Extracted from page.tsx for lazy loading.
 * These maps power intelligent regional search matching.
 */

export const SEARCH_SYNONYMS: Record<string, string[]> = {
  // United States - extensive coverage
  'united states': ['usa', 'us', 'america', 'american', 'u.s.', 'u.s.a', 'states', 'washington', 'new york', 'california', 'texas', 'florida', 'chicago', 'los angeles', 'biden', 'trump', 'white house', 'congress', 'pentagon'],
  'usa': ['united states', 'america', 'american', 'u.s.'],
  'america': ['usa', 'united states', 'american', 'u.s.'],

  // Middle East - comprehensive
  'middle east': ['mena', 'mideast', 'israel', 'palestine', 'gaza', 'iran', 'iraq', 'saudi arabia', 'syria', 'lebanon', 'jordan', 'yemen', 'uae', 'dubai', 'qatar', 'kuwait', 'bahrain', 'oman', 'persian gulf', 'levant', 'arabian'],
  'israel': ['israeli', 'tel aviv', 'jerusalem', 'gaza', 'palestine', 'hamas', 'netanyahu'],
  'palestine': ['palestinian', 'gaza', 'west bank', 'hamas'],

  // Europe
  'europe': ['european', 'eu', 'uk', 'france', 'germany', 'italy', 'spain', 'poland', 'ukraine', 'russia', 'nato', 'brussels'],
  'uk': ['united kingdom', 'britain', 'british', 'england', 'london', 'scotland', 'wales'],

  // Asia
  'asia': ['asian', 'china', 'japan', 'korea', 'india', 'indonesia', 'vietnam', 'thailand', 'philippines', 'malaysia', 'singapore'],
  'china': ['chinese', 'beijing', 'shanghai', 'hong kong', 'xi jinping', 'ccp', 'taiwan'],
  'korea': ['korean', 'south korea', 'north korea', 'seoul', 'pyongyang', 'k-pop'],

  // Americas
  'mexico': ['mexican', 'mexico city', 'guadalajara', 'tijuana', 'cartel', 'border'],
  'canada': ['canadian', 'toronto', 'vancouver', 'montreal', 'ottawa', 'trudeau', 'quebec'],
  'south america': ['latin america', 'brazil', 'argentina', 'colombia', 'chile', 'peru', 'venezuela', 'ecuador', 'bolivia'],
  'brazil': ['brazilian', 'sao paulo', 'rio', 'brasilia', 'lula'],
  'argentina': ['argentine', 'buenos aires', 'milei'],

  // Africa
  'africa': ['african', 'nigeria', 'egypt', 'south africa', 'kenya', 'ethiopia', 'ghana', 'morocco', 'sahel', 'sahara'],

  // Topics
  'war': ['conflict', 'military', 'armed', 'battle', 'fighting', 'troops', 'combat', 'invasion'],
  'sports': ['football', 'soccer', 'basketball', 'baseball', 'nfl', 'nba', 'mlb', 'olympics', 'world cup', 'championship'],
  'technology': ['tech', 'ai', 'artificial intelligence', 'software', 'startup', 'silicon valley', 'apple', 'google', 'microsoft'],
  'politics': ['political', 'election', 'government', 'president', 'prime minister', 'parliament', 'congress', 'vote'],
  'economy': ['economic', 'financial', 'market', 'stock', 'trade', 'gdp', 'inflation', 'recession'],
}

export const COUNTRY_KEYWORDS: Record<string, string[]> = {
  'usa': ['usa', 'united states', 'america'],
  'uk': ['uk', 'united kingdom', 'britain'],
  'canada': ['canada', 'canadian'],
  'australia': ['australia', 'australian'],
  'germany': ['germany', 'german'],
  'france': ['france', 'french'],
  'japan': ['japan', 'japanese'],
  'china': ['china', 'chinese'],
  'india': ['india', 'indian'],
  'brazil': ['brazil', 'brazilian'],
  'mexico': ['mexico', 'mexican'],
  'south africa': ['south africa'],
  'nigeria': ['nigeria', 'nigerian'],
  'kenya': ['kenya', 'kenyan'],
  'egypt': ['egypt', 'egyptian'],
  'ukraine': ['ukraine', 'ukrainian'],
  'russia': ['russia', 'russian'],
  'israel': ['israel', 'israeli', 'gaza', 'palestine'],
  'south korea': ['south korea', 'korean', 'seoul'],
  'indonesia': ['indonesia', 'indonesian', 'jakarta'],
}
