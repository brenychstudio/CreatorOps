// src/pages/prototype/SmartMix.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import { usePrototypeStore, type Mix } from "../../store/prototypeStore";

type SmartMixDragPayload = {
  assetId: string;
  from: { mixId: string; slotIndex: number };
};

const SMART_MIX_DND_TYPE = "application/x-creatorops-smartmix";

function setSmartMixDragData(e: React.DragEvent, payload: SmartMixDragPayload) {
  e.dataTransfer.setData(SMART_MIX_DND_TYPE, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

function getSmartMixDragData(e: React.DragEvent): SmartMixDragPayload | null {
  try {
    const raw = e.dataTransfer.getData(SMART_MIX_DND_TYPE);
    if (!raw) return null;
    return JSON.parse(raw) as SmartMixDragPayload;
  } catch {
    return null;
  }
}

function scoreValue(value?: number) {
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function fitLabel(value?: number) {
  const score = scoreValue(value);

  if (score >= 80) return "Strong fit";
  if (score >= 68) return "Good base";
  return "Needs tune";
}

export default function SmartMix() {
  const nav = useNavigate();
  const [, setStatus] = useState("Ready");
  const [focusedMixId, setFocusedMixId] = useState<string | null>(null);
  const [draggingTile, setDraggingTile] = useState<{ mixId: string; slotIndex: number } | null>(null);
  const [overTile, setOverTile] = useState<{ mixId: string; slotIndex: number } | null>(null);

  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);
  const lockedSlots = usePrototypeStore((s) => s.lockedSlots);
  const getAssetById = usePrototypeStore((s) => s.getAssetById);
  const regenerateMixes = usePrototypeStore((s) => s.regenerateMixes);
  const pickBestMix = usePrototypeStore((s) => s.pickBestMix);
  const buildSequenceFromBest = usePrototypeStore((s) => s.buildSequenceFromBest);
  const toggleMixSlotLock = usePrototypeStore((s) => s.toggleMixSlotLock);
  const replaceMixTile = usePrototypeStore((s) => s.replaceMixTile);
  const replaceWeakMixTile = usePrototypeStore((s) => s.replaceWeakMixTile);
  const reorderMixTiles = usePrototypeStore((s) => s.reorderMixTiles);
  const sendSequenceToPlanner = usePrototypeStore((s) => s.sendSequenceToPlanner);

  const visibleMixes = useMemo(() => mixes.slice(0, 3), [mixes]);
  const visibleBestId = useMemo(() => {
    if (visibleMixes.some((mix) => mix.id === bestMixId)) return bestMixId;
    return visibleMixes[0]?.id;
  }, [bestMixId, visibleMixes]);
  const focusedVisibleMixId = useMemo(() => {
    if (focusedMixId && visibleMixes.some((mix) => mix.id === focusedMixId)) return focusedMixId;
    return null;
  }, [focusedMixId, visibleMixes]);

  const activeMix = useMemo(() => {
    return visibleMixes.find((mix) => mix.id === visibleBestId) ?? visibleMixes[0];
  }, [visibleMixes, visibleBestId]);

  const onReplaceTile = (mixId: string, slotIndex: number) => {
    const replaced = replaceMixTile(mixId, slotIndex);
    setStatus(replaced ? `Improved slot ${slotIndex + 1}` : "No improvement available.");
  };

  const onReplaceWeak = (mixId: string) => {
    const replaced = replaceWeakMixTile(mixId);
    setStatus(replaced ? "Candidate improved" : "No improvement available.");
  };

  const onPickCandidate = (mixId: string) => {
    pickBestMix(mixId);
    setFocusedMixId(mixId);
    setStatus("Mix selected for Planner");
  };

  const onDropTile = (e: React.DragEvent, mix: Mix, slotIndex: number, locked: boolean) => {
    e.preventDefault();

    const payload = getSmartMixDragData(e);
    setOverTile(null);
    setDraggingTile(null);

    if (!payload?.assetId || locked || payload.from.mixId !== mix.id || payload.from.slotIndex === slotIndex) {
      return;
    }

    const reordered = reorderMixTiles(mix.id, payload.from.slotIndex, slotIndex);
    if (reordered) {
      setFocusedMixId(mix.id);
      setStatus("Candidate order updated");
    } else {
      setStatus("Reorder unavailable for locked slots");
    }
  };

  const onRegenerate = async () => {
    setStatus("Regenerating unlocked slots...");
    await regenerateMixes();
    setStatus(Object.keys(lockedSlots ?? {}).length ? "Regenerated with locked slots" : "Regenerated");
  };

  const onContinue = () => {
    if (activeMix) pickBestMix(activeMix.id);
    buildSequenceFromBest();
    sendSequenceToPlanner();
    nav("/prototype/planner");
  };

  const renderTile = (mix: Mix, slotIndex: number) => {
    const id = mix.tileIds[slotIndex];
    const asset = id ? getAssetById(id) : undefined;
    const locked = Boolean(id && lockedSlots?.[slotIndex] === id);
    const weak = mix.weakSlotIndex === slotIndex;
    const canDrag = Boolean(asset) && !locked;
    const isDragging = draggingTile?.mixId === mix.id && draggingTile.slotIndex === slotIndex;
    const isOver = overTile?.mixId === mix.id && overTile.slotIndex === slotIndex;
    const canDropHere = Boolean(draggingTile && draggingTile.mixId === mix.id && draggingTile.slotIndex !== slotIndex && !locked);

    return (
      <div
        draggable={canDrag}
        onDragStart={(e) => {
          if (!asset || locked) {
            e.preventDefault();
            return;
          }

          setDraggingTile({ mixId: mix.id, slotIndex });
          setSmartMixDragData(e, {
            assetId: asset.id,
            from: { mixId: mix.id, slotIndex },
          });
        }}
        onDragOver={(e) => {
          if (!canDropHere) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOverTile({ mixId: mix.id, slotIndex });
        }}
        onDrop={(e) => onDropTile(e, mix, slotIndex, locked)}
        onDragLeave={() => {
          if (isOver) setOverTile(null);
        }}
        onDragEnd={() => {
          setDraggingTile(null);
          setOverTile(null);
        }}
        className={[
          "group relative aspect-[4/5] w-full min-w-0 overflow-hidden rounded-xl border bg-[color:var(--co-surface)] transition-[border-color,box-shadow,opacity,filter] duration-200",
          locked ? "border-[color:var(--co-text)]/30" : "border-[color:var(--co-border)]",
          canDrag ? "cursor-grab active:cursor-grabbing" : "",
          isDragging ? "opacity-45" : "",
          isOver ? "ring-2 ring-[color:var(--co-text)]/22 ring-offset-2 ring-offset-[color:var(--co-surface)]" : "",
        ].join(" ")}
      >
        {asset ? (
          <img src={asset.thumbUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="h-full w-full bg-[color:var(--co-surface)]" />
        )}

        {locked || weak ? (
          <div className="pointer-events-none absolute left-2 top-2">
            <span className="co-smart-tile-badge">
              {locked ? "Kept" : "Tune"}
            </span>
          </div>
        ) : null}

        <div className="absolute inset-x-1 bottom-1 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => {
              toggleMixSlotLock(mix.id, slotIndex);
              setStatus(locked ? "Slot unlocked" : "Slot locked");
            }}
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-white/82 backdrop-blur pressable"
          >
            {locked ? "Kept" : "Keep"}
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
            Improve
          </button>
        </div>
      </div>
    );
  };

  if (!mixes.length) {
    return (
      <FlowEmptyState
        title="No mixes yet"
        desc="Select ready assets in Library to generate stronger Week Pack candidates. Starter assets can fill the board when selection is light."
        primaryLabel="Go to Library"
        primaryTo="/prototype/library"
        secondaryLabel="How it works"
        secondaryTo="/"
      />
    );
  }

  return (
    <div className="co-workspace-page co-scene co-comparison-stage">
      <div className="co-scene-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base text-[color:var(--co-text)]">Smart Mix</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Decision field for building the strongest weekly rhythm.
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => void onRegenerate()}
            className="flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Refresh candidates
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Continue to Planner
          </button>
        </div>
      </div>

      <div className="co-scrollbar grid min-h-0 min-w-0 flex-1 content-start gap-3 overflow-y-auto pr-1 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {visibleMixes.map((mix, mixIndex) => {
          const isBest = mix.id === visibleBestId;
          const isDimmed = Boolean(focusedVisibleMixId && !isBest);
          const fit = fitLabel(mix.overallScore ?? mix.score);

          return (
            <div
              key={mix.id}
              className={[
                "co-stage-card co-smart-candidate-card min-w-0 p-2.5 sm:p-3",
                isBest ? "co-smart-candidate-card-selected" : "co-smart-candidate-card-muted",
                isDimmed ? "opacity-35 saturate-[0.45] brightness-[0.72] hover:opacity-60" : "",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                      Candidate {String(mixIndex + 1).padStart(2, "0")}
                    </span>

                    {isBest ? (
                      <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-active)] px-2.5 py-1 text-xs text-[color:var(--co-text)]/82">
                        Selected for Planner
                      </span>
                    ) : (
                      <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-2.5 py-1 text-xs text-[color:var(--co-muted)]">
                        Alternative rhythm
                      </span>
                    )}
                  </div>

                  <div className="mt-2 truncate text-[13px] font-medium text-[color:var(--co-text)]">
                    {fit}
                  </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={isBest}
                    onClick={() => {
                      if (!isBest) onPickCandidate(mix.id);
                    }}
                    disabled={isBest}
                    className={[
                      "rounded-full border border-[color:var(--co-border)] px-2.5 py-1 text-[11px] text-[color:var(--co-text)]/82 hover:bg-[color:var(--co-surface)] pressable",
                      isBest ? "bg-[color:var(--co-surface-active)] opacity-80" : "bg-transparent",
                    ].join(" ")}
                  >
                    {isBest ? "Selected" : "Use this mix"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onReplaceWeak(mix.id)}
                    className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2.5 py-1 text-[11px] text-[color:var(--co-text)]/82 hover:opacity-90 pressable"
                  >
                    Improve
                  </button>
                </div>
              </div>

              <div className="mt-3 grid min-w-0 grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="min-w-0">
                    {renderTile(mix, i)}
                  </div>
                ))}
              </div>

              {isBest ? (
                <div className="co-smart-selected-note">
                  Drives Planner, Captions, and Export.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
