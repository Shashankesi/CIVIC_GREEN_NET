import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[TabErrorBoundary] Error rendering tab "${this.props.tabName || 'admin-section'}":`, error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20 my-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            {this.props.title || `Unable to load ${this.props.tabName || 'this section'}`}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-600 dark:text-slate-400">
            {this.state.error?.message || 'A temporary rendering or data issue occurred while displaying this section. Your other tabs and data are safe.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={this.resetError}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Section</span>
            </button>
            {this.props.onNavigateDefault && (
              <button
                onClick={this.props.onNavigateDefault}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span>Return to Overview</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TabErrorBoundary;
