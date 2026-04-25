// src/pages/prototype/SmartMix.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import { usePrototypeStore, type Mix } from "../../store/prototypeStore";

function SoftScoreDots({ scoreDots }: { scoreDots: 1 | 2 | 3 }) {
  const on = "bg-[color:var(--co-text)]/80";
  const off = "bg-[color:var(--co-border)]";

  return (
    <div className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${scoreDots >= 1 ? on : off}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${scoreDots >= 2 ? on : off}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${scoreDots >= 3 ? on : off}`} />
    </div>
  );
}

function scoreValue(value?: number) {
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function recommendationFor(mix: Mix) {
  return mix.recommendation || (scoreValue(mix.overallScore ?? mix.score) >= 80 ? "Balanced visual set" : "Good base, needs one replacement");
}

function shortReasonFor(mix?: Mix) {
  const reasons = mix?.reasons?.filter(Boolean) ?? [];

  if (reasons.length >= 2) {
    return `${reasons[0]} ${reasons[1]}`;
  }

  if (reasons.length === 1) {
    return reasons[0];
  }

  return "Balanced rhythm. Ready for captions and export.";
}

export default function SmartMix() {
  const nav = useNavigate();
  const [status, setStatus] = useState("Ready");

  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);
  const lockedSlots = usePrototypeStore((s) => s.lockedSlots);
  const getAssetById = usePrototypeStore((s) => s.getAssetById);
  const regenerateMixes = usePrototypeStore((s) => s.regenerateMixes);
  const pickBestMix = usePrototypeStore((s) => s.pickBestMix);
  const toggleMixSlotLock = usePrototypeStore((s) => s.toggleMixSlotLock);
  const replaceMixTile = usePrototypeStore((s) => s.replaceMixTile);
  const replaceWeakMixTile = usePrototypeStore((s) => s.replaceWeakMixTile);

  const activeMix = useMemo(() => {
    return mixes.find((mix) => mix.id === bestMixId) ?? mixes[0];
  }, [mixes, bestMixId]);

  const onReplaceTile = (mixId: string, slotIndex: number) => {
    const replaced = replaceMixTile(mixId, slotIndex);
    setStatus(replaced ? `Replaced slot ${slotIndex + 1}` : "No replacement available.");
  };

  const onReplaceWeak = (mixId: string) => {
    const replaced = replaceWeakMixTile(mixId);
    setStatus(replaced ? "Weak slot replaced" : "No replacement available.");
  };

  const onRegenerate = async () => {
    setStatus("Regenerating unlocked slots...");
    await regenerateMixes();
    setStatus(Object.keys(lockedSlots ?? {}).length ? "Regenerated with locked slots" : "Regenerated");
  };

  const onContinue = () => {
    if (activeMix) pickBestMix(activeMix.id);
    nav("/prototype/sequence");
  };

  const renderTile = (mix: Mix, slotIndex: number) => {
    const id = mix.tileIds[slotIndex];
    const asset = id ? getAssetById(id) : undefined;
    const locked = Boolean(id && lockedSlots?.[slotIndex] === id);
    const weak = mix.weakSlotIndex === slotIndex;

    return (
      <div
        className={[
          "group relative aspect-[4/5] w-full min-w-0 overflow-hidden rounded-xl border bg-[color:var(--co-surface)]",
          locked ? "border-[color:var(--co-text)]/30" : "border-[color:var(--co-border)]",
        ].join(" ")}
      >
        {asset ? (
          <img src={asset.thumbUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="h-full w-full bg-[color:var(--co-surface)]" />
        )}

        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {locked ? (
            <span className="rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] text-white/82 backdrop-blur">
              Locked
            </span>
          ) : weak ? (
            <span className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur">
              Weak
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-1 bottom-1 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => {
              toggleMixSlotLock(mix.id, slotIndex);
              setStatus(locked ? "Slot unlocked" : "Slot locked");
            }}
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-white/82 backdrop-blur pressable"
          >
            {locked ? "Locked" : "Lock"}
          </button>

          <button
            type="button"
            disabled={locked}
            onClick={() => onReplaceTile(mix.id, slotIndex)}
            className={[
              "min-w-0 flex-1 rounded-full border border-white/10 px-2 py-1 text-[10px] backdrop-blur pressable",
              locked ? "bg-black/25 text-white/35" : "bg-black/55 text-white/82",
            ].join(" ")}
          >
            Replace
          </button>
        </div>
      </div>
    );
  };

  if (!mixes.length) {
    return (
      <FlowEmptyState
        title="No mixes yet"
        desc="Select at least 9 ready assets in Library to generate stronger mixes. Demo-ready assets can still fill the prototype when selection is light."
        primaryLabel="Go to Library"
        primaryTo="/prototype/library"
        secondaryLabel="How it works"
        secondaryTo="/"
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4 text-[color:var(--co-text)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base text-[color:var(--co-text)]">Smart Mix</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Ranked 3x3 candidates with local scoring and editable guardrails.
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => void onRegenerate()}
            className="flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Regenerate unlocked
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Continue
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                Active candidate
              </span>

              <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-2.5 py-1 text-xs text-[color:var(--co-text)]/78">
                {scoreValue(activeMix?.overallScore ?? activeMix?.score)} / 100
              </span>

              <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-2.5 py-1 text-xs text-[color:var(--co-muted)]">
                {Object.keys(lockedSlots ?? {}).length} locked
              </span>
            </div>

            <div className="mt-3 text-sm font-medium text-[color:var(--co-text)]">
              {activeMix ? recommendationFor(activeMix) : "Choose a candidate"}
            </div>

            <div className="mt-1 max-w-[46rem] text-[12px] leading-5 text-[color:var(--co-muted)]">
              {shortReasonFor(activeMix)}
            </div>
          </div>

          <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
            {status}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {mixes.map((mix, mixIndex) => {
          const isBest = mix.id === bestMixId;
          const overall = scoreValue(mix.overallScore ?? mix.score);
          const recommendation = recommendationFor(mix);
          const reason = shortReasonFor(mix);

          return (
            <div
              key={mix.id}
              className={[
                "min-w-0 rounded-3xl border bg-[color:var(--co-surface-2)] p-4 shadow-sm",
                isBest ? "border-[color:var(--co-text)]/24" : "border-[color:var(--co-border)]",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                      Candidate {String(mixIndex + 1).padStart(2, "0")}
                    </span>

                    <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2.5 py-1 text-xs text-[color:var(--co-text)]/78">
                      {overall}
                    </span>

                    <SoftScoreDots scoreDots={mix.scoreDots} />

                    {isBest ? (
                      <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2.5 py-1 text-xs text-[color:var(--co-text)]/78">
                        Selected
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 text-sm font-medium text-[color:var(--co-text)]">
                    {recommendation}
                  </div>

                  <div className="mt-1 max-w-[30rem] text-[12px] leading-5 text-[color:var(--co-muted)]">
                    {reason}
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      pickBestMix(mix.id);
                      setStatus("Candidate selected");
                    }}
                    className="flex-1 rounded-full border border-[color:var(--co-border)] bg-transparent px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable sm:flex-none"
                  >
                    Pick as best
                  </button>

                  <button
                    type="button"
                    onClick={() => onReplaceWeak(mix.id)}
                    className="flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 pressable sm:flex-none"
                  >
                    Replace weak
                  </button>
                </div>
              </div>

              <div className="mt-4 grid min-w-0 grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="min-w-0">
                    {renderTile(mix, i)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
