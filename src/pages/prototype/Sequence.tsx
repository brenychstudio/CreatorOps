// src/pages/prototype/Sequence.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import { usePrototypeStore } from "../../store/prototypeStore";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Sequence() {
  const navigate = useNavigate();

  const assets = usePrototypeStore((s) => s.assets);
  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);

  const getAssetById = usePrototypeStore((s) => s.getAssetById);

  const buildSequenceFromBest = usePrototypeStore((s) => s.buildSequenceFromBest);
  const sendSequenceToPlanner = usePrototypeStore((s) => s.sendSequenceToPlanner);

  // ensure store sequence is built (used by Planner send)
  useEffect(() => {
    if (!mixes.length) return;
    // build sequence when a best mix exists (or fallback to first)
    buildSequenceFromBest();
  }, [buildSequenceFromBest, bestMixId, mixes.length]);

  const pressable = "transition active:translate-y-[1px] active:scale-[0.98]";

  const bestMix = useMemo(() => {
    return mixes.find((m) => m.id === bestMixId) ?? mixes[0];
  }, [mixes, bestMixId]);

  // 9 tiles for the 3×3 feed (ensure we always have 9 ready 4:5 ids)
  const nineTileIds = useMemo(() => {
    const raw = bestMix?.tileIds ?? [];

    const filtered = raw
      .map((id) => getAssetById(id))
      .filter(Boolean)
      .filter((a: any) => a.status === "ready" && a.ratio === "4:5")
      .map((a: any) => a.id);

    if (filtered.length >= 9) return filtered.slice(0, 9);

    const fallbackPool = assets
      .filter((a: any) => a.status === "ready" && a.ratio === "4:5")
      .map((a: any) => a.id);

    const pool = filtered.length ? filtered : fallbackPool;
    const out = [...filtered];

    for (let i = out.length; i < 9; i++) out.push(pool[i % Math.max(1, pool.length)]);
    return out.slice(0, 9);
  }, [bestMix, getAssetById, assets]);

  const weekIds = useMemo(() => nineTileIds.slice(0, 7), [nineTileIds]);
  const nextIds = useMemo(() => nineTileIds.slice(7, 9), [nineTileIds]);

  // Focus state: clicking a day/next tile updates the main preview
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [bestMixId]);

  const activeId = nineTileIds[activeIndex] ?? nineTileIds[0];
  const activeAsset = activeId ? getAssetById(activeId) : undefined;

  const activeLabel = activeIndex < 7 ? dayNames[activeIndex] : "Next";
  const activeSubLabel = activeIndex < 7 ? `Day ${activeIndex + 1} / 7` : `Next ${activeIndex - 6} / 2`;

  const WeekTile = (props: { index: number; label: string; id?: string }) => {
    const { index, label, id } = props;
    const selected = index === activeIndex;
    const a: any = id ? getAssetById(id) : undefined;

    return (
      <button type="button" onClick={() => setActiveIndex(index)} className={["group w-full text-left", pressable].join(" ")}>
        <div
          className={[
            "relative aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-[color:var(--co-surface)] transition",
            "border-[color:var(--co-border)]",
            selected ? "shadow-sm" : "hover:opacity-[0.96]",
          ].join(" ")}
        >
          {a ? (
            <img
              src={a.thumbUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="h-full w-full bg-[color:var(--co-surface)]" />
          )}

          {/* Day label — overlay like Planner */}
          <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]/80 px-2 py-1 text-[11px] text-[color:var(--co-muted)] backdrop-blur">
            <span className="text-[color:var(--co-text)]/80">{label}</span>
            <span className="mx-1 text-[color:var(--co-muted)]/60">·</span>
            <span className="text-[color:var(--co-muted)]/80">4:5</span>
          </div>

          {selected ? (
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-[color:var(--co-text)]/10" />
          ) : null}
        </div>
      </button>
    );
  };


  // Flow guard: deep links should never land on an “empty” step
  if (!mixes.length) {
    return (
      <FlowEmptyState
        title="No mixes yet"
        desc="Start from Library to upload/select assets and generate Smart Mix candidates."
        primaryLabel="Go to Library"
        primaryTo="/prototype/library"
        secondaryLabel="How it works"
        secondaryTo="/"
      />
    );
  }

  if (!bestMixId) {
    return (
      <FlowEmptyState
        title="Pick a best grid first"
        desc="Choose the strongest Smart Mix candidate, then build your week sequence."
        primaryLabel="Go to Smart Mix"
        primaryTo="/prototype/smart-mix"
        secondaryLabel="Back to Library"
        secondaryTo="/prototype/library"
      />
    );
  }

  return (
    <div className="space-y-4 text-[color:var(--co-text)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base text-[color:var(--co-text)]">Sequence</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">Focus + week overview.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/prototype/smart-mix")}
            className={[
              "rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Back to Smart Mix
          </button>

          <button
            type="button"
            onClick={() => {
              sendSequenceToPlanner();
              navigate("/prototype/planner");
            }}
            className={[
              "rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Send to Planner
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Main preview */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[color:var(--co-muted)]">{activeSubLabel}</div>
              <div className="text-xs text-[color:var(--co-muted)]">{activeLabel} · 4:5</div>
            </div>

            <div className="mt-3 overflow-hidden rounded-3xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)]">
              {activeAsset ? (
                <img src={(activeAsset as any).thumbUrl} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <div className="aspect-[4/5] w-full" />
              )}
            </div>

            <div className="mt-3 rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-3 text-[11px] text-[color:var(--co-muted)]">
              <div className="font-medium text-[color:var(--co-text)]/70">9-tile → 7-day mapping</div>
              <div className="mt-1">
                Smart Mix is a 3×3 grid (9). Sequence is week-based (7). The remaining two tiles are shown as{" "}
                <span className="text-[color:var(--co-text)]/80">Next</span> so nothing disappears.
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[color:var(--co-muted)]">Week</div>
              <div className="text-[11px] text-[color:var(--co-muted)]">Tap to focus</div>
            </div>

            {/* Week grid: 7 days + 2 Next */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {weekIds.map((id, i) => (
                <WeekTile key={`day-${i}`} index={i} label={dayNames[i]} id={id} />
              ))}
              {nextIds.map((id, j) => (
                <WeekTile key={`next-${j}`} index={7 + j} label="Next" id={id} />
              ))}
            </div>

            {/* Tip */}
            <div className="mt-4 rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-3 text-[11px] text-[color:var(--co-muted)]">
              Tip: this is the “review” step — quick scan of the week + focused inspection per day.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
