import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Event } from '@/types/event'

interface ErrorBoundaryProps {
  children: ReactNode
  event: Event | null
  fallback?: (error: Error, errorInfo: ErrorInfo, event: Event | null) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary for EventDetailPanel
 * Catches rendering errors and shows fallback UI
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.event !== this.props.event && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      })
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!, this.props.event)
      }

      // Default fallback: show raw JSON
      return (
        <FallbackPanel
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          event={this.props.event}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Fallback panel showing raw JSON when rendering fails
 */
function FallbackPanel({
  error,
  errorInfo,
  event,
}: {
  error: Error
  errorInfo: ErrorInfo | null
  event: Event | null
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        aria-hidden="true"
      />
      
      {/* Fallback Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-full md:max-w-md bg-gray-900 text-white shadow-2xl z-50 overflow-y-auto"
        role="alert"
      >
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Rendering Error</h2>
            <p className="text-gray-300 text-sm">
              The event detail panel failed to render. Showing raw event data below.
            </p>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-yellow-400">Error Message</h3>
            <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto text-red-300">
              {error.message}
            </pre>
          </div>

          {errorInfo && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-yellow-400">Component Stack</h3>
              <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto text-gray-300">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}

          {event && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-yellow-400">Event Data (Raw JSON)</h3>
              <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto text-gray-300">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          )}

          {!event && (
            <div className="text-yellow-400">
              No event data available
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ErrorBoundary
