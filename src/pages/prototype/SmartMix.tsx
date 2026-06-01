// src/pages/prototype/SmartMix.tsx
import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import type { Asset } from "../../data/mockAssets";
import {
  PACK_MODE_META,
  isPackSelectionComplete,
} from "../../modules/prototype/packPlanning";
import { usePrototypeStore, type Mix } from "../../store/prototypeStore";

type SmartMixDragPayload = {
  assetId: string;
  from: { mixId: string; slotIndex: number };
};

const SMART_MIX_DND_TYPE = "application/x-creatorops-smartmix";

type ExtendedMixCandidate = {
  id: string;
  title: string;
  label: string;
  items: Asset[];
  score: number;
  weakSlotIndex?: number;
  status: "selected" | "alternative";
};

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

function fitTone(value?: number) {
  const score = scoreValue(value);

  if (score >= 80) return "strong";
  if (score >= 68) return "good";
  return "tune";
}

function postLabel(postNumber: number) {
  return String(postNumber).padStart(2, "0");
}

function extendedHashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeExtendedRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleExtended<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function uniqueAssets(items: Asset[]) {
  const seen = new Set<string>();
  return items.filter((asset) => {
    if (seen.has(asset.id)) return false;
    seen.add(asset.id);
    return true;
  });
}

function resolveExtendedReadyAssets(items: Asset[]) {
  const ready = uniqueAssets(items).filter((asset) => asset.status === "ready");
  const feedReady = ready.filter((asset) => asset.ratio === "4:5");
  return feedReady.length >= 18 ? feedReady : ready;
}

