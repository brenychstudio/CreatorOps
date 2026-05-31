import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildMockAssets, type Asset } from "../data/mockAssets";
import { computeAssetAnalysisFromUrl } from "../lib/assetAnalysis";
import { PACK_MODE_META, getPackSlotCount, type PackMode } from "../modules/prototype/packPlanning";

export { PACK_MODE_META };
export type { PackMode };

export type Tone = "Minimal" | "Neutral" | "Emotional" | "Sales";
export type Length = "Short" | "Medium" | "Long";

export type Mix = {
  id: string;
  tileIds: string[]; // 3×3 grid (9)
  score: number; // 0..100
  overallScore: number;
  rhythmScore: number;
  varietyScore: number;
  balanceScore: number;
  readinessScore: number;
  duplicatePenalty: number;
  duplicateRisk: "Low" | "Medium" | "High";
  scoreDots: 1 | 2 | 3;
  hasConflict: boolean;
  reasons: string[];
  recommendation: string;
  weakness?: string;
  weakSlotIndex?: number;
  generatedAt?: string;
};

export type SequenceDay = {
  dayIndex: number; // 0..6
  tileId?: string;
  storyId?: string;
};

export type PlannerSlot = {
  dayIndex: number; // 0..8 (0..6 week, 7..8 next)
  slotIndex: number; // 0..N (A/B/…)
  tileId?: string; // assetId
  storyId?: string;
};

export type CaptionsState = {
  tone: Tone;
  length: Length;
  variants: string[];
  hashtags: string[];
  cta?: string;
  source?: "local" | "openai" | "fallback";
};

export type GeneratedCaptionResult = {
  id: string;
  caption: string;
  hashtags: string[];
  cta: string;
  alt: string;
};

export type Readout = {
  selected: number;
  mixes: number;
  conflictsAvoided: number;
  minutesSaved: number;
};

type DragFrom = { dayIndex: number; slotIndex: number };

