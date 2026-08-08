import { Component, ErrorInfo, ReactNode } from "react";
import ServerError from "@/pages/ServerError";
import { logError } from "@/lib/monitoring";

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError({
      kind: "react",
      message: error.message,
      source: info.componentStack?.trim().split("\n")[0],
      stack: error.stack,
    });
  }


  handleReset = () => {
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return <ServerError error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
