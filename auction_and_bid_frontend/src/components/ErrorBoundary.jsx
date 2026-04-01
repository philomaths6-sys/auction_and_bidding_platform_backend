import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep console logging for dev diagnosis
    console.error('UI crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 font-sans">
        <div className="glass max-w-2xl w-full rounded-2xl p-8">
          <h1 className="text-xl font-black uppercase tracking-widest text-red-400">Something went wrong</h1>
          <p className="mt-2 text-slate-300 font-medium">
            The page crashed instead of showing a blank screen. Refresh and try again.
          </p>
          <pre className="mt-6 whitespace-pre-wrap break-words text-xs bg-black/30 border border-white/10 rounded-xl p-4 text-slate-200">
            {String(this.state.error?.message || this.state.error || 'Unknown error')}
          </pre>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest px-5 py-2.5 rounded-lg"
            >
              Reload
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-white/10 hover:bg-white/15 text-white font-black uppercase tracking-widest px-5 py-2.5 rounded-lg border border-white/10"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

