import React, { Component, ReactNode, ErrorInfo } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// React error boundaries must be class components.
// Declare state explicitly as a class property to satisfy TSC strict mode.
export class ErrorBoundary extends Component<Props, State> {
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, { extra: { errorInfo } });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red", backgroundColor: "white", zIndex: 9999, position: "relative" }}>
          <h1>Error: {this.state.error?.message}</h1>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return (this as unknown as { props: Props }).props.children;
  }
}
