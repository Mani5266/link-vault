"use client";

import { Component, type ReactNode } from "react";

// ============================================================
// ErrorBoundary — Catches unhandled React errors in children
// Editorial design system styling
// ============================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Compact mode for inline sections (vs full-page) */
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.compact) {
        return (
          <div
            className="border border-danger/20 bg-danger-subtle px-4 py-3 flex items-center gap-3"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <svg className="w-4 h-4 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-danger flex-1">
              {this.state.error?.message || "Something went wrong in this section."}
            </p>
            <button
              onClick={this.handleReset}
              className="text-xs text-danger font-medium hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
          <div
            className="w-12 h-12 mb-4 flex items-center justify-center border border-danger/30 bg-danger-subtle"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="font-display text-heading text-paper mb-2">
            Something went wrong
          </h2>
          <p className="text-caption text-paper-muted max-w-md mb-6">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-primary !py-2 !px-5 !text-xs"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