type PrototypeState = {
  assets: Asset[];
  selectedAssetIds: string[];
  packMode: PackMode;
  mixSeed: number;

  // Uploads (offline, session-only)
  uploadAssetIds: string[];
  uploadError?: string;
  addUploads: (files: FileList | File[]) => Promise<void>;
  removeUpload: (id: string) => Promise<void>;
  clearUploads: () => void;

  mixes: Mix[];
  bestMixId?: string;
  selectedMixId?: string;
  selectedMixScore?: number;
  selectedMixReasons: string[];
  selectedMixGeneratedAt?: string;
  lockedSlots: Record<number, string>;
  lockedAssetIds: string[];

  sequence: SequenceDay[];
  planner: PlannerSlot[];

  captions: CaptionsState;

  ai: {
    prompt: string;
    draft: string;
  };

  readout: Readout;

  getAssetById: (id: string) => Asset | undefined;
  setPackMode: (mode: PackMode) => void;
  getPackTargetCount: () => number;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  // Scan pipeline (offline): compute asset.analysis via Canvas downscale
  // IDs currently being analyzed (used for UI progress; includes mock + uploads)
  analysisPendingIds: string[];
  scanMissingAssetAnalysis: (ids?: string[]) => Promise<void>;

  // Library / Smart Mix
  generateMixes: () => Promise<void>;
  regenerateMixes: () => Promise<void>; // alias for UI consistency
  pickBestMix: (mixId?: string) => void;
  toggleMixSlotLock: (mixId: string, slotIndex: number) => void;
  replaceMixTile: (mixId: string, slotIndex: number) => boolean;
  replaceWeakMixTile: (mixId: string) => boolean;
  reorderMixTiles: (mixId: string, fromIndex: number, toIndex: number) => boolean;

  // Sequence / Planner
  buildSequenceFromBest: () => void;
  sendSequenceToPlanner: () => void;

  // Planner drag-drop (supports both old and new call signatures)
  setPlannerSlot: {
    (dayIndex: number, tileId?: string, storyId?: string): void; // legacy: (dayIndex, tileId)
    (dayIndex: number, slotIndex: number, tileId?: string, from?: DragFrom): void; // new: (dayIndex, slotIndex, tileId, from?)
  };
  clearPlannerSlot: {
    (dayIndex: number): void; // legacy
    (dayIndex: number, slotIndex: number): void;
  };

  // Captions
  generateCaptions: (tone: Tone, length: Length, anchorTileId?: string) => void;
  setGeneratedCaption: (result: GeneratedCaptionResult, source?: CaptionsState["source"]) => void;

  // AI request (placeholder)
  setAiPrompt: (prompt: string) => void;
  generateDraftFromPrompt: (prompt?: string, anchorTileId?: string) => Promise<void>;

  // Export
  exportTextPack: () => string;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8)}-${Date.now().toString(16).slice(-4)}`;
}

function makeRng(seed: number) {
  // mulberry32 PRNG (deterministic, fast)
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: number, salt: number) {
  // 32-bit mix/hash
  let x = (seed ^ (salt + 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function one<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function makePlannerSkeleton(): PlannerSlot[] {
  const slots: PlannerSlot[] = [];

  // Week: A/B/C slots (0/1/2)
  for (let day = 0; day < 7; day++) {
    for (let slot = 0; slot < 3; slot++) slots.push({ dayIndex: day, slotIndex: slot });
  }

  // Next slots: A only (slotIndex 0)
  slots.push({ dayIndex: 7, slotIndex: 0 });
  slots.push({ dayIndex: 8, slotIndex: 0 });

  return slots;
}

function computeReadoutLite(opts: { selectedAssetIds: string[]; mixes: Mix[] }): Readout {
  const selected = opts.selectedAssetIds.length;
  const mixes = opts.mixes.length;
  const conflictsAvoided = opts.mixes.reduce((acc, m) => acc + (m.hasConflict ? 1 : 0), 0);
  const minutesSaved = Math.round(mixes * 6.5); // toy metric
  return { selected, mixes, conflictsAvoided, minutesSaved };
}

function hasConflict(a: Asset, b: Asset) {
  // Simplified, stable rule (keeps types aligned with mockAssets)
  if (a.series === b.series) return true;
  if (a.ratio === b.ratio && a.status === b.status) return true;
  return false;
}

function scoreDots(score: number): 1 | 2 | 3 {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  return 1;
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function lockedAssetIdsFromSlots(lockedSlots: Record<number, string>) {
  return unique(
    Object.entries(lockedSlots)
      .filter(([slot, id]) => Number(slot) >= 0 && Number(slot) < 9 && Boolean(id))
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, id]) => id)
  );
}

function normalizeLockedSlots(lockedSlots?: Record<number, string>) {
  const next: Record<number, string> = {};
  for (const [slot, id] of Object.entries(lockedSlots ?? {})) {
    const index = Number(slot);
    if (Number.isInteger(index) && index >= 0 && index < 9 && id) next[index] = id;
  }
  return next;
}

function mixSelectedMeta(mix: Mix | undefined, lockedSlots: Record<number, string>) {
  return {
    selectedMixId: mix?.id,
    selectedMixScore: mix?.overallScore ?? mix?.score,
    selectedMixReasons: mix?.reasons ?? [],
    selectedMixGeneratedAt: mix?.generatedAt,
    lockedSlots,
    lockedAssetIds: lockedAssetIdsFromSlots(lockedSlots),
  };
}

function applyLockedSlotsToTileIds(
  tileIds: string[],
  lockedSlots: Record<number, string>,
  poolIds: string[]
) {
  const out = tileIds.slice(0, 9);
  while (out.length < 9) out.push("");

  const lockedIds = new Set(Object.values(lockedSlots).filter(Boolean));
  const used = new Set<string>();

  for (const [slot, id] of Object.entries(lockedSlots)) {
    const index = Number(slot);
    if (index >= 0 && index < 9 && id) {
      out[index] = id;
      used.add(id);
    }
  }

  for (let i = 0; i < out.length; i++) {
    const id = out[i];
    if (!id) continue;
    if (lockedSlots[i] === id) continue;
    if (lockedIds.has(id) || used.has(id)) out[i] = "";
    else used.add(id);
  }

  const fill = [...tileIds, ...poolIds].filter((id) => id && !used.has(id));
  let fillIndex = 0;

  for (let i = 0; i < out.length; i++) {
    if (lockedSlots[i]) continue;
    if (out[i]) continue;

    const next = fill[fillIndex++];
    if (next) {
      out[i] = next;
      used.add(next);
    }
  }

  return out.slice(0, 9);
}

function countBy<T>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

function findWeakSlotIndex(
  tileIds: string[],
  getAssetById: (id: string) => Asset | undefined,
  lockedSlots: Record<number, string> = {}
) {
  const ids = tileIds.slice(0, 9);
  const seriesCounts = countBy(
    ids
      .map((id) => (id ? getAssetById(id)?.series : undefined))
      .filter((series): series is string => Boolean(series))
  );
  const idCounts = countBy(ids.filter(Boolean));

  let bestIndex = -1;
  let bestRisk = -1;

  for (let i = 0; i < 9; i++) {
    if (lockedSlots[i]) continue;
    const id = ids[i];
    const asset = id ? getAssetById(id) : undefined;
    const prev = ids[i - 1] ? getAssetById(ids[i - 1]!) : undefined;
    const next = ids[i + 1] ? getAssetById(ids[i + 1]!) : undefined;

    let risk = 0;
    if (!id || !asset) risk += 80;
    if (asset && asset.status !== "ready") risk += 35;
    if (asset && asset.ratio !== "4:5") risk += 25;
    if (id && (idCounts.get(id) ?? 0) > 1) risk += 45;
    if (asset && (seriesCounts.get(asset.series) ?? 0) >= 5) risk += 20;
    if (asset && prev?.series === asset.series) risk += 12;
    if (asset && next?.series === asset.series) risk += 12;
    if (asset?.analysis && (asset.analysis.brightness < 0.18 || asset.analysis.brightness > 0.86)) risk += 8;

    if (risk > bestRisk) {
      bestRisk = risk;
      bestIndex = i;
    }
  }

  return bestRisk > 0 ? bestIndex : ids.findIndex((_, index) => !lockedSlots[index]);
}

function scoreMixV2(
  mix: Mix,
  getAssetById: (id: string) => Asset | undefined,
  lockedSlots: Record<number, string> = {}
): Mix {
  const tileIds = mix.tileIds.slice(0, 9);
  const assets = tileIds.map((id) => (id ? getAssetById(id) : undefined));
  const presentAssets = assets.filter((asset): asset is Asset => Boolean(asset));
  const readyAssets = presentAssets.filter((asset) => asset.status === "ready");
  const ready45Assets = readyAssets.filter((asset) => asset.ratio === "4:5");
  const uniqueIds = unique(tileIds.filter(Boolean));
  const missingSlots = tileIds.filter((id) => !id).length;
  const repeatedIds = Math.max(0, tileIds.filter(Boolean).length - uniqueIds.length);
  const seriesCounts = countBy(presentAssets.map((asset) => asset.series));
  const seriesCount = seriesCounts.size;
  const maxSeries = Math.max(0, ...Array.from(seriesCounts.values()));
  const adjacent = mixV3AdjacencyStats(tileIds, getAssetById);
  const analyzed = presentAssets.filter((asset) => Boolean(asset.analysis));

  let brightnessStd = 0.12;
  let averageFeatureDistance = 0.3;

  if (analyzed.length >= 2) {
    const brightnesses = analyzed.map((asset) => asset.analysis!.brightness);
    const mean = brightnesses.reduce((acc, value) => acc + value, 0) / brightnesses.length;
    brightnessStd = Math.sqrt(
      brightnesses.reduce((acc, value) => acc + (value - mean) * (value - mean), 0) / brightnesses.length
    );

    let distance = 0;
    let count = 0;
    for (let i = 0; i < analyzed.length; i++) {
      for (let j = i + 1; j < analyzed.length; j++) {
        const a = analyzed[i]!.analysis!;
        const b = analyzed[j]!.analysis!;
        distance +=
          Math.abs(a.brightness - b.brightness) * 0.9 +
          hueDelta01(a.hue, b.hue) * 0.7 +
          Math.abs(a.saturation - b.saturation) * 0.6 +
          Math.abs(a.busy - b.busy) * 0.6;
        count++;
        if (count >= 24) break;
      }
      if (count >= 24) break;
    }
    averageFeatureDistance = count ? distance / count : averageFeatureDistance;
  }

  const readinessScore = clampScore((ready45Assets.length / 9) * 100 - missingSlots * 8);
  const varietyScore = clampScore(
    (uniqueIds.length / 9) * 46 +
      (Math.min(seriesCount, 4) / 4) * 30 +
      Math.min(1, averageFeatureDistance / 0.38) * 24 -
      repeatedIds * 12
  );
  const balanceScore = clampScore(
    100 -
      Math.max(0, maxSeries - 4) * 16 -
      adjacent.adjSameSeries * 4 -
      (brightnessStd < 0.07 ? (0.07 - brightnessStd) * 180 : 0) -
      (brightnessStd > 0.24 ? (brightnessStd - 0.24) * 120 : 0)
  );
  const rhythmScore = clampScore(
    100 - adjacent.adjSameSeries * 6 - adjacent.adjTooSimilar * 10 - missingSlots * 10 - repeatedIds * 10
  );
  const duplicatePenalty = Math.round(repeatedIds * 12 + adjacent.adjSameSeries * 4 + adjacent.adjTooSimilar * 8);
  const duplicateRisk: Mix["duplicateRisk"] =
    duplicatePenalty >= 28 || repeatedIds >= 2 ? "High" : duplicatePenalty >= 12 ? "Medium" : "Low";
  const overallScore = clampScore(
    rhythmScore * 0.3 + varietyScore * 0.25 + balanceScore * 0.25 + readinessScore * 0.2 - duplicatePenalty * 0.35
  );
  const weakSlotIndex = findWeakSlotIndex(tileIds, getAssetById, lockedSlots);

  const reasons: string[] = [];
  if (rhythmScore >= 78) reasons.push("Good rhythm across the week.");
  else reasons.push("One slot is softening the weekly rhythm.");
  if (repeatedIds === 0) reasons.push("No repeated assets in the 3x3 set.");
  else reasons.push("Repeated assets are lowering variety.");
  if (balanceScore >= 76) reasons.push("Balanced mix of visual directions.");
  else reasons.push("One visual direction is doing too much work.");
  if (readinessScore >= 90) reasons.push("Ready for captions and export.");
  else reasons.push("One weaker slot could be replaced.");

  let recommendation = "Good base, needs one replacement";
  if (overallScore >= 88 && rhythmScore >= 82) recommendation = "Strong weekly rhythm";
  else if (overallScore >= 80 && balanceScore >= varietyScore) recommendation = "Balanced visual set";
  else if (varietyScore >= 82 && readinessScore < 90) recommendation = "High variety, softer CTA";
  else if (overallScore >= 74) recommendation = "Solid grid foundation";

  const weakness =
    duplicateRisk !== "Low"
      ? "Duplicate or same-series clustering risk."
      : readinessScore < 90
        ? "One slot is less export-ready."
        : balanceScore < 70
          ? "Visual balance could improve."
          : undefined;

  return {
    ...mix,
    score: overallScore,
    overallScore,
    rhythmScore,
    varietyScore,
    balanceScore,
    readinessScore,
    duplicatePenalty,
    duplicateRisk,
    scoreDots: scoreDots(overallScore),
    hasConflict: duplicateRisk !== "Low" || readinessScore < 80 || Boolean(mix.hasConflict),
    reasons: reasons.slice(0, 4),
    recommendation,
    weakness,
    weakSlotIndex: weakSlotIndex >= 0 ? weakSlotIndex : undefined,
    generatedAt: mix.generatedAt ?? new Date().toISOString(),
  };
}

// ===== Smart Mix v3: grid adjacency + similarity guard (no UI changes) =====

const MIXV3_ADJ_PAIRS: Array<[number, number]> = [
  // horizontal
  [0, 1],
  [1, 2],
  [3, 4],
  [4, 5],
  [6, 7],
  [7, 8],
  // vertical
  [0, 3],
  [3, 6],
  [1, 4],
  [4, 7],
  [2, 5],
  [5, 8],
];

const MIXV3_SIM_THRESHOLD = 0.86; // "too similar" for adjacent tiles
const MIXV3_MAX_TRIES = 48; // how many layouts we try per mix

function mixV3HashSeed(seed: number, salt: number) {
  let x = (seed ^ (salt + 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function mixV3Rng(seed: number) {
  // mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function mixV3Shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hueDelta01(a: number, b: number) {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
}

/**
 * Similarity heuristic (0..1) based only on metadata (safe/offline).
 * If you later add pixel-analysis, swap this function only.
 */
function mixV3Similarity01(a: Asset, b: Asset): number {
  // If pixel-analysis exists, use it as primary signal.
  const aa = a.analysis;
  const bb = b.analysis;

  let sim = 0;

  if (aa && bb) {
    const dB = Math.abs(aa.brightness - bb.brightness);
    const dC = Math.abs(aa.contrast - bb.contrast);
    const dH = hueDelta01(aa.hue, bb.hue);
    const dS = Math.abs(aa.saturation - bb.saturation);
    const dBusy = Math.abs(aa.busy - bb.busy);

    // weighted RMS distance in 0..1 domain
    const wB = 1.0;
    const wC = 0.6;
    const wH = 0.9;
    const wS = 0.7;
    const wBusy = 0.7;
    const wSum = wB + wC + wH + wS + wBusy;

    const dist = Math.sqrt(
      (wB * dB * dB + wC * dC * dC + wH * dH * dH + wS * dS * dS + wBusy * dBusy * dBusy) / wSum
    );
    sim = clamp01(1 - dist);
  } else {
    // Fallback: metadata-only heuristic (safe/offline)
    if (a.ratio === b.ratio) sim += 0.12;
    if (a.status === b.status) sim += 0.12;

    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (Number.isFinite(ta) && Number.isFinite(tb) && Math.abs(ta - tb) < 1000 * 60 * 60 * 24 * 7) sim += 0.06;
  }

  // Series acts as a hard-ish prior: usually too cohesive next to each other
  if (a.series === b.series) sim = Math.max(sim, 0.75);

  return clamp01(sim);
}

function mixV3AdjacencyStats(tileIds: string[], getAssetById: (id: string) => Asset | undefined) {
  let adjSameSeries = 0;
  let adjTooSimilar = 0;

  for (const [i, j] of MIXV3_ADJ_PAIRS) {
    const ai = tileIds[i] ? getAssetById(tileIds[i]!) : undefined;
    const aj = tileIds[j] ? getAssetById(tileIds[j]!) : undefined;
    if (!ai || !aj) continue;

    if (ai.series === aj.series) adjSameSeries++;

    const sim = mixV3Similarity01(ai, aj);
    if (sim >= MIXV3_SIM_THRESHOLD) adjTooSimilar++;
  }

  // penalty weights tuned for "premium curated" feel
  const penalty = adjSameSeries * 7 + adjTooSimilar * 11;

  return { adjSameSeries, adjTooSimilar, penalty };
}

function mixV3OptimizeGridOrder(
  tileIds: string[],
  getAssetById: (id: string) => Asset | undefined,
  rng: () => number
): { ordered: string[]; stats: ReturnType<typeof mixV3AdjacencyStats> } {
  const base = tileIds.slice(0, 9);
  let best = base;
  let bestStats = mixV3AdjacencyStats(best, getAssetById);

  // try multiple deterministic shuffles; pick layout with minimal adjacency penalty
  for (let t = 0; t < MIXV3_MAX_TRIES; t++) {
    const candidate = mixV3Shuffle(base, rng);
    const s = mixV3AdjacencyStats(candidate, getAssetById);
    if (s.penalty < bestStats.penalty) {
      best = candidate;
      bestStats = s;
      if (bestStats.penalty === 0) break;
    }
  }

  return { ordered: best, stats: bestStats };
}

function mixV3PostProcessMix(
  mix: Mix,
  getAssetById: (id: string) => Asset | undefined,
  seed: number,
  salt: number
): Mix {
  const ids = mix.tileIds.slice(0, 9);

  // Ensure exactly 9 for the grid
  if (ids.length && ids.length < 9) {
    while (ids.length < 9) ids.push(ids[ids.length % ids.length]!);
  }

  const rng = mixV3Rng(mixV3HashSeed(seed, salt));
  const { ordered, stats } = mixV3OptimizeGridOrder(ids, getAssetById, rng);

  // ===== analysis-driven scoring (v3 foundation) =====
  const orderedAssets = ordered
    .map((id) => (id ? getAssetById(id) : undefined))
    .filter((a): a is Asset => Boolean(a));

  const analyzed = orderedAssets.filter((a) => Boolean(a.analysis));
  const coverage = orderedAssets.length ? analyzed.length / orderedAssets.length : 0;

  const brightnesses = analyzed.map((a) => a.analysis!.brightness);
  const meanB = brightnesses.length ? brightnesses.reduce((acc, v) => acc + v, 0) / brightnesses.length : 0.5;
  const varB =
    brightnesses.length > 1
      ? brightnesses.reduce((acc, v) => acc + (v - meanB) * (v - meanB), 0) / brightnesses.length
      : 0;
  const stdB = Math.sqrt(Math.max(0, varB));

  // Brightness rhythm: encourage enough variation, avoid "flat" grids
  let rhythmPenalty = 0;
  if (coverage >= 0.9) {
    if (stdB < 0.07) rhythmPenalty += (0.07 - stdB) * 220;
    if (stdB > 0.23) rhythmPenalty += (stdB - 0.23) * 120;
  }

  // Variety: average pairwise feature distance (sampled)
  const analysisDist01 = (a: Asset, b: Asset) => {
    if (!a.analysis || !b.analysis) return 0.3;
    const aa = a.analysis;
    const bb = b.analysis;
    const dB = Math.abs(aa.brightness - bb.brightness);
    const dC = Math.abs(aa.contrast - bb.contrast);
    const dH = hueDelta01(aa.hue, bb.hue);
    const dS = Math.abs(aa.saturation - bb.saturation);
    const dBusy = Math.abs(aa.busy - bb.busy);
    const wB = 1.0;
    const wC = 0.6;
    const wH = 0.9;
    const wS = 0.7;
    const wBusy = 0.7;
    const wSum = wB + wC + wH + wS + wBusy;
    return Math.sqrt(
      (wB * dB * dB + wC * dC * dC + wH * dH * dH + wS * dS * dS + wBusy * dBusy * dBusy) / wSum
    );
  };

  let variety01 = 0;
  if (analyzed.length >= 2) {
    let sum = 0;
    let cnt = 0;
    // deterministic sampling (first N pairs)
    for (let i = 0; i < analyzed.length; i++) {
      for (let j = i + 1; j < analyzed.length; j++) {
        sum += analysisDist01(analyzed[i]!, analyzed[j]!);
        cnt++;
        if (cnt >= 24) break;
      }
      if (cnt >= 24) break;
    }
    variety01 = cnt ? sum / cnt : 0;
  }

  // Color & layout diversity: penalize monotone rows and dominant hue bias (demo-friendly)
  let monoRowCount = 0;
  let dominantHueCount = 0;
  let flatTextureRowCount = 0;

  if (coverage >= 0.9) {
    const rows: Array<[number, number, number]> = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ];

    const at = (idx: number) => {
      const id = ordered[idx];
      const a = id ? getAssetById(id) : undefined;
      return a?.analysis;
    };

    const avgHueDelta3 = (i0: number, i1: number, i2: number) => {
      const a0 = at(i0);
      const a1 = at(i1);
      const a2 = at(i2);
      if (!a0 || !a1 || !a2) return 0.2;
      const d01 = hueDelta01(a0.hue, a1.hue);
      const d12 = hueDelta01(a1.hue, a2.hue);
      const d02 = hueDelta01(a0.hue, a2.hue);
      return (d01 + d12 + d02) / 3;
    };

    const avgSat3 = (i0: number, i1: number, i2: number) => {
      const a0 = at(i0);
      const a1 = at(i1);
      const a2 = at(i2);
      if (!a0 || !a1 || !a2) return 0.2;
      return (a0.saturation + a1.saturation + a2.saturation) / 3;
    };

    const stdBusy3 = (i0: number, i1: number, i2: number) => {
      const a0 = at(i0);
      const a1 = at(i1);
      const a2 = at(i2);
      if (!a0 || !a1 || !a2) return 0.08;
      const m = (a0.busy + a1.busy + a2.busy) / 3;
      const v =
        ((a0.busy - m) * (a0.busy - m) + (a1.busy - m) * (a1.busy - m) + (a2.busy - m) * (a2.busy - m)) / 3;
      return Math.sqrt(Math.max(0, v));
    };

    // global dominant hue bias (8 bins)
    const hueBins = new Array(8).fill(0);
    for (const a of analyzed) {
      const h = a.analysis!.hue;
      const bin = Math.max(0, Math.min(7, Math.floor(h * 8)));
      hueBins[bin]++;
    }
    dominantHueCount = Math.max(...hueBins);

    // row checks
    for (const [a, b, c] of rows) {
      const hueAvg = avgHueDelta3(a, b, c);
      const satAvg = avgSat3(a, b, c);
      if (satAvg >= 0.18 && hueAvg < 0.06) monoRowCount++;

      const busyStd = stdBusy3(a, b, c);
      if (busyStd < 0.03) flatTextureRowCount++;
    }
  }

  const colorPenalty =
    coverage >= 0.9 ? monoRowCount * 9 + (dominantHueCount >= 6 ? 10 : dominantHueCount >= 5 ? 6 : 0) : 0;

  const texturePenalty = coverage >= 0.9 ? flatTextureRowCount * 4 : 0;

  const varietyPenalty = coverage >= 0.9 && variety01 < 0.26 ? (0.26 - variety01) * 140 : 0;

  // Map variety to a small bonus/penalty in score points
  const varietyBonus = coverage >= 0.9 ? clamp01((variety01 - 0.28) / 0.22) * 10 - 2 : 0;

  // Adjust score and conflict based on adjacency + metrics
  const nextScore = Math.max(
    10,
    Math.min(100, Math.round(mix.score - stats.penalty - rhythmPenalty - colorPenalty - texturePenalty - varietyPenalty + varietyBonus))
  );

  const nextHasConflict =
    mix.hasConflict ||
    stats.adjTooSimilar > 0 ||
    stats.adjSameSeries >= 4 ||
    (coverage >= 0.9 && stdB < 0.055) ||
    (coverage >= 0.9 && (monoRowCount > 0 || dominantHueCount >= 6 || variety01 < 0.24));

  // reasons (demo-friendly, metric-based)
  const baseSelected = mix.reasons.find((r) => r.startsWith("Selected:"));
  const baseSeries = mix.reasons.find((r) => r === "Series spread");
  const baseAntiRepeat = mix.reasons.find((r) => r === "Anti-repeat");

  const reasons: string[] = [];

  if (coverage >= 0.9) {
    if (stdB >= 0.08 && stdB <= 0.18) reasons.push("Balanced light/dark rhythm");
    else if (stdB < 0.08) reasons.push("Rhythm: avoid flat grid");
    else reasons.push("Rhythm: avoid extremes");

    if (stats.adjTooSimilar === 0) reasons.push("Avoided near-duplicates");
    else reasons.push(`Near-duplicate risk (${stats.adjTooSimilar})`);

    const colorRisk =
      monoRowCount > 0
        ? `Color clustering risk (${monoRowCount})`
        : dominantHueCount >= 6
          ? "Dominant color bias"
          : "";

    if (colorRisk) reasons.push(colorRisk);
    else if (variety01 >= 0.34) reasons.push("High variety score");
    else reasons.push("Low variety score");
  } else {
    reasons.push("Analysis pending");
  }

  if (baseSelected) reasons.push(baseSelected);
  else if (baseAntiRepeat) reasons.push(baseAntiRepeat);
  else if (baseSeries) reasons.push(baseSeries);

  // final cap
  const capped = reasons.slice(0, 4);

  return {
    ...mix,
    tileIds: ordered,
    score: nextScore,
    scoreDots: scoreDots(nextScore),
    hasConflict: nextHasConflict,
    reasons: capped,
  };
}

function humanId(id?: string): string {
  if (!id) return "";
  const m = id.match(/^[a-z]-0*(\d+)$/i); // p-11, p-07, t-03...
  return m ? `#${m[1]}` : id;
}

