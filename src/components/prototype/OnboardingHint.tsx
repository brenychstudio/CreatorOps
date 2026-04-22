// src/components/prototype/OnboardingHint.tsx
import { useEffect, useMemo, useState } from "react";

const LS_KEY = "creatorops_onboarding_v1_hide";
const SS_KEY = "creatorops_onboarding_v1_seen";

type Step = {
  n: string;
  title: string;
  desc: string;
};

export default function OnboardingHint() {
  const [visible, setVisible] = useState(false);

  const steps: Step[] = useMemo(
    () => [
      {
        n: "1",
        title: "Upload 6–12 photos",
        desc: "Use the Uploads panel on the right (drag & drop works).",
      },
      {
        n: "2",
        title: "Select 3–7 to steer (optional)",
        desc: "Pick a few posts that represent the vibe you want.",
      },
      {
        n: "3",
        title: "Smart Mix → Pick best → Export ZIP",
        desc: "Generate ranked grids, choose the best, then download the pack.",
      },
    ],
    []
  );

  useEffect(() => {
    try {
      const hide = window.localStorage.getItem(LS_KEY) === "1";
      const seen = window.sessionStorage.getItem(SS_KEY) === "1";
      if (!hide && !seen) setVisible(true);
    } catch {
      // If storage is blocked, still show once.
      setVisible(true);
    }
  }, []);

  const dismissForSession = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(SS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const neverShowAgain = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(LS_KEY, "1");
      window.sessionStorage.setItem(SS_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[color:var(--co-text)]">Quick start</div>
          <div className="mt-1 text-xs text-[color:var(--co-muted)]">
            30 seconds to your first export pack.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dismissForSession}
            className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={neverShowAgain}
            className="rounded-full bg-[color:var(--co-text)] px-3 py-1.5 text-xs text-[color:var(--co-bg)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            title="Hide this hint permanently on this device"
          >
            Don’t show again
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-3"
          >
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-bg)]/40 text-xs text-[color:var(--co-text)]">
                {s.n}
              </div>
              <div className="text-xs text-[color:var(--co-text)]">{s.title}</div>
            </div>
            <div className="mt-2 text-[11px] text-[color:var(--co-muted)]">{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-[color:var(--co-muted)]">
        Beta note: uploads reset on refresh.
      </div>
    </div>
  );
}
