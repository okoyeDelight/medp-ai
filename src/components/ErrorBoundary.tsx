import React from "react";

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { hasError: boolean; error?: Error }

/** App-level error boundary. Catches render + async errors surfaced to React. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Never leak stack traces in production; only note the error class.
    if (import.meta.env.DEV) console.error("[ErrorBoundary]", error);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            The safety engine hit a temporary snag. You can retry — none of your health data was lost.
          </p>
          <button
            onClick={this.reset}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
