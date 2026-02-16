/**
 * useTopics Hook
 * 
 * Session-cached topic data management:
 * - Detects topics from events
 * - Creates and caches digests
 * - Manual refresh capability
 * - Loading states
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Event } from '@/types/event'
import { detectTopics, DetectedTopic } from '@/utils/topicDetector'
import { createAllDigests, TopicDigest } from '@/utils/topicAggregator'

interface UseTopicsResult {
  /** Detected topics sorted by priority */
  topics: DetectedTopic[]
  /** Topic digests keyed by topic ID */
  digests: Map<string, TopicDigest>
  /** Get digest for a specific topic */
  getDigest: (topicId: string) => TopicDigest | undefined
  /** Currently active topic ID */
  activeTopic: string | null
  /** Set active topic */
  setActiveTopic: (topicId: string | null) => void
  /** Whether topics are being processed */
  isLoading: boolean
  /** Manually refresh topics */
  refresh: () => void
  /** Last refresh timestamp */
  lastRefresh: number
}

export function useTopics(events: Event[]): UseTopicsResult {
  const [topics, setTopics] = useState<DetectedTopic[]>([])
  const [digests, setDigests] = useState<Map<string, TopicDigest>>(new Map())
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(0)
  
  // Process topics when events change
  const processTopics = useCallback(() => {
    if (events.length === 0) {
      setTopics([])
      setDigests(new Map())
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    
    // Use async function for topic detection (now includes Google Trends)
    ;(async () => {
      try {
        // Detect topics (async - includes Google Trends)
        const detected = await detectTopics(events)
        setTopics(detected)
        
        // Create digests for all topics
        const allDigests = createAllDigests(detected, events)
        setDigests(allDigests)
        
        // Set default active topic if none selected (prefer Economy & Finance)
        if (!activeTopic && detected.length > 0) {
          const economyTopic = detected.find(t => t.id === 'economy-finance')
          setActiveTopic(economyTopic?.id || detected[0].id)
        }
        
        setLastRefresh(Date.now())
      } catch (error) {
        console.error('Failed to process topics:', error)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [events, activeTopic])
  
  // Process on mount and when events change significantly
  useEffect(() => {
    processTopics()
  }, [events.length]) // Only re-process when event count changes
  
  // Get digest for a specific topic
  const getDigest = useCallback((topicId: string): TopicDigest | undefined => {
    return digests.get(topicId)
  }, [digests])
  
  // Manual refresh
  const refresh = useCallback(() => {
    processTopics()
  }, [processTopics])
  
  return {
    topics,
    digests,
    getDigest,
    activeTopic,
    setActiveTopic,
    isLoading,
    refresh,
    lastRefresh,
  }
}

/**
 * Get topic by ID from topics array
 */
export function getTopicById(topics: DetectedTopic[], id: string): DetectedTopic | undefined {
  return topics.find(t => t.id === id)
}

/**
 * Get topics by category
 */
export function getTopicsByCategory(
  topics: DetectedTopic[], 
  category: 'geopolitical' | 'crisis' | 'trending' | 'markets'
): DetectedTopic[] {
  return topics.filter(t => t.category === category)
}
