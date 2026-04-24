// src/components/prototype/Stepper.tsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";

const steps = [
  { key: "library", label: "Library", path: "/prototype/library" },
  { key: "smartMix", label: "Smart Mix", path: "/prototype/smart-mix" },
  { key: "sequence", label: "Sequence", path: "/prototype/sequence" },
  { key: "planner", label: "Planner", path: "/prototype/planner" },
  { key: "captions", label: "Captions", path: "/prototype/captions" },
  { key: "export", label: "Export", path: "/prototype/export" },
] as const;

type Hint = {
  msg: string;
  ctaLabel: string;
  ctaTo: string;
};

export default function Stepper() {
  const loc = useLocation();
  const nav = useNavigate();

  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);
  const planner = usePrototypeStore((s) => s.planner);

  const captions = usePrototypeStore((s) => s.captions);

  const [hint, setHint] = useState<Hint | null>(null);

  const activeIndex = Math.max(0, steps.findIndex((s) => loc.pathname.startsWith(s.path)));

  const hasPlan = useMemo(() => planner.some((p) => Boolean(p.tileId)), [planner]);
  const hasCaptions = Boolean(captions?.variants?.[0]?.trim()) || Boolean(captions?.hashtags?.length);

  const gates = useMemo(() => {
    const hasMixes = mixes.length > 0;
    const hasBest = Boolean(bestMixId);

    // Planner is considered “ready” once it has at least one filled tile.
    // (Planner page also enforces its own empty-state guard.)
    const can = {
      library: { enabled: true },
      smartMix: {
        enabled: hasMixes,
        hint: {
          msg: "Generate Smart Mix candidates from Library first.",
          ctaLabel: "Go to Library",
          ctaTo: "/prototype/library",
        },
      },
      sequence: {
        enabled: hasMixes && hasBest,
        hint: {
          msg: "Pick a best Smart Mix grid before building the sequence.",
          ctaLabel: "Go to Smart Mix",
          ctaTo: "/prototype/smart-mix",
        },
      },
      planner: {
        enabled: hasMixes && hasBest && hasPlan,
        hint: {
          msg: "Send your sequence to Planner first (Sequence → Send to Planner).",
          ctaLabel: "Go to Sequence",
          ctaTo: "/prototype/sequence",
        },
      },
      captions: {
        enabled: hasPlan,
        hint: {
          msg: "Create a week plan in Planner first.",
          ctaLabel: "Go to Planner",
          ctaTo: "/prototype/planner",
        },
      },
      export: {
        enabled: hasPlan && hasCaptions,
        hint: {
          msg: hasPlan ? "Generate captions first, then export the ZIP pack." : "Create a plan first.",
          ctaLabel: hasPlan ? "Go to Captions" : "Go to Planner",
          ctaTo: hasPlan ? "/prototype/captions" : "/prototype/planner",
        },
      },
    } as const;

    return can;
  }, [mixes.length, bestMixId, hasPlan, hasCaptions]);

  const onStepClick = (key: (typeof steps)[number]["key"], path: string) => {
    // Always allow navigation to the active step (avoid weird “locked while already here” state).
    const isActive = loc.pathname.startsWith(path);
    const gate = (gates as any)[key];

    if (!isActive && gate && gate.enabled === false) {
      setHint(gate.hint);
      window.setTimeout(() => setHint(null), 2600);
      return;
    }

    setHint(null);
    nav(path);
  };

  return (
    <div className="relative flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0">
      {steps.map((s, i) => {
        const active = i === activeIndex;
        const done = i < activeIndex;

        const gate = (gates as any)[s.key];
        const enabled = active || gate?.enabled !== false;

        const state = active
          ? "bg-[color:var(--co-surface)] text-[color:var(--co-text)]"
          : done
          ? "bg-transparent text-[color:var(--co-text)] opacity-80"
          : "bg-transparent text-[color:var(--co-muted)]";

        const locked = !enabled;

        return (
          <button
            key={s.path}
            type="button"
            onClick={() => onStepClick(s.key, s.path)}
            aria-disabled={locked ? true : undefined}
            className={[
              "shrink-0 rounded-full border px-3 py-1 text-xs pressable",
              "border-[color:var(--co-border)]",
              "transition-[background-color,color,border-color,opacity,filter] duration-300 ease-out",
              state,
              locked ? "cursor-not-allowed opacity-55 grayscale" : "hover:opacity-100 hover:bg-[color:var(--co-surface)] hover:text-[color:var(--co-text)]",
            ].join(" ")}
            title={locked ? gate?.hint?.msg ?? "Complete previous step first." : s.label}
          >
            {s.label}
          </button>
        );
      })}

      {hint ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-3 shadow-lg">
          <div className="text-xs text-[color:var(--co-muted)]">Next step</div>
          <div className="mt-1 text-sm text-[color:var(--co-text)]">{hint.msg}</div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setHint(null)}
              className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 pressable"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setHint(null);
                nav(hint.ctaTo);
              }}
              className="rounded-full bg-[color:var(--co-text)] px-3 py-1.5 text-xs text-[color:var(--co-bg)] hover:opacity-90 pressable"
            >
              {hint.ctaLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