const captionBankByTone: Record<Tone, string[]> = {
  Minimal: [
    "A clean moment to build momentum.",
    "Clarity over noise.",
    "A small decision that keeps the week intentional.",
    "Save it. Keep moving.",
    "Less, but precise.",
    "Quiet structure. Strong output.",
  ],
  Neutral: [
    "A clear step forward — simple, repeatable.",
    "One move that makes the plan feel real.",
    "Tight workflow, calmer week.",
    "Build the rhythm. Protect focus.",
    "Saved time. Kept quality.",
  ],
  Emotional: [
    "A small detail that changes the whole direction.",
    "Quietly powerful — it holds the week together.",
    "A calm moment, but it matters.",
    "You can feel the rhythm clicking in.",
    "Less stress, more intention.",
  ],
  Sales: [
    "Save this — it’s the workflow that compounds.",
    "A simple system that pays back every week.",
    "If you want consistency, start here.",
    "Keep this as a template for your next run.",
    "This is the kind of structure that scales.",
  ],
};

const ctaByTone: Record<Tone, string> = {
  Minimal: "Save this for your next content batch.",
  Neutral: "Use this as a reference for the next weekly plan.",
  Emotional: "Keep this close when the week needs direction.",
  Sales: "Turn this into your next repeatable content system.",
};

