"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel flex flex-col items-center justify-center h-full text-center py-8">
          <p className="text-sm text-text-secondary mb-2">
            {this.props.fallbackTitle ?? "This panel encountered an error"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-accent-green hover:text-accent-green/80 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
