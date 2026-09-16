import { Component, type ErrorInfo, type ReactNode } from "react";
import { useI18n, type MessageKey } from "../i18n";
import { logError } from "../lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  translate?: (key: MessageKey) => string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render errors, logs them, and provides a recoverable reload state. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  /** Updates the fallback state after a descendant throws. @returns {void} Nothing. */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /** Logs the render error for diagnosis. @param {Error} error The render error. @param {ErrorInfo} errorInfo React component stack information. @returns {void} Nothing. */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError("ui.render_error", error, { componentStack: errorInfo.componentStack || "" });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 py-6 text-foreground">
        <h1 className="page-title">{this.props.translate?.("errors.unexpected_title") ?? "Something went wrong"}</h1>
        <p className="text-sm text-muted-foreground">{this.props.translate?.("errors.unexpected_message") ?? "An unexpected error occurred."}</p>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          {this.props.translate?.("common.reload") ?? "Reload"}
        </button>
      </main>
    );
  }
}

/** Provides localized copy to the render-error boundary. */
export default function LocalizedErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return <ErrorBoundary translate={t}>{children}</ErrorBoundary>;
}
