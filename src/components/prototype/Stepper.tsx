// src/components/prototype/Stepper.tsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";

const steps = [
  { key: "library", label: "Library", layer: "Intake", path: "/prototype/library" },
  { key: "smartMix", label: "Smart Mix", layer: "Decision", path: "/prototype/smart-mix" },
  { key: "planner", label: "Planner", layer: "Plan", path: "/prototype/planner" },
  { key: "captions", label: "Captions", layer: "Voice", path: "/prototype/captions" },
  { key: "export", label: "Export", layer: "Output", path: "/prototype/export" },
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

  const activeIndex = steps.findIndex((s) => loc.pathname.startsWith(s.path));
  const hasPlan = useMemo(() => planner.some((p) => Boolean(p.tileId)), [planner]);
  const hasCaptions = Boolean(captions?.variants?.[0]?.trim()) || Boolean(captions?.hashtags?.length);

  const gates = useMemo(() => {
    const hasMixes = mixes.length > 0;
    const hasBest = Boolean(bestMixId);

    const can = {
      library: { enabled: true },
      smartMix: {
        enabled: hasMixes,
        hint: {
          msg: "Complete the Intake field before opening Smart Mix.",
          ctaLabel: "Go to Library",
          ctaTo: "/prototype/library",
        },
      },
      planner: {
        enabled: hasMixes && hasBest,
        hint: {
          msg: "Choose a Decision grid before shaping the publishing board.",
          ctaLabel: "Go to Smart Mix",
          ctaTo: "/prototype/smart-mix",
        },
      },
      captions: {
        enabled: hasPlan,
        hint: {
          msg: "Shape the Plan first, then write the Voice layer.",
          ctaLabel: "Go to Planner",
          ctaTo: "/prototype/planner",
        },
      },
      export: {
        enabled: hasPlan && hasCaptions,
        hint: {
          msg: hasPlan ? "Prepare the Voice layer first, then export the pack." : "Shape the Plan before Output.",
          ctaLabel: hasPlan ? "Go to Captions" : "Go to Planner",
          ctaTo: hasPlan ? "/prototype/captions" : "/prototype/planner",
        },
      },
    } as const;

    return can;
  }, [mixes.length, bestMixId, hasPlan, hasCaptions]);

  const onStepClick = (key: (typeof steps)[number]["key"], path: string) => {
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
    <div className="relative flex w-full min-w-0 items-center gap-1 overflow-x-auto sm:gap-1.5 md:w-auto md:overflow-visible">
      {steps.map((s, i) => {
        const active = i === activeIndex;
        const done = activeIndex >= 0 && i < activeIndex;

        const gate = (gates as any)[s.key];
        const enabled = active || gate?.enabled !== false;
        const locked = !enabled;

        const state = active
          ? "co-step-active text-[color:var(--co-text)]"
          : done
            ? "co-step-done bg-transparent opacity-85"
            : "bg-transparent text-[color:var(--co-muted)]";

        return (
          <button
            key={s.path}
            type="button"
            onClick={() => onStepClick(s.key, s.path)}
            aria-disabled={locked ? true : undefined}
            aria-current={active ? "step" : undefined}
            className={[
              "co-step-button shrink-0 rounded-full border px-2.5 py-1.5 text-xs pressable sm:px-3",
              "transition-[background-color,color,border-color,opacity,filter] duration-300 ease-out",
              state,
              locked
                ? "co-step-locked cursor-not-allowed opacity-55"
                : "hover:opacity-100 hover:bg-[color:var(--co-surface-active)] hover:text-[color:var(--co-text)]",
            ].join(" ")}
            title={locked ? gate?.hint?.msg ?? "Complete previous step first." : `${s.label} - ${s.layer}`}
          >
            {s.label}
          </button>
        );
      })}

      {hint ? (
        <div className="co-system-panel absolute right-0 top-full z-20 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl p-3">
          <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Workflow state</div>
          <div className="mt-1 text-sm text-[color:var(--co-text)]">{hint.msg}</div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setHint(null)}
              className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 pressable"
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
