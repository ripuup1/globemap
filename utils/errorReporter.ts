/**
 * Lightweight Error Reporter
 *
 * Captures errors from React ErrorBoundary, unhandled promises,
 * and global errors. Reports to /api/errors endpoint.
 * Batches errors to avoid spamming in error loops.
 */

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  source: 'boundary' | 'global' | 'promise' | 'api'
  url: string
  userAgent: string
  timestamp: number
  metadata?: Record<string, unknown>
}

const ERROR_BATCH_INTERVAL = 5000 // 5 seconds
const MAX_ERRORS_PER_BATCH = 10
const MAX_ERRORS_PER_SESSION = 50

let errorQueue: ErrorReport[] = []
let totalErrorsThisSession = 0
let batchTimer: ReturnType<typeof setTimeout> | null = null

function flushErrors() {
  if (errorQueue.length === 0) return
  const batch = errorQueue.splice(0, MAX_ERRORS_PER_BATCH)

  // Fire and forget - don't block on error reporting
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ errors: batch }),
  }).catch(() => {
    // If error reporting fails, just log locally
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorReporter] Failed to send error batch')
    }
  })
}

function scheduleFlush() {
  if (batchTimer) return
  batchTimer = setTimeout(() => {
    batchTimer = null
    flushErrors()
  }, ERROR_BATCH_INTERVAL)
}

export function reportError(
  error: Error | string,
  source: ErrorReport['source'] = 'global',
  metadata?: Record<string, unknown>
) {
  if (totalErrorsThisSession >= MAX_ERRORS_PER_SESSION) return
  totalErrorsThisSession++

  const report: ErrorReport = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    source,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: Date.now(),
    metadata,
  }

  // Always log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${source}]`, report.message, metadata)
  }

  errorQueue.push(report)
  scheduleFlush()
}

/**
 * Install global error handlers.
 * Call once in the root layout or app entry.
 */
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    reportError(event.error || event.message, 'global', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? event.reason
      : String(event.reason || 'Unknown promise rejection')
    reportError(reason, 'promise')
  })
}