function assetIdSet(items: Asset[]) {
  return new Set(items.map((asset) => asset.id));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function hueDelta01(a: number, b: number) {
  const delta = Math.abs(a - b);
  return Math.min(delta, 1 - delta);
}

function assetDistance01(a: Asset, b: Asset) {
  if (a.analysis && b.analysis) {
    const brightness = Math.abs(a.analysis.brightness - b.analysis.brightness);
    const contrast = Math.abs(a.analysis.contrast - b.analysis.contrast);
    const hue = hueDelta01(a.analysis.hue, b.analysis.hue);
    const saturation = Math.abs(a.analysis.saturation - b.analysis.saturation);
    const busy = Math.abs(a.analysis.busy - b.analysis.busy);

    return clamp01(
      Math.sqrt(
        (brightness * brightness +
          contrast * contrast * 0.55 +
          hue * hue * 0.9 +
          saturation * saturation * 0.7 +
          busy * busy * 0.65) /
          3.8
      )
    );
  }

  let distance = 0.46;
  if (a.series === b.series) distance -= 0.22;
  if (a.source !== b.source) distance += 0.08;
  if (a.collection && b.collection && a.collection !== b.collection) distance += 0.06;
  if (a.mood && b.mood && a.mood !== b.mood) distance += 0.06;
  return clamp01(distance);
}

function scoreExtendedFlow(items: Asset[], selectedIds: Set<string>, reference?: Asset[]) {
  if (!items.length) return 0;

  let score = 70;
  const selectedCount = items.filter((asset) => selectedIds.has(asset.id)).length;
  const uploadCount = items.filter((asset) => asset.source === "upload").length;
  score += (selectedCount / items.length) * 9;
  score += Math.min(4, uploadCount * 0.3);

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]!;
    const current = items[i]!;
    const distance = assetDistance01(prev, current);

    if (prev.series === current.series) score -= 5.5;
    if (distance < 0.15) score -= 7;
    else score += Math.min(2.2, distance * 3.2);
  }

  for (let start = 0; start < items.length; start += 3) {
    const group = items.slice(start, start + 3);
    const seriesCount = new Map<string, number>();
    for (const asset of group) seriesCount.set(asset.series, (seriesCount.get(asset.series) ?? 0) + 1);
    const maxSeries = Math.max(...seriesCount.values());
    if (maxSeries >= 3) score -= 8;
    else if (maxSeries === 2) score -= 2.5;
  }

  if (reference?.length) {
    let samePosition = 0;
    const referenceIds = new Set(reference.map((asset) => asset.id));
    for (let i = 0; i < items.length; i++) {
      if (items[i]?.id === reference[i]?.id) samePosition++;
    }

    const overlap = items.filter((asset) => referenceIds.has(asset.id)).length;
    score += (items.length - samePosition) * 0.45;
    score += (items.length - overlap) * 0.3;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getExtendedNeighborIndexes(slotIndex: number) {
  const neighbors: number[] = [];
  const col = slotIndex % 3;
  const row = Math.floor(slotIndex / 3);

  if (col > 0) neighbors.push(slotIndex - 1);
  if (col < 2) neighbors.push(slotIndex + 1);
  if (row > 0) neighbors.push(slotIndex - 3);
  if (row < 5) neighbors.push(slotIndex + 3);

  return neighbors;
}

function findWeakExtendedSlot(items: Asset[], lockedSlots: Record<number, string>) {
  let weakSlot = -1;
  let weakScore = -Infinity;

  for (let index = 0; index < items.length; index++) {
    if (lockedSlots[index]) continue;

    const asset = items[index];
    if (!asset) continue;

    let localScore = 0;
    for (const neighborIndex of getExtendedNeighborIndexes(index)) {
      const neighbor = items[neighborIndex];
      if (!neighbor) continue;

      const distance = assetDistance01(asset, neighbor);
      if (asset.series === neighbor.series) localScore += 7;
      if (distance < 0.16) localScore += 9;
      else if (distance < 0.24) localScore += 4;
    }

    if (localScore > weakScore) {
      weakScore = localScore;
      weakSlot = index;
    }
  }

  return weakScore > 0 ? weakSlot : undefined;
}

function assetsFromIds(
  ids: string[],
  getAssetById: (id: string) => Asset | undefined,
  fallbackPool: Asset[]
) {
  const items = ids.map((id) => getAssetById(id)).filter((asset): asset is Asset => Boolean(asset));
  const pool = uniqueAssets([...items, ...fallbackPool]);
  const out = uniqueAssets(items);

  for (const asset of pool) {
    if (out.length >= 18) break;
    if (!out.some((item) => item.id === asset.id)) out.push(asset);
  }

  return out.slice(0, 18);
}

function applyExtendedLockedSlots(
  items: Asset[],
  lockedSlots: Record<number, string>,
  fallbackPool: Asset[]
) {
  const pool = uniqueAssets([...items, ...fallbackPool]);
  const byId = new Map(pool.map((asset) => [asset.id, asset] as const));
  const out: Array<Asset | undefined> = items.slice(0, 18);
  const used = new Set<string>();
  const lockedIds = new Set(Object.values(lockedSlots).filter(Boolean));

  while (out.length < 18) out.push(undefined);

  for (const [slot, id] of Object.entries(lockedSlots)) {
    const index = Number(slot);
    const asset = byId.get(id);
    if (Number.isInteger(index) && index >= 0 && index < 18 && asset) {
      out[index] = asset;
      used.add(asset.id);
    }
  }

  for (let index = 0; index < out.length; index++) {
    const asset = out[index];
    if (!asset) continue;
    if (lockedSlots[index] === asset.id) continue;

    if (lockedIds.has(asset.id) || used.has(asset.id)) out[index] = undefined;
    else used.add(asset.id);
  }

  const fill = pool.filter((asset) => !used.has(asset.id));
  let fillIndex = 0;

  for (let index = 0; index < out.length; index++) {
    if (lockedSlots[index]) continue;
    if (out[index]) continue;

    const next = fill[fillIndex++];
    if (next) {
      out[index] = next;
      used.add(next.id);
    }
  }

  return out.filter((asset): asset is Asset => Boolean(asset)).slice(0, 18);
}

function findExtendedReplacement(opts: {
  items: Asset[];
  slotIndex: number;
  lockedSlots: Record<number, string>;
  pool: Asset[];
  selectedIds: Set<string>;
}) {
  const current = opts.items[opts.slotIndex];
  const used = new Set(
    opts.items
      .filter((_, index) => index !== opts.slotIndex)
      .map((asset) => asset.id)
  );
  const lockedIds = new Set(Object.values(opts.lockedSlots).filter(Boolean));
  const candidates = resolveExtendedReadyAssets(opts.pool).filter(
    (asset) => asset.id !== current?.id && !used.has(asset.id) && !lockedIds.has(asset.id)
  );

  return candidates
    .map((asset) => {
      const next = opts.items.slice();
      next[opts.slotIndex] = asset;
      const score =
        scoreExtendedFlow(next, opts.selectedIds) +
        (opts.selectedIds.has(asset.id) ? 4 : 0) +
        (asset.source === "upload" ? 2 : 0);
      return { asset, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.asset;
}

function buildExtendedCandidateItems(opts: {
  selectedAssets: Asset[];
  availableAssets: Asset[];
  run: number;
  variant: number;
  attempt: number;
}) {
  const selected = resolveExtendedReadyAssets(opts.selectedAssets);
  const pool = uniqueAssets([...selected, ...resolveExtendedReadyAssets(opts.availableAssets)]);
  const unselected = pool.filter((asset) => !selected.some((selectedAsset) => selectedAsset.id === asset.id));
  const seed = extendedHashSeed(
    [
      "extended-feed",
      opts.run,
      opts.variant,
      opts.attempt,
      selected.map((asset) => asset.id).join(","),
      pool.map((asset) => asset.id).join(","),
    ].join("|")
  );
  const rng = makeExtendedRng(seed);

  const fillAllowance =
    unselected.length > 0
      ? Math.min(unselected.length, opts.run === 0 ? opts.variant : 2 + ((opts.run + opts.variant + opts.attempt) % 4))
      : 0;
  const selectedTake = Math.max(0, 18 - fillAllowance);
  const chosen = uniqueAssets([
    ...shuffleExtended(selected, rng).slice(0, selectedTake),
    ...shuffleExtended(unselected, rng).slice(0, fillAllowance),
  ]);

  for (const asset of shuffleExtended(pool, rng)) {
    if (chosen.length >= 18) break;
    if (!chosen.some((item) => item.id === asset.id)) chosen.push(asset);
  }

  const ordered = shuffleExtended(chosen.slice(0, 18), rng);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i - 1]?.series !== ordered[i]?.series) continue;
    const swapIndex = ordered.findIndex((asset, index) => index > i && asset.series !== ordered[i - 1]?.series);
    if (swapIndex > i) [ordered[i], ordered[swapIndex]] = [ordered[swapIndex]!, ordered[i]!];
  }

  return ordered;
}

function buildExtendedMixCandidates(opts: {
  selectedAssets: Asset[];
  availableAssets: Asset[];
  activeIndex: number;
  run: number;
}): ExtendedMixCandidate[] {
  const selectedIds = new Set(opts.selectedAssets.map((asset) => asset.id));
  const variants: Array<{ items: Asset[]; score: number }> = [];

  for (let variant = 0; variant < 2; variant++) {
    let bestItems: Asset[] = [];
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 34; attempt++) {
      const items = buildExtendedCandidateItems({
        selectedAssets: opts.selectedAssets,
        availableAssets: opts.availableAssets,
        run: opts.run,
        variant,
        attempt,
      });
      const score = scoreExtendedFlow(items, selectedIds, variants[0]?.items);

      if (score > bestScore) {
        bestItems = items;
        bestScore = score;
      }
    }

    variants.push({ items: bestItems, score: bestScore });
  }

  return variants.map((variant, index) => ({
    id: `extended-feed-${opts.run}-${index}`,
    title: `Candidate ${postLabel(index + 1)}`,
    label: index === 0 ? "Best current feed" : "Fresh alternative",
    items: variant.items,
    score: variant.score,
    weakSlotIndex: findWeakExtendedSlot(variant.items, {}),
    status: opts.activeIndex === index ? "selected" : "alternative",
  }));
}

