/**
 * AI-Powered Source Identifier
 * 
 * Hybrid approach to identify relevant sources:
 * 1. Keyword matching from topic names/descriptions
 * 2. News API search (NewsAPI.org)
 * 3. Google Custom Search / Google News parsing
 * 
 * Combines all three methods with relevance scoring
 */

import { DetectedTopic } from './topicDetector'
import { ArticleSummary } from './topicAggregator'
import { searchNewsAPI, getTopHeadlines } from './newsApiClient'
import { searchGoogleCustomSearch } from './googleSourceParser'
import { deduplicateByTitleSimilarity } from './articleDeduplicator'

interface ScoredArticle extends ArticleSummary {
  relevanceScore: number
  sourceMethod: 'keyword' | 'newsapi' | 'google'
}

/**
 * Extract keywords from topic for searching
 */
function extractSearchKeywords(topic: DetectedTopic): string[] {
  // Use topic name and keywords
  const keywords = [
    topic.name,
    ...topic.keywords,
  ]
  
  // Remove common words
  const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
  return keywords
    .map(kw => kw.toLowerCase())
    .filter(kw => kw.length > 2 && !stopWords.has(kw))
    .slice(0, 5) // Top 5 keywords
}

/**
 * Score article relevance to topic
 */
function scoreArticleRelevance(article: ArticleSummary, topic: DetectedTopic): number {
  let score = 0
  
  const titleLower = article.title.toLowerCase()
  const excerptLower = (article.excerpt || '').toLowerCase()
  const searchText = `${titleLower} ${excerptLower}`
  
  // Exact keyword matches
  for (const keyword of topic.keywords) {
    const keywordLower = keyword.toLowerCase()
    if (titleLower.includes(keywordLower)) {
      score += 10 // High score for title match
    } else if (excerptLower.includes(keywordLower)) {
      score += 5 // Medium score for excerpt match
    }
  }
  
  // Topic name match
  const topicNameLower = topic.name.toLowerCase()
  if (titleLower.includes(topicNameLower)) {
    score += 15 // Very high score for topic name
  }
  
  // Recency boost (more recent = higher score)
  const hoursAgo = (Date.now() - article.timestamp) / (1000 * 60 * 60)
  if (hoursAgo < 6) {
    score += 5
  } else if (hoursAgo < 24) {
    score += 3
  } else if (hoursAgo < 168) { // 7 days
    score += 1
  }
  
  // Severity boost
  score += article.severity * 0.5
  
  return score
}

/**
 * Identify relevant sources for a topic using hybrid approach
 */
export async function identifyRelevantSources(
  topic: DetectedTopic,
  existingArticles: ArticleSummary[] = [],
  limit: number = 15
): Promise<ArticleSummary[]> {
  const keywords = extractSearchKeywords(topic)
  const allArticles: ScoredArticle[] = []
  
  // 1. Keyword matching from existing articles
  const keywordMatches = existingArticles
    .map(article => ({
      ...article,
      relevanceScore: scoreArticleRelevance(article, topic),
      sourceMethod: 'keyword' as const,
    }))
    .filter(article => article.relevanceScore > 0)
  
  allArticles.push(...keywordMatches)
  
  // 2. News API search (parallel with Google)
  const [newsApiResults, googleResults] = await Promise.all([
    searchNewsAPI(keywords, limit).catch(() => []),
    searchGoogleCustomSearch(keywords.join(' '), limit).catch(() => []),
  ])
  
  // Score and add NewsAPI results
  const scoredNewsAPI = newsApiResults.map(article => ({
    ...article,
    relevanceScore: scoreArticleRelevance(article, topic),
    sourceMethod: 'newsapi' as const,
  }))
  allArticles.push(...scoredNewsAPI)
  
  // Score and add Google results
  const scoredGoogle = googleResults.map(article => ({
    ...article,
    relevanceScore: scoreArticleRelevance(article, topic),
    sourceMethod: 'google' as const,
  }))
  allArticles.push(...scoredGoogle)
  
  // 3. Sort by relevance score (highest first)
  allArticles.sort((a, b) => b.relevanceScore - a.relevanceScore)
  
  // 4. Deduplicate by title similarity
  const deduplicated = deduplicateByTitleSimilarity(allArticles, 0.85)
  
  // 5. Return top N articles
  return deduplicated.slice(0, limit)
}

/**
 * Get top headlines for a topic category
 */
export async function getCategoryHeadlines(
  category: string,
  country: string = 'us',
  limit: number = 10
): Promise<ArticleSummary[]> {
  try {
    return await getTopHeadlines(category, country, limit)
  } catch (error) {
    console.warn('[AISourceIdentifier] Failed to get category headlines:', error)
    return []
  }
}