// ---- Seeded RNG (stable, deterministic per "regenerate run") ----
function fnv1a32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMixSeed(opts: { poolIds: string[]; selectedIds: string[]; run: number }): number {
  // "predictable but different": same pool+selection+run => same results
  const key = `mixv2|run:${opts.run}|pool:${opts.poolIds.join(",")}|sel:${opts.selectedIds.join(",")}`;
  return fnv1a32(key);
}

export const usePrototypeStore = create<PrototypeState>()(
  persist(
    (set, get) => {
      const assets = buildMockAssets();
      let draftReqId = 0;
let mixRun = 0; // increments on Regenerate for deterministic variety

      // IMPORTANT: makes Regenerate visibly change candidates even when selection/pool is stable.
      let mixesNonce = 0;

      // Prevent duplicate concurrent scans for the same asset.
      const analyzing = new Set<string>();

      const initial: Omit<
        PrototypeState,
        | "getAssetById"
        | "setPackMode"
        | "getPackTargetCount"
        | "toggleSelect"
        | "clearSelection"
        | "addUploads"
        | "removeUpload"
        | "clearUploads"
        | "scanMissingAssetAnalysis"
        | "generateMixes"
        | "regenerateMixes"
        | "pickBestMix"
        | "toggleMixSlotLock"
        | "replaceMixTile"
        | "replaceWeakMixTile"
        | "reorderMixTiles"
        | "buildSequenceFromBest"
        | "sendSequenceToPlanner"
        | "setPlannerSlot"
        | "clearPlannerSlot"
        | "generateCaptions"
        | "setGeneratedCaption"
        | "setAiPrompt"
        | "generateDraftFromPrompt"
        | "exportTextPack"
      > = {
        assets,
        selectedAssetIds: [],
        packMode: "week-pack",
        mixSeed: 1,
        uploadAssetIds: [],
        uploadError: undefined,
        mixes: [],
        bestMixId: undefined,
        selectedMixId: undefined,
        selectedMixScore: undefined,
        selectedMixReasons: [],
        selectedMixGeneratedAt: undefined,
        lockedSlots: {},
        lockedAssetIds: [],
        sequence: Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex })),
        planner: makePlannerSkeleton(),
        captions: { tone: "Minimal", length: "Short", variants: [], hashtags: [], source: "local" },
        ai: { prompt: "", draft: "" },
        readout: { selected: 0, mixes: 0, conflictsAvoided: 0, minutesSaved: 0 },
        analysisPendingIds: [],
      };

      type MixMode = "balanced" | "selected" | "fresh" | "variety";
type BuildMixOpts = { mixIndex: number; mode: MixMode; avoid?: Set<string>; rng: () => number };

