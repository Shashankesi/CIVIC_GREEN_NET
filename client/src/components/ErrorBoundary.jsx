import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught', error, info)
    this.setState({ error, info })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-sm text-slate-700 dark:text-slate-200">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2">Please refresh the page and try again. If it keeps happening, contact support with the details below.</p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="font-medium">{this.state.error?.message || 'Unknown error'}</p>
            {this.state.info?.componentStack && (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">
                {this.state.info.componentStack}
              </pre>
            )}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
