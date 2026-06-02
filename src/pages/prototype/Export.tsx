// src/pages/prototype/Export.tsx
import JSZip from "jszip";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import type { Asset } from "../../data/mockAssets";
import { writeClientReviewHandoff } from "../../modules/client-review/handoff";
import type { ClientReviewHandoffItem } from "../../modules/client-review/handoff";
import { writeMediaConverterHandoff } from "../../modules/media-converter/core/handoff";
import type { MediaConverterHandoffItem } from "../../modules/media-converter/core/handoff";
import { buildPackSlots, splitSlotsByWeek } from "../../modules/prototype/packPlanning";
import { usePrototypeStore, type ExtendedCaptionDraft, type Length, type Tone } from "../../store/prototypeStore";

type CreatorOpsImportMeta = ImportMeta & {
  env?: {
    VITE_APP_VERSION?: string;
    VITE_BUILD_TIME?: string;
  };
};

const env = (import.meta as CreatorOpsImportMeta).env;
const APP_VERSION = env?.VITE_APP_VERSION ?? "dev";
const BUILD_TIME = env?.VITE_BUILD_TIME ?? "";

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

function mimeHintFromExtension(extension: string): MediaConverterHandoffItem["mimeHint"] {
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
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
const PACK_CONTENTS = ["images/01–09", "captions.txt", "hashtags.txt", "captions.csv", "manifest.json", "README"];
const EXTENDED_PACK_CONTENTS = [
  "images/01-18",
  "captions.txt",
  "hashtags.txt",
  "captions.csv",
  "manifest.json",
  "README",
];

type ExportTile = {
  index: number; // 0..8 (grid order)
  slot: string;
  id: string | null;
  series: string | null;
  ratio: string | null;
  source: string | null;
  file: string | null; // images/01.png ...
};

type ExtendedExportView = "all" | "week-1" | "week-2";

type ExtendedExportPost = {
  index: number;
  postNumber: number;
  weekIndex: 1 | 2;
  weekLabel: "Week 1" | "Week 2";
  dayLabel: string;
  asset: Asset;
  draft: ExtendedCaptionDraft;
  hasSavedDraft: boolean;
};

function formatPostNumber(value: number) {
  return String(value).padStart(2, "0");
}

function buildExtendedFallbackDraft(opts: {
  asset?: Asset;
  postNumber: number;
  weekIndex: 1 | 2;
  tone: Tone;
  length: Length;
}): ExtendedCaptionDraft {
  return {
    caption: `Post #${opts.postNumber}. Caption draft included in Export Pack.`,
    cta: "Save this for your next content batch.",
    hashtags: ["#creatorops", "#weekpack", "#contentworkflow"],
    tone: opts.tone,
    length: opts.length,
  };
}

function buildExtendedPostText(post: ExtendedExportPost) {
  const tags = post.draft.hashtags.join(" ");
  return [
    `${post.weekLabel} / Post #${formatPostNumber(post.postNumber)} / ${post.dayLabel}`,
    "",
    post.draft.caption,
    "",
    `CTA: ${post.draft.cta || "-"}`,
    `Hashtags: ${tags || "-"}`,
  ].join("\n");
}

function buildExtendedPlainText(posts: ExtendedExportPost[]) {
  const lines: string[] = [];
  lines.push("CreatorOps Extended Pack Captions");
  lines.push("18 ordered posts");
  lines.push("");

  for (const week of [1, 2] as const) {
    lines.push(`Week ${week}`);
    lines.push("");

    posts
      .filter((post) => post.weekIndex === week)
      .forEach((post) => {
        lines.push(buildExtendedPostText(post));
        lines.push("");
        lines.push("---");
        lines.push("");
      });
  }

  return lines.join("\n").trim();
}

function buildExtendedCsvText(posts: Array<ExtendedExportPost & { file?: string | null }>) {
  const lines: string[] = [];
  lines.push(["post_number", "week", "day", "filename", "caption", "cta", "hashtags"].join(","));

  posts.forEach((post) => {
    const filename = post.file ? post.file.replace(/^images\//, "") : getExtendedZipFilename(post);

    lines.push(
      [
        csvEscape(formatPostNumber(post.postNumber)),
        csvEscape(post.weekLabel),
        csvEscape(post.dayLabel),
        csvEscape(filename),
        csvEscape(post.draft.caption),
        csvEscape(post.draft.cta),
        csvEscape(post.draft.hashtags.join(" ")),
      ].join(",")
    );
  });

  return lines.join("\n");
}

function getExtendedPostExtension(post: ExtendedExportPost) {
  const extension = post.asset.file?.type ? extFromMime(post.asset.file.type) : extFromPath(post.asset.thumbUrl);
  return ["jpg", "png", "webp"].includes(extension) ? extension : "jpg";
}

function getExtendedZipFilename(post: ExtendedExportPost) {
  return `${formatPostNumber(post.postNumber)}.${getExtendedPostExtension(post)}`;
}

function getExtendedHandoffFilename(post: ExtendedExportPost) {
  return `extended-pack-01-${formatPostNumber(post.postNumber)}.${getExtendedPostExtension(post)}`;
}

function ExtendedExport() {
  const navigate = useNavigate();
  const pressable = "transition active:translate-y-[1px] active:scale-[0.98]";

  const selectedAssetIds = usePrototypeStore((s) => s.selectedAssetIds);
  const selectedExtendedAssetIds = usePrototypeStore((s) => s.selectedExtendedAssetIds);
  const selectedExtendedCandidateId = usePrototypeStore((s) => s.selectedExtendedCandidateId);
  const extendedCaptions = usePrototypeStore((s) => s.extendedCaptions);
  const mixSeed = usePrototypeStore((s) => s.mixSeed);
  const getAssetById = usePrototypeStore((s) => s.getAssetById);
  const clearUploads = usePrototypeStore((s) => s.clearUploads);
  const clearSelection = usePrototypeStore((s) => s.clearSelection);

  const [view, setView] = useState<ExtendedExportView>("all");
  const [isZipping, setIsZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [clientReviewError, setClientReviewError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const extendedItems = useMemo(() => {
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

  const slots = useMemo(() => buildPackSlots("extended-pack"), []);
  const posts = useMemo<ExtendedExportPost[]>(() => {
    return slots.flatMap((slot, index) => {
      const asset = extendedItems[index];
      if (!asset) return [];

      const savedDraft = extendedCaptions[asset.id];
      const draft =
        savedDraft ??
        buildExtendedFallbackDraft({
          asset,
          postNumber: slot.postNumber,
          weekIndex: slot.weekIndex,
          tone: "Minimal",
          length: "Short",
        });

      return [
        {
          index,
          postNumber: slot.postNumber,
          weekIndex: slot.weekIndex,
          weekLabel: slot.weekLabel,
          dayLabel: slot.dayLabel,
          asset,
          draft,
          hasSavedDraft: Boolean(savedDraft),
        },
      ];
    });
  }, [extendedCaptions, extendedItems, slots]);

  const { week1: week1Posts, week2: week2Posts } = useMemo(() => splitSlotsByWeek(posts), [posts]);
  const visibleWeekPosts = view === "week-1" ? week1Posts : view === "week-2" ? week2Posts : [];
  const draftsSavedCount = posts.filter((post) => post.hasSavedDraft).length;
  const extendedText = useMemo(() => buildExtendedPlainText(posts), [posts]);
  const extendedCsvText = useMemo(() => buildExtendedCsvText(posts), [posts]);

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 900);
  };

  const copyExtendedText = async () => {
    const ok = await safeCopy(extendedText);
    if (ok) flashCopied("pack");
  };

  const copyExtendedCsv = async () => {
    const ok = await safeCopy(extendedCsvText);
    if (ok) flashCopied("csv");
  };

  const copyPost = async (post: ExtendedExportPost) => {
    const ok = await safeCopy(buildExtendedPostText(post));
    if (ok) flashCopied(`post-${post.postNumber}`);
  };

  const downloadExtendedText = () => {
    downloadBlob(
      `creatorops-extended-pack_${tsStamp()}.txt`,
      new Blob([extendedText || "-"], { type: "text/plain;charset=utf-8" })
    );
  };

  const buildExtendedMediaConverterHandoffPayload = () => {
    const items = posts.map((post): MediaConverterHandoffItem => {
      const filename = getExtendedHandoffFilename(post);
      const extension = filename.split(".").pop() ?? "jpg";

      return {
        id: post.asset.id || `extended-export-${formatPostNumber(post.postNumber)}`,
        src: post.asset.thumbUrl,
        filename,
        label: `Post #${post.postNumber}`,
        mimeHint: post.asset.file?.type ? mimeHintFromExtension(extension) : undefined,
      };
    });

    return {
      version: "v1" as const,
      source: "export-week-pack" as const,
      packTitle: "Extended Pack 01",
      createdAt: new Date().toISOString(),
      presetId: "website" as const,
      items,
    };
  };

  const handleOpenExtendedMediaConverter = () => {
    setHandoffError(null);

    try {
      const payload = buildExtendedMediaConverterHandoffPayload();
      if (payload.items.length !== 18) {
        setHandoffError("Could not prepare 18 images for Media Converter.");
        return;
      }

      writeMediaConverterHandoff(payload);
      navigate("/prototype/media-converter?source=export");
    } catch {
      setHandoffError("Could not prepare Media Converter handoff.");
    }
  };

  const buildExtendedClientReviewHandoffPayload = () => {
    const items = posts.map((post): ClientReviewHandoffItem => ({
      id: post.asset.id || `extended-review-${formatPostNumber(post.postNumber)}`,
      src: post.asset.thumbUrl,
      label: `Post #${post.postNumber}`,
      weekIndex: post.weekIndex,
      day: post.dayLabel,
      filename: getExtendedHandoffFilename(post),
      caption: post.draft.caption,
      cta: post.draft.cta,
      hashtags: post.draft.hashtags,
    }));

    return {
      version: "v1" as const,
      source: "export-week-pack" as const,
      packMode: "extended-pack" as const,
      postCount: 18 as const,
      packTitle: "Extended Pack 01",
      createdAt: new Date().toISOString(),
      preparedBy: "CreatorOps",
      items,
    };
  };

  const handleOpenExtendedClientReview = () => {
    setClientReviewError(null);

    try {
      const payload = buildExtendedClientReviewHandoffPayload();
      if (payload.items.length !== 18) {
        setClientReviewError("Could not prepare 18 posts for Client Review.");
        return;
      }

      writeClientReviewHandoff(payload);
      navigate("/prototype/client-review?source=export");
    } catch {
      setClientReviewError("Could not prepare Client Review.");
    }
  };

  const openExtendedProfileHandoff = () => {
    navigate("/prototype/bio-builder?source=export", {
      state: {
        source: "export",
        useCurrentExportPack: true,
        profilePreviewIds: week1Posts.map((post) => post.asset.id),
      },
    });
  };

  const buildExtendedManifest = (exportPosts: Array<ExtendedExportPost & { file?: string | null }>) => ({
    app: "CreatorOps",
    packType: "extended-pack",
    postCount: 18,
    weeks: 2,
    version: "beta",
    appVersion: APP_VERSION,
    buildTime: BUILD_TIME || null,
    generatedAt: new Date().toISOString(),
    seed: mixSeed ?? null,
    selection: {
      selectedAssetIds: selectedAssetIds.slice(),
      selectedExtendedAssetIds: selectedExtendedAssetIds.slice(0, 18),
      selectedExtendedCandidateId: selectedExtendedCandidateId ?? null,
      usedInExtendedPack: exportPosts.map((post) => post.asset.id),
    },
    items: exportPosts.map((post) => ({
      postNumber: post.postNumber,
      weekIndex: post.weekIndex,
      weekSlotIndex: post.index % 9,
      weekLabel: post.weekLabel,
      dayLabel: post.dayLabel,
      filename: post.file ? post.file.replace(/^images\//, "") : getExtendedZipFilename(post),
      assetId: post.asset.id,
      series: post.asset.series,
      ratio: post.asset.ratio,
      source: post.asset.source,
      caption: post.draft.caption,
      cta: post.draft.cta,
      hashtags: post.draft.hashtags,
      tone: post.draft.tone,
      length: post.draft.length,
      hasSavedDraft: post.hasSavedDraft,
    })),
    files: {
      captionsTxt: "captions.txt",
      hashtagsTxt: "hashtags.txt",
      captionsCsv: "captions.csv",
      manifest: "manifest.json",
      imagesDir: "images/",
    },
  });

  const onDownloadExtendedZip = async () => {
    if (isZipping) return;

    setZipError(null);
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const exportPosts = posts.map((post) => ({ ...post, file: null as string | null }));

      zip.file("captions.txt", extendedText || "-");
      zip.file(
        "hashtags.txt",
        exportPosts
          .map((post) => `Post #${formatPostNumber(post.postNumber)}: ${post.draft.hashtags.join(" ") || "-"}`)
          .join("\n")
      );

      const imgFolder = zip.folder("images");
      if (imgFolder) {
        for (let i = 0; i < exportPosts.length; i++) {
          const post = exportPosts[i]!;
          const order = formatPostNumber(i + 1);
          const file: File | undefined = post.asset.file;

          if (file) {
            const ext = extFromMime(file.type) || extFromPath(file.name);
            const name = `${order}.${ext}`;
            imgFolder.file(name, file);
            post.file = `images/${name}`;
            continue;
          }

          const url = String(post.asset.thumbUrl || "");
          if (!url) continue;

          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`fetch ${res.status}`);
            const blob = await res.blob();
            const ext = extFromMime(blob.type) || extFromPath(url);
            const name = `${order}.${ext}`;
            imgFolder.file(name, blob);
            post.file = `images/${name}`;
          } catch {
            // Keep manifest and text export even if a preview image cannot be fetched.
          }
        }
      }

      zip.file("captions.csv", buildExtendedCsvText(exportPosts));
      zip.file("manifest.json", JSON.stringify(buildExtendedManifest(exportPosts), null, 2));
      zip.file(
        "README.txt",
        [
          "CreatorOps Extended Export Pack",
          `App version: ${APP_VERSION}${BUILD_TIME ? ` (${BUILD_TIME})` : ""}`,
          "",
          "This Extended Pack contains 18 ordered posts for Week 1 + Week 2.",
          "",
          "What's inside:",
          "- images/01..18.* -> Week 1 + Week 2 in feed order",
          "- captions.txt    -> per-post captions, CTA lines, and hashtags",
          "- hashtags.txt    -> per-post hashtag lines",
          "- captions.csv    -> ready-to-copy table",
          "- manifest.json   -> post mapping, asset ids, draft status",
          "",
          "How to post:",
          "1) Open images/ and post in filename order from 01 to 18.",
          "2) Use captions.csv or captions.txt for the matching copy.",
          "",
          "Notes:",
          "- Draft status is recorded as hasSavedDraft in manifest.json.",
          "- If an image file is missing, it could not be fetched at export time.",
        ].join("\n")
      );

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      const vSafe = String(APP_VERSION || "dev").replace(/[^a-zA-Z0-9._-]/g, "-");
      downloadBlob(`creatorops-${vSafe}_extended-pack_${tsStamp()}.zip`, blob);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? e.message : "Failed to build extended zip.";
      setZipError(msg);
    } finally {
      setIsZipping(false);
    }
  };

  const renderExtendedTile = (post: ExtendedExportPost) => (
    <div key={`${post.asset.id}-${post.postNumber}`} className="co-extended-export-tile">
      <img src={post.asset.thumbUrl} alt="" draggable={false} loading="lazy" decoding="async" />
      <span className="co-extended-export-post-badge">{formatPostNumber(post.postNumber)}</span>
      <span className="co-extended-export-week-badge">
        {post.dayLabel} · {formatPostNumber(post.postNumber)}
      </span>
    </div>
  );

  const renderWeekPreview = (label: "Week 1" | "Week 2", items: ExtendedExportPost[]) => (
    <section key={label} className="co-extended-export-week-section">
      <div className="co-extended-export-week-head">
        <div>
          <div className="text-sm font-medium text-[color:var(--co-text)]">{label}</div>
          <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">
            Posts {label === "Week 1" ? "01-09" : "10-18"}
          </div>
        </div>
        <span>{items.length}/9</span>
      </div>
      <div className="co-extended-export-grid co-extended-export-grid--week">
        {items.map(renderExtendedTile)}
      </div>
    </section>
  );

  if (extendedItems.length < 18 || posts.length < 18) {
    return (
      <FlowEmptyState
        title="Extended Export needs 18 planned posts."
        desc="Return to Planner or Smart Mix to prepare Week 1 + Week 2."
        primaryLabel="Back to Planner"
        primaryTo="/prototype/planner"
        secondaryLabel="Back to Smart Mix"
        secondaryTo="/prototype/smart-mix"
      />
    );
  }

  return (
    <div className="co-workspace-page co-scene co-completion-scene co-export-page co-extended-export-page">
      <div className="co-scene-header co-export-scene-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base text-[color:var(--co-text)]">Export Pack Ready</div>
          <p className="mt-1 max-w-[44rem] text-sm leading-5 text-[color:var(--co-muted)]">
            Your Extended Pack is ordered, captioned, and ready to download.
          </p>

          <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
            {[
              "Extended Pack",
              "18 posts",
              "Week 1 + Week 2",
              "captions",
              "manifest",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2.5 py-1 text-[11px] text-[color:var(--co-muted)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden flex-wrap gap-2 sm:flex sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/prototype/captions")}
            className={[
              "flex-1 rounded-full border border-[color:var(--co-border-soft)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] sm:flex-none",
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
              "flex-1 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Home
          </button>
        </div>
      </div>

      <div className="co-export-workbench co-extended-export-workbench co-scrollbar">
        <section className="co-export-preview-panel co-extended-export-preview-panel">
          <div className="co-extended-export-topbar">
            <div>
              <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Final feed order</div>
              <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">
                {view === "all" ? "Final Extended Pack" : view === "week-1" ? "Week 1 posts" : "Week 2 posts"}
              </div>
            </div>
            <div className="co-extended-export-view-tabs" role="tablist" aria-label="Extended export view">
              {[
                { id: "all" as const, label: "All 18" },
                { id: "week-1" as const, label: "Week 1" },
                { id: "week-2" as const, label: "Week 2" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={view === item.id}
                  onClick={() => setView(item.id)}
                  className={view === item.id ? "is-active" : ""}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {view === "all" ? (
            <div className="co-extended-export-week-stack co-scrollbar">
              {renderWeekPreview("Week 1", week1Posts)}
              {renderWeekPreview("Week 2", week2Posts)}
            </div>
          ) : (
            <div className="co-extended-export-week-single">
              {renderWeekPreview(view === "week-1" ? "Week 1" : "Week 2", visibleWeekPosts)}
            </div>
          )}
        </section>

        <aside className="co-export-action-panel co-extended-export-action-panel">
          <div className="co-export-download-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Download pack</div>
                <div className="mt-2 text-xl font-medium text-[color:var(--co-text)]">
                  Extended ZIP ready
                </div>
                <p className="mt-3 max-w-[40ch] text-sm leading-6 text-[color:var(--co-muted)]">
                  Includes ordered images, per-post captions, hashtags, CSV, manifest, and README.
                </p>
              </div>
              <button
                type="button"
                onClick={onDownloadExtendedZip}
                disabled={isZipping}
                className={[
                  "co-export-primary-action w-full hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                  isZipping ? "opacity-70 cursor-wait" : "",
                ].join(" ")}
              >
                {isZipping ? "Building pack..." : "Download ZIP"}
              </button>
            </div>

            <div className="mt-5">
              <div className="text-[11px] text-[color:var(--co-muted)]">Pack contents</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXTENDED_PACK_CONTENTS.map((item) => (
                  <span key={item} className="co-export-file-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={copyExtendedText}
                className={["co-extended-export-mini-action", pressable].join(" ")}
              >
                {copiedKey === "pack" ? "Copied" : "Copy pack"}
              </button>
              <button
                type="button"
                onClick={copyExtendedCsv}
                className={["co-extended-export-mini-action", pressable].join(" ")}
              >
                {copiedKey === "csv" ? "Copied" : "Copy CSV"}
              </button>
              <button
                type="button"
                onClick={downloadExtendedText}
                className={["co-extended-export-mini-action", pressable].join(" ")}
              >
                Download TXT
              </button>
            </div>

            {zipError ? (
              <div className="mt-4 rounded-xl border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] p-3 text-[11px] text-[color:var(--co-muted)]">
                ZIP error: {zipError}
              </div>
            ) : null}
          </div>

          <div className="co-export-secondary-card co-extended-export-handoff-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Format handoff</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Media Converter</div>
                <p className="mt-2 max-w-[40ch] text-[12px] leading-5 text-[color:var(--co-muted)]">
                  Send all 18 ordered images for final format conversion.
                </p>
                {handoffError ? (
                  <p className="mt-2 text-[11px] leading-5 text-[color:var(--co-muted)]">{handoffError}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleOpenExtendedMediaConverter}
                className={["co-extended-export-row-action", pressable].join(" ")}
              >
                Open Media Converter
              </button>
            </div>
          </div>

          <div className="co-export-secondary-card co-extended-export-handoff-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Client review</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Extended Pack approval</div>
                <p className="mt-2 max-w-[40ch] text-[12px] leading-5 text-[color:var(--co-muted)]">
                  Preview Week 1, Week 2, or all 18 posts before approval.
                </p>
                {clientReviewError ? (
                  <p className="mt-2 text-[11px] leading-5 text-[color:var(--co-muted)]">{clientReviewError}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleOpenExtendedClientReview}
                className={["co-extended-export-row-action", pressable].join(" ")}
              >
                Open Client Review
              </button>
            </div>
          </div>

          <div className="co-export-secondary-card co-extended-export-handoff-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Profile handoff</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Bio Builder</div>
                <p className="mt-2 max-w-[40ch] text-[12px] leading-5 text-[color:var(--co-muted)]">
                  Use the first 9 posts for the profile preview.
                </p>
              </div>

              <button
                type="button"
                onClick={openExtendedProfileHandoff}
                className={["co-extended-export-row-action", pressable].join(" ")}
              >
                Open Profile Handoff
              </button>
            </div>
          </div>

          <div className="co-export-secondary-card co-extended-export-post-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Copy queue</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Per-post handoff</div>
              </div>
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                {draftsSavedCount}/18 saved
              </div>
            </div>

            <div className="co-extended-export-post-list co-scrollbar">
              {posts.map((post) => (
                <div key={`copy-${post.asset.id}-${post.postNumber}`} className="co-extended-export-post-row">
                  <img src={post.asset.thumbUrl} alt="" draggable={false} loading="lazy" decoding="async" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[color:var(--co-text)]">
                      {post.weekLabel} / Post #{formatPostNumber(post.postNumber)}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-[color:var(--co-muted)]">
                      {post.draft.caption}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyPost(post)}
                    className={["co-extended-export-row-action", pressable].join(" ")}
                  >
                    {copiedKey === `post-${post.postNumber}` ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Export() {
  const packMode = usePrototypeStore((s) => s.packMode);
  return packMode === "extended-pack" ? <ExtendedExport /> : <WeekPackExport />;
}

function WeekPackExport() {
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
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [clientReviewError, setClientReviewError] = useState<string | null>(null);

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
  const previewIds = useMemo(() => Array.from({ length: 9 }, (_, index) => gridIds[index]), [gridIds]);
  const filledGridCount = gridIds.filter(Boolean).length;

  const hasAnyGrid = gridIds.some(Boolean);
  const bestMix = useMemo(() => mixes.find((m) => m.id === bestMixId), [mixes, bestMixId]);

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
      const a = id ? getAssetById(id) : undefined;
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
      gridFiles: manifest.grid.map((g) => ({
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
      "CreatorOps workspace diagnostics",
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
      "CreatorOps workspace feedback",
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
      "Tip: Include what you expected, what happened, and whether you used uploads.",
    ].join("\n");

    const subject = "CreatorOps workspace feedback";
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

  const buildMediaConverterHandoffPayloadFromExport = () => {
    const items = previewIds.flatMap((id, index): MediaConverterHandoffItem[] => {
      const asset = id ? getAssetById(id) : undefined;
      if (!asset?.thumbUrl) return [];

      const order = String(index + 1).padStart(2, "0");
      const extension = asset.file?.type ? extFromMime(asset.file.type) : extFromPath(asset.thumbUrl);
      const safeExtension = ["jpg", "png", "webp"].includes(extension) ? extension : "jpg";

      return [
        {
          id: asset.id || `export-${order}`,
          src: asset.thumbUrl,
          filename: `week-pack-01-${order}.${safeExtension}`,
          label: `Post #${index + 1}`,
          mimeHint: asset.file?.type ? mimeHintFromExtension(safeExtension) : undefined,
        },
      ];
    });

    return {
      version: "v1" as const,
      source: "export-week-pack" as const,
      packTitle: "Week Pack 01",
      createdAt: new Date().toISOString(),
      presetId: "website" as const,
      items,
    };
  };

  const handleOpenMediaConverter = () => {
    setHandoffError(null);

    try {
      const payload = buildMediaConverterHandoffPayloadFromExport();
      if (!payload.items.length) {
        setHandoffError("Could not prepare Media Converter handoff.");
        return;
      }

      writeMediaConverterHandoff(payload);
      navigate("/prototype/media-converter?source=export");
    } catch {
      setHandoffError("Could not prepare Media Converter handoff.");
    }
  };

  const buildClientReviewHandoffPayloadFromExport = () => {
    const primaryCaption = captions.variants?.[0] || "Caption draft included in Export Pack.";
    const ctaText = captions.cta || "Save this for your next content batch.";
    const hashtagArray = captions.hashtags?.length
      ? captions.hashtags
      : ["#creatorops", "#weekpack", "#contentworkflow"];

    const items = previewIds.flatMap((id, index): ClientReviewHandoffItem[] => {
      const asset = id ? getAssetById(id) : undefined;
      if (!asset?.thumbUrl) return [];

      const order = String(index + 1).padStart(2, "0");
      const extension = asset.file?.type ? extFromMime(asset.file.type) : extFromPath(asset.thumbUrl);
      const safeExtension = ["jpg", "png", "webp"].includes(extension) ? extension : "jpg";

      return [
        {
          id: asset.id || `review-${order}`,
          src: asset.thumbUrl,
          label: `Post #${index + 1}`,
          day: index < 7 ? DAYS[index] : `Next ${index - 6}`,
          filename: `week-pack-01-${order}.${safeExtension}`,
          caption: primaryCaption,
          cta: ctaText,
          hashtags: hashtagArray,
        },
      ];
    });

    return {
      version: "v1" as const,
      source: "export-week-pack" as const,
      packTitle: "Week Pack 01",
      createdAt: new Date().toISOString(),
      preparedBy: "CreatorOps",
      items,
    };
  };

  const handleOpenClientReview = () => {
    setClientReviewError(null);

    try {
      const payload = buildClientReviewHandoffPayloadFromExport();
      if (!payload.items.length) {
        setClientReviewError("Could not prepare Client Review.");
        return;
      }

      writeClientReviewHandoff(payload);
      navigate("/prototype/client-review?source=export");
    } catch {
      setClientReviewError("Could not prepare Client Review.");
    }
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
        const a = id ? getAssetById(id) : undefined;
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

          const a = getAssetById(t.id);
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

          // Backup path: fetch blob from thumbUrl (works for bundled assets)
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
          "CreatorOps Export Pack",
          `App version: ${APP_VERSION}${BUILD_TIME ? ` (${BUILD_TIME})` : ""}`,
          "",
          "What's inside:",
          "- images/01..09.*  -> 3x3 grid in order (left to right, top to bottom)",
          "- captions.txt     -> primary caption (+ alt, if available)",
          "- hashtags.txt     -> hashtags line",
          "- captions.csv     -> ready-to-copy table (filename + slot + caption + hashtags)",
          "- manifest.json    -> pack mapping (grid slots, ids, reasons)",
          "",
          "How to post (fast):",
          "1) Open images/ and post in filename order: 01,02,03 -> 04,05,06 -> 07,08,09",
          "2) Use captions.txt (or captions.csv) to copy caption + hashtags.",
          "",
          "Notes:",
          "- If an image file is missing, it could not be fetched at export time.",
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
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? e.message : "Failed to build zip.";
      setZipError(msg);
    } finally {
      setIsZipping(false);
    }
  };

  const Tile = (props: { id?: string; label: string; index: number }) => {
    const a = props.id ? getAssetById(props.id) : undefined;
    const order = String(props.index + 1).padStart(2, "0");

    return (
      <div className="co-export-tile min-w-0">
        <div className="co-export-tile-media relative overflow-hidden">
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

          <div className="pointer-events-none absolute left-1.5 top-1.5 rounded-full border border-white/10 bg-black/35 px-1.5 py-0.5 text-[10px] text-white/72 backdrop-blur sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[11px]">
            <span className="text-[color:var(--co-text)]/80">{props.label}</span>
          </div>

          <div className="pointer-events-none absolute right-1.5 top-1.5 rounded-full border border-white/10 bg-black/45 px-1.5 py-0.5 text-[10px] text-white/84 backdrop-blur sm:right-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[11px]">
            {order}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="co-workspace-page co-scene co-completion-scene co-export-page">
      <div className="co-scene-header co-export-scene-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base text-[color:var(--co-text)]">Export Pack Ready</div>
          <p className="mt-1 max-w-[44rem] text-sm leading-5 text-[color:var(--co-muted)]">
            Your Week Pack is ordered, captioned, and ready to download.
          </p>

          <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
            {["Pack ready", `${filledGridCount}/9 images`, "captions", "CSV", "manifest"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2.5 py-1 text-[11px] text-[color:var(--co-muted)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden flex-wrap gap-2 sm:flex sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/prototype/captions")}
            className={[
              "flex-1 rounded-full border border-[color:var(--co-border-soft)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] sm:flex-none",
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
              "flex-1 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Home
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="co-export-workbench co-scrollbar">
        {/* Left: 3×3 preview */}
        <section className="co-export-preview-panel">
            <div className="hidden w-full items-center justify-between gap-3 sm:flex">
              <div>
                <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Final 3x3</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">
                  Export order locked.
                </div>
              </div>
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                01 - 09
              </div>
            </div>

            <div className="co-export-preview-grid">
              {previewIds.map((id, i) => (
                <Tile
                  key={`${id ?? "empty"}-${i}`}
                  id={id}
                  label={i < 7 ? DAYS[i] : `Next ${i - 6}`}
                  index={i}
                />
              ))}
            </div>

            <div className="mt-3 hidden w-full gap-2 text-[11px] text-[color:var(--co-muted)] sm:grid sm:grid-cols-3">
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-center">
                Week 01-07
              </div>
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-center">
                Next 08-09
              </div>
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-center">
                ZIP order
              </div>
            </div>
        </section>

        {/* Right: actions */}
        <aside className="co-export-action-panel">
          <div className="co-export-download-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Download pack</div>
                <div className="mt-2 text-xl font-medium text-[color:var(--co-text)]">
                  ZIP ready
                </div>
                <p className="mt-3 max-w-[38ch] text-sm leading-6 text-[color:var(--co-muted)]">
                  Your Week Pack includes ordered images, captions, hashtags, CSV, manifest, and README.
                </p>
              </div>
              <button
                type="button"
                onClick={onDownloadPack}
                disabled={isZipping}
                className={[
                  "co-export-primary-action w-full hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                  isZipping ? "opacity-70 cursor-wait" : "",
                ].join(" ")}
              >
                {isZipping ? "Building pack..." : "Download ZIP"}
              </button>
            </div>

            <div className="mt-5">
              <div className="text-[11px] text-[color:var(--co-muted)]">Pack contents</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {PACK_CONTENTS.map((item) => (
                  <span
                    key={item}
                    className="co-export-file-chip"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {zipError ? (
              <div className="mt-4 rounded-xl border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] p-3 text-[11px] text-[color:var(--co-muted)]">
                ZIP error: {zipError}
                <div className="mt-2 text-[11px]">
                  If you see "Cannot find module jszip", run:{" "}
                  <span className="font-mono">npm i jszip</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="co-export-secondary-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Format handoff</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Media Converter</div>
                <p className="mt-2 max-w-[40ch] text-[12px] leading-5 text-[color:var(--co-muted)]">
                  Prepare this Week Pack in Media Converter. Convert final images to JPG, PNG, or WebP before sharing.
                </p>
                {handoffError ? (
                  <p className="mt-2 text-[11px] leading-5 text-[color:var(--co-muted)]">{handoffError}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleOpenMediaConverter}
                className={[
                  "rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
              >
                Open in Media Converter
              </button>
            </div>
          </div>

          <div className="co-export-secondary-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Client review</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Approval Preview</div>
                <p className="mt-2 max-w-[36ch] text-[12px] leading-5 text-[color:var(--co-muted)]">
                  Preview this Week Pack for client approval.
                </p>
                {clientReviewError ? (
                  <p className="mt-2 text-[11px] leading-5 text-[color:var(--co-muted)]">{clientReviewError}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleOpenClientReview}
                className={[
                  "rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
              >
                Open Client Review
              </button>
            </div>
          </div>

          <div className="co-export-secondary-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Profile handoff</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Bio Builder</div>
                <p className="mt-2 max-w-[36ch] text-[12px] leading-5 text-[color:var(--co-muted)]">
                  Carry this Week Pack into Bio Builder.
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
                className={[
                  "rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface-active)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
              >
                Open Profile Handoff
              </button>
            </div>
          </div>

          <details className="co-export-secondary-card co-export-secondary-card--quiet">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
              Support tools
            </summary>

            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[color:var(--co-muted)]">Support</div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={copyDiagnostics}
                    className={[
                      "flex-1 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                      pressable,
                    ].join(" ")}
                  >
                    {diagCopied ? "Copied" : "Copy summary"}
                  </button>

                  <button
                    type="button"
                    onClick={sendFeedbackEmail}
                    className={[
                      "flex-1 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                      pressable,
                    ].join(" ")}
                    title="Opens Gmail compose with a prefilled message (also copies text)"
                  >
                    Send feedback
                  </button>
                </div>
              </div>

              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What worked / what felt confusing / what should improve?"
                className="min-h-[70px] w-full resize-none rounded-xl border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] p-3 text-sm text-[color:var(--co-text)] placeholder:text-[color:var(--co-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)]"
              />

              <div className="text-[11px] text-[color:var(--co-muted)]">
                Share what you expected, what happened, and whether you used uploads.
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--co-border-soft)] pt-3">
                <div>
                  <div className="text-xs text-[color:var(--co-muted)]">Workspace reset</div>
                  <div className="mt-1 text-[11px] text-[color:var(--co-muted)]">
                    Clears saved draft progress. Uploads are already session-only.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetSavedState}
                  className={[
                    "rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    pressable,
                  ].join(" ")}
                  title="Clears saved workspace on this device"
                >
                  Reset draft
                </button>
              </div>
            </div>
          </details>

          <div className="px-1 text-[11px] leading-5 text-[color:var(--co-muted)]">
            Export-first by design: one clean outcome, not another layer of workflow noise.
          </div>

        </aside>
      </div>
    </div>
  );
}