function buildMixFromPool(
  state: PrototypeState,
  poolIds: string[],
  opts: {
    mixIndex: number;
    seed: number;
    usedGlobal: Set<string>;
    usedSelected: Set<string>;
  }
): Mix {
  const pool = unique(poolIds).filter(Boolean);

  if (!pool.length) {
    return {
      id: uid("mix"),
      tileIds: Array.from({ length: 9 }, () => ""),
      score: 10,
      overallScore: 10,
      rhythmScore: 0,
      varietyScore: 0,
      balanceScore: 0,
      readinessScore: 0,
      duplicatePenalty: 0,
      duplicateRisk: "Low",
      scoreDots: 1,
      hasConflict: false,
      reasons: ["Empty pool"],
      recommendation: "Select assets to build a mix",
      generatedAt: new Date().toISOString(),
    };
  }

  // Stable-but-changing RNG: depends on (seed, mixIndex)
  const rng = makeRng(hashSeed(opts.seed, 1000 + opts.mixIndex * 77));

  const byId = new Map(state.assets.map((a) => [a.id, a] as const));
  const getAsset = (id: string) => byId.get(id);

  const selectedInPool = unique(state.selectedAssetIds.filter((id) => pool.includes(id)));
  const selectedSet = new Set(selectedInPool);

  // ---- series helpers (anti “same style clumps”)
  const seriesOf = (id: string) => getAsset(id)?.series ?? "Other";

  // distribute selected across 4 mixes deterministically
  const perMix = (() => {
    const n = selectedInPool.length;
    if (!n) return 0;
    const base = Math.floor(n / 4);
    const rem = n % 4;
    return Math.min(9, base + (opts.mixIndex < rem ? 1 : 0));
  })();

  const chosen: string[] = [];
  const chosenSet = new Set<string>();
  const seriesCount = new Map<string, number>();

  const canAdd = (id: string) => {
    if (!id) return false;
    if (chosenSet.has(id)) return false;
    if (!pool.includes(id)) return false;
    return true;
  };

  const add = (id: string) => {
    if (!canAdd(id)) return false;
    chosen.push(id);
    chosenSet.add(id);

    const s = seriesOf(id);
    seriesCount.set(s, (seriesCount.get(s) ?? 0) + 1);
    return true;
  };

  // Weight: prefer not usedSelected, then not usedGlobal. Stable jitter from rng().
  const weight = (id: string) => {
    let w = 0;
    if (selectedSet.has(id) && opts.usedSelected.has(id)) w += 100; // strongest penalty
    if (opts.usedGlobal.has(id)) w += 12; // softer penalty
    // tiny stable randomness to avoid ties
    w += rng() * 2;
    return w;
  };

  const poolShuffled = shuffleWithRng(pool, rng);

  // --- Phase 1: add selected (distributed), prefer fresh selected
  const selectedOrdered = poolShuffled
    .filter((id) => selectedSet.has(id))
    .sort((a, b) => weight(a) - weight(b));

  for (const id of selectedOrdered) {
    if (chosen.length >= perMix) break;
    add(id);
  }

  // --- Phase 2: fill with non-selected, prefer not-usedGlobal
  const nonSelectedOrdered = poolShuffled
    .filter((id) => !selectedSet.has(id))
    .sort((a, b) => weight(a) - weight(b));

  for (const id of nonSelectedOrdered) {
    if (chosen.length >= 9) break;
    add(id);
  }

  // --- Phase 3: if still short, allow repeats across mixes (still no duplicates внутри міксу)
  if (chosen.length < 9) {
    const anyOrdered = poolShuffled.sort((a, b) => weight(a) - weight(b));
    for (const id of anyOrdered) {
      if (chosen.length >= 9) break;
      add(id);
    }
  }

  // --- Phase 4: if STILL short (very small pool), pad with empty slots to avoid duplicates
  while (chosen.length < 9) chosen.push("");

  // ---- Reorder chosen to reduce same-series adjacency (round-robin by series)
  const groups = new Map<string, string[]>();
  for (const id of chosen.filter(Boolean)) {
    const s = seriesOf(id);
    const list = groups.get(s) ?? [];
    list.push(id);
    groups.set(s, list);
  }

  const seriesKeys = Array.from(groups.keys()).sort((a, b) => (groups.get(b)?.length ?? 0) - (groups.get(a)?.length ?? 0));

  const reordered: string[] = [];
  while (reordered.length < 9) {
    let progressed = false;
    for (const s of seriesKeys) {
      const list = groups.get(s) ?? [];
      const id = list.shift();
      if (id) {
        reordered.push(id);
        progressed = true;
        if (reordered.length >= 9) break;
      }
    }
    if (!progressed) break;
  }

  // keep empty pads if any
  while (reordered.length < 9) reordered.push("");

  // ---- conflicts + score
  const items = reordered
    .filter(Boolean)
    .map((id) => getAsset(id))
    .filter((a): a is Asset => Boolean(a));

  let conflicts = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (hasConflict(items[i]!, items[j]!)) conflicts++;
    }
  }

  const maxSeries = Math.max(0, ...Array.from(seriesCount.values()));

  const globalRepeats = reordered.filter((id) => id && opts.usedGlobal.has(id)).length;
  const selectedRepeats = reordered.filter((id) => id && selectedSet.has(id) && opts.usedSelected.has(id)).length;
  const selectedUsed = reordered.filter((id) => id && selectedSet.has(id)).length;

  let score = 94;
  score -= conflicts * 12;
  score -= selectedRepeats * 8;
  score -= globalRepeats * 3;
  score -= Math.max(0, maxSeries - 4) * 5;
  score += Math.round((rng() - 0.5) * 6);
  score = Math.max(10, Math.min(100, score));

  const reasons: string[] = [];
  if (conflicts) reasons.push(`Guardrails: ${conflicts}`);
  reasons.push(`Selected: ${selectedUsed}/${selectedInPool.length || 0}`);
  reasons.push("Anti-repeat");
  reasons.push("Series spread");

  return {
    id: uid("mix"),
    tileIds: reordered.slice(0, 9),
    score,
    overallScore: score,
    rhythmScore: score,
    varietyScore: score,
    balanceScore: score,
    readinessScore: score,
    duplicatePenalty: conflicts,
    duplicateRisk: conflicts > 2 ? "High" : conflicts > 0 ? "Medium" : "Low",
    scoreDots: scoreDots(score),
    hasConflict: conflicts > 0,
    reasons,
    recommendation: "Balanced visual set",
    generatedAt: new Date().toISOString(),
  };
}

      function resolveMixPool(state: PrototypeState): string[] {
        const ready45 = state.assets.filter((a) => a.status === "ready" && a.ratio === "4:5");
        const ready45Ids = ready45.map((a) => a.id);

        const selected = state.selectedAssetIds
          .map((id) => state.assets.find((a) => a.id === id))
          .filter((a): a is Asset => Boolean(a));

        const selectedReady45Ids = selected
          .filter((a) => a.status === "ready" && a.ratio === "4:5")
          .map((a) => a.id);

        // Prefer selected, but always fill with other ready 4:5 posts (avoid duplicates).
        if (selectedReady45Ids.length) {
          const fill = ready45Ids.filter((id) => !selectedReady45Ids.includes(id));
          const pool = unique([...selectedReady45Ids, ...fill]);
          if (pool.length) return pool;
        }

        // Default pool: any ready 4:5 posts.
        if (ready45Ids.length) return ready45Ids;

        // Last resort: any ready assets.
        const anyReady = state.assets.filter((a) => a.status === "ready");
        return anyReady.map((a) => a.id);
      }

      return {
        ...initial,

        scanMissingAssetAnalysis: async (ids?: string[]) => {
          const current = get();
          const idSet = new Set(ids ?? current.assets.map((a) => a.id));

          const targets = current.assets.filter((a) => idSet.has(a.id) && !a.analysis && !analyzing.has(a.id));
          if (!targets.length) return;

          const targetIds = targets.map((t) => t.id);

          // mark as in-flight (local guard) + expose for UI
          for (const a of targets) analyzing.add(a.id);
          set((st) => ({
            analysisPendingIds: unique([...(st.analysisPendingIds ?? []), ...targetIds]),
          }));

          try {
            // sequential scan gives stable progress updates and avoids heavy parallel work
            for (const id of targetIds) {
              // Asset may have been removed (e.g., user cleared uploads mid-scan)
              const snap = get();
              const asset = snap.assets.find((a) => a.id === id);
              if (!asset) {
                set((st) => ({
                  analysisPendingIds: (st.analysisPendingIds ?? []).filter((x) => x !== id),
                }));
                continue;
              }

              const analysis = await computeAssetAnalysisFromUrl(asset.thumbUrl, { size: 64 });

              // Update asset if it still exists, then mark this id as done
              set((st) => ({
                assets: st.assets.map((a) => (a.id === id ? { ...a, analysis } : a)),
                analysisPendingIds: (st.analysisPendingIds ?? []).filter((x) => x !== id),
              }));
            }
          } finally {
            for (const a of targets) analyzing.delete(a.id);
            // Safety: drop any leftover target ids from pending
            set((st) => ({
              analysisPendingIds: (st.analysisPendingIds ?? []).filter((x) => !targetIds.includes(x)),
            }));
          }
        },

        getAssetById: (id) => get().assets.find((a) => a.id === id),

        getPackTargetCount: () => getPackSlotCount(get().packMode),

        setPackMode: (mode) =>
          set((state) => {
            const targetCount = getPackSlotCount(mode);
            const selectedAssetIds = state.selectedAssetIds.slice(0, targetCount);

            return {
              packMode: mode,
              selectedAssetIds,
              readout: computeReadoutLite({ selectedAssetIds, mixes: state.mixes }),
            };
          }),

        toggleSelect: (id) =>
          set((state) => {
            const isOn = state.selectedAssetIds.includes(id);
            const targetCount = getPackSlotCount(state.packMode);
            const selectedAssetIds = isOn
              ? state.selectedAssetIds.filter((x) => x !== id)
              : state.selectedAssetIds.length >= targetCount
                ? state.selectedAssetIds
                : [...state.selectedAssetIds, id];

            return {
              selectedAssetIds,
              readout: computeReadoutLite({ selectedAssetIds, mixes: state.mixes }),
            };
          }),

        clearSelection: () =>
          set((state) => {
            const selectedAssetIds: string[] = [];
            return {
              selectedAssetIds,
              readout: computeReadoutLite({ selectedAssetIds, mixes: state.mixes }),
            };
          }),

        addUploads: async (filesLike) => {
          const files = Array.isArray(filesLike) ? filesLike : Array.from(filesLike);
          if (!files.length) return;

          const MAX_FILES = 24;
          const MAX_BYTES = 8 * 1024 * 1024;

          const snap = get();
          const remaining = Math.max(0, MAX_FILES - (snap.uploadAssetIds?.length ?? 0));

          const accepted: Asset[] = [];
          const acceptedIds: string[] = [];
          const rejected: string[] = [];

          for (const f of files) {
            if (accepted.length >= remaining) break;

            if (!f.type?.startsWith("image/")) {
              rejected.push(`${f.name}: not an image`);
              continue;
            }
            if (f.size > MAX_BYTES) {
              rejected.push(`${f.name}: >8MB`);
              continue;
            }

            const objectUrl = URL.createObjectURL(f);
            const id = uid("u");

            accepted.push({
              id,
              thumbUrl: objectUrl,
              ratio: "4:5",
              status: "ready",
              series: "Uploads",
              createdAt: new Date().toISOString(),
              source: "upload",
              fileName: f.name,
              fileSize: f.size,
              objectUrl,
              file: f,
            });

            acceptedIds.push(id);
          }

          const overflow = files.length - accepted.length;
          if (overflow > 0 && remaining === 0) rejected.push("Limit reached (24 uploads).");

          set((st) => ({
            assets: [...accepted, ...st.assets],
            uploadAssetIds: [...st.uploadAssetIds, ...acceptedIds],
            uploadError: rejected.length ? rejected.slice(0, 3).join(" · ") : undefined,
          }));

          if (acceptedIds.length) {
            await get().scanMissingAssetAnalysis(acceptedIds);

            // Auto-regenerate if mixes already exist (keeps Smart Mix in sync)
            if (get().mixes.length) await get().generateMixes();
          }
        },

        removeUpload: async (id) => {
          const snap = get();
          if (!snap.uploadAssetIds.includes(id)) return;

          const a = snap.assets.find((x) => x.id === id);
          if (a?.source === "upload") {
            const u = a.objectUrl ?? a.thumbUrl;
            try {
              URL.revokeObjectURL(u);
            } catch {
              // ignore
            }
          }

          set((st) => {
            const assets = st.assets.filter((x) => x.id !== id);
            const uploadAssetIds = st.uploadAssetIds.filter((x) => x !== id);
            const selectedAssetIds = st.selectedAssetIds.filter((x) => x !== id);

            const planner = st.planner.map((p) => (p.tileId === id ? { ...p, tileId: undefined } : p));
            const sequence = st.sequence.map((d) => (d.tileId === id ? { ...d, tileId: undefined } : d));

            const analysisPendingIds = (st.analysisPendingIds ?? []).filter((x) => x !== id);

            return {
              assets,
              uploadAssetIds,
              selectedAssetIds,
              planner,
              sequence,
              analysisPendingIds,
              uploadError: undefined,
              readout: computeReadoutLite({ selectedAssetIds, mixes: st.mixes }),
            };});

          if (get().mixes.length) await get().generateMixes();
        },

        clearUploads: () => {
          const snap = get();
          const ids = snap.uploadAssetIds.slice();
          if (!ids.length) return;

          for (const id of ids) {
            const a = snap.assets.find((x) => x.id === id);
            if (a?.source === "upload") {
              const u = a.objectUrl ?? a.thumbUrl;
              try {
                URL.revokeObjectURL(u);
              } catch {
                // ignore
              }
            }
          }

          set((st) => {
            const removeSet = new Set(st.uploadAssetIds);

            const assets = st.assets.filter((a) => a.source !== "upload");
            const selectedAssetIds = st.selectedAssetIds.filter((id) => !removeSet.has(id));

            const planner = st.planner.map((p) => (p.tileId && removeSet.has(p.tileId) ? { ...p, tileId: undefined } : p));
            const sequence = st.sequence.map((d) => (d.tileId && removeSet.has(d.tileId) ? { ...d, tileId: undefined } : d));

            const analysisPendingIds = (st.analysisPendingIds ?? []).filter((id) => !removeSet.has(id));

            return {
              assets,
              uploadAssetIds: [],
              uploadError: undefined,
              selectedAssetIds,
              planner,
              sequence,
              analysisPendingIds,
              readout: computeReadoutLite({ selectedAssetIds, mixes: st.mixes }),
            };});

          // Keep mixes consistent (fallback to mock assets)
          if (get().mixes.length) void get().generateMixes();
        },

        generateMixes: async () => {
          // Ensure analysis is available for the current pool (v3 foundation)
          const snap = get();
          const poolIds0 = resolveMixPool(snap);
          if (poolIds0.length) await get().scanMissingAssetAnalysis(poolIds0);

          set((state) => {
            const poolIds = resolveMixPool(state);
            if (!poolIds.length) return {};

            const seed = state.mixSeed ?? 1;
            const lockedSlots = normalizeLockedSlots(state.lockedSlots);
            const usedGlobal = new Set<string>();
            const usedSelected = new Set<string>();

            const mixes: Mix[] = [];
            const getAsset = (id: string) => state.assets.find((a) => a.id === id);

            const MIX_COUNT = 4; // 5–10 candidates target (demo-friendly)
            for (let i = 0; i < MIX_COUNT; i++) {
              const raw = buildMixFromPool(state, poolIds, {
                mixIndex: i,
                seed,
                usedGlobal,
                usedSelected,
              });

              // v3: optimize 3×3 order + apply adjacency/similarity + rhythm/variety metrics
              const processed = mixV3PostProcessMix(raw, getAsset, seed, 700 + i * 31);
              const lockedTileIds = applyLockedSlotsToTileIds(processed.tileIds, lockedSlots, poolIds);
              const mix = scoreMixV2({ ...processed, tileIds: lockedTileIds }, getAsset, lockedSlots);

              mixes.push(mix);

              // reserve tiles for anti-repeat across candidates (use processed tile order)
              for (const id of mix.tileIds) {
                usedGlobal.add(id);
                if (state.selectedAssetIds.includes(id)) usedSelected.add(id);
              }
            }

            const noConflict = mixes.filter((m) => !m.hasConflict);
            const best = (noConflict.length ? noConflict : mixes)
              .slice()
              .sort((a, b) => (b.overallScore ?? b.score) - (a.overallScore ?? a.score))[0]?.id;
            const bestMix = mixes.find((m) => m.id === best);

            const selectedAssetIds = state.selectedAssetIds;
            return {
              mixes,
              bestMixId: best,
              ...mixSelectedMeta(bestMix, lockedSlots),
              readout: computeReadoutLite({ selectedAssetIds, mixes }),
            };
          });
        },

        regenerateMixes: async () => {
          // Predictable-but-different: bump seed, then rebuild
          set((st) => ({ mixSeed: (st.mixSeed ?? 1) + 1 }));
          await get().generateMixes();
        },

        pickBestMix: (mixId) =>
          set((state) => {
            if (!state.mixes.length) return {};
            const lockedSlots = normalizeLockedSlots(state.lockedSlots);
            const requested = mixId ? state.mixes.find((m) => m.id === mixId) : undefined;
            if (requested) {
              return {
                bestMixId: requested.id,
                ...mixSelectedMeta(requested, lockedSlots),
              };
            }

            const noConflict = state.mixes.filter((m) => !m.hasConflict);
            const bestMix = (noConflict.length ? noConflict : state.mixes)
              .slice()
              .sort((a, b) => (b.overallScore ?? b.score) - (a.overallScore ?? a.score))[0];

            return {
              bestMixId: bestMix?.id,
              ...mixSelectedMeta(bestMix, lockedSlots),
            };
          }),

        toggleMixSlotLock: (mixId, slotIndex) =>
          set((state) => {
            const mix = state.mixes.find((m) => m.id === mixId);
            const assetId = mix?.tileIds[slotIndex];
            if (!mix || !assetId) return {};

            const lockedSlots = normalizeLockedSlots(state.lockedSlots);
            if (lockedSlots[slotIndex] === assetId) delete lockedSlots[slotIndex];
            else lockedSlots[slotIndex] = assetId;

            const scoredMixes = state.mixes.map((candidate) =>
              scoreMixV2(candidate, (id) => state.assets.find((asset) => asset.id === id), lockedSlots)
            );
            const selected = scoredMixes.find((candidate) => candidate.id === mixId);

            return {
              mixes: scoredMixes,
              bestMixId: mixId,
              ...mixSelectedMeta(selected, lockedSlots),
            };
          }),

        replaceMixTile: (mixId, slotIndex) => {
          let replaced = false;

          set((state) => {
            const lockedSlots = normalizeLockedSlots(state.lockedSlots);
            if (lockedSlots[slotIndex]) return {};

            const mix = state.mixes.find((candidate) => candidate.id === mixId);
            if (!mix) return {};

            const currentIds = mix.tileIds.slice(0, 9);
            const currentId = currentIds[slotIndex];
            const used = new Set(currentIds.filter((id, index) => Boolean(id) && index !== slotIndex));
            const poolIds = resolveMixPool(state);
            const selected = new Set(state.selectedAssetIds);
            const seriesCounts = countBy(
              currentIds
                .map((id, index) => (index === slotIndex || !id ? undefined : state.assets.find((asset) => asset.id === id)?.series))
                .filter((series): series is string => Boolean(series))
            );

            const candidates = poolIds
              .map((id) => state.assets.find((asset) => asset.id === id))
              .filter((asset): asset is Asset => Boolean(asset))
              .filter((asset) => asset.status === "ready" && asset.ratio === "4:5")
              .filter((asset) => asset.id !== currentId && !used.has(asset.id))
              .sort((a, b) => {
                const aScore =
                  (selected.has(a.id) ? 40 : 0) -
                  (seriesCounts.get(a.series) ?? 0) * 8 +
                  (a.source === "upload" ? 4 : 0);
                const bScore =
                  (selected.has(b.id) ? 40 : 0) -
                  (seriesCounts.get(b.series) ?? 0) * 8 +
                  (b.source === "upload" ? 4 : 0);
                if (bScore !== aScore) return bScore - aScore;
                return a.id.localeCompare(b.id);
              });

            const replacement = candidates[0];
            if (!replacement) return {};

            replaced = true;
            const nextTileIds = currentIds.slice();
            nextTileIds[slotIndex] = replacement.id;

            const getAsset = (id: string) => state.assets.find((asset) => asset.id === id);
            const mixes = state.mixes.map((candidate) => {
              if (candidate.id !== mixId) return scoreMixV2(candidate, getAsset, lockedSlots);
              return scoreMixV2({ ...candidate, tileIds: nextTileIds }, getAsset, lockedSlots);
            });
            const selectedMix = mixes.find((candidate) => candidate.id === mixId);

            return {
              mixes,
              bestMixId: mixId,
              ...mixSelectedMeta(selectedMix, lockedSlots),
            };
          });

          return replaced;
        },

        replaceWeakMixTile: (mixId) => {
          const state = get();
          const mix = state.mixes.find((candidate) => candidate.id === mixId);
          if (!mix) return false;

          const lockedSlots = normalizeLockedSlots(state.lockedSlots);
          const weakSlot =
            typeof mix.weakSlotIndex === "number"
              ? lockedSlots[mix.weakSlotIndex]
                ? findWeakSlotIndex(mix.tileIds, state.getAssetById, lockedSlots)
                : mix.weakSlotIndex
              : findWeakSlotIndex(mix.tileIds, state.getAssetById, lockedSlots);

          if (weakSlot < 0 || lockedSlots[weakSlot]) return false;
          return get().replaceMixTile(mixId, weakSlot);
        },

        reorderMixTiles: (mixId, fromIndex, toIndex) => {
          let reordered = false;

          set((state) => {
            if (
              fromIndex === toIndex ||
              fromIndex < 0 ||
              fromIndex > 8 ||
              toIndex < 0 ||
              toIndex > 8
            ) {
              return {};
            }

            const lockedSlots = normalizeLockedSlots(state.lockedSlots);
            if (lockedSlots[fromIndex] || lockedSlots[toIndex]) return {};

            const mix = state.mixes.find((candidate) => candidate.id === mixId);
            if (!mix) return {};

            const nextTileIds = mix.tileIds.slice(0, 9);
            if (!nextTileIds[fromIndex] || !nextTileIds[toIndex]) return {};

            [nextTileIds[fromIndex], nextTileIds[toIndex]] = [nextTileIds[toIndex], nextTileIds[fromIndex]];

            const getAsset = (id: string) => state.assets.find((asset) => asset.id === id);
            const mixes = state.mixes.map((candidate) => {
              if (candidate.id !== mixId) return scoreMixV2(candidate, getAsset, lockedSlots);
              return scoreMixV2({ ...candidate, tileIds: nextTileIds }, getAsset, lockedSlots);
            });
            const selectedMix = mixes.find((candidate) => candidate.id === mixId);

            reordered = true;

            return {
              mixes,
              bestMixId: mixId,
              ...mixSelectedMeta(selectedMix, lockedSlots),
              readout: computeReadoutLite({ selectedAssetIds: state.selectedAssetIds, mixes }),
            };
          });

          return reordered;
        },

        buildSequenceFromBest: () =>
          set((state) => {
            const best = state.mixes.find((m) => m.id === state.bestMixId) ?? state.mixes[0];
            if (!best) return {};

            // Use 4:5 posts only for the weekly plan
            const posts = best.tileIds
              .map((id) => state.assets.find((a) => a.id === id))
              .filter((a): a is Asset => Boolean(a))
              .filter((a) => a.ratio === "4:5");

            const fallbackPosts = state.assets.filter((a) => a.status === "ready" && a.ratio === "4:5");
            const pool = posts.length ? posts : fallbackPosts;
            if (!pool.length) return {};

            const sequence: SequenceDay[] = Array.from({ length: 7 }, (_, dayIndex) => {
              const tile = pool[dayIndex % pool.length];
              return { dayIndex, tileId: tile?.id };
            });

            return { sequence };
          }),

        sendSequenceToPlanner: () =>
          set((state) => {
            // If sequence is empty, try to build it first.
            const seq = state.sequence.some((d) => d.tileId)
              ? state.sequence
              : (() => {
                  const best = state.mixes.find((m) => m.id === state.bestMixId) ?? state.mixes[0];
                  if (!best) return state.sequence;
                  const posts = best.tileIds
                    .map((id) => state.assets.find((a) => a.id === id))
                    .filter((a): a is Asset => Boolean(a))
                    .filter((a) => a.ratio === "4:5");
                  if (!posts.length) return state.sequence;
                  return Array.from({ length: 7 }, (_, dayIndex) => ({
                    dayIndex,
                    tileId: posts[dayIndex % posts.length]?.id,
                  }));
                })();

            const planner = state.planner.map((slot) => {
              if (slot.slotIndex !== 0) return slot; // only fill A slots
              const day = seq.find((d) => d.dayIndex === slot.dayIndex);
              return { ...slot, tileId: day?.tileId };
            });

            return { planner, sequence: seq };
          }),

        setPlannerSlot: ((...args: any[]) =>
          set((state) => {
            // Overload resolver:
            // 1) legacy: (dayIndex, tileId?, storyId?)
            // 2) new: (dayIndex, slotIndex, tileId?, from?)
            const [dayIndex, a, b, c] = args as [number, any, any, any];
            const slotIndex = typeof a === "number" ? (a as number) : 0;
            const tileId = typeof a === "number" ? (b as string | undefined) : (a as string | undefined);
            const from = typeof a === "number" ? (c as DragFrom | undefined) : undefined;

            let planner = state.planner.map((s) =>
              s.dayIndex === dayIndex && s.slotIndex === slotIndex ? { ...s, tileId } : s
            );

            // If drag source is provided, clear it (move). If same slot, no-op.
            if (from && !(from.dayIndex === dayIndex && from.slotIndex === slotIndex)) {
              planner = planner.map((s) =>
                s.dayIndex === from.dayIndex && s.slotIndex === from.slotIndex ? { ...s, tileId: undefined } : s
              );
            }

            return { planner };
          })) as PrototypeState["setPlannerSlot"],

        clearPlannerSlot: ((...args: any[]) =>
          set((state) => {
            const [dayIndex, slotIndexMaybe] = args as [number, any];
            const slotIndex = typeof slotIndexMaybe === "number" ? slotIndexMaybe : 0;
            const planner = state.planner.map((s) =>
              s.dayIndex === dayIndex && s.slotIndex === slotIndex ? { ...s, tileId: undefined } : s
            );
            return { planner };
          })) as PrototypeState["clearPlannerSlot"],

        generateCaptions: (tone, length, anchorTileId) =>
          set((state) => {
            const fallbackMon = state.planner.find((s) => s.dayIndex === 0 && s.slotIndex === 0)?.tileId;
            const fallbackAny = state.planner.find((s) => s.slotIndex === 0)?.tileId;
            const anchorId = anchorTileId ?? fallbackMon ?? fallbackAny;

            const base = anchorId ? `Post ${humanId(anchorId)}` : "Post";

            // Premium decision: keep it tight (1–2 variants)
            const bank = captionBankByTone[tone] ?? captionBankByTone.Minimal;
            const v1 = `${base}. ${one(bank)}`;
            const v2 = `${base}. ${one(bank)}`;

            const n = length === "Short" ? 1 : 2;
            const variants = pickN([v1, v2], n);

            const hashtags = one([
              ["#workflow", "#planning", "#sequence", "#creatorops", "#minimal"],
              ["#creatorops", "#planning", "#cinematic", "#workflow", "#mood"],
              ["#grid", "#workflow", "#planning", "#sequence", "#creatorops"],
            ]);

            return { captions: { tone, length, variants, hashtags, cta: ctaByTone[tone], source: "local" } };
          }),

        setGeneratedCaption: (result, source = "openai") =>
          set((state) => {
            const caption = result.caption.trim();
            const alt = result.alt.trim();
            const variants = [caption, alt].filter(Boolean).slice(0, 2);
            const hashtags = result.hashtags
              .map((tag) => tag.trim())
              .filter(Boolean)
              .slice(0, 10);

            return {
              captions: {
                ...state.captions,
                variants,
                hashtags,
                cta: result.cta.trim(),
                source,
              },
            };
          }),

        setAiPrompt: (prompt) =>
          set((state) => ({
            ai: { ...state.ai, prompt },
          })),

        generateDraftFromPrompt: async (promptMaybe?: string, anchorTileId?: string) => {
          const prompt = (promptMaybe ?? get().ai.prompt ?? "").toString();
          const reqId = ++draftReqId;

          // persist prompt immediately (so UI doesn't lose it on navigation)
          set((state) => ({ ai: { ...state.ai, prompt } }));

          // async placeholder (later: replace with OpenAI call)
          await new Promise((r) => setTimeout(r, 350));
          if (reqId !== draftReqId) return; // ignore stale requests

          const s = get();
          const anchorId =
            anchorTileId ??
            s.planner.find((p) => p.dayIndex === 0 && p.slotIndex === 0)?.tileId ??
            s.planner.find((p) => p.slotIndex === 0)?.tileId;

          const label = anchorId ? humanId(anchorId) : "#";
          const trimmed = prompt.trim();

          const draft = trimmed
            ? `Post ${label}. ${trimmed}\n\n(Placeholder — later we'll replace this with OpenAI output.)`
            : `Post ${label}. (Placeholder — add a prompt above.)`;

          set((state) => ({ ai: { ...state.ai, prompt, draft } }));
        },

        exportTextPack: () => {
          const s = get();
          const lines: string[] = [];
          lines.push("CreatorOps — Publication pack");
          lines.push("");

          // Captions
          lines.push("CAPTIONS");
          s.captions.variants.forEach((v, i) => {
            lines.push(`${i + 1}. ${v}`);
          });
          lines.push("");

          // Hashtags
          lines.push("HASHTAGS");
          lines.push(s.captions.hashtags.join(" "));
          lines.push("");

          if (s.captions.cta?.trim()) {
            lines.push("CTA");
            lines.push(s.captions.cta);
            lines.push("");
          }

          // Planner
          lines.push("PLANNER (WEEK)");
          const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const slotA = s.planner.find((p) => p.dayIndex === dayIndex && p.slotIndex === 0)?.tileId ?? "-";
            lines.push(`${dayNames[dayIndex]}: ${slotA}`);
          }
          lines.push("");

          // AI draft (optional)
          if (s.ai.draft.trim()) {
            lines.push("DRAFT");
            lines.push(s.ai.draft);
            lines.push("");
          }

          return lines.join("\n");
        },
      };
    },
    {
      // Beta persistence: keep planning/text state across refresh.
      // NOTE: uploads (File/objectURL) are session-only and intentionally NOT persisted.
      name: "creatorops-beta-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        ai: s.ai,
        captions: s.captions,
        packMode: s.packMode,
        selectedAssetIds: s.selectedAssetIds,
        mixSeed: s.mixSeed,
        mixes: s.mixes,
        bestMixId: s.bestMixId,
        selectedMixId: s.selectedMixId,
        selectedMixScore: s.selectedMixScore,
        selectedMixReasons: s.selectedMixReasons,
        selectedMixGeneratedAt: s.selectedMixGeneratedAt,
        lockedSlots: s.lockedSlots,
        lockedAssetIds: s.lockedAssetIds,
        planner: s.planner,
        sequence: s.sequence,
      }),
      merge: (persisted, current) => {
        const p: any = (persisted as any) || {};
        const valid = new Set(current.assets.map((a) => a.id));
        const keep = (id: any) => typeof id === "string" && valid.has(id);

        const packMode: PackMode =
          p.packMode === "extended-pack" || p.packMode === "week-pack" ? p.packMode : current.packMode;
        const targetCount = getPackSlotCount(packMode);

        const selectedAssetIds = Array.isArray(p.selectedAssetIds)
          ? p.selectedAssetIds.filter(keep).slice(0, targetCount)
          : current.selectedAssetIds.slice(0, targetCount);

        const planner = Array.isArray(p.planner)
          ? p.planner.map((slot: any) => ({
              ...slot,
              tileId: keep(slot?.tileId) ? slot.tileId : undefined,
              storyId: undefined,
            }))
          : current.planner;

        const sequence = Array.isArray(p.sequence)
          ? p.sequence.map((d: any) => ({
              ...d,
              tileId: keep(d?.tileId) ? d.tileId : undefined,
              storyId: undefined,
            }))
          : current.sequence;

        const lockedSlots = normalizeLockedSlots(p.lockedSlots);
        for (const [slot, id] of Object.entries(lockedSlots)) {
          if (!keep(id)) delete lockedSlots[Number(slot)];
        }

        const mixes = Array.isArray(p.mixes)
          ? p.mixes.filter(
              (m: any) =>
                m &&
                Array.isArray(m.tileIds) &&
                m.tileIds.length === 9 &&
                m.tileIds.every(keep)
            )
              .map((m: Mix) => scoreMixV2(m, (id) => current.assets.find((a) => a.id === id), lockedSlots))
          : current.mixes;

        const bestMixId =
          typeof p.bestMixId === "string" && mixes.some((m: any) => m.id === p.bestMixId)
            ? p.bestMixId
            : undefined;

        const mixSeed = typeof p.mixSeed === "number" ? p.mixSeed : current.mixSeed;
        const captions = p.captions ? p.captions : current.captions;
        const ai = p.ai ? p.ai : current.ai;
        const selectedMix = mixes.find((m: Mix) => m.id === bestMixId);

        return {
          ...current,
          ai,
          captions,
          packMode,
          selectedAssetIds,
          mixSeed,
          mixes,
          bestMixId,
          ...mixSelectedMeta(selectedMix, lockedSlots),
          planner,
          sequence,
          readout: computeReadoutLite({ selectedAssetIds, mixes }),
        };
      },
    }
  )
);
