/**
 * Article Deduplicator
 * 
 * Removes duplicate articles using title similarity (Levenshtein distance)
 * Ensures timelines have no repeating articles
 */

import { ArticleSummary } from './topicAggregator'

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        )
      }
    }
  }
  
  return matrix[len1][len2]
}

/**
 * Calculate title similarity (0-1 scale, 1 = identical)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalized1 = title1.toLowerCase().trim()
  const normalized2 = title2.toLowerCase().trim()
  
  // Exact match
  if (normalized1 === normalized2) return 1.0
  
  // Calculate Levenshtein distance
  const maxLen = Math.max(normalized1.length, normalized2.length)
  if (maxLen === 0) return 1.0
  
  const distance = levenshteinDistance(normalized1, normalized2)
  const similarity = 1 - (distance / maxLen)
  
  // Also check keyword overlap
  const words1 = new Set(normalized1.split(/\s+/).filter(w => w.length > 3))
  const words2 = new Set(normalized2.split(/\s+/).filter(w => w.length > 3))
  
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])
  const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0
  
  // Combine Levenshtein and Jaccard (weighted average)
  return (similarity * 0.6) + (jaccardSimilarity * 0.4)
}

/**
 * Deduplicate articles by title similarity
 * 
 * @param articles Array of articles to deduplicate
 * @param threshold Similarity threshold (0-1). Articles above this are considered duplicates. Default: 0.85
 * @returns Deduplicated array, keeping the most recent or highest severity article
 */
export function deduplicateByTitleSimilarity(
  articles: ArticleSummary[],
  threshold: number = 0.85
): ArticleSummary[] {
  if (articles.length === 0) return articles
  
  const deduplicated: ArticleSummary[] = []
  const seen = new Set<string>()
  
  // Sort by timestamp (most recent first) and severity (highest first)
  const sorted = [...articles].sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp
    }
    return b.severity - a.severity
  })
  
  for (const article of sorted) {
    let isDuplicate = false
    
    // Check against already added articles
    for (const existing of deduplicated) {
      const similarity = calculateTitleSimilarity(article.title, existing.title)
      
      if (similarity >= threshold) {
        isDuplicate = true
        
        // If this article is more recent or has higher severity, replace the existing one
        if (article.timestamp > existing.timestamp || 
            (article.timestamp === existing.timestamp && article.severity > existing.severity)) {
          const index = deduplicated.indexOf(existing)
          deduplicated[index] = article
        }
        break
      }
    }
    
    // Also check URL if available (exact match)
    if (!isDuplicate && article.url) {
      const urlKey = new URL(article.url).pathname.toLowerCase()
      if (seen.has(urlKey)) {
        isDuplicate = true
      } else {
        seen.add(urlKey)
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(article)
    }
  }
  
  return deduplicated
}

/**
 * Deduplicate timeline events (same logic as articles)
 */
export function deduplicateTimelineEvents<T extends { title: string; url?: string; timestamp: number }>(
  events: T[],
  threshold: number = 0.85
): T[] {
  if (events.length === 0) return events
  
  const deduplicated: T[] = []
  const seen = new Set<string>()
  
  // Sort by timestamp (most recent first)
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp)
  
  for (const event of sorted) {
    let isDuplicate = false
    
    // Check against already added events
    for (const existing of deduplicated) {
      const similarity = calculateTitleSimilarity(event.title, existing.title)
      
      if (similarity >= threshold) {
        isDuplicate = true
        // Keep the more recent one
        if (event.timestamp > existing.timestamp) {
          const index = deduplicated.indexOf(existing)
          deduplicated[index] = event
        }
        break
      }
    }
    
    // Also check URL if available
    if (!isDuplicate && event.url) {
      try {
        const urlKey = new URL(event.url).pathname.toLowerCase()
        if (seen.has(urlKey)) {
          isDuplicate = true
        } else {
          seen.add(urlKey)
        }
      } catch {
        // Invalid URL, skip URL check
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(event)
    }
  }
  
  return deduplicated
}
