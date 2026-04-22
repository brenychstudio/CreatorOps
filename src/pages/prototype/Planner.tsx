// src/pages/prototype/Planner.tsx
import { useMemo, useState } from "react";
import { usePrototypeStore } from "../../store/prototypeStore";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";

type DragPayload = {
  assetId: string;
  from?: { dayIndex: number; slotIndex: number };
};

function setDragData(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData("application/json", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

function getDragData(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export default function Planner() {
  const navigate = useNavigate();
  const pressable = "transition active:translate-y-[1px] active:scale-[0.98]";

  const assets = usePrototypeStore((s) => s.assets);
  const selectedAssetIds = usePrototypeStore((s) => s.selectedAssetIds);
  const planner = usePrototypeStore((s) => s.planner);
  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);
  const getAssetById = usePrototypeStore((s) => s.getAssetById);
  const setSlot = usePrototypeStore((s) => s.setPlannerSlot);
  const clearSlot = usePrototypeStore((s) => s.clearPlannerSlot);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [dragging, setDragging] = useState(false);
  const [overKey, setOverKey] = useState<string | null>(null);

  // Helpers
  const getSlotId = (dayIndex: number) =>
    planner.find((s) => s.dayIndex === dayIndex && s.slotIndex === 0)?.tileId;

  const findSlotByTileId = (tileId: string) => {
    const hit = planner.find((s) => s.slotIndex === 0 && s.tileId === tileId);
    return hit ? { dayIndex: hit.dayIndex, slotIndex: hit.slotIndex } : null;
  };

  const setSlotSafe = (dayIndex: number, tileId: string) => {
    // IMPORTANT: не передаємо payload.from у store — робимо move/swap тут,
    // щоб нічого не “зникало” при заміні.
    setSlot(dayIndex, 0, tileId);
  };

  const clearSlotSafe = (dayIndex: number) => clearSlot(dayIndex, 0);

  // Slot A = week plan (Mon..Sun)
  const weekA = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayIndex) => getSlotId(dayIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planner]);

  // Next slots (persisted if user drops there)
  const nextAStored = useMemo(() => getSlotId(7), [planner]);
  const nextBStored = useMemo(() => getSlotId(8), [planner]);

  const usedAll = useMemo(() => {
    const all = [...weekA, nextAStored, nextBStored].filter(Boolean) as string[];
    return new Set(all);
  }, [weekA, nextAStored, nextBStored]);

  // Fallback suggestions (2 tiles): from selected or ready pool, 4:5-only, excluding usedAll
  const fallbackNext = useMemo(() => {
    const seed = selectedAssetIds.length
      ? selectedAssetIds
      : assets.filter((a) => a.status === "ready").map((a) => a.id);

    const candidates = unique([
      ...seed,
      ...assets.filter((a) => a.status === "ready").map((a) => a.id),
    ])
      .map((id) => getAssetById(id))
      .filter((a): a is NonNullable<ReturnType<typeof getAssetById>> => Boolean(a))
      .filter((a) => a.status === "ready" && a.ratio === "4:5")
      .filter((a) => !usedAll.has(a.id))
      .map((a) => a.id);

    return candidates.slice(0, 2);
  }, [assets, selectedAssetIds, getAssetById, usedAll]);

  // Next tiles: stored if user dropped there; otherwise show fallback but keep it draggable (no from)
  const nextA = nextAStored ?? fallbackNext[0];
  const nextB = nextBStored ?? fallbackNext[1];

  const filledWeekCount = weekA.filter(Boolean).length;
  const hasAnyPlan = filledWeekCount > 0 || Boolean(nextAStored) || Boolean(nextBStored);

  const handleDrop = (targetDayIndex: number, payload: DragPayload) => {
    const draggedId = payload.assetId;
    if (!draggedId) return;

    const isNextTarget = targetDayIndex >= 7;

    // Якщо кидаємо в той самий слот — нічого
    if (payload.from && payload.from.dayIndex === targetDayIndex) return;

   // Week -> Next: SWAP (so week never becomes empty and no duplicates)
if (payload.from && isNextTarget && payload.from.dayIndex < 7) {
  const fromDay = payload.from.dayIndex;

  // IMPORTANT: for Next we must use the *displayed* tile (stored OR fallback),
  // otherwise Next looks "empty" in store and causes wrong move logic.
  const targetDisplayed =
    targetDayIndex === 7 ? nextA :
    targetDayIndex === 8 ? nextB :
    getSlotId(targetDayIndex);

  // Put dragged into Next (persist it)
  setSlotSafe(targetDayIndex, draggedId);

  // Fill the source day (swap) to avoid empty week slot
  if (targetDisplayed && targetDisplayed !== draggedId) {
    setSlotSafe(fromDay, targetDisplayed);
  } else {
    // If there was no fallback (rare) — then we have to clear
    clearSlotSafe(fromDay);
  }

  return;
}

    const targetExisting = getSlotId(targetDayIndex);

    // Якщо drag з існуючого слота (week або stored next) — робимо swap/move
    if (payload.from) {
      const fromDay = payload.from.dayIndex;

      // Якщо таргет зайнятий → SWAP
      if (targetExisting) {
        setSlotSafe(targetDayIndex, draggedId);
        setSlotSafe(fromDay, targetExisting);
        return;
      }

      // Якщо таргет пустий → MOVE (очистити source)
      setSlotSafe(targetDayIndex, draggedId);
      clearSlotSafe(fromDay);
      return;
    }

    // Якщо drag без from (із “pool/suggestion”, або fallback next) —
    // робимо REPLACE + enforce unique (зняти цей tile з іншого слота, якщо був)
    const existingElsewhere = findSlotByTileId(draggedId);
    if (existingElsewhere && existingElsewhere.dayIndex !== targetDayIndex) {
      clearSlotSafe(existingElsewhere.dayIndex);
    }

    setSlotSafe(targetDayIndex, draggedId);
  };

  const renderTileMedia = (tileId?: string) => {
    const a = tileId ? getAssetById(tileId) : undefined;

    if (!a) {
      return (
        <div className="aspect-[4/5] w-full rounded-2xl bg-[color:var(--co-surface)] border border-[color:var(--co-border)]" />
      );
    }

    return (
      <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[color:var(--co-surface)] border border-[color:var(--co-border)]">
        <img
          src={a.thumbUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  };

  const dropBase = (opts: { key: string; dayIndex: number }) => {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragging) {
          e.dataTransfer.dropEffect = "move";
          setOverKey(opts.key);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const payload = getDragData(e);
        if (!payload?.assetId) return;
        handleDrop(opts.dayIndex, payload);
        setOverKey(null);
      },
      onDragLeave: () => {
        if (overKey === opts.key) setOverKey(null);
      },
    } as const;
  };

  const TileFrame = (props: {
    dayIndex: number;
    label: string;
    tileId?: string;
    isNext?: boolean;
    stored?: boolean;
  }) => {
    const { dayIndex, label, tileId, isNext, stored } = props;
    const key = `${isNext ? "n" : "w"}-${dayIndex}-a`;
    const isOver = dragging && overKey === key;
    const a = tileId ? getAssetById(tileId) : undefined;

    return (
      <div
        {...dropBase({ key, dayIndex })}
        className={[
          "group relative rounded-3xl border bg-[color:var(--co-surface-2)] p-3 transition",
          "border-[color:var(--co-border)]",
          "hover:opacity-[0.97]",
          isOver ? "ring-2 ring-[color:var(--co-text)]/10" : "",
        ].join(" ")}
      >
        <div className="relative">
          {a ? (
            <div
              draggable
              onDragStart={(e) => {
                setDragging(true);
                setDragData(e, {
                  assetId: a.id,
                  // from лише якщо це реально збережений слот (тиждень або next stored)
                  ...(stored ? { from: { dayIndex, slotIndex: 0 } } : {}),
                });
              }}
              onDragEnd={() => {
                setDragging(false);
                setOverKey(null);
              }}
            >
              {renderTileMedia(a.id)}
            </div>
          ) : (
            <div>{renderTileMedia(undefined)}</div>
          )}

          {/* Label overlay */}
          <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]/80 px-2 py-1 text-[11px] text-[color:var(--co-muted)] backdrop-blur">
            <span className="text-[color:var(--co-text)]/80">{label}</span>
            <span className="mx-1 text-[color:var(--co-muted)]/60">·</span>
            <span className="text-[color:var(--co-muted)]/80">4:5</span>
          </div>

          {/* Clear overlay (тільки якщо це stored слот і там щось є) */}
          {stored && a ? (
            <button
              onClick={() => clearSlotSafe(dayIndex)}
              className={[
                "absolute right-2 top-2 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]/85 px-2 py-1 text-[11px] text-[color:var(--co-muted)] opacity-0 transition group-hover:opacity-100 hover:opacity-90",
                pressable,
              ].join(" ")}
              aria-label="Clear"
              title="Clear"
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    );
  };


  // Flow guard: Planner expects sequence → planner handoff (or at least a best mix)
  if (!mixes.length) {
    return (
      <FlowEmptyState
        title="No mixes yet"
        desc="Generate Smart Mix candidates first, then send a sequence to Planner."
        primaryLabel="Go to Library"
        primaryTo="/prototype/library"
        secondaryLabel="Go to Smart Mix"
        secondaryTo="/prototype/smart-mix"
      />
    );
  }

  if (!bestMixId) {
    return (
      <FlowEmptyState
        title="Pick a best grid first"
        desc="Choose the strongest Smart Mix candidate, then send it to Planner."
        primaryLabel="Go to Smart Mix"
        primaryTo="/prototype/smart-mix"
        secondaryLabel="Back to Library"
        secondaryTo="/prototype/library"
      />
    );
  }

  if (!hasAnyPlan) {
    return (
      <FlowEmptyState
        title="No plan yet"
        desc="Send your week sequence to Planner to auto-fill the grid."
        primaryLabel="Go to Sequence"
        primaryTo="/prototype/sequence"
        secondaryLabel="Back to Smart Mix"
        secondaryTo="/prototype/smart-mix"
      />
    );
  }

  return (
    <div className="space-y-4 text-[color:var(--co-text)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base text-[color:var(--co-text)]">Planner</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Profile preview. Drag to reorder the week.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/prototype/sequence")}
            className={[
              "rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Back to Sequence
          </button>

          <button
            type="button"
            onClick={() => navigate("/prototype/captions")}
            className={[
              "rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Continue
          </button>
        </div>
      </div>

      {/* 3×3 grid: 7 week slots + 2 Next slots (droppable) */}
      <div className="mx-auto w-full max-w-[680px]">
        <div className="grid grid-cols-3 gap-[12px]">
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div key={dayIndex}>
              <TileFrame
                dayIndex={dayIndex}
                label={dayNames[dayIndex]}
                tileId={weekA[dayIndex]}
                stored={Boolean(weekA[dayIndex])}
              />
            </div>
          ))}

          <TileFrame
            dayIndex={7}
            label="Next"
            tileId={nextA}
            isNext
            stored={Boolean(nextAStored)} // stored only if user dropped there
          />
          <TileFrame
            dayIndex={8}
            label="Next"
            tileId={nextB}
            isNext
            stored={Boolean(nextBStored)}
          />
        </div>
      </div>
    </div>
  );
}