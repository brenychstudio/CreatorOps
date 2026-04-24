// src/pages/prototype/Export.tsx
import JSZip from "jszip";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";

const APP_VERSION = (import.meta as any).env?.VITE_APP_VERSION ?? "dev";
const BUILD_TIME = (import.meta as any).env?.VITE_BUILD_TIME ?? "";
import { usePrototypeStore } from "../../store/prototypeStore";

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function extFromMime(mime?: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

function extFromPath(url: string) {
  const clean = url.split("?")[0] || "";
  const last = clean.split("/").pop() || "";
  const dot = last.lastIndexOf(".");
  if (dot > 0) {
    const ext = last.slice(dot + 1).toLowerCase();
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  }
  return "jpg";
}

function tsStamp(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}`;
}

function csvEscape(v: string) {
  const s = (v ?? "").toString();
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type ExportTile = {
  index: number; // 0..8 (grid order)
  slot: string;
  id: string | null;
  series: string | null;
  ratio: string | null;
  source: string | null;
  file: string | null; // images/01.png ...
};

export default function Export() {
  const navigate = useNavigate();
  const pressable = "transition active:translate-y-[1px] active:scale-[0.98]";

  const assets = usePrototypeStore((s) => s.assets);
  const selectedAssetIds = usePrototypeStore((s) => s.selectedAssetIds);
  const planner = usePrototypeStore((s) => s.planner);
  const mixes = usePrototypeStore((s) => s.mixes);
  const bestMixId = usePrototypeStore((s) => s.bestMixId);
  const mixSeed = usePrototypeStore((s) => s.mixSeed);

  const getAssetById = usePrototypeStore((s) => s.getAssetById);

  const captions = usePrototypeStore((s) => s.captions);
  const ai = usePrototypeStore((s) => s.ai);
  const exportTextPack = usePrototypeStore((s) => s.exportTextPack);

  const clearUploads = usePrototypeStore((s) => s.clearUploads);
  const clearSelection = usePrototypeStore((s) => s.clearSelection);

  const [isZipping, setIsZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const [feedbackText, setFeedbackText] = useState("");
  const [diagCopied, setDiagCopied] = useState(false);

  // Week (Slot A): 7 tiles
  const weekA = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayIndex) =>
      planner.find((s) => s.dayIndex === dayIndex && s.slotIndex === 0)?.tileId
    );
  }, [planner]);

  const usedWeekA = useMemo(() => new Set(weekA.filter(Boolean) as string[]), [weekA]);

  // 2 suggestions for completing the 3×3 grid (same logic as Planner)
  const suggestionIds = useMemo(() => {
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
      .filter((a) => !usedWeekA.has(a.id))
      .map((a) => a.id);

    return candidates.slice(0, 2);
  }, [assets, selectedAssetIds, getAssetById, usedWeekA]);

  const gridIds = useMemo(() => [...weekA, ...suggestionIds].slice(0, 9), [weekA, suggestionIds]);

  const hasAnyGrid = gridIds.some(Boolean);

  if (!hasAnyGrid) {
    return (
      <FlowEmptyState
        title="Nothing to export yet"
        desc="Create a Smart Mix and pick a best grid first, then complete your plan."
        primaryLabel="Go to Smart Mix"
        primaryTo="/prototype/smart-mix"
        secondaryLabel="Back to Library"
        secondaryTo="/prototype/library"
      />
    );
  }


  const bestMix = useMemo(() => mixes.find((m) => m.id === bestMixId), [mixes, bestMixId]);

  const buildManifest = (tiles: ExportTile[]) => {
    const selected = selectedAssetIds.slice();
    const used = tiles.map((t) => t.id).filter(Boolean) as string[];

    return {
      app: "CreatorOps",
      kind: "export-pack",
      version: "beta",
      appVersion: APP_VERSION,
      buildTime: BUILD_TIME || null,
      generatedAt: new Date().toISOString(),
      seed: mixSeed ?? null,
      selection: {
        selectedAssetIds: selected,
        usedInGrid: used,
      },
      smartMix: {
        bestMixId: bestMixId ?? null,
        bestMixScore: bestMix?.score ?? null,
        bestMixReasons: bestMix?.reasons ?? [],
      },
      grid: tiles.map((t) => ({
        index: t.index,
        slot: t.slot,
        id: t.id,
        series: t.series,
        ratio: t.ratio,
        source: t.source,
        file: t.file,
      })),
      captions: {
        tone: captions.tone,
        length: captions.length,
        primary: captions.variants?.[0] ?? "",
        alt: captions.variants?.[1] ?? "",
        hashtags: captions.hashtags ?? [],
      },
      ai: {
        prompt: ai?.prompt ?? "",
        draft: ai?.draft ?? "",
      },
      files: {
        captionsTxt: "captions.txt",
        hashtagsTxt: "hashtags.txt",
        captionsCsv: "captions.csv",
        manifest: "manifest.json",
        imagesDir: "images/",
      },
    };
  };


  const makeTilesBase = (): ExportTile[] => {
    return gridIds.map((id, i) => {
      const a: any = id ? getAssetById(id) : undefined;
      const slot = i < 7 ? DAYS[i] : `Next ${i - 6}`;
      return {
        index: i,
        slot,
        id: id ?? null,
        series: a?.series ?? null,
        ratio: a?.ratio ?? null,
        source: a?.source ?? "mock",
        file: null,
      };
    });
  };

  const buildDiagnosticsText = () => {
    const tiles = makeTilesBase();
    const manifest = buildManifest(tiles);

    const summary = {
      app: "CreatorOps",
      kind: "beta-feedback",
      generatedAt: new Date().toISOString(),
      seed: manifest.seed,
      selectedCount: manifest.selection?.selectedAssetIds?.length ?? 0,
      bestMixId: manifest.smartMix?.bestMixId ?? null,
      bestMixScore: manifest.smartMix?.bestMixScore ?? null,
      bestMixReasons: manifest.smartMix?.bestMixReasons ?? [],
      ua: navigator.userAgent,
      gridFiles: (manifest.grid ?? []).map((g: any) => ({
        index: g.index,
        slot: g.slot,
        id: g.id,
        source: g.source,
      })),
      captions: {
        tone: manifest.captions?.tone,
        length: manifest.captions?.length,
      },
    };

    return [
      "CreatorOps beta feedback diagnostics",
      `Version: ${APP_VERSION}${BUILD_TIME ? ` (${BUILD_TIME})` : ""}`,
      "",
      JSON.stringify(summary, null, 2),
      "",
      "Full manifest:",
      JSON.stringify(manifest, null, 2),
    ].join("\n");
  };

  const copyDiagnostics = async () => {
    const ok = await safeCopy(buildDiagnosticsText());
    if (ok) {
      setDiagCopied(true);
      window.setTimeout(() => setDiagCopied(false), 900);
    }
  };

  const sendFeedbackEmail = async () => {
    const tiles = makeTilesBase();
    const manifest = buildManifest(tiles);

    const body = [
      "CreatorOps beta feedback",
      `Version: ${APP_VERSION}${BUILD_TIME ? ` (${BUILD_TIME})` : ""}`,
      "",
      "Message:",
      feedbackText.trim() ? feedbackText.trim() : "(no message)",
      "",
      "Quick diagnostics:",
      `- generatedAt: ${new Date().toISOString()}`,
      `- seed: ${manifest.seed ?? "n/a"}`,
      `- selected: ${manifest.selection?.selectedAssetIds?.length ?? 0}`,
      `- bestMixScore: ${manifest.smartMix?.bestMixScore ?? "n/a"}`,
      `- reasons: ${(manifest.smartMix?.bestMixReasons ?? []).join(" | ")}`,
      "",
      "Tip: If needed, copy full diagnostics from the app (Export → Feedback → Copy diagnostics).",
    ].join("\n");

    const subject = "CreatorOps beta feedback";
    const gmailUrl =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    // Always copy the body so the user can paste it anywhere if needed.
    void safeCopy(body);

    // Gmail compose is the most reliable in-browser option (mailto can do nothing if no OS mail app is configured).
    const opened = window.open(gmailUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = gmailUrl;
  };

  const resetSavedState = () => {
    try {
      window.localStorage.removeItem("creatorops-beta-v1");
      window.localStorage.removeItem("creatorops_onboarding_v1_hide");
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem("creatorops_onboarding_v1_seen");
    } catch {
      // ignore
    }
    // reload to ensure store re-hydrates from a clean slate
    window.location.href = "/prototype/library";
  };

  const onDownloadPack = async () => {
    if (isZipping) return;

    setZipError(null);
    setIsZipping(true);

    try {
      const zip = new JSZip();

      // Human-readable text files
      const captionsText = [
        captions.variants?.[0] ? captions.variants[0] : "",
        captions.variants?.[1] ? `\n\n---\n\n${captions.variants[1]}` : "",
      ]
        .filter(Boolean)
        .join("");

      const hashtagsText = (captions.hashtags ?? []).join(" ");
      const packText = exportTextPack();

      zip.file("captions.txt", captionsText || "—");
      zip.file("hashtags.txt", hashtagsText || "—");
      zip.file("pack.txt", packText || "—");
      if (ai?.draft?.trim()) zip.file("ai-draft.txt", ai.draft);

      // Grid tiles (stable 0..8 order)
      const tiles: ExportTile[] = gridIds.map((id, i) => {
        const a: any = id ? getAssetById(id) : undefined;
        const slot = i < 7 ? DAYS[i] : `Next ${i - 6}`;
        return {
          index: i,
          slot,
          id: id ?? null,
          series: a?.series ?? null,
          ratio: a?.ratio ?? null,
          source: a?.source ?? "mock",
          file: null,
        };
      });

      // Images: 01..09 mapped to grid position (left→right, top→bottom)
      const imgFolder = zip.folder("images");
      if (imgFolder) {
        for (let i = 0; i < tiles.length; i++) {
          const t = tiles[i]!;
          if (!t.id) continue;

          const a: any = getAssetById(t.id);
          if (!a) continue;

          const order = String(i + 1).padStart(2, "0");

          // Prefer File for uploads
          const file: File | undefined = a.file;
          if (file) {
            const ext = extFromMime(file.type) || extFromPath(file.name);
            const name = `${order}.${ext}`;
            imgFolder.file(name, file);
            t.file = `images/${name}`;
            continue;
          }

          // Fallback: fetch blob from thumbUrl (works for local public assets)
          const url = String(a.thumbUrl || "");
          if (!url) continue;

          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`fetch ${res.status}`);
            const blob = await res.blob();
            const ext = extFromMime(blob.type) || extFromPath(url);
            const name = `${order}.${ext}`;
            imgFolder.file(name, blob);
            t.file = `images/${name}`;
          } catch {
            // If we can't fetch (e.g. URL revoked), skip image but keep manifest entry
          }
        }
      }

      // captions.csv: 1 row per grid image (stable 01..09)
      const primary = captions.variants?.[0] ?? "";
      const tags = (captions.hashtags ?? []).join(" ");
      const csvLines: string[] = [];
      csvLines.push(["filename", "slot", "caption", "hashtags"].join(","));

      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i]!;
        const filename = t.file ? t.file.replace(/^images\//, "") : ""; // inside images/
        csvLines.push(
          [
            csvEscape(filename),
            csvEscape(t.slot),
            csvEscape(primary),
            csvEscape(tags),
          ].join(",")
        );
      }

      zip.file("captions.csv", csvLines.join("\n"));

      // manifest.json
      const manifest = buildManifest(tiles);
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      // README
      zip.file(
        "README.txt",
        [
          "CreatorOps export pack (beta)",
          `App version: ${APP_VERSION}${BUILD_TIME ? ` (${BUILD_TIME})` : ""}`,
          "",
          "What’s inside:",
          "- images/01..09.*  → 3×3 grid in order (left→right, top→bottom)",
          "- captions.txt     → primary caption (+ alt, if available)",
          "- hashtags.txt     → hashtags line",
          "- captions.csv     → ready-to-copy table (filename + slot + caption + hashtags)",
          "- manifest.json    → machine-readable mapping (grid slots, ids, reasons)",
          "",
          "How to post (fast):",
          "1) Open images/ and post in filename order: 01,02,03 → 04,05,06 → 07,08,09",
          "2) Use captions.txt (or captions.csv) to copy caption + hashtags.",
          "",
          "Notes:",
          "- If an image file is missing, it couldn’t be fetched at export time (e.g. revoked URL).",
          "- Best mix reasons are recorded in manifest.json under smartMix.bestMixReasons.",
        ].join("\n")
      );

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const vSafe = String(APP_VERSION || "dev").replace(/[^a-zA-Z0-9._-]/g, "-");
      const filename = `creatorops-${vSafe}_pack_${tsStamp()}.zip`;
      downloadBlob(filename, blob);
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Failed to build zip.";
      setZipError(msg);
    } finally {
      setIsZipping(false);
    }
  };

  const Tile = (props: { id?: string; label: string; index: number }) => {
    const a: any = props.id ? getAssetById(props.id) : undefined;
    const order = String(props.index + 1).padStart(2, "0");

    return (
    <div className="min-w-0 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-1.5 sm:p-2">
        <div className="relative overflow-hidden rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)]">
          <div className="aspect-[4/5] w-full">
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
              <div className="flex h-full w-full items-center justify-center text-xs text-[color:var(--co-muted)]">
                Empty
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]/85 px-2 py-1 text-[11px] text-[color:var(--co-muted)] backdrop-blur">
            <span className="text-[color:var(--co-text)]/80">{props.label}</span>
            <span className="mx-1 text-[color:var(--co-muted)]/60">·</span>
            <span className="text-[color:var(--co-muted)]/80">4:5</span>
          </div>

          <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-bg)]/55 px-2 py-1 text-[11px] text-[color:var(--co-text)]/85 backdrop-blur">
            {order}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-5 text-[color:var(--co-text)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg text-[color:var(--co-text)]">Export</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Real ZIP pack: 3×3 grid + captions + CSV.
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/prototype/captions")}
            className={[
              "flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Back to Captions
          </button>

          <button
            type="button"
            onClick={() => {
              clearUploads();
              clearSelection();
              navigate("/", { replace: false });
            }}
            className={[
              "flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: 3×3 preview */}
        <div className="min-w-0 lg:col-span-7">
          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--co-muted)]">3×3 pack preview</div>
              <div className="text-[11px] text-[color:var(--co-muted)]">Week (7) + Next (2)</div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {gridIds.map((id, i) => (
                <Tile
                  key={`${id ?? "empty"}-${i}`}
                  id={id}
                  label={i < 7 ? DAYS[i] : `Next ${i - 6}`}
                  index={i}
                />
              ))}
            </div>

            <div className="mt-3 text-[11px] text-[color:var(--co-muted)]">
              Exported filenames match this grid order: <span className="font-mono">01..09</span>.
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--co-muted)]">Download</div>
              <button
                type="button"
                onClick={onDownloadPack}
                disabled={isZipping}
                className={[
                  "w-full rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 sm:w-auto",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                  isZipping ? "opacity-70 cursor-wait" : "",
                ].join(" ")}
              >
                {isZipping ? "Building…" : "Download zip"}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-3 text-[11px] text-[color:var(--co-muted)]">
              Includes <span className="font-mono">images/01..09</span>, <span className="font-mono">captions.csv</span>,
              plus manifest + text files.
            </div>

            {zipError ? (
              <div className="mt-3 rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-3 text-[11px] text-[color:var(--co-muted)]">
                ZIP error: {zipError}
                <div className="mt-2 text-[11px]">
                  If you see “Cannot find module jszip”, run:{" "}
                  <span className="font-mono">npm i jszip</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[color:var(--co-muted)]">Next tool</div>
                <div className="mt-2 text-sm font-medium text-[color:var(--co-text)]">
                  Profile ready too?
                </div>
                <p className="mt-2 max-w-[34ch] text-[12px] leading-6 text-[color:var(--co-muted)]">
                  Use Bio Builder to align your avatar, bio, CTA, and profile preview with this
                  content pack.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/prototype/bio-builder?source=export", {
                    state: {
                      source: "export",
                      useCurrentExportPack: true,
                    },
                  })
                }
                className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable"
              >
                Open Bio Builder
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--co-muted)]">Feedback</div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={copyDiagnostics}
                  className={[
                    "flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    pressable,
                  ].join(" ")}
                >
                  {diagCopied ? "Copied" : "Copy diagnostics"}
                </button>

                <button
                  type="button"
                  onClick={sendFeedbackEmail}
                  className={[
                    "flex-1 rounded-full bg-[color:var(--co-text)] px-3 py-1.5 text-xs text-[color:var(--co-bg)] hover:opacity-90 sm:flex-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    pressable,
                  ].join(" ")}
                  title="Opens Gmail compose with a prefilled message (also copies text)"
                >
                  Send email
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What worked / what felt confusing / what should improve?"
                className="min-h-[92px] w-full resize-none rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-3 text-sm text-[color:var(--co-text)] placeholder:text-[color:var(--co-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)]"
              />

              <div className="text-[11px] text-[color:var(--co-muted)]">
                Tip: include what you expected, what happened, and whether you used uploads.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--co-muted)]">Reset</div>
              <button
                type="button"
                onClick={resetSavedState}
                className={[
                  "rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
                title="Clears saved beta state on this device"
              >
                Reset saved state
              </button>
            </div>

            <div className="mt-3 text-[11px] text-[color:var(--co-muted)]">
              Clears local saved progress (selection, mixes, planner, captions). Uploads are already session-only.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