function buildRefreshedExtendedItems(opts: {
  selectedAssets: Asset[];
  availableAssets: Asset[];
  selectedIds: Set<string>;
  lockedSlots: Record<number, string>;
  run: number;
  variant: number;
  reference?: Asset[];
}) {
  let bestItems: Asset[] = [];
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 34; attempt++) {
    const candidateItems = buildExtendedCandidateItems({
      selectedAssets: opts.selectedAssets,
      availableAssets: opts.availableAssets,
      run: opts.run,
      variant: opts.variant,
      attempt,
    });
    const items = applyExtendedLockedSlots(candidateItems, opts.lockedSlots, opts.availableAssets);
    const score = scoreExtendedFlow(items, opts.selectedIds, opts.reference);

    if (score > bestScore) {
      bestItems = items;
      bestScore = score;
    }
  }

  return bestItems;
}

function ExtendedFeedPost({
  asset,
  postNumber,
  locked,
  weak,
  dragging,
  over,
  canDrag,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  onToggleLock,
  onImprove,
}: {
  asset: Asset;
  postNumber: number;
  locked: boolean;
  weak: boolean;
  dragging: boolean;
  over: boolean;
  canDrag: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
  onDrop: (event: React.DragEvent) => void;
  onToggleLock: () => void;
  onImprove: () => void;
}) {
  return (
    <div
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={[
        "co-smart-extended-feed-post",
        locked ? "co-smart-extended-feed-post--locked" : "",
        weak ? "co-smart-extended-feed-post--weak" : "",
        dragging ? "co-smart-extended-feed-post--dragging" : "",
        over ? "co-smart-extended-feed-post--over" : "",
        canDrag ? "co-smart-extended-feed-post--draggable" : "",
      ].join(" ")}
    >
      <img src={asset.thumbUrl} alt="" draggable={false} loading="lazy" decoding="async" />
      {locked || weak ? (
        <span className="co-smart-extended-state-badge">{locked ? "Kept" : "Tune"}</span>
      ) : null}
      <span className="co-smart-extended-post-badge">{postLabel(postNumber)}</span>

      <div className="co-smart-extended-tile-actions">
        <button type="button" onClick={onToggleLock} title={locked ? "Unlock this post" : "Keep this post"}>
          {locked ? "Kept" : "Keep"}
        </button>
        <button type="button" disabled={locked} onClick={onImprove} title="Tune this post">
          Tune
        </button>
      </div>
    </div>
  );
}

