// src/pages/prototype/Planner.tsx
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
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
  const buildSequenceFromBest = usePrototypeStore((s) => s.buildSequenceFromBest);
  const sendSequenceToPlanner = usePrototypeStore((s) => s.sendSequenceToPlanner);
  const setSlot = usePrototypeStore((s) => s.setPlannerSlot);
  const clearSlot = usePrototypeStore((s) => s.clearPlannerSlot);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const phoneDragRef = useRef({
    pointerId: -1,
    startY: 0,
    scrollTop: 0,
    dragging: false,
  });

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

  useEffect(() => {
    if (mixes.length && bestMixId && !hasAnyPlan) {
      buildSequenceFromBest();
      sendSequenceToPlanner();
    }
  }, [bestMixId, buildSequenceFromBest, hasAnyPlan, mixes.length, sendSequenceToPlanner]);

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
            </div>
            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
              Synced
            </div>
          </div>

          <div className="co-iphone-shell co-planner-phone-shell" aria-label="Planner mobile preview">
            <div className="co-iphone-island" aria-hidden="true" />
            <div className="co-iphone-screen">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
                <div className="min-w-0 truncate text-[13px] font-medium text-white/92">creatorops</div>
                <div className="flex items-center gap-3 text-white/70">
                  <span className="text-xs">+</span>
                  <span className="text-xs">|||</span>
                </div>
              </div>

              <div
                className="co-planner-phone-body co-scrollbar"
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
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
