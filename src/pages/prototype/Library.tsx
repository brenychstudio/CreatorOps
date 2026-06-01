// src/pages/prototype/Library.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, DragEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";
import OnboardingHint from "../../components/prototype/OnboardingHint";
import {
  optimizeImageForWorkspace,
  WORKSPACE_IMAGE_LIMIT_BYTES,
  type WorkspaceOptimizeResult,
} from "../../modules/media-converter/core/workspaceOptimize";
import {
  PACK_MODE_META,
  getPackSlotCount,
  getRemainingAssetCount,
  isPackSelectionComplete,
  type PackMode,
} from "../../modules/prototype/packPlanning";

type OversizedRescueStatus = "waiting" | "optimizing" | "optimized" | "failed" | "skipped";
type AssetViewMode = "field" | "spatial";

type OversizedRescueItem = {
  id: string;
  file: File;
  name: string;
  originalSizeLabel: string;
  status: OversizedRescueStatus;
  optimizedName?: string;
  optimizedSizeLabel?: string;
  message?: string;
};

const RESCUE_SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getLargeFieldCardSize(assetCount: number) {
  if (assetCount <= 6) return { min: "clamp(15rem, 16vw, 20rem)", max: "20rem" };
  if (assetCount <= 18) return { min: "clamp(13.5rem, 14vw, 18rem)", max: "18rem" };
  if (assetCount <= 30) return { min: "clamp(11rem, 11.5vw, 15rem)", max: "15rem" };
  return { min: "clamp(8.75rem, 9vw, 12.5rem)", max: "12.5rem" };
}

