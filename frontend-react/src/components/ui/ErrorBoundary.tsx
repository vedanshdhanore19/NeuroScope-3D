import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="py-16 px-4 max-w-xl mx-auto text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-navy">
              {this.props.fallbackTitle || 'Viewer Encountered an Unexpected Issue'}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-left overflow-auto max-h-32">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-md transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
