import React from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary caught error]:', error, info)
    this.setState({ error, info })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-850 dark:text-slate-100">
            Something unexpected occurred
          </h2>
          <p className="mt-2 max-w-md text-xs text-slate-600 dark:text-slate-400">
            We encountered an unexpected issue while rendering this section. You can try refreshing or navigating back to your dashboard.
          </p>

          {isDev && this.state.error && (
            <div className="mt-4 max-w-xl text-left rounded-xl border border-red-200 bg-red-50/50 p-3.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              <div className="font-mono font-semibold">{this.state.error.toString()}</div>
              {this.state.info?.componentStack && (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-red-600/80 dark:text-red-400/80">
                  {this.state.info.componentStack}
                </pre>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <Home className="h-3.5 w-3.5" />
              Go to Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