function rescueId(file: File, index: number) {
  return `rescue-${Date.now()}-${index}-${file.name}-${file.size}`;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${bytes} B`;
}

function hasTransparencyRisk(items: OversizedRescueItem[]) {
  return items.some((item) => item.file.type === "image/png" || item.file.type === "image/webp");
}

export default function Library() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadModalTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadModalState, setUploadModalState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const [oversizedRescueItems, setOversizedRescueItems] = useState<OversizedRescueItem[]>([]);
  const [rescueMessage, setRescueMessage] = useState<string | null>(null);
  const [assetViewMode, setAssetViewMode] = useState<AssetViewMode>("field");

  const assets = usePrototypeStore((s) => s.assets);
  const selected = usePrototypeStore((s) => s.selectedAssetIds);
  const packMode = usePrototypeStore((s) => s.packMode);
  const setPackMode = usePrototypeStore((s) => s.setPackMode);
  const toggleSelect = usePrototypeStore((s) => s.toggleSelect);
  const selectAssets = usePrototypeStore((s) => s.selectAssets);
  const clearSelection = usePrototypeStore((s) => s.clearSelection);
  const generateMixes = usePrototypeStore((s) => s.generateMixes);
  const scanMissingAssetAnalysis = usePrototypeStore((s) => s.scanMissingAssetAnalysis);

  const uploadAssetIds = usePrototypeStore((s) => s.uploadAssetIds);
  const uploadError = usePrototypeStore((s) => s.uploadError);
  const addUploads = usePrototypeStore((s) => s.addUploads);
  const removeUpload = usePrototypeStore((s) => s.removeUpload);
  const clearUploads = usePrototypeStore((s) => s.clearUploads);
  const analysisPendingIds = usePrototypeStore((s) => s.analysisPendingIds);

  const selectedSet = new Set(selected);
  const selectedCount = selected.length;
  const hasSelection = selectedCount > 0;
  const packMeta = PACK_MODE_META[packMode];
  const targetCount = getPackSlotCount(packMode);
  const remainingCount = getRemainingAssetCount(packMode, selectedCount);
  const isComplete = isPackSelectionComplete(packMode, selectedCount);
  const isExtended = packMode === "extended-pack";
  const isSpatialView = assetViewMode === "spatial";
  const libraryViewTransition = shouldReduceMotion
    ? ({ duration: 0 } as const)
    : ({ duration: 0.54, ease: [0.16, 1, 0.3, 1] } as const);
  const libraryGridTransition = shouldReduceMotion
    ? ({ duration: 0 } as const)
    : ({ duration: 0.34, ease: [0.16, 1, 0.3, 1] } as const);
  const maxUploads = 24;
  const remaining = Math.max(0, maxUploads - uploadAssetIds.length);
  const hasRescueItems = oversizedRescueItems.some((item) => item.status !== "skipped");
  const isOptimizingRescue = oversizedRescueItems.some((item) => item.status === "optimizing");
  const waitingRescueItems = oversizedRescueItems.filter((item) => item.status === "waiting" || item.status === "failed");
  const optimizedRescueItems = oversizedRescueItems.filter((item) => item.status === "optimized");
  const visibleRescueItems = oversizedRescueItems.filter((item) => item.status !== "skipped");

  const pendingUploads = useMemo(() => {
    if (!uploadAssetIds.length) return 0;
    const set = new Set(uploadAssetIds);
    return (analysisPendingIds ?? []).filter((id) => set.has(id)).length;
  }, [analysisPendingIds, uploadAssetIds]);

  const scanStatus =
    pendingUploads > 0
      ? `Scanning ${uploadAssetIds.length - pendingUploads}/${uploadAssetIds.length}`
      : uploadAssetIds.length
        ? "Uploads ready"
        : null;

  const isUploadModalVisible = uploadModalState !== "closed";

  // показуємо тільки 4:5 (Instagram feed)
  const feedAssets = useMemo(() => assets.filter((a) => a.ratio === "4:5"), [assets]);
  const feedAssetIds = useMemo(() => feedAssets.map((a) => a.id), [feedAssets]);
  const allFeedSelected = feedAssetIds.length > 0 && feedAssetIds.every((id) => selectedSet.has(id));
  const availableAssetCount = feedAssets.length;
  const hasEnoughAvailableAssets = availableAssetCount >= targetCount;
  const selectionStatusLabel = `${selectedCount} selected`;
  const targetStatusLabel = isComplete ? `${packMeta.shortLabel} ready` : `${remainingCount} more needed`;
  const extendedAvailabilityLabel =
    isExtended && !hasEnoughAvailableAssets
      ? `${availableAssetCount} available - add uploads for 18-post planning`
      : null;
  const largeFieldCardSize = getLargeFieldCardSize(feedAssets.length);
  const libraryGridStyle = isSpatialView
    ? undefined
    : ({
        "--co-library-field-card-min": largeFieldCardSize.min,
        "--co-library-field-card-max": largeFieldCardSize.max,
      } as CSSProperties);
  const hasUtilityControls = Boolean(
    scanStatus || uploadError || uploadAssetIds.length || selectedCount || feedAssetIds.length,
  );

  // Pre-scan analysis for assets visible in this view (demo + uploads)
  useEffect(() => {
    void scanMissingAssetAnalysis(feedAssetIds);
  }, [scanMissingAssetAnalysis, feedAssetIds]);

  useEffect(() => {
    return () => {
      if (uploadModalTimerRef.current !== null) {
        window.clearTimeout(uploadModalTimerRef.current);
      }
    };
  }, []);

  const openUploadModal = () => {
    if (uploadModalTimerRef.current !== null) {
      window.clearTimeout(uploadModalTimerRef.current);
    }

    setUploadModalState("opening");
    uploadModalTimerRef.current = window.setTimeout(() => {
      setUploadModalState("open");
      uploadModalTimerRef.current = null;
    }, 18);
  };

  const closeUploadModal = () => {
    if (uploadModalState === "closed" || uploadModalState === "closing") return;
    if (isOptimizingRescue) return;

    if (uploadModalTimerRef.current !== null) {
      window.clearTimeout(uploadModalTimerRef.current);
    }

    setUploadModalState("closing");
    uploadModalTimerRef.current = window.setTimeout(() => {
      setUploadModalState("closed");
      uploadModalTimerRef.current = null;
    }, 220);
  };

  useEffect(() => {
    if (!isUploadModalVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (uploadModalState === "closing") return;
      if (isOptimizingRescue) return;

      if (uploadModalTimerRef.current !== null) {
        window.clearTimeout(uploadModalTimerRef.current);
      }

      setUploadModalState("closing");
      uploadModalTimerRef.current = window.setTimeout(() => {
        setUploadModalState("closed");
        uploadModalTimerRef.current = null;
      }, 220);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOptimizingRescue, isUploadModalVisible, uploadModalState]);

  const onAddToSmartMix = async () => {
    if (packMode !== "week-pack") return;
    await generateMixes();
    navigate("/prototype/smart-mix");
  };

  const onOpenExtendedSmartMix = () => {
    if (packMode !== "extended-pack" || !isComplete) return;
    navigate("/prototype/smart-mix");
  };

  const onSelectPackMode = (mode: PackMode) => {
    setPackMode(mode);
  };

  const onSelectAllFeedAssets = () => {
    if (!feedAssetIds.length) return;
    selectAssets(feedAssetIds);
  };

  const addOversizedRescueItems = (files: File[]) => {
    if (!files.length) return;

    setOversizedRescueItems((current) => [
      ...files.map((file, index) => ({
        id: rescueId(file, index),
        file,
        name: file.name,
        originalSizeLabel: formatFileSize(file.size),
        status: "waiting" as const,
      })),
      ...current,
    ]);

    setRescueMessage(null);
  };

  const handleIncomingFiles = async (filesLike: FileList | File[]) => {
    const files = Array.isArray(filesLike) ? filesLike : Array.from(filesLike);
    if (!files.length) return { hasRescueFiles: false };

    const normalFiles: File[] = [];
    const rescueFiles: File[] = [];

    for (const file of files) {
      const isOversized = file.size > WORKSPACE_IMAGE_LIMIT_BYTES;
      const canRescue = RESCUE_SUPPORTED_TYPES.has(file.type);

      if (isOversized && canRescue) {
        rescueFiles.push(file);
      } else {
        normalFiles.push(file);
      }
    }

    if (normalFiles.length) await addUploads(normalFiles);
    if (rescueFiles.length) {
      addOversizedRescueItems(rescueFiles);
      if (!isUploadModalVisible) openUploadModal();
    }

    return { hasRescueFiles: rescueFiles.length > 0 };
  };

  const onOptimizeForWorkspace = async () => {
    if (isOptimizingRescue || !waitingRescueItems.length) return;

    setRescueMessage(null);
    const readyFiles: WorkspaceOptimizeResult[] = [];
    let hasFailure = false;
    let stillTooLarge = false;

    for (const item of waitingRescueItems) {
      setOversizedRescueItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: "optimizing", message: "Optimizing..." } : entry,
        ),
      );

      try {
        const result = await optimizeImageForWorkspace(item.file);

        if (result.optimizedSize <= WORKSPACE_IMAGE_LIMIT_BYTES) {
          readyFiles.push(result);
          setOversizedRescueItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "optimized",
                    optimizedName: result.file.name,
                    optimizedSizeLabel: formatFileSize(result.optimizedSize),
                    message: `Optimized copy added - ${formatFileSize(result.originalSize)} -> ${formatFileSize(
                      result.optimizedSize,
                    )}`,
                  }
                : entry,
            ),
          );
        } else {
          stillTooLarge = true;
          setOversizedRescueItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "failed",
                    optimizedName: result.file.name,
                    optimizedSizeLabel: formatFileSize(result.optimizedSize),
                    message: "This image is still too large after optimization. Try Media Converter for more control.",
                  }
                : entry,
            ),
          );
        }
      } catch {
        hasFailure = true;
        setOversizedRescueItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "failed",
                  message: "This image could not be optimized in the browser. Try Media Converter for more control.",
                }
              : entry,
          ),
        );
      }
    }

    if (readyFiles.length) {
      await addUploads(readyFiles.map((result) => result.file));
    }

    if (hasFailure) {
      setRescueMessage("Some images could not be optimized. Try Media Converter for more control.");
    } else if (stillTooLarge) {
      setRescueMessage("Some images are still too large after optimization. Try Media Converter for more control.");
    } else if (readyFiles.length) {
      setOversizedRescueItems([]);
      setRescueMessage(null);
      closeUploadModal();
    }
  };

  const onSkipLargeFiles = () => {
    setOversizedRescueItems((current) =>
      current.map((item) => (item.status === "optimized" ? item : { ...item, status: "skipped" })),
    );
    setRescueMessage(null);
    closeUploadModal();
  };

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length) {
      const result = await handleIncomingFiles(files);
      if (!result.hasRescueFiles) closeUploadModal();
    }
    e.currentTarget.value = "";
  };

  const openSystemPicker = () => {
    fileRef.current?.click();
  };

  const onUploadModalDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (files && files.length) {
      const result = await handleIncomingFiles(files);
      if (!result.hasRescueFiles) closeUploadModal();
    }
  };

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploadModalVisible) return;
    if (e.dataTransfer?.types?.includes("Files")) setIsDragging(true);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploadModalVisible) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    if (e.dataTransfer?.types?.includes("Files")) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploadModalVisible) return;
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setIsDragging(false);
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploadModalVisible) return;

    const files = e.dataTransfer?.files;
    if (files && files.length) {
      await handleIncomingFiles(files);
    }
  };

  return (
    <div
      className={["co-workspace-page co-scene co-asset-field", isDragging ? "co-asset-field--dragging" : ""].join(" ")}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="co-scene-header co-library-header flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="co-library-header-left min-w-0">
          <div className="co-library-title-copy min-w-0">
            <div className="text-base text-[color:var(--co-text)]">Library</div>
            <div className="text-sm text-[color:var(--co-muted)]">Intake field for shaping the week.</div>
          </div>

          <div className="co-library-view-switch" role="group" aria-label="Asset field view">
            {[
              { value: "field" as const, label: "Large", title: "Large asset view" },
              { value: "spatial" as const, label: "Compact", title: "Compact asset view" },
            ].map((option) => {
              const isActive = assetViewMode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAssetViewMode(option.value)}
                  aria-pressed={isActive}
                  title={option.title}
                  className={[
                    "co-library-view-option pressable",
                    isActive ? "co-library-view-option--active" : "",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  ].join(" ")}
                >
                  {isActive ? (
                    <motion.span layoutId="co-library-view-indicator" className="co-library-view-indicator" />
                  ) : null}
                  <span className="relative z-10 font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="co-library-action-row flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />

          <div
            className="flex flex-1 items-center gap-1 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/72 p-1 sm:flex-none"
            role="group"
            aria-label="Planning mode"
          >
            {(Object.keys(PACK_MODE_META) as PackMode[]).map((mode) => {
              const meta = PACK_MODE_META[mode];
              const isActive = packMode === mode;
              const label = mode === "extended-pack" ? "Extended" : "Week";
              const detail = mode === "extended-pack" ? "18" : "9";

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSelectPackMode(mode)}
                  aria-pressed={isActive}
                  title={`${meta.label}: ${meta.description}`}
                  className={[
                    "inline-flex min-h-8 flex-1 items-center justify-center gap-2 rounded-full px-3 text-xs transition pressable sm:flex-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    isActive
                      ? "bg-[color:var(--co-text)] text-[color:var(--co-bg)]"
                      : "text-[color:var(--co-muted)] hover:bg-[color:var(--co-bg)]/34 hover:text-[color:var(--co-text)]",
                  ].join(" ")}
                >
                  <span className="font-medium">{label}</span>
                  <span
                    className={[
                      "rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums",
                      isActive
                        ? "border-[color:var(--co-bg)]/20 bg-[color:var(--co-bg)]/12"
                        : "border-[color:var(--co-border-soft)] bg-[color:var(--co-bg)]/24",
                    ].join(" ")}
                  >
                    {detail}
                  </span>
                  {meta.badge ? <span className="hidden text-[10px] opacity-70 xl:inline">Pro</span> : null}
                </button>
              );
            })}
          </div>

          <div className="co-library-count-pill flex-1 sm:flex-none" title={`${packMeta.label}: ${packMeta.description}`}>
            <span>{selectionStatusLabel}</span>
            <span>{targetStatusLabel}</span>
            {extendedAvailabilityLabel ? <span>{extendedAvailabilityLabel}</span> : null}
          </div>

          <button
            type="button"
            onClick={openUploadModal}
            className="flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            title="Upload up to 24 images (<=8MB each)"
          >
            <span>Add photos</span>
            <span className="ml-2 text-[11px] text-[color:var(--co-muted)]">{remaining} upload slots left</span>
          </button>

          {isExtended ? (
            <button
              type="button"
              onClick={onOpenExtendedSmartMix}
              disabled={!isComplete}
              className={[
                "relative z-10 flex-1 rounded-full px-4 py-2 text-sm transition sm:flex-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                isComplete
                  ? "bg-[color:var(--co-text)] text-[color:var(--co-bg)] hover:opacity-90 pressable"
                  : "cursor-not-allowed border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)] opacity-80",
              ].join(" ")}
              title={isComplete ? "Open Extended Smart Mix" : "Extended Pack needs 18 images before Smart Mix"}
            >
              {isComplete ? "Open Extended Smart Mix" : "Select 18 images first"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onAddToSmartMix}
              className="relative z-10 flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            >
              Add to Smart Mix
            </button>
          )}
        </div>
      </div>

      {hasUtilityControls ? (
        <div className="co-library-utility-row" aria-label="Library utilities">
          {scanStatus ? (
            <span className="co-library-utility-chip">
              {scanStatus}
            </span>
          ) : null}
          {uploadError ? (
            <span className="co-library-utility-chip">
              {uploadError}
            </span>
          ) : null}
          {uploadAssetIds.length ? (
            <button type="button" onClick={clearUploads} className="co-library-utility-button pressable">
              Clear uploads
            </button>
          ) : null}
          {feedAssetIds.length ? (
            <button
              type="button"
              onClick={onSelectAllFeedAssets}
              disabled={allFeedSelected}
              className={[
                "co-library-utility-button pressable",
                allFeedSelected ? "cursor-default opacity-60" : "",
              ].join(" ")}
            >
              {allFeedSelected ? "All selected" : "Select all"}
            </button>
          ) : null}
          {selectedCount ? (
            <button type="button" onClick={clearSelection} className="co-library-utility-button pressable">
              Clear selection
            </button>
          ) : null}
        </div>
      ) : null}

      <OnboardingHint />

      <div className="co-library-stage min-h-0 min-w-0 flex-1">
        <AnimatePresence initial={false}>
          <motion.div
            key={assetViewMode}
            className="co-library-view-sweep"
            aria-hidden="true"
            initial={{ opacity: 0, x: isSpatialView ? "-4%" : "4%", scaleX: 0.82 }}
            animate={{ opacity: shouldReduceMotion ? 0 : [0, 0.42, 0], x: 0, scaleX: [0.82, 1.04, 1] }}
            exit={{ opacity: 0 }}
            transition={libraryViewTransition}
          />
        </AnimatePresence>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={assetViewMode}
            data-view-mode={assetViewMode}
            initial={
              shouldReduceMotion
                ? false
                : {
                    opacity: 0,
                    y: isSpatialView ? 10 : -8,
                    scale: isSpatialView ? 0.992 : 1.006,
                    filter: "blur(10px)",
                  }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    y: isSpatialView ? -8 : 10,
                    scale: isSpatialView ? 1.006 : 0.992,
                    filter: "blur(10px)",
                  }
            }
            transition={libraryGridTransition}
            style={libraryGridStyle}
            className={[
              "co-library-grid co-scrollbar grid min-h-0 min-w-0 content-start overflow-y-auto pr-1",
              isSpatialView
                ? "gap-1.5 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-12"
                : "gap-2 sm:gap-2.5",
            ].join(" ")}
          >
          {feedAssets.map((a, index) => {
            const isSel = selectedSet.has(a.id);
            const isUpload = a.source === "upload";

            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleSelect(a.id)}
                aria-pressed={isSel}
                title={isSel ? "Remove from Smart Mix pool" : "Add to Smart Mix pool"}
                className={[
                  "co-library-card group relative overflow-hidden rounded-xl border bg-[color:var(--co-surface-2)] text-left shadow-sm pressable",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  isSel
                    ? "border-[color:var(--co-border)] shadow-md"
                    : "border-[color:var(--co-border)] hover:opacity-[0.96]",
                  hasSelection && !isSel ? "saturate-75" : "",
                ].join(" ")}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[color:var(--co-bg)]/30">
                  <img
                    src={a.thumbUrl}
                    alt=""
                    className={[
                      "h-full w-full object-cover transition-opacity duration-200",
                      isSel ? "opacity-100" : "",
                      hasSelection && !isSel
                        ? "opacity-70 group-hover:opacity-100"
                        : !hasSelection
                          ? "opacity-95 group-hover:opacity-100"
                          : "",
                    ].join(" ")}
                    draggable={false}
                    loading={index < 12 ? "eager" : "lazy"}
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                {isSel ? (
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-4 ring-[color:var(--co-text)]/18 ring-inset" />
                ) : (
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-transparent ring-inset transition group-hover:ring-[color:var(--co-border)]" />
                )}

                {/* Series/Upload pill */}
                <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-bg)]/65 px-2 py-1 text-[11px] leading-none text-[color:var(--co-text)] shadow-sm backdrop-blur">
                  {isUpload ? "Upload" : a.series}
                </div>

                {/* Remove upload button */}
                {isUpload ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeUpload(a.id);
                    }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-bg)]/55 text-[color:var(--co-text)] shadow-sm backdrop-blur transition hover:opacity-100 opacity-80"
                    title="Remove upload"
                    aria-label="Remove upload"
                  >
                    <span className="text-sm leading-none">×</span>
                  </button>
                ) : null}

                {/* Ratio */}
                <div className="pointer-events-none absolute left-2 bottom-2 text-[11px] font-medium leading-none text-[color:var(--co-text)]/85 drop-shadow">
                  {isUpload ? "Fit" : a.ratio}
                </div>

                {/* Select indicator */}
                <div
                  className={[
                    "pointer-events-none absolute right-2 bottom-2 grid h-7 w-7 place-items-center rounded-full border backdrop-blur transition",
                    isSel
                      ? "border-transparent bg-[color:var(--co-text)]/90 text-[color:var(--co-bg)] shadow-sm"
                      : "border-[color:var(--co-border)] bg-[color:var(--co-bg)]/50 text-[color:var(--co-text)] opacity-70 group-hover:opacity-100",
                  ].join(" ")}
                >
                  <span className="text-sm leading-none">{isSel ? "✓" : "+"}</span>
                </div>
                </div>
              </button>
            );
          })}
          </motion.div>
        </AnimatePresence>
      </div>

      {isDragging ? (
        <div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-[1.15rem] border border-[color:var(--co-text)]/25 bg-[color:var(--co-bg)]/45 backdrop-blur">
          <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)]">
            Drop images to upload
          </div>
        </div>
      ) : null}

      {isUploadModalVisible ? (
        <div
          className={[
            "co-upload-modal-backdrop",
            uploadModalState === "closing" ? "co-upload-modal-backdrop--closing" : "co-upload-modal-backdrop--open",
          ].join(" ")}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeUploadModal();
          }}
        >
          <div
            className={[
              "co-upload-modal",
              uploadModalState === "closing" ? "co-upload-modal--closing" : "co-upload-modal--open",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="co-upload-title"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={onUploadModalDrop}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                  Upload
                </div>
                <div id="co-upload-title" className="mt-2 text-xl font-semibold text-[color:var(--co-text)]">
                  {hasRescueItems ? "Large images detected" : "Add photos"}
                </div>
                <div className="mt-2 max-w-[34ch] text-sm leading-6 text-[color:var(--co-muted)]">
                  {hasRescueItems
                    ? visibleRescueItems.length === 1
                      ? "This image is larger than the workspace limit. CreatorOps can create an optimized JPG copy for smoother workspace use."
                      : "Some images are larger than the workspace limit. CreatorOps can create optimized JPG copies for smoother workspace use."
                    : "Drop images here or choose files from your computer."}
                </div>
              </div>

              <button
                type="button"
                onClick={closeUploadModal}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-text)] pressable"
                aria-label="Close upload"
              >
                x
              </button>
            </div>

            {hasRescueItems ? (
              <>
                <div className="mt-4 rounded-[1.15rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-bg)]/24 p-3">
                  <p className="text-xs leading-5 text-[color:var(--co-muted)]">
                    Your original files stay on your device. Optimization happens locally in your browser. Nothing is uploaded for this step.
                  </p>
                  {hasTransparencyRisk(visibleRescueItems) ? (
                    <p className="mt-1 text-xs leading-5 text-[color:var(--co-muted)]">
                      Transparent graphics may get a white background as JPG. Use Media Converter if you need to preserve transparency.
                    </p>
                  ) : null}
                  {rescueMessage ? (
                    <p className="mt-2 text-xs leading-5 text-[color:var(--co-text)]">{rescueMessage}</p>
                  ) : null}

                  <div className="mt-3 grid max-h-[210px] gap-2 overflow-y-auto pr-1 co-scrollbar">
                    {visibleRescueItems.map((item) => (
                      <div
                        key={item.id}
                        className="min-w-0 rounded-xl border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/60 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-[color:var(--co-text)]">{item.name}</div>
                            <div className="mt-1 text-[11px] text-[color:var(--co-muted)]">
                              {item.optimizedSizeLabel
                                ? `${item.originalSizeLabel} -> ${item.optimizedSizeLabel}`
                                : item.originalSizeLabel}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-2.5 py-1 text-[10px] text-[color:var(--co-muted)]">
                            {item.status === "waiting"
                              ? "Ready"
                              : item.status === "optimizing"
                                ? "Optimizing"
                                : item.status === "optimized"
                                  ? "Added"
                                  : "Needs control"}
                          </span>
                        </div>
                        {item.message ? (
                          <div className="mt-2 text-[11px] leading-5 text-[color:var(--co-muted)]">{item.message}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <button
                    type="button"
                    onClick={onOptimizeForWorkspace}
                    disabled={isOptimizingRescue || !waitingRescueItems.length}
                    className={[
                      "rounded-full px-4 py-2 text-sm pressable",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                      isOptimizingRescue || !waitingRescueItems.length
                        ? "cursor-not-allowed border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)]"
                        : "bg-[color:var(--co-text)] text-[color:var(--co-bg)] hover:opacity-90",
                    ].join(" ")}
                  >
                    {isOptimizingRescue
                      ? "Optimizing..."
                      : optimizedRescueItems.length && !waitingRescueItems.length
                        ? "Optimized copies added"
                        : "Optimize for workspace"}
                  </button>

                  <button
                    type="button"
                    onClick={onSkipLargeFiles}
                    disabled={isOptimizingRescue}
                    className="rounded-full border border-[color:var(--co-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] pressable disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Skip large files
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/prototype/media-converter")}
                    disabled={isOptimizingRescue}
                    className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Open Media Converter
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="co-upload-dropzone">
                  <button
                    type="button"
                    onClick={openSystemPicker}
                    className="co-upload-drop-icon pressable"
                    aria-label="Browse files"
                  >
                    +
                  </button>
                  <div className="text-sm font-medium text-[color:var(--co-text)]">Drop image files</div>
                  <div className="mt-1 text-xs text-[color:var(--co-muted)]">
                    Up to {remaining} more, 8MB each.
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-[color:var(--co-muted)]">
                    JPG, PNG, WebP, GIF supported by browser preview.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeUploadModal}
                      className="rounded-full border border-[color:var(--co-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] pressable"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={openSystemPicker}
                      className="rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable"
                    >
                      Browse files
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
