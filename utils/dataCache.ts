/**
 * Data Cache System
 * 
 * In-memory cache for API responses with TTL support
 * Optimizes data transfer by caching frequently accessed data
 */

interface CacheEntry<T> {
  data: T
  expires: number
  timestamp: number
}

export class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 1000 // Maximum cache entries
  
  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  /**
   * Set cache entry with TTL (time to live in milliseconds)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0]
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
      timestamp: Date.now(),
    })
  }
  
  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }
  
  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key)
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let valid = 0
    
    for (const entry of this.cache.values()) {
      if (now > entry.expires) {
        expired++
      } else {
        valid++
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize,
    }
  }
}

// Singleton instance
export const dataCache = new DataCache()

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    dataCache.cleanup()
  }, 5 * 60 * 1000)
}
