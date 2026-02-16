/**
 * Structured logging utility
 * Provides consistent logging with context and environment-aware levels
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  component?: string
  action?: string
  data?: any
  error?: Error
}

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Log levels configuration
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

/**
 * Get current log level threshold
 * In production, only show errors and warnings
 */
function getLogThreshold(): number {
  if (isProduction) {
    return LOG_LEVELS.warn // Only errors and warnings in prod
  }
  return LOG_LEVELS.debug // All logs in dev
}

/**
 * Format log message with context
 */
function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const parts: string[] = [`[${level.toUpperCase()}]`]

  if (context?.component) {
    parts.push(`[${context.component}]`)
  }

  if (context?.action) {
    parts.push(`${context.action}:`)
  }

  parts.push(message)

  return parts.join(' ')
}

/**
 * Log error
 */
export function logError(message: string, context?: LogContext): void {
  if (LOG_LEVELS.error >= getLogThreshold()) {
    const formatted = formatMessage('error', message, context)
    console.error(formatted, context?.data || '', context?.error || '')
  }
}

/**
 * Log warning
 */
export function logWarn(message: string, context?: LogContext): void {
  if (LOG_LEVELS.warn >= getLogThreshold()) {
    const formatted = formatMessage('warn', message, context)
    console.warn(formatted, context?.data || '')
  }
}

/**
 * Log info
 */
export function logInfo(message: string, context?: LogContext): void {
  if (LOG_LEVELS.info >= getLogThreshold()) {
    const formatted = formatMessage('info', message, context)
    console.info(formatted, context?.data || '')
  }
}

/**
 * Log debug (only in development)
 */
export function logDebug(message: string, context?: LogContext): void {
  if (isDevelopment && LOG_LEVELS.debug >= getLogThreshold()) {
    const formatted = formatMessage('debug', message, context)
    console.debug(formatted, context?.data || '')
  }
}

/**
 * Log data ingestion failure
 */
export function logIngestionFailure(
  stage: string,
  error: Error | string,
  data?: any
): void {
  logError(`Data ingestion failed at ${stage}`, {
    component: 'DataIngestion',
    action: stage,
    error: error instanceof Error ? error : new Error(String(error)),
    data,
  })
}

/**
 * Log marker rendering error
 */
export function logRenderingError(
  error: Error | string,
  eventId?: string,
  data?: any
): void {
  logError('Marker rendering failed', {
    component: 'Globe',
    action: 'renderMarker',
    error: error instanceof Error ? error : new Error(String(error)),
    data: { eventId, ...data },
  })
}

/**
 * Log click interaction error
 */
export function logInteractionError(
  action: string,
  error: Error | string,
  eventId?: string,
  data?: any
): void {
  logError(`Click interaction failed: ${action}`, {
    component: 'Interaction',
    action,
    error: error instanceof Error ? error : new Error(String(error)),
    data: { eventId, ...data },
  })
}

/**
 * Log validation error
 */
export function logValidationError(
  field: string,
  error: string,
  data?: any
): void {
  logWarn(`Validation failed for ${field}`, {
    component: 'Validation',
    action: 'validate',
    data: { field, error, ...data },
  })
}
