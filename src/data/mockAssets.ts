export type AssetRatio = "4:5" | "9:16";
export type AssetStatus = "ready" | "draft";
export type AssetSource = "mock" | "upload";

export type AssetAnalysis = {
  // 0..1 metrics, computed client-side via Canvas scan pipeline
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
  busy: number;
};

export type Asset = {
  id: string;
  thumbUrl: string;
  ratio: AssetRatio;
  status: AssetStatus;
  series: string;
  createdAt: string; // ISO

  // Computed in-browser (offline-safe) for Smart Mix scoring/guardrails
  analysis?: AssetAnalysis;

  // Source + upload metadata (session-only; not persisted)
  source: AssetSource;
  fileName?: string;
  fileSize?: number;
  objectUrl?: string;
  file?: File;

  // Optional metadata (used by Smart Mix heuristics in later iterations)
  collection?: string;
  mood?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function buildMockAssets(): Asset[] {
  const assets: Asset[] = [];

  // 12 x 4:5
  for (let i = 1; i <= 12; i++) {
    assets.push({
      id: `p-${pad2(i)}`,
      thumbUrl: `/creatorops/thumbs/4x5/thumb-4x5-${pad2(i)}.jpg`,
      ratio: "4:5",
      status: "ready",
      series: i <= 6 ? "Series A" : "Series B",
      createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
      source: "mock",
    });
  }

  // 12 x 9:16
  for (let i = 1; i <= 12; i++) {
    assets.push({
      id: `s-${pad2(i)}`,
      thumbUrl: `/creatorops/thumbs/9x16/thumb-9x16-${pad2(i)}.png`,
      ratio: "9:16",
      status: "ready",
      series: i <= 6 ? "Series A" : "Series B",
      createdAt: new Date(Date.now() - (i + 12) * 86_400_000).toISOString(),
      source: "mock",
    });
  }

  return assets;
}