function ExtendedFeedColumn({
  candidate,
  selected,
  dimmed,
  onSelect,
  onRefresh,
  renderPost,
}: {
  candidate: ExtendedMixCandidate;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  renderPost: (asset: Asset, index: number) => React.ReactNode;
}) {
  const fit = fitLabel(candidate.score);
  const score = scoreValue(candidate.score);
  const tone = fitTone(candidate.score);

  return (
    <section
      className={[
        "co-smart-extended-feed-column",
        selected ? "co-smart-extended-feed-column--selected" : "",
        dimmed ? "co-smart-extended-feed-column--dimmed" : "",
      ].join(" ")}
    >
      <div className="co-smart-extended-feed-header">
        <div className="min-w-0">
          <div className="co-smart-extended-feed-kicker">{candidate.title}</div>
          <div className="co-smart-extended-feed-title">{candidate.label}</div>
          <div className="co-smart-extended-feed-fit">
            <span className="co-smart-extended-fit-copy">{fit}</span>
            <span
              className={[
                "co-smart-extended-score-meter",
                `co-smart-extended-score-meter--${tone}`,
              ].join(" ")}
              title={`Fit score ${score}/100`}
              aria-label={`Fit score ${score} out of 100`}
            >
              <span style={{ width: `${score}%` }} />
            </span>
            <span className="co-smart-extended-score-number">{score}</span>
          </div>
        </div>

        <div className="co-smart-extended-header-actions">
          {selected ? (
            <span className="co-smart-extended-selected-pill">Selected</span>
          ) : (
            <button type="button" onClick={onSelect} className="co-smart-extended-use-button pressable">
              Use rhythm
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="co-smart-extended-use-button co-smart-extended-refresh-button pressable"
            title="Pro feature: refresh this rhythm only."
          >
            <span>Refresh</span>
            <span className="co-smart-extended-pro-tag">Pro</span>
          </button>
        </div>
      </div>

      <div className="co-smart-extended-feed">
        {candidate.items.map((asset, index) => (
          <Fragment key={`${candidate.id}-slot-${index}`}>
            {renderPost(asset, index)}
            {index === 8 ? (
              <div className="co-smart-extended-week-divider" aria-hidden="true">
                <span>Week 2 starts</span>
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

export default function SmartMix() {
  const nav = useNavigate();
  const [, setStatus] = useState("Ready");
  const [focusedMixId, setFocusedMixId] = useState<string | null>(null);
  const [activeExtendedCandidateIndex, setActiveExtendedCandidateIndex] = useState(0);
  const [focusedExtendedCandidateIndex, setFocusedExtendedCandidateIndex] = useState<number | null>(null);
  const [extendedRun, setExtendedRun] = useState(0);
  const [extendedRefreshRun, setExtendedRefreshRun] = useState(0);
  const [extendedManualLayouts, setExtendedManualLayouts] = useState<Record<number, string[]>>({});
  const [extendedLockedSlots, setExtendedLockedSlots] = useState<Record<number, Record<number, string>>>({});
  const [draggingTile, setDraggingTile] = useState<{ mixId: string; slotIndex: number } | null>(null);
  const [overTile, setOverTile] = useState<{ mixId: string; slotIndex: number } | null>(null);

  const assets = usePrototypeStore((s) => s.assets);
  const mixes = usePrototypeStore((s) => s.mixes);
  const selectedAssetIds = usePrototypeStore((s) => s.selectedAssetIds);
  const packMode = usePrototypeStore((s) => s.packMode);
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
  const setSelectedExtendedRhythm = usePrototypeStore((s) => s.setSelectedExtendedRhythm);

  const isExtendedPack = packMode === "extended-pack";
  const packMeta = PACK_MODE_META[packMode];
  const selectedCount = selectedAssetIds.length;
  const isComplete = isPackSelectionComplete(packMode, selectedCount);
  const selectedAssets = useMemo(
    () => selectedAssetIds.map((id) => getAssetById(id)).filter((asset): asset is Asset => Boolean(asset)),
    [getAssetById, selectedAssetIds]
  );
  const availableExtendedAssets = useMemo(
    () => assets.filter((asset) => asset.status === "ready"),
    [assets]
  );
  const selectedExtendedIds = useMemo(() => assetIdSet(selectedAssets), [selectedAssets]);
  const isExtendedReady = isExtendedPack && isComplete && selectedAssets.length >= 18;
  const generatedExtendedCandidates = useMemo(
    () =>
      isExtendedReady
        ? buildExtendedMixCandidates({
            selectedAssets,
            availableAssets: availableExtendedAssets,
            activeIndex: activeExtendedCandidateIndex,
            run: extendedRun,
          })
        : [],
    [activeExtendedCandidateIndex, availableExtendedAssets, extendedRun, isExtendedReady, selectedAssets]
  );
  const extendedCandidates = useMemo(
    () =>
      generatedExtendedCandidates.map((candidate, index) => {
        const manualIds = extendedManualLayouts[index];
        const lockedForCandidate = extendedLockedSlots[index] ?? {};
        const manualItems = manualIds
          ? assetsFromIds(manualIds, getAssetById, availableExtendedAssets)
          : candidate.items;
        const items = applyExtendedLockedSlots(manualItems, lockedForCandidate, availableExtendedAssets);
        const score = scoreExtendedFlow(items, selectedExtendedIds, generatedExtendedCandidates[0]?.items);

        return {
          ...candidate,
          items,
          score,
          weakSlotIndex: findWeakExtendedSlot(items, lockedForCandidate),
        };
      }),
    [
      availableExtendedAssets,
      extendedLockedSlots,
      extendedManualLayouts,
      generatedExtendedCandidates,
      getAssetById,
      selectedExtendedIds,
    ]
  );
  const activeExtendedCandidate = useMemo(
    () => extendedCandidates.find((candidate) => candidate.status === "selected") ?? extendedCandidates[0],
    [extendedCandidates]
  );

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

  const onRegenerateExtended = () => {
    setActiveExtendedCandidateIndex(0);
    setFocusedExtendedCandidateIndex(null);
    setExtendedRun((run) => run + 1);
    setExtendedManualLayouts({});
    setStatus("Extended feed rhythms regenerated");
  };

  const setExtendedCandidateItems = (candidateIndex: number, items: Asset[]) => {
    setExtendedManualLayouts((layouts) => ({
      ...layouts,
      [candidateIndex]: items.slice(0, 18).map((asset) => asset.id),
    }));
  };

  const saveExtendedRhythm = (candidate: ExtendedMixCandidate) => {
    const ids = candidate.items.map((asset) => asset.id).slice(0, 18);
    if (ids.length < 18) return false;

    setSelectedExtendedRhythm(candidate.id, ids);
    return true;
  };

  const onToggleExtendedSlotLock = (candidateIndex: number, candidate: ExtendedMixCandidate, slotIndex: number) => {
    const asset = candidate.items[slotIndex];
    if (!asset) return;

    setExtendedCandidateItems(candidateIndex, candidate.items);
    setExtendedLockedSlots((slotSets) => {
      const nextForCandidate = { ...(slotSets[candidateIndex] ?? {}) };
      if (nextForCandidate[slotIndex] === asset.id) delete nextForCandidate[slotIndex];
      else nextForCandidate[slotIndex] = asset.id;

      return {
        ...slotSets,
        [candidateIndex]: nextForCandidate,
      };
    });
    setStatus((extendedLockedSlots[candidateIndex] ?? {})[slotIndex] === asset.id ? "Slot unlocked" : "Slot locked");
  };

  const onReplaceExtendedTile = (candidateIndex: number, candidate: ExtendedMixCandidate, slotIndex: number) => {
    const lockedForCandidate = extendedLockedSlots[candidateIndex] ?? {};
    if (lockedForCandidate[slotIndex]) {
      setStatus("Unlock this slot first");
      return false;
    }

    const replacement = findExtendedReplacement({
      items: candidate.items,
      slotIndex,
      lockedSlots: lockedForCandidate,
      pool: availableExtendedAssets,
      selectedIds: selectedExtendedIds,
    });

    if (!replacement) {
      setStatus("No improvement available.");
      return false;
    }

    const nextItems = candidate.items.slice();
    nextItems[slotIndex] = replacement;
    setExtendedCandidateItems(candidateIndex, nextItems);
    setActiveExtendedCandidateIndex(candidateIndex);
    setFocusedExtendedCandidateIndex(candidateIndex);
    setSelectedExtendedRhythm(candidate.id, nextItems.map((asset) => asset.id));
    setStatus(`Improved slot ${slotIndex + 1}`);
    return true;
  };

  const onRefreshExtendedCandidate = (candidateIndex: number, candidate: ExtendedMixCandidate) => {
    const nextRun = extendedRun + extendedRefreshRun + 37 + candidateIndex * 13;
    const lockedForCandidate = extendedLockedSlots[candidateIndex] ?? {};
    const reference = extendedCandidates.find((_, index) => index !== candidateIndex)?.items;
    const items = buildRefreshedExtendedItems({
      selectedAssets,
      availableAssets: availableExtendedAssets,
      selectedIds: selectedExtendedIds,
      lockedSlots: lockedForCandidate,
      run: nextRun,
      variant: candidateIndex + 11,
      reference,
    });

    setExtendedRefreshRun((run) => run + 1);
    setExtendedCandidateItems(candidateIndex, items);
    if (candidateIndex === activeExtendedCandidateIndex) {
      setSelectedExtendedRhythm(candidate.id, items.map((asset) => asset.id));
    }
    setStatus(`${candidate.title} refreshed`);
  };

  const onDropExtendedTile = (
    e: React.DragEvent,
    candidateIndex: number,
    candidate: ExtendedMixCandidate,
    slotIndex: number
  ) => {
    e.preventDefault();

    const payload = getSmartMixDragData(e);
    setOverTile(null);
    setDraggingTile(null);

    const lockedForCandidate = extendedLockedSlots[candidateIndex] ?? {};
    if (
      !payload?.assetId ||
      payload.from.mixId !== candidate.id ||
      payload.from.slotIndex === slotIndex ||
      lockedForCandidate[payload.from.slotIndex] ||
      lockedForCandidate[slotIndex]
    ) {
      return;
    }

    const nextItems = candidate.items.slice();
    [nextItems[payload.from.slotIndex], nextItems[slotIndex]] = [
      nextItems[slotIndex]!,
      nextItems[payload.from.slotIndex]!,
    ];

    setExtendedCandidateItems(candidateIndex, nextItems);
    setActiveExtendedCandidateIndex(candidateIndex);
    setFocusedExtendedCandidateIndex(candidateIndex);
    setSelectedExtendedRhythm(candidate.id, nextItems.map((asset) => asset.id));
    setStatus("Candidate order updated");
  };

  const onOpenExtendedPlanner = () => {
    if (!activeExtendedCandidate) return;
    if (!saveExtendedRhythm(activeExtendedCandidate)) {
      setStatus("Extended Planner needs 18 posts");
      return;
    }

    nav("/prototype/planner");
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

  const renderExtendedTile = (candidate: ExtendedMixCandidate, candidateIndex: number, asset: Asset, slotIndex: number) => {
    const lockedForCandidate = extendedLockedSlots[candidateIndex] ?? {};
    const locked = lockedForCandidate[slotIndex] === asset.id;
    const weak = candidate.weakSlotIndex === slotIndex;
    const isDragging = draggingTile?.mixId === candidate.id && draggingTile.slotIndex === slotIndex;
    const isOver = overTile?.mixId === candidate.id && overTile.slotIndex === slotIndex;
    const canDrag = !locked;
    const canDropHere = Boolean(
      draggingTile &&
        draggingTile.mixId === candidate.id &&
        draggingTile.slotIndex !== slotIndex &&
        !locked &&
        !lockedForCandidate[draggingTile.slotIndex]
    );

    return (
      <ExtendedFeedPost
        key={`${candidate.id}-${asset.id}-${slotIndex}`}
        asset={asset}
        postNumber={slotIndex + 1}
        locked={locked}
        weak={weak}
        dragging={isDragging}
        over={isOver}
        canDrag={canDrag}
        onDragStart={(e) => {
          if (locked) {
            e.preventDefault();
            return;
          }

          setDraggingTile({ mixId: candidate.id, slotIndex });
          setSmartMixDragData(e, {
            assetId: asset.id,
            from: { mixId: candidate.id, slotIndex },
          });
        }}
        onDragOver={(e) => {
          if (!canDropHere) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOverTile({ mixId: candidate.id, slotIndex });
        }}
        onDragLeave={() => {
          if (isOver) setOverTile(null);
        }}
        onDragEnd={() => {
          setDraggingTile(null);
          setOverTile(null);
        }}
        onDrop={(e) => onDropExtendedTile(e, candidateIndex, candidate, slotIndex)}
        onToggleLock={() => onToggleExtendedSlotLock(candidateIndex, candidate, slotIndex)}
        onImprove={() => onReplaceExtendedTile(candidateIndex, candidate, slotIndex)}
      />
    );
  };

  if (isExtendedPack && !isExtendedReady) {
    return (
      <FlowEmptyState
        title={selectedCount ? "Extended Pack needs 18 images." : "No assets selected yet."}
        desc={
          selectedCount
            ? "Return to Library and select enough assets for Week 1 + Week 2."
            : "Return to Library to build an Extended Pack for Week 1 + Week 2."
        }
        primaryLabel="Back to Library"
        primaryTo="/prototype/library"
      />
    );
  }

  if (isExtendedPack && activeExtendedCandidate) {
    return (
      <div className="co-workspace-page co-scene co-comparison-stage">
        <div className="co-scene-header flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="text-base text-[color:var(--co-text)]">Smart Mix</div>
              {packMeta.badge ? (
                <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-2.5 py-1 text-xs text-[color:var(--co-muted)]">
                  {packMeta.badge}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-sm text-[color:var(--co-muted)]">
              Build an 18-post rhythm for Week 1 + Week 2.
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => nav("/prototype/library")}
              className="flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            >
              Back to Library
            </button>

            <button
              type="button"
              onClick={onRegenerateExtended}
              className="flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            >
              Refresh rhythms
            </button>

            <button
              type="button"
              onClick={onOpenExtendedPlanner}
              className="flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
              title="Selected rhythm continues into Extended Planner."
            >
              Open Extended Planner
            </button>
          </div>
        </div>

        <div className="co-scrollbar co-smart-extended-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="co-smart-extended-feed-stage">
            {extendedCandidates.map((candidate, index) => (
              <ExtendedFeedColumn
                key={candidate.id}
                candidate={candidate}
                selected={candidate.status === "selected"}
                dimmed={
                  focusedExtendedCandidateIndex !== null &&
                  activeExtendedCandidateIndex !== index
                }
                onSelect={() => {
                  setActiveExtendedCandidateIndex(index);
                  setFocusedExtendedCandidateIndex(index);
                  saveExtendedRhythm(candidate);
                  setStatus("Extended rhythm selected");
                }}
                onRefresh={() => onRefreshExtendedCandidate(index, candidate)}
                renderPost={(asset, slotIndex) => renderExtendedTile(candidate, index, asset, slotIndex)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
