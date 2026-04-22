// src/components/system/AppCrashBoundary.tsx
import React from "react";

type State = {
  hasError: boolean;
  errorMessage: string;
  stack: string;
  componentStack: string;
};

function safeCopy(text: string) {
  try {
    return navigator.clipboard.writeText(text).then(() => true);
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return Promise.resolve(ok);
    } catch {
      return Promise.resolve(false);
    }
  }
}

const APP_VERSION = (import.meta as any).env?.VITE_APP_VERSION ?? "dev";
const BUILD_TIME = (import.meta as any).env?.VITE_BUILD_TIME ?? "";

function buildDiagnostics(errorMessage: string, stack: string, componentStack: string) {
  let persistedState = "unavailable";
  try {
    persistedState = window.localStorage.getItem("creatorops-beta-v1") ?? "null";
  } catch {
    persistedState = "inaccessible";
  }

  return [
    "CreatorOps crash diagnostics",
    `version: ${APP_VERSION}${BUILD_TIME ? ` (${BUILD_TIME})` : ""}`,
    `path: ${window.location.pathname}${window.location.search}${window.location.hash}`,
    `time: ${new Date().toISOString()}`,
    `userAgent: ${navigator.userAgent}`,
    "",
    "error:",
    errorMessage || "(unknown)",
    "",
    "stack:",
    stack || "(none)",
    "",
    "componentStack:",
    componentStack || "(none)",
    "",
    "persistedState:",
    persistedState,
  ].join("\n");
}

function CrashFallback(props: {
  errorMessage: string;
  stack: string;
  componentStack: string;
  onResetState: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    const ok = await safeCopy(buildDiagnostics(props.errorMessage, props.stack, props.componentStack));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--co-bg)] text-[color:var(--co-text)]">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <div className="w-full rounded-3xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg text-[color:var(--co-text)]">Something went wrong</div>
              <div className="mt-1 text-sm text-[color:var(--co-muted)]">
                CreatorOps hit an unexpected runtime error. Your safest next step is to copy diagnostics,
                then reset saved state and return to Library.
              </div>
              <div className="mt-2 text-[11px] text-[color:var(--co-muted)]">
                Version: <span className="font-mono">{APP_VERSION}{BUILD_TIME ? ` (${BUILD_TIME})` : ""}</span>
              </div>
            </div>

            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
              Crash safe mode
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-4">
            <div className="text-xs text-[color:var(--co-muted)]">Error summary</div>
            <div className="mt-2 text-sm text-[color:var(--co-text)]/90">
              {props.errorMessage || "Unknown runtime error"}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            >
              {copied ? "Copied" : "Copy diagnostics"}
            </button>

            <button
              type="button"
              onClick={props.onResetState}
              className="rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            >
              Reset saved state
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="rounded-full border border-[color:var(--co-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            >
              Go home
            </button>
          </div>

          <div className="mt-5 text-[11px] text-[color:var(--co-muted)]">
            Note: resetting clears persisted beta state and onboarding flags. Session uploads are already non-persistent.
          </div>
        </div>
      </div>
    </div>
  );
}

export default class AppCrashBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = {
    hasError: false,
    errorMessage: "",
    stack: "",
    componentStack: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? "" : "",
      componentStack: "",
    };
  }

  componentDidCatch(_error: unknown, info: React.ErrorInfo) {
    this.setState({
      componentStack: info.componentStack ?? "",
    });
  }

  private resetSavedState = () => {
    try {
      window.localStorage.removeItem("creatorops-beta-v1");
      window.localStorage.removeItem("creatorops_onboarding_v1_hide");
    } catch {
      // ignore
    }

    try {
      window.sessionStorage.removeItem("creatorops_onboarding_v1_seen");
    } catch {
      // ignore
    }

    window.location.href = "/prototype/library";
  };

  render() {
    if (this.state.hasError) {
      return (
        <CrashFallback
          errorMessage={this.state.errorMessage}
          stack={this.state.stack}
          componentStack={this.state.componentStack}
          onResetState={this.resetSavedState}
        />
      );
    }

    return this.props.children;
  }
}
