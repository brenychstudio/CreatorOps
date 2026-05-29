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
        title: "Add 6-12 photos",
        desc: "Start the Week Pack from Library or drag images into the field.",
      },
      {
        n: "2",
        title: "Select the rhythm",
        desc: "Choose the assets that best represent the week.",
      },
      {
        n: "3",
        title: "Planner -> Captions -> Export",
        desc: "Shape the board, write the voice layer, then download the Export Pack.",
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
    <div className="rounded-[1.05rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] p-2.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm text-[color:var(--co-text)]">Quick start</div>
          <div className="mt-0.5 text-xs text-[color:var(--co-muted)]">Build a Week Pack in under a minute.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            Hide this
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface-active)] px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="grid h-5 w-5 place-items-center rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-bg)]/40 text-[11px] text-[color:var(--co-text)]">
                {s.n}
              </div>
              <div className="text-xs text-[color:var(--co-text)]">{s.title}</div>
            </div>
            <div className="mt-1 text-[11px] text-[color:var(--co-muted)]">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
