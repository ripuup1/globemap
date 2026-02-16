/**
 * Compression Utilities
 *
 * Data optimization for API responses
 */

/**
 * Minify JSON by removing unnecessary whitespace
 */
export function minifyJSON(data: any): string {
  return JSON.stringify(data)
}

/**
 * Compress large arrays by removing null/undefined values
 */
export function compressArray<T>(arr: T[]): T[] {
  return arr.filter(item => item !== null && item !== undefined)
}

/**
 * Get cache headers for API responses
 */
export function getCacheHeaders() {
  return {
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    'Vary': 'Accept-Encoding',
  }
}

/**
 * Estimate response size (rough approximation)
 */
export function estimateSize(data: any): number {
  return new Blob([JSON.stringify(data)]).size
}
