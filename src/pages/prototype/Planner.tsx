// src/pages/prototype/Planner.tsx
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePrototypeStore } from "../../store/prototypeStore";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import type { Asset } from "../../data/mockAssets";
import { buildPackSlots, splitSlotsByWeek } from "../../modules/prototype/packPlanning";

type DragPayload = {
  assetId: string;
  from?: { dayIndex: number; slotIndex: number };
};

type PhonePreviewMode = "instagram" | "tiktok";
type ExtendedPlannerTab = "week-1" | "week-2" | "all";
const EXTENDED_PLANNER_DRAG_MIME = "application/x-creatorops-extended-index";

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

function formatPostNumber(value: number) {
  return String(value).padStart(2, "0");
}

function ExtendedPostTile({
  asset,
  postNumber,
  dayLabel,
  compact = false,
  dragIndex,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  asset: Asset;
  postNumber: number;
  dayLabel?: string;
  compact?: boolean;
  dragIndex?: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd?: () => void;
}) {
  const canDrag = typeof dragIndex === "number";

  return (
    <div
      className={[
        "co-extended-planner-tile",
        compact ? "co-extended-planner-tile--compact" : "",
        canDrag ? "co-extended-planner-tile--draggable" : "",
        isDragging ? "co-extended-planner-tile--dragging" : "",
        isDropTarget ? "co-extended-planner-tile--drop-target" : "",
      ].join(" ")}
      draggable={canDrag}
      onDragStart={canDrag ? (event) => onDragStart?.(event, dragIndex) : undefined}
      onDragOver={canDrag ? (event) => onDragOver?.(event, dragIndex) : undefined}
      onDragLeave={canDrag ? (event) => onDragLeave?.(event, dragIndex) : undefined}
      onDrop={canDrag ? (event) => onDrop?.(event, dragIndex) : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
    >
      <img src={asset.thumbUrl} alt="" draggable={false} loading="lazy" decoding="async" />
      <span className="co-extended-planner-post-badge">{formatPostNumber(postNumber)}</span>
      {dayLabel ? (
        <span className="co-extended-planner-day-label">
          {dayLabel} - {formatPostNumber(postNumber)}
        </span>
      ) : null}
    </div>
  );
}

function ExtendedWeekBoard({
  title,
  range,
  items,
  startNumber,
  dragIndex,
  overIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  title: string;
  range: string;
  items: Asset[];
  startNumber: number;
  dragIndex: number | null;
  overIndex: number | null;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}) {
  const slots = buildPackSlots("extended-pack").slice(startNumber - 1, startNumber - 1 + 9);

  return (
    <section className="co-extended-planner-board co-extended-planner-board--week">
      <div className="co-extended-planner-board-header">
        <div>
          <div className="co-extended-planner-board-title">{title}</div>
          <div className="co-extended-planner-board-range">{range}</div>
        </div>
        <span>{items.length} posts ready</span>
      </div>

      <div className="co-extended-planner-week-grid">
        {items.map((asset, index) => {
          const slot = slots[index];
          const postNumber = startNumber + index;
          const sequenceIndex = startNumber - 1 + index;

          return (
            <ExtendedPostTile
              key={`${title}-${asset.id}-${postNumber}`}
              asset={asset}
              postNumber={postNumber}
              dayLabel={slot?.dayLabel}
              dragIndex={sequenceIndex}
              isDragging={dragIndex === sequenceIndex}
              isDropTarget={overIndex === sequenceIndex && dragIndex !== sequenceIndex}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          );
        })}
      </div>
    </section>
  );
}

function ExtendedAllBoard({
  items,
  dragIndex,
  overIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  items: Asset[];
  dragIndex: number | null;
  overIndex: number | null;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}) {
  return (
    <section className="co-extended-planner-board co-extended-planner-board--all">
      <div className="co-extended-planner-board-header">
        <div>
          <div className="co-extended-planner-board-title">All 18 rhythm</div>
          <div className="co-extended-planner-board-range">Review the full feed before captions.</div>
        </div>
        <span>Posts 01-18</span>
      </div>

      <div className="co-extended-planner-board-scroll co-scrollbar">
        <div className="co-extended-planner-all-grid">
          {items.map((asset, index) => (
            <div key={`all-${asset.id}-${index}`} className="contents">
              <ExtendedPostTile
                asset={asset}
                postNumber={index + 1}
                compact
                dragIndex={index}
                isDragging={dragIndex === index}
                isDropTarget={overIndex === index && dragIndex !== index}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Planner() {
  const navigate = useNavigate();
  const pressable = "transition active:translate-y-[1px] active:scale-[0.98]";

  const assets = usePrototypeStore((s) => s.assets);
  const selectedAssetIds = usePrototypeStore((s) => s.selectedAssetIds);
  const selectedExtendedAssetIds = usePrototypeStore((s) => s.selectedExtendedAssetIds);
  const selectedExtendedCandidateId = usePrototypeStore((s) => s.selectedExtendedCandidateId);
  const packMode = usePrototypeStore((s) => s.packMode);
  const planner = usePrototypeStore((s) => s.planner);
  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);
  const getAssetById = usePrototypeStore((s) => s.getAssetById);
  const buildSequenceFromBest = usePrototypeStore((s) => s.buildSequenceFromBest);
  const sendSequenceToPlanner = usePrototypeStore((s) => s.sendSequenceToPlanner);
  const setSelectedExtendedRhythm = usePrototypeStore((s) => s.setSelectedExtendedRhythm);
  const setSlot = usePrototypeStore((s) => s.setPlannerSlot);
  const clearSlot = usePrototypeStore((s) => s.clearPlannerSlot);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isExtendedPack = packMode === "extended-pack";
  const phoneDragRef = useRef({
    pointerId: -1,
    startY: 0,
    scrollTop: 0,
    dragging: false,
  });

  const [dragging, setDragging] = useState(false);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [phonePreviewMode, setPhonePreviewMode] = useState<PhonePreviewMode>("instagram");
  const [extendedTab, setExtendedTab] = useState<ExtendedPlannerTab>("week-1");
  const [extendedDragIndex, setExtendedDragIndex] = useState<number | null>(null);
  const [extendedOverIndex, setExtendedOverIndex] = useState<number | null>(null);

  const extendedPlannerItems = useMemo(() => {
    const selectedExtendedItems = selectedExtendedAssetIds
      .map((id) => getAssetById(id))
      .filter((asset): asset is Asset => Boolean(asset))
      .slice(0, 18);

    const fallbackItems = selectedAssetIds
      .map((id) => getAssetById(id))
      .filter((asset): asset is Asset => Boolean(asset))
      .slice(0, 18);

    return selectedExtendedItems.length === 18 ? selectedExtendedItems : fallbackItems;
  }, [getAssetById, selectedAssetIds, selectedExtendedAssetIds]);

  const extendedPlannerReady = extendedPlannerItems.length === 18;
  const { week1: extendedWeek1, week2: extendedWeek2 } = useMemo(
    () => splitSlotsByWeek(extendedPlannerItems),
    [extendedPlannerItems]
  );

  const clearExtendedDragState = () => {
    setExtendedDragIndex(null);
    setExtendedOverIndex(null);
  };

  const swapExtendedItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= extendedPlannerItems.length ||
      toIndex >= extendedPlannerItems.length
    ) {
      return;
    }

    const nextIds = extendedPlannerItems.map((asset) => asset.id);
    [nextIds[fromIndex], nextIds[toIndex]] = [nextIds[toIndex], nextIds[fromIndex]];
    setSelectedExtendedRhythm(selectedExtendedCandidateId ?? "planner-extended", nextIds);
  };

  const onExtendedTileDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    setExtendedDragIndex(index);
    setExtendedOverIndex(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(EXTENDED_PLANNER_DRAG_MIME, String(index));
    event.dataTransfer.setData("text/plain", String(index));
  };

  const onExtendedTileDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setExtendedOverIndex(index);
  };

  const onExtendedTileDragLeave = (_event: React.DragEvent<HTMLDivElement>, index: number) => {
    setExtendedOverIndex((current) => (current === index ? null : current));
  };

  const onExtendedTileDrop = (event: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    event.preventDefault();
    const raw =
      event.dataTransfer.getData(EXTENDED_PLANNER_DRAG_MIME) ||
      event.dataTransfer.getData("text/plain");
    const parsedIndex = Number.parseInt(raw, 10);
    const fromIndex = Number.isInteger(parsedIndex) ? parsedIndex : extendedDragIndex;

    if (typeof fromIndex === "number") {
      swapExtendedItems(fromIndex, toIndex);
    }

    clearExtendedDragState();
  };

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
  const nextAStored = useMemo(
    () => planner.find((slot) => slot.dayIndex === 7 && slot.slotIndex === 0)?.tileId,
    [planner]
  );
  const nextBStored = useMemo(
    () => planner.find((slot) => slot.dayIndex === 8 && slot.slotIndex === 0)?.tileId,
    [planner]
  );

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
  const plannerPreviewSlots = [
    ...Array.from({ length: 7 }, (_, dayIndex) => ({
      key: `week-${dayIndex}`,
      label: dayNames[dayIndex],
      tileId: weekA[dayIndex],
    })),
    { key: "next-a", label: "Next", tileId: nextA },
    { key: "next-b", label: "Next", tileId: nextB },
  ];
  const heroPreview = plannerPreviewSlots.find((slot) => Boolean(slot.tileId)) ?? plannerPreviewSlots[0];
  const previewAvatarUrl = heroPreview?.tileId ? getAssetById(heroPreview.tileId)?.thumbUrl : undefined;
  const highlightSlots = plannerPreviewSlots.filter((slot) => Boolean(slot.tileId)).slice(0, 4);
  const verticalPreviewSlots = plannerPreviewSlots.filter((slot) => Boolean(slot.tileId));
  const extendedPreviewSlots = extendedPlannerItems.map((asset, index) => ({
    key: `extended-${asset.id}-${index}`,
    label: formatPostNumber(index + 1),
    tileId: asset.id,
  }));
  const extendedPreviewAvatarUrl = extendedPlannerItems[0]?.thumbUrl;
  const extendedHighlightAssets = extendedPlannerItems.slice(0, 4);
  const extendedHighlightLabels = ["Week 1", "Mood", "Flow", "Week 2"];

  useEffect(() => {
    if (isExtendedPack) return;
    if (mixes.length && bestMixId && !hasAnyPlan) {
      buildSequenceFromBest();
      sendSequenceToPlanner();
    }
  }, [bestMixId, buildSequenceFromBest, hasAnyPlan, isExtendedPack, mixes.length, sendSequenceToPlanner]);

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
        <div className="aspect-[4/5] w-full bg-[color:var(--co-surface)]" />
      );
    }

    return (
      <div className="aspect-[4/5] w-full overflow-hidden bg-[color:var(--co-surface)]">
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
          "group relative overflow-hidden rounded-[1.05rem] border bg-[color:var(--co-surface)] transition",
          "border-[color:var(--co-border-soft)]",
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

  const PhoneGridTile = (props: { tileId?: string }) => {
    const asset = props.tileId ? getAssetById(props.tileId) : undefined;

    return (
      <div className="co-planner-phone-tile">
        {asset ? (
          <img
            src={asset.thumbUrl}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="co-planner-phone-empty" />
        )}
      </div>
    );
  };

  const TikTokProfileTile = (props: { tileId?: string; index: number }) => {
    const asset = props.tileId ? getAssetById(props.tileId) : undefined;
    const playCounts = ["8.2K", "12K", "6.4K", "9.8K", "7.1K", "10K", "5.6K", "11K", "4.9K"];

    return (
      <div className="co-planner-tiktok-profile-tile">
        {asset ? (
          <img
            className="co-planner-tiktok-profile-tile-media"
            src={asset.thumbUrl}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="co-planner-tiktok-profile-tile-empty" />
        )}
        <span className="co-planner-tiktok-profile-plays">
          <span aria-hidden="true" />
          {playCounts[props.index % playCounts.length]}
        </span>
      </div>
    );
  };

  const onPhonePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;

    phoneDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: event.currentTarget.scrollTop,
      dragging: true,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPhonePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = phoneDragRef.current;
    if (!drag.dragging || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollTop = drag.scrollTop + drag.startY - event.clientY;
  };

  const endPhoneDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = phoneDragRef.current;
    if (drag.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    phoneDragRef.current = {
      pointerId: -1,
      startY: 0,
      scrollTop: 0,
      dragging: false,
    };
  };

  if (isExtendedPack) {
    if (!extendedPlannerReady) {
      return (
        <FlowEmptyState
          title="Extended Planner needs 18 selected images."
          desc="Return to Library or Smart Mix to prepare Week 1 + Week 2."
          primaryLabel="Back to Library"
          primaryTo="/prototype/library"
          secondaryLabel="Back to Smart Mix"
          secondaryTo="/prototype/smart-mix"
        />
      );
    }

    const activeExtendedBoard =
      extendedTab === "week-1" ? (
        <ExtendedWeekBoard
          title="Week 1"
          range="Posts 01-09"
          items={extendedWeek1}
          startNumber={1}
          dragIndex={extendedDragIndex}
          overIndex={extendedOverIndex}
          onDragStart={onExtendedTileDragStart}
          onDragOver={onExtendedTileDragOver}
          onDragLeave={onExtendedTileDragLeave}
          onDrop={onExtendedTileDrop}
          onDragEnd={clearExtendedDragState}
        />
      ) : extendedTab === "week-2" ? (
        <ExtendedWeekBoard
          title="Week 2"
          range="Posts 10-18"
          items={extendedWeek2}
          startNumber={10}
          dragIndex={extendedDragIndex}
          overIndex={extendedOverIndex}
          onDragStart={onExtendedTileDragStart}
          onDragOver={onExtendedTileDragOver}
          onDragLeave={onExtendedTileDragLeave}
          onDrop={onExtendedTileDrop}
          onDragEnd={clearExtendedDragState}
        />
      ) : (
        <ExtendedAllBoard
          items={extendedPlannerItems}
          dragIndex={extendedDragIndex}
          overIndex={extendedOverIndex}
          onDragStart={onExtendedTileDragStart}
          onDragOver={onExtendedTileDragOver}
          onDragLeave={onExtendedTileDragLeave}
          onDrop={onExtendedTileDrop}
          onDragEnd={clearExtendedDragState}
        />
      );

    return (
      <div className="co-workspace-page co-scene co-board-stage co-extended-planner-stage">
        <div className="co-scene-header co-extended-planner-header">
          <div className="min-w-0">
            <div className="co-extended-planner-title-row">
              <div className="text-base text-[color:var(--co-text)]">Planner</div>
              <span className="co-extended-planner-pro-badge">Pro preview</span>
            </div>
            <div className="mt-1 text-sm text-[color:var(--co-muted)]">
              Shape Week 1 + Week 2 before captions.
            </div>
          </div>

          <div className="co-extended-planner-actions">
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
              onClick={() => navigate("/prototype/captions")}
              className={[
                "rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                pressable,
              ].join(" ")}
            >
              Open Extended Captions
            </button>
          </div>
        </div>

        <div className="co-extended-planner-tabs" role="tablist" aria-label="Extended Planner views">
          {[
            { id: "week-1" as const, label: "Week 1" },
            { id: "week-2" as const, label: "Week 2" },
            { id: "all" as const, label: "All 18" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={extendedTab === tab.id}
              onClick={() => setExtendedTab(tab.id)}
              className={extendedTab === tab.id ? "is-active" : ""}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={[
            "co-extended-planner-layout",
            extendedTab === "all" ? "co-extended-planner-layout--all" : "co-extended-planner-layout--week",
          ].join(" ")}
        >
          <div className="co-extended-planner-main">{activeExtendedBoard}</div>

          <aside className="co-planner-preview-panel co-stage-card co-extended-planner-phone-panel">
            <div className="co-planner-preview-heading">
              <div>
                <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Feed Preview</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Extended rhythm</div>
                <div className="co-planner-preview-mode-toggle" role="group" aria-label="Extended phone preview mode">
                  <button
                    type="button"
                    className={phonePreviewMode === "instagram" ? "is-active" : ""}
                    onClick={() => setPhonePreviewMode("instagram")}
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    className={phonePreviewMode === "tiktok" ? "is-active" : ""}
                    onClick={() => setPhonePreviewMode("tiktok")}
                  >
                    TikTok
                  </button>
                </div>
              </div>
              <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                Synced
              </div>
            </div>

            <div
              className="co-iphone-shell co-planner-phone-shell co-extended-planner-phone-shell"
              aria-label="Extended Planner mobile preview"
            >
              <div className="co-iphone-island" aria-hidden="true" />
              <div className="co-iphone-screen">
                {phonePreviewMode === "instagram" ? (
                  <>
                    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
                      <div className="min-w-0 truncate text-[13px] font-medium text-white/92">creatorops</div>
                      <div className="flex items-center gap-3 text-white/70">
                        <span className="text-xs">+</span>
                        <span className="text-xs">|||</span>
                      </div>
                    </div>

                    <div
                      className="co-planner-phone-body"
                      onPointerDown={onPhonePointerDown}
                      onPointerMove={onPhonePointerMove}
                      onPointerUp={endPhoneDrag}
                      onPointerCancel={endPhoneDrag}
                      onPointerLeave={endPhoneDrag}
                    >
                      <div className="co-planner-phone-profile">
                        <div className="co-planner-phone-account">
                          <div className="co-planner-phone-avatar">
                            {extendedPreviewAvatarUrl ? (
                              <img
                                src={extendedPreviewAvatarUrl}
                                alt=""
                                draggable={false}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null}
                          </div>
                          <div className="co-planner-phone-stats" aria-label="Extended feed stats">
                            <div>
                              <strong>18</strong>
                              <span>posts</span>
                            </div>
                            <div>
                              <strong>12.4K</strong>
                              <span>followers</span>
                            </div>
                            <div>
                              <strong>321</strong>
                              <span>following</span>
                            </div>
                          </div>
                        </div>

                        <div className="co-planner-phone-actions">
                          <button type="button">Follow</button>
                          <button type="button">Message</button>
                        </div>

                        <div className="co-planner-phone-bio">
                          <strong>CreatorOps</strong>
                          <span>Calm weekly content systems.</span>
                          <span>Week 1 + Week 2 ready for captions.</span>
                          <a href="#planner-preview" onClick={(event) => event.preventDefault()}>
                            creatorops.studio/extended-pack
                          </a>
                        </div>

                        <div className="co-planner-phone-highlights" aria-label="Extended profile highlights">
                          {extendedHighlightAssets.map((asset, index) => (
                            <div key={`extended-highlight-${asset.id}-${index}`} className="co-planner-phone-highlight">
                              <div className="co-planner-phone-highlight-thumb">
                                <img src={asset.thumbUrl} alt="" draggable={false} loading="lazy" decoding="async" />
                              </div>
                              <span>{extendedHighlightLabels[index] ?? "Post"}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="co-planner-phone-tabs">
                        <span>Posts</span>
                        <span>Reels</span>
                        <span>Tagged</span>
                      </div>

                      <div className="co-planner-phone-grid">
                        {extendedPreviewSlots.map((slot) => (
                          <PhoneGridTile key={slot.key} tileId={slot.tileId} />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="co-planner-tiktok-body">
                    <div
                      className="co-planner-tiktok-scroll"
                      onPointerDown={onPhonePointerDown}
                      onPointerMove={onPhonePointerMove}
                      onPointerUp={endPhoneDrag}
                      onPointerCancel={endPhoneDrag}
                      onPointerLeave={endPhoneDrag}
                    >
                      <div className="co-planner-tiktok-appbar" aria-label="TikTok profile controls">
                        <span className="co-planner-tiktok-icon co-planner-tiktok-icon--person" aria-hidden="true" />
                        <div className="co-planner-tiktok-appbar-actions">
                          <span className="co-planner-tiktok-icon co-planner-tiktok-icon--steps" aria-hidden="true" />
                          <span className="co-planner-tiktok-icon co-planner-tiktok-icon--share" aria-hidden="true" />
                          <span className="co-planner-tiktok-icon co-planner-tiktok-icon--menu" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="co-planner-tiktok-profile">
                        <div className="co-planner-tiktok-profile-avatar">
                          {extendedPreviewAvatarUrl ? (
                            <img
                              src={extendedPreviewAvatarUrl}
                              alt=""
                              draggable={false}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : null}
                          <span aria-hidden="true">+</span>
                        </div>
                        <div className="co-planner-tiktok-name-row">
                          <strong>CreatorOps</strong>
                          <span>1</span>
                          <button type="button" aria-label="Edit profile preview" />
                        </div>
                        <div className="co-planner-tiktok-handle">@creatorops</div>
                        <div className="co-planner-tiktok-profile-stats" aria-label="TikTok profile stats">
                          <div>
                            <b>321</b>
                            <span>Following</span>
                          </div>
                          <div>
                            <b>12.4K</b>
                            <span>Followers</span>
                          </div>
                          <div>
                            <b>84K</b>
                            <span>Likes</span>
                          </div>
                        </div>
                        <p>Calm weekly content systems. Extended Pack rhythm ready for captions.</p>
                        <div className="co-planner-tiktok-studio">
                          <span aria-hidden="true" />
                          TikTok Studio
                        </div>
                        <a href="#planner-preview" onClick={(event) => event.preventDefault()}>
                          creatorops.studio/extended-pack
                        </a>
                      </div>

                      <div className="co-planner-tiktok-profile-tabs">
                        <span className="is-active" aria-label="Videos" />
                        <span aria-label="Shop" />
                        <span aria-label="Private" />
                        <span aria-label="Saved" />
                        <span aria-label="Liked" />
                      </div>

                      <div className="co-planner-tiktok-profile-grid">
                        {extendedPreviewSlots.map((slot, index) => (
                          <TikTokProfileTile key={slot.key} tileId={slot.tileId} index={index} />
                        ))}
                      </div>
                    </div>

                    <div className="co-planner-tiktok-bottom-nav" aria-label="TikTok bottom navigation preview">
                      <span>Home</span>
                      <span>Friends</span>
                      <strong>+</strong>
                      <span>Inbox</span>
                      <span className="is-active">Profile</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }


  // Flow guard: Planner expects a selected Smart Mix and can prepare its own board.
  if (!mixes.length) {
    return (
      <FlowEmptyState
        title="No mixes yet"
        desc="Generate Smart Mix candidates first, then shape the publishing board."
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
        desc="Choose the strongest Smart Mix candidate, then shape the weekly rhythm."
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
        title="Preparing board"
        desc="Planner is shaping the selected Smart Mix into a weekly publishing rhythm."
        primaryLabel="Back to Smart Mix"
        primaryTo="/prototype/smart-mix"
        secondaryLabel="Back to Smart Mix"
        secondaryTo="/prototype/smart-mix"
      />
    );
  }

  return (
    <div className="co-workspace-page co-scene co-board-stage">
      {/* Header */}
      <div className="co-scene-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base text-[color:var(--co-text)]">Planner</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Publishing board for shaping the weekly rhythm before captions.
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/prototype/smart-mix")}
            className={[
              "flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Back to Smart Mix
          </button>

          <button
            type="button"
            onClick={() => navigate("/prototype/captions")}
            className={[
              "flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Continue to Captions
          </button>
        </div>
      </div>

      {/* 3×3 grid: 7 week slots + 2 Next slots (droppable) */}
      <div className="co-planner-workbench">
        <div className="co-workspace-board co-workspace-board--planner">
          <div className="co-publishing-board co-planner-board">
            <div className="flex items-center justify-between gap-3 pb-2">
              <div>
                <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Publishing board</div>
                <div className="mt-1 text-xs text-[color:var(--co-muted)]">This order drives Captions and Export.</div>
              </div>
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] tabular-nums text-[color:var(--co-muted)]">
                9 slots
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
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

        <aside className="co-planner-preview-panel co-stage-card">
          <div className="co-planner-preview-heading">
            <div>
              <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Feed Preview</div>
              <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Week Pack rhythm</div>
              <div className="co-planner-preview-mode-toggle" role="group" aria-label="Phone preview mode">
                <button
                  type="button"
                  className={phonePreviewMode === "instagram" ? "is-active" : ""}
                  onClick={() => setPhonePreviewMode("instagram")}
                >
                  Instagram
                </button>
                <button
                  type="button"
                  className={phonePreviewMode === "tiktok" ? "is-active" : ""}
                  onClick={() => setPhonePreviewMode("tiktok")}
                >
                  TikTok
                </button>
              </div>
            </div>
            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
              Synced
            </div>
          </div>

          <div className="co-iphone-shell co-planner-phone-shell" aria-label="Planner mobile preview">
            <div className="co-iphone-island" aria-hidden="true" />
            <div className="co-iphone-screen">
              {phonePreviewMode === "instagram" ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
                    <div className="min-w-0 truncate text-[13px] font-medium text-white/92">creatorops</div>
                    <div className="flex items-center gap-3 text-white/70">
                      <span className="text-xs">+</span>
                      <span className="text-xs">|||</span>
                    </div>
                  </div>

                  <div
                    className="co-planner-phone-body"
                    onPointerDown={onPhonePointerDown}
                    onPointerMove={onPhonePointerMove}
                    onPointerUp={endPhoneDrag}
                    onPointerCancel={endPhoneDrag}
                    onPointerLeave={endPhoneDrag}
                  >
                    <div className="co-planner-phone-profile">
                      <div className="co-planner-phone-account">
                        <div className="co-planner-phone-avatar">
                          {previewAvatarUrl ? (
                            <img src={previewAvatarUrl} alt="" draggable={false} loading="lazy" decoding="async" />
                          ) : null}
                        </div>
                        <div className="co-planner-phone-stats" aria-label="Feed stats">
                          <div>
                            <strong>9</strong>
                            <span>posts</span>
                          </div>
                          <div>
                            <strong>12.4K</strong>
                            <span>followers</span>
                          </div>
                          <div>
                            <strong>321</strong>
                            <span>following</span>
                          </div>
                        </div>
                      </div>

                      <div className="co-planner-phone-actions">
                        <button type="button">Follow</button>
                        <button type="button">Message</button>
                      </div>

                      <div className="co-planner-phone-bio">
                        <strong>CreatorOps</strong>
                        <span>Calm weekly content systems.</span>
                        <span>Week Pack ready for captions.</span>
                        <a href="#planner-preview" onClick={(event) => event.preventDefault()}>
                          creatorops.studio/week-pack
                        </a>
                      </div>

                      <div className="co-planner-phone-highlights" aria-label="Profile highlights">
                        {highlightSlots.map((slot, index) => {
                          const asset = slot.tileId ? getAssetById(slot.tileId) : undefined;
                          const labels = ["Rhythm", "Offer", "Mood", "CTA"];

                          return (
                            <div key={slot.key} className="co-planner-phone-highlight">
                              <div className="co-planner-phone-highlight-thumb">
                                {asset ? (
                                  <img src={asset.thumbUrl} alt="" draggable={false} loading="lazy" decoding="async" />
                                ) : null}
                              </div>
                              <span>{labels[index] ?? slot.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="co-planner-phone-tabs">
                      <span>Posts</span>
                      <span>Reels</span>
                      <span>Tagged</span>
                    </div>

                    <div className="co-planner-phone-grid">
                      {plannerPreviewSlots.map((slot) => (
                        <PhoneGridTile
                          key={slot.key}
                          tileId={slot.tileId}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="co-planner-tiktok-body">
                  <div
                    className="co-planner-tiktok-scroll"
                    onPointerDown={onPhonePointerDown}
                    onPointerMove={onPhonePointerMove}
                    onPointerUp={endPhoneDrag}
                    onPointerCancel={endPhoneDrag}
                    onPointerLeave={endPhoneDrag}
                  >
                    <div className="co-planner-tiktok-appbar" aria-label="TikTok profile controls">
                      <span className="co-planner-tiktok-icon co-planner-tiktok-icon--person" aria-hidden="true" />
                      <div className="co-planner-tiktok-appbar-actions">
                        <span className="co-planner-tiktok-icon co-planner-tiktok-icon--steps" aria-hidden="true" />
                        <span className="co-planner-tiktok-icon co-planner-tiktok-icon--share" aria-hidden="true" />
                        <span className="co-planner-tiktok-icon co-planner-tiktok-icon--menu" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="co-planner-tiktok-profile">
                      <div className="co-planner-tiktok-profile-avatar">
                        {previewAvatarUrl ? (
                          <img src={previewAvatarUrl} alt="" draggable={false} loading="lazy" decoding="async" />
                        ) : null}
                        <span aria-hidden="true">+</span>
                      </div>
                      <div className="co-planner-tiktok-name-row">
                        <strong>CreatorOps</strong>
                        <span>1</span>
                        <button type="button" aria-label="Edit profile preview" />
                      </div>
                      <div className="co-planner-tiktok-handle">@creatorops</div>
                      <div className="co-planner-tiktok-profile-stats" aria-label="TikTok profile stats">
                        <div>
                          <b>321</b>
                          <span>Following</span>
                        </div>
                        <div>
                          <b>12.4K</b>
                          <span>Followers</span>
                        </div>
                        <div>
                          <b>84K</b>
                          <span>Likes</span>
                        </div>
                      </div>
                      <p>Calm weekly content systems. Week Pack rhythm ready for captions.</p>
                      <div className="co-planner-tiktok-studio">
                        <span aria-hidden="true" />
                        TikTok Studio
                      </div>
                      <a href="#planner-preview" onClick={(event) => event.preventDefault()}>
                        creatorops.studio/week-pack
                      </a>
                    </div>

                    <div className="co-planner-tiktok-profile-tabs">
                      <span className="is-active" aria-label="Videos" />
                      <span aria-label="Shop" />
                      <span aria-label="Private" />
                      <span aria-label="Saved" />
                      <span aria-label="Liked" />
                    </div>

                    <div className="co-planner-tiktok-profile-grid">
                      {(verticalPreviewSlots.length ? verticalPreviewSlots : plannerPreviewSlots).map((slot, index) => (
                        <TikTokProfileTile
                          key={slot.key}
                          tileId={slot.tileId}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="co-planner-tiktok-bottom-nav" aria-label="TikTok bottom navigation preview">
                    <span>Home</span>
                    <span>Friends</span>
                    <strong>+</strong>
                    <span>Inbox</span>
                    <span className="is-active">Profile</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
