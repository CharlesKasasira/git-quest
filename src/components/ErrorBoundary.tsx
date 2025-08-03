import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-terminal-bg text-terminal-text flex items-center justify-center">
          <div className="max-w-md p-6 border-2 border-terminal-error rounded-lg">
            <h2 className="text-xl font-pixel text-terminal-error mb-4">
              🚨 TIMELINE ERROR DETECTED
            </h2>
            <p className="text-sm mb-4">
              The timeline has encountered an unexpected error. The Timekeeper Development Team has been notified.
            </p>
            <div className="bg-black p-3 rounded font-mono text-xs mb-4">
              <div className="text-terminal-error">Error: {this.state.error?.message}</div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-terminal-primary text-black font-mono hover:bg-terminal-secondary transition-colors"
            >
              RESTART TIMELINE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 