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
      <main role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-[var(--background)] text-[var(--foreground)]">
        <h1 className="text-xl font-700">{this.props.translate?.("errors.unexpected_title") ?? "Something went wrong"}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{this.props.translate?.("errors.unexpected_message") ?? "An unexpected error occurred."}</p>
        <button type="button" onClick={() => window.location.reload()} className="h-10 px-4 rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-foreground)] font-500">
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
