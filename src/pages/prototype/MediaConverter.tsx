import type { DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { convertImageFile } from "../../modules/media-converter/core/browserConvert";
import {
  detectCanvasFormatSupport,
  type MediaConverterFormatSupport,
} from "../../modules/media-converter/core/formatSupport";
import type { MediaConverterManifest, MediaConverterOutputFormat } from "../../modules/media-converter/core/types";
import {
  buildMediaConverterZipName,
  createMediaConverterZip,
} from "../../modules/media-converter/core/zipExport";

type ConverterPresetId = "smaller" | "website" | "social" | "quality" | "transparent";
type TargetFormat = MediaConverterOutputFormat;
type FormatLabel = TargetFormat | "Unknown";

type ConverterQueueStatus =
  | "ready"
  | "planned"
  | "needs-background"
  | "unsupported"
  | "too-large"
  | "metadata-loading"
  | "metadata-failed";

type ConverterConversionStatus = "idle" | "queued" | "converting" | "converted" | "failed";

type ConverterQueueItem = {
  id: string;
  file: File;
  name: string;
  type: string;
  formatLabel: FormatLabel;
  sizeLabel: string;
  width?: number;
  height?: number;
  objectUrl: string;
  presetId: ConverterPresetId;
  targetFormat: TargetFormat;
  status: ConverterQueueStatus;
  message: string;
  conversionStatus: ConverterConversionStatus;
  convertedObjectUrl?: string;
  convertedBlob?: Blob;
  convertedName?: string;
  convertedSizeLabel?: string;
  convertedSizeDeltaLabel?: string;
  convertedFormatLabel?: TargetFormat;
  conversionMessage?: string;
  usedFallback?: boolean;
};

const MAX_FILES = 20;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const OUTPUT_FORMATS: TargetFormat[] = ["JPG", "PNG", "WebP"];

const presets = [
  {
    id: "smaller",
    title: "Make smaller",
    description: "Reduce file size for faster sharing.",
    targetFormat: "WebP",
    quality: 80,
  },
  {
    id: "website",
    title: "Website ready",
    description: "Prepare web-friendly images.",
    targetFormat: "WebP",
    quality: 90,
  },
  {
    id: "social",
    title: "Social media ready",
    description: "Resize for publishing surfaces.",
    targetFormat: "JPG",
    quality: 88,
  },
  {
    id: "quality",
    title: "Keep best quality",
    description: "Convert without aggressive compression.",
    targetFormat: "PNG",
    quality: 100,
  },
  {
    id: "transparent",
    title: "Transparent image",
    description: "Preserve transparency when possible.",
    targetFormat: "PNG",
    quality: 100,
  },
] as const satisfies ReadonlyArray<{
  id: ConverterPresetId;
  title: string;
  description: string;
  targetFormat: TargetFormat;
  quality: number;
}>;

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
      {children}
    </span>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`co-workspace-panel min-h-0 ${className}`}>{children}</section>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getSizeDeltaLabel(originalSize: number, convertedSize: number) {
  if (!originalSize || !convertedSize) return null;

  const delta = convertedSize - originalSize;
  const percent = Math.round((Math.abs(delta) / originalSize) * 100);

  if (percent < 1) return "similar size";
  if (delta < 0) return `${percent}% smaller`;
  return `${percent}% larger`;
}

function getFormatLabel(file: File): FormatLabel {
  if (file.type === "image/jpeg") return "JPG";
  if (file.type === "image/png") return "PNG";
  if (file.type === "image/webp") return "WebP";
  return "Unknown";
}

function formatLabelFromMimeType(mimeType: string): TargetFormat {
  if (mimeType === "image/jpeg") return "JPG";
  if (mimeType === "image/webp") return "WebP";
  return "PNG";
}

function isSupportedFile(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();
  const supportedExtension = extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "webp";
  return ACCEPTED_TYPES.has(file.type) && supportedExtension;
}

function plannedState(formatLabel: FormatLabel, targetFormat: TargetFormat) {
  if ((formatLabel === "PNG" || formatLabel === "WebP") && targetFormat === "JPG") {
    return {
      status: "needs-background" as const,
      message: "Background may be required",
    };
  }

  return {
    status: "ready" as const,
    message: "Ready for engine",
  };
}

function statusLabel(status: ConverterQueueStatus) {
  const labels: Record<ConverterQueueStatus, string> = {
    ready: "Ready",
    planned: "Planned",
    "needs-background": "Needs background",
    unsupported: "Unsupported",
    "too-large": "Too large",
    "metadata-loading": "Loading",
    "metadata-failed": "Metadata failed",
  };

  return labels[status];
}

function conversionStatusLabel(item: ConverterQueueItem) {
  if (item.conversionStatus === "converted") {
    return item.usedFallback ? `Converted as ${item.convertedFormatLabel ?? "PNG"} fallback` : "Converted";
  }

  if (item.conversionStatus === "converting") return "Converting";
  if (item.conversionStatus === "queued") return "Queued";
  if (item.conversionStatus === "failed") return "Conversion failed";
  return item.message || statusLabel(item.status);
}

function supportSummary(formatSupport: MediaConverterFormatSupport | null) {
  if (!formatSupport) return "Detecting...";
  return OUTPUT_FORMATS.map((format) => (formatSupport[format] ? `${format} supported` : `${format} fallback`)).join(" / ");
}

function formatSupportWarning(formatSupport: MediaConverterFormatSupport | null, targetFormat: TargetFormat) {
  if (!formatSupport || formatSupport[targetFormat]) return null;
  return `Selected ${targetFormat} output may fall back to PNG in this browser.`;
}

function createQueueId(file: File) {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${file.name}-${file.lastModified}-${randomPart}`;
}

function buildConvertedFilename(name: string, extension: string) {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}-converted.${extension}`;
}

function getPresetTitle(presetId: ConverterPresetId) {
  return presets.find((preset) => preset.id === presetId)?.title ?? "Custom";
}

function buildReadmeText() {
  return [
    "CreatorOps Media Converter",
    "",
    "This ZIP was generated locally in your browser.",
    "No files were uploaded for this conversion step.",
    "",
    "Contents:",
    "- converted/: converted image files",
    "- manifest.json: conversion metadata",
    "- README.txt: this note",
    "",
  ].join("\n");
}

function buildManifestFromConvertedItems(items: ConverterQueueItem[]): MediaConverterManifest {
  return {
    tool: "CreatorOps Media Converter",
    version: "v1-local",
    createdAt: new Date().toISOString(),
    localFirst: true,
    files: items.map((item) => ({
      originalName: item.name,
      convertedName: item.convertedName ?? "",
      originalFormat: item.formatLabel,
      outputFormat: item.convertedFormatLabel ?? item.targetFormat,
      originalSize: item.file.size,
      convertedSize: item.convertedBlob?.size ?? 0,
      width: item.width,
      height: item.height,
      preset: getPresetTitle(item.presetId),
      usedFallback: Boolean(item.usedFallback),
    })),
  };
}

function conversionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  if (message === "decode-failed") return "This image could not be decoded in the browser.";
  if (message === "canvas-context-failed") return "The browser could not prepare the conversion canvas.";
  if (message === "encode-failed") return "The browser could not export this image. Try PNG.";
  return "Conversion failed. Try another preset or file.";
}

function canConvertItem(item: ConverterQueueItem) {
  return item.status !== "unsupported" && item.status !== "too-large";
}

function shouldConvertItem(item: ConverterQueueItem) {
  return canConvertItem(item) && item.conversionStatus !== "converted" && item.conversionStatus !== "converting";
}

export default function MediaConverter() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<ConverterQueueItem[]>([]);
  const [queue, setQueue] = useState<ConverterQueueItem[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<ConverterPresetId>("website");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [formatSupport, setFormatSupport] = useState<MediaConverterFormatSupport | null>(null);

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId) ?? presets[1];
  const convertedItems = queue.filter(
    (item) => item.conversionStatus === "converted" && item.convertedBlob && item.convertedName,
  );
  const convertableCount = queue.filter(canConvertItem).length;
  const convertedCount = queue.filter((item) => item.conversionStatus === "converted").length;
  const pendingConversionCount = queue.filter(shouldConvertItem).length;
  const convertingCount = queue.filter(
    (item) => item.conversionStatus === "queued" || item.conversionStatus === "converting",
  ).length;
  const failedCount = queue.filter((item) => item.conversionStatus === "failed").length;
  const fallbackCount = queue.filter((item) => item.usedFallback).length;
  const hasConvertedOutputs = convertedCount > 0;
  const hasConvertedItems = convertedItems.length > 0;
  const allValidConverted = convertableCount > 0 && convertedItems.length === convertableCount;
  const canConvertQueue = pendingConversionCount > 0 && !isConverting;
  const selectedFormatWarning = formatSupportWarning(formatSupport, selectedPreset.targetFormat);
  const zipPlanStatus = zipError
    ? "Export failed"
    : isCreatingZip
      ? "Creating ZIP..."
      : hasConvertedItems
        ? `${convertedItems.length} file${convertedItems.length === 1 ? "" : "s"} ready`
        : "Ready after conversion";
  const queueSummary = queue.length
    ? [
        `${queue.length} file${queue.length === 1 ? "" : "s"}`,
        `${convertedCount} converted`,
        pendingConversionCount ? `${pendingConversionCount} ready` : null,
        failedCount ? `${failedCount} failed` : null,
        fallbackCount ? `${fallbackCount} fallback` : null,
        allValidConverted ? "ZIP ready" : hasConvertedItems ? "ZIP includes converted files only" : null,
      ]
        .filter(Boolean)
        .join(" - ")
    : "No files yet";
  const convertQueueLabel = !queue.length
    ? "Add images first"
    : isConverting
      ? "Converting..."
      : !pendingConversionCount && convertedCount
        ? "Converted"
        : "Convert queue";

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    let isMounted = true;

    detectCanvasFormatSupport()
      .then((support) => {
        if (isMounted) setFormatSupport(support);
      })
      .catch(() => {
        if (isMounted) {
          setFormatSupport({
            JPG: false,
            PNG: true,
            WebP: false,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        URL.revokeObjectURL(item.objectUrl);
        if (item.convertedObjectUrl) URL.revokeObjectURL(item.convertedObjectUrl);
      });
    };
  }, []);

  const plan = useMemo(
    () => [
      ["Selected preset", selectedPreset.title],
      ["Output format", selectedPreset.targetFormat],
      ["Browser output", supportSummary(formatSupport)],
      ["Quality", String(selectedPreset.quality)],
      ["Resize", "Original size"],
      ["Queue", queue.length ? queueSummary : "Waiting for images"],
      ["Converted", `${convertedCount} / ${convertableCount || 0}`],
      ["ZIP", zipPlanStatus],
      ...(isConverting ? ([["Converting", `${convertingCount} / ${convertableCount || 0}`]] as const) : []),
    ],
    [
      convertableCount,
      convertedCount,
      convertingCount,
      isConverting,
      queue.length,
      queueSummary,
      formatSupport,
      zipPlanStatus,
      selectedPreset.quality,
      selectedPreset.targetFormat,
      selectedPreset.title,
    ],
  );

  const updatePreset = (presetId: ConverterPresetId) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;

    queueRef.current.forEach((item) => {
      if (item.convertedObjectUrl) URL.revokeObjectURL(item.convertedObjectUrl);
    });

    setSelectedPresetId(presetId);
    setZipError(null);
    setQueue((items) =>
      items.map((item) => {
        const state = plannedState(item.formatLabel, preset.targetFormat);
        return {
          ...item,
          presetId,
          targetFormat: preset.targetFormat,
          status: item.status === "metadata-loading" || item.status === "metadata-failed" ? item.status : state.status,
          message: item.status === "metadata-loading" || item.status === "metadata-failed" ? item.message : state.message,
          conversionStatus: "idle",
          convertedObjectUrl: undefined,
          convertedBlob: undefined,
          convertedName: undefined,
          convertedSizeLabel: undefined,
          convertedSizeDeltaLabel: undefined,
          convertedFormatLabel: undefined,
          conversionMessage: undefined,
          usedFallback: undefined,
        };
      }),
    );
  };

  const loadDimensions = (item: ConverterQueueItem) => {
    const image = new Image();
    image.onload = () => {
      setQueue((items) =>
        items.map((current) => {
          if (current.id !== item.id) return current;
          const state = plannedState(current.formatLabel, current.targetFormat);
          return {
            ...current,
            width: image.naturalWidth,
            height: image.naturalHeight,
            status: state.status,
            message: state.message,
          };
        }),
      );
    };
    image.onerror = () => {
      setQueue((items) =>
        items.map((current) =>
          current.id === item.id
            ? {
                ...current,
                status: "metadata-failed",
                message: "Metadata failed",
                conversionStatus: "failed",
                conversionMessage: "This image could not be decoded in the browser.",
              }
            : current,
        ),
      );
    };
    image.src = item.objectUrl;
  };

  const addFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const nextWarnings = new Set<string>();
    const availableSlots = Math.max(0, MAX_FILES - queueRef.current.length);

    if (availableSlots <= 0) {
      setWarnings(["Batch limit is 20 images for this local preview."]);
      return;
    }

    if (incoming.length > availableSlots) {
      nextWarnings.add("Batch limit is 20 images for this local preview.");
    }

    const accepted: ConverterQueueItem[] = [];

    for (const file of incoming.slice(0, availableSlots)) {
      if (!isSupportedFile(file)) {
        nextWarnings.add("Only JPG, PNG, and WebP are supported in this preview.");
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        nextWarnings.add("Files above 15 MB are skipped for now.");
        continue;
      }

      const formatLabel = getFormatLabel(file);
      const objectUrl = URL.createObjectURL(file);
      const item: ConverterQueueItem = {
        id: createQueueId(file),
        file,
        name: file.name,
        type: file.type,
        formatLabel,
        sizeLabel: formatFileSize(file.size),
        objectUrl,
        presetId: selectedPreset.id,
        targetFormat: selectedPreset.targetFormat,
        status: "metadata-loading",
        message: "Metadata loading",
        conversionStatus: "idle",
      };

      accepted.push(item);
    }

    if (accepted.length) {
      setZipError(null);
      setQueue((items) => [...items, ...accepted]);
      accepted.forEach(loadDimensions);
    }

    setWarnings(Array.from(nextWarnings));
  };

  const removeItem = (id: string) => {
    setZipError(null);
    setQueue((items) => {
      const item = items.find((current) => current.id === id);
      if (item) {
        URL.revokeObjectURL(item.objectUrl);
        if (item.convertedObjectUrl) URL.revokeObjectURL(item.convertedObjectUrl);
      }
      return items.filter((current) => current.id !== id);
    });
  };

  const clearQueue = () => {
    setQueue((items) => {
      items.forEach((item) => {
        URL.revokeObjectURL(item.objectUrl);
        if (item.convertedObjectUrl) URL.revokeObjectURL(item.convertedObjectUrl);
      });
      return [];
    });
    setWarnings([]);
    setIsConverting(false);
    setZipError(null);
  };

  const resetConvertedOutputs = () => {
    setZipError(null);
    setQueue((items) =>
      items.map((item) => {
        if (item.convertedObjectUrl) URL.revokeObjectURL(item.convertedObjectUrl);

        return {
          ...item,
          conversionStatus: item.conversionStatus === "converted" ? "idle" : item.conversionStatus,
          convertedObjectUrl: undefined,
          convertedBlob: undefined,
          convertedName: undefined,
          convertedSizeLabel: undefined,
          convertedSizeDeltaLabel: undefined,
          convertedFormatLabel: undefined,
          conversionMessage: undefined,
          usedFallback: undefined,
        };
      }),
    );
  };

  const retryItem = async (id: string) => {
    const currentItem = queueRef.current.find((item) => item.id === id);
    if (!currentItem || !canConvertItem(currentItem) || isConverting) return;

    setZipError(null);
    setIsConverting(true);
    setQueue((items) =>
      items.map((item) =>
        item.id === currentItem.id
          ? {
              ...item,
              conversionStatus: "converting",
              conversionMessage: "Converting",
            }
          : item,
      ),
    );

    try {
      const preset = presets.find((item) => item.id === currentItem.presetId) ?? selectedPreset;
      const result = await convertImageFile(currentItem.file, {
        outputFormat: currentItem.targetFormat,
        quality: preset.quality,
        backgroundColor: "#ffffff",
      });
      const convertedObjectUrl = URL.createObjectURL(result.blob);
      const convertedName = buildConvertedFilename(currentItem.name, result.extension);
      const convertedFormatLabel = formatLabelFromMimeType(result.mimeType);
      const convertedSizeLabel = formatFileSize(result.blob.size);
      const convertedSizeDeltaLabel = getSizeDeltaLabel(currentItem.file.size, result.blob.size) ?? undefined;

      setQueue((items) =>
        items.map((item) => {
          if (item.id !== currentItem.id) return item;
          if (item.convertedObjectUrl) URL.revokeObjectURL(item.convertedObjectUrl);

          return {
            ...item,
            conversionStatus: "converted",
            convertedObjectUrl,
            convertedBlob: result.blob,
            convertedName,
            convertedSizeLabel,
            convertedSizeDeltaLabel,
            convertedFormatLabel,
            conversionMessage: result.usedFallback
              ? `Converted as ${convertedFormatLabel} fallback`
              : `Converted as ${convertedFormatLabel}`,
            usedFallback: result.usedFallback,
          };
        }),
      );
    } catch (error) {
      setQueue((items) =>
        items.map((item) =>
          item.id === currentItem.id
            ? {
                ...item,
                conversionStatus: "failed",
                conversionMessage: conversionErrorMessage(error),
              }
            : item,
        ),
      );
    }

    setIsConverting(false);
  };

  const handleConvertQueue = async () => {
    const itemsToConvert = queueRef.current.filter(shouldConvertItem);
    if (!itemsToConvert.length || isConverting) return;

    setZipError(null);
    setIsConverting(true);
    setQueue((items) =>
      items.map((item) =>
        shouldConvertItem(item)
          ? {
              ...item,
              conversionStatus: "queued",
              conversionMessage: "Queued",
            }
          : item,
      ),
    );

    for (const queuedItem of itemsToConvert) {
      const currentItem = queueRef.current.find((item) => item.id === queuedItem.id);
      if (!currentItem || !canConvertItem(currentItem)) continue;

      setQueue((items) =>
        items.map((item) =>
          item.id === currentItem.id
            ? {
                ...item,
                conversionStatus: "converting",
                conversionMessage: "Converting",
              }
            : item,
        ),
      );

      try {
        const preset = presets.find((item) => item.id === currentItem.presetId) ?? selectedPreset;
        const result = await convertImageFile(currentItem.file, {
          outputFormat: currentItem.targetFormat,
          quality: preset.quality,
          backgroundColor: "#ffffff",
        });
        const convertedObjectUrl = URL.createObjectURL(result.blob);
        const convertedName = buildConvertedFilename(currentItem.name, result.extension);
        const convertedFormatLabel = formatLabelFromMimeType(result.mimeType);
        const convertedSizeLabel = formatFileSize(result.blob.size);
        const convertedSizeDeltaLabel = getSizeDeltaLabel(currentItem.file.size, result.blob.size) ?? undefined;

        setQueue((items) =>
          items.map((item) => {
            if (item.id !== currentItem.id) return item;
            if (item.convertedObjectUrl) URL.revokeObjectURL(item.convertedObjectUrl);

            return {
              ...item,
              conversionStatus: "converted",
              convertedObjectUrl,
              convertedBlob: result.blob,
              convertedName,
              convertedSizeLabel,
              convertedSizeDeltaLabel,
              convertedFormatLabel,
              conversionMessage: result.usedFallback
                ? `Converted as ${convertedFormatLabel} fallback`
                : `Converted as ${convertedFormatLabel}`,
              usedFallback: result.usedFallback,
            };
          }),
        );
      } catch (error) {
        setQueue((items) =>
          items.map((item) =>
            item.id === currentItem.id
              ? {
                  ...item,
                  conversionStatus: "failed",
                  conversionMessage: conversionErrorMessage(error),
                }
              : item,
          ),
        );
      }
    }

    setIsConverting(false);
  };

  const onDownload = (item: ConverterQueueItem) => {
    if (!item.convertedObjectUrl || !item.convertedName) return;
    const anchor = document.createElement("a");
    anchor.href = item.convertedObjectUrl;
    anchor.download = item.convertedName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleDownloadZip = async () => {
    if (!convertedItems.length || isCreatingZip) return;

    setIsCreatingZip(true);
    setZipError(null);

    try {
      const manifest = buildManifestFromConvertedItems(convertedItems);
      const zipBlob = await createMediaConverterZip({
        files: convertedItems.map((item) => ({
          path: `converted/${item.convertedName!}`,
          blob: item.convertedBlob!,
        })),
        manifest,
        readmeText: buildReadmeText(),
      });
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildMediaConverterZipName();
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setZipError("ZIP export failed. Try downloading files individually.");
    } finally {
      setIsCreatingZip(false);
    }
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.types?.includes("Files")) setIsDragging(true);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    if (event.dataTransfer?.types?.includes("Files")) setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setIsDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer?.files;
    if (files?.length) addFiles(files);
  };

  return (
    <div className="co-workspace-page co-scene co-asset-field">
      <div className="co-scrollbar grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 overflow-y-auto pr-1 lg:overflow-hidden">
        <header className="co-scene-header flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Media Tools</div>
            <h1 className="mt-1 text-[clamp(1.9rem,3.6vw,3.7rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-[color:var(--co-text)]">
              Media Converter
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-[color:var(--co-text)] sm:text-base">
              Prepare images before they enter your Week Pack.
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[color:var(--co-muted)] sm:text-sm">
              Convert, resize, and prepare images locally. Files stay on your device.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge>Local-first</Badge>
            <Badge>JPG / PNG / WebP</Badge>
            <Badge>No upload</Badge>
          </div>
        </header>

        <div className="grid min-h-0 min-w-0 items-start gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="grid min-h-0 min-w-0 gap-2">
            <Panel className="!h-auto !p-3">
              <div
                className={[
                  "relative flex min-h-[12.5rem] min-w-0 flex-col justify-between gap-3 rounded-[1.05rem] border border-dashed bg-[color:var(--co-surface)]/35 p-4 sm:min-h-[13.5rem]",
                  isDragging ? "border-[color:var(--co-text)]/45 bg-[color:var(--co-surface-active)]" : "border-[color:var(--co-border-soft)]",
                ].join(" ")}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  aria-label="Choose JPG, PNG, or WebP images"
                  onChange={(event) => {
                    if (event.currentTarget.files?.length) addFiles(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />

                <div className="max-w-xl">
                  <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Local intake</div>
                  <div className="mt-3 text-[clamp(1.5rem,2.8vw,2.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[color:var(--co-text)]">
                    {isDragging ? "Release to add images" : "Drop images here"}
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--co-muted)] sm:text-base">
                    or choose JPG, PNG, and WebP files from your computer.
                  </p>
                  <p className="mt-2 max-w-md text-xs leading-5 text-[color:var(--co-muted)] sm:text-sm">
                    Files stay on your device. Canvas conversion runs locally in this browser.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm font-medium text-[color:var(--co-bg)] pressable"
                  >
                    Choose images
                  </button>
                  <button
                    type="button"
                    onClick={handleConvertQueue}
                    disabled={!canConvertQueue}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium pressable",
                      !canConvertQueue
                        ? "cursor-not-allowed border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)]"
                        : "bg-[color:var(--co-text)] text-[color:var(--co-bg)]",
                    ].join(" ")}
                  >
                    {convertQueueLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={!hasConvertedItems || isCreatingZip}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium pressable",
                      allValidConverted
                        ? "bg-[color:var(--co-text)] text-[color:var(--co-bg)]"
                        : "border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] text-[color:var(--co-text)]",
                      !hasConvertedItems || isCreatingZip ? "cursor-not-allowed opacity-55" : "hover:bg-[color:var(--co-surface-active)]",
                    ].join(" ")}
                  >
                    {isCreatingZip ? "Creating ZIP..." : "Download ZIP"}
                  </button>
                  {hasConvertedOutputs ? (
                    <button
                      type="button"
                      onClick={resetConvertedOutputs}
                      disabled={isConverting}
                      className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] disabled:cursor-not-allowed disabled:text-[color:var(--co-muted)] pressable"
                    >
                      Reset outputs
                    </button>
                  ) : null}
                  {queue.length ? (
                    <button
                      type="button"
                      onClick={clearQueue}
                      className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable"
                    >
                      Clear queue
                    </button>
                  ) : null}
                  <span className="text-xs leading-5 text-[color:var(--co-muted)]">
                    {queue.length}/{MAX_FILES} local files
                  </span>
                  {zipError ? (
                    <span className="text-xs leading-5 text-[color:var(--co-muted)]">{zipError}</span>
                  ) : hasConvertedItems && !allValidConverted ? (
                    <span className="text-xs leading-5 text-[color:var(--co-muted)]">
                      ZIP includes converted files only.
                    </span>
                  ) : !hasConvertedItems && queue.length ? (
                    <span className="text-xs leading-5 text-[color:var(--co-muted)]">
                      ZIP export appears after conversion.
                    </span>
                  ) : null}
                </div>
              </div>
            </Panel>

            <Panel className="!h-auto !p-3">
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Conversion queue</div>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-[color:var(--co-text)]">
                    {queue.length ? "Local conversion queue" : "No files added yet."}
                  </h2>
                </div>
                <span className="text-xs text-[color:var(--co-muted)]">
                  {queue.length
                    ? queueSummary
                    : "Add JPG, PNG, or WebP images to prepare a local conversion queue."}
                </span>
              </div>

              {warnings.length ? (
                <div className="mt-2 rounded-[0.9rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/55 px-3 py-2 text-xs leading-5 text-[color:var(--co-muted)]">
                  <div className="font-medium text-[color:var(--co-text)]">Some files were not added.</div>
                  {warnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              ) : null}

              <div className="mt-2 grid max-h-[18rem] gap-1.5 overflow-y-auto pr-1">
                {queue.length ? (
                  queue.map((item) => {
                    const preset = presets.find((entry) => entry.id === item.presetId) ?? selectedPreset;
                    const dimensions = item.width && item.height ? `${item.width}x${item.height}` : "dimensions loading";
                    return (
                      <div
                        key={item.id}
                        className="grid min-w-0 items-center gap-3 rounded-[0.85rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/45 p-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
                      >
                        <img
                          src={item.objectUrl}
                          alt=""
                          className="h-14 w-14 rounded-[0.7rem] object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[color:var(--co-text)]">{item.name}</div>
                          <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">
                            {item.formatLabel} - {dimensions} - {item.sizeLabel}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">
                            {preset.title} - {item.formatLabel} -&gt; {item.targetFormat}
                          </div>
                          {item.conversionStatus === "converted" && item.convertedSizeLabel ? (
                            <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">
                              {item.conversionMessage} - {item.convertedSizeLabel}
                              {item.convertedSizeDeltaLabel ? ` - ${item.convertedSizeDeltaLabel}` : ""}
                            </div>
                          ) : null}
                          {item.conversionStatus === "failed" && item.conversionMessage ? (
                            <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">
                              {item.conversionMessage}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-text)]">
                            {conversionStatusLabel(item)}
                          </span>
                          {item.conversionStatus === "converted" ? (
                            <button
                              type="button"
                              onClick={() => onDownload(item)}
                              className="rounded-full bg-[color:var(--co-text)] px-3 py-1 text-[11px] font-medium text-[color:var(--co-bg)] pressable"
                            >
                              Download
                            </button>
                          ) : null}
                          {item.conversionStatus === "failed" && canConvertItem(item) ? (
                            <button
                              type="button"
                              onClick={() => retryItem(item.id)}
                              disabled={isConverting}
                              className="rounded-full bg-[color:var(--co-text)] px-3 py-1 text-[11px] font-medium text-[color:var(--co-bg)] disabled:cursor-not-allowed disabled:opacity-50 pressable"
                            >
                              Retry
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded-full border border-[color:var(--co-border-soft)] bg-transparent px-3 py-1 text-[11px] text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] hover:text-[color:var(--co-text)] pressable"
                            aria-label={`Remove ${item.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[0.85rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/45 p-3 text-sm text-[color:var(--co-muted)]">
                    No files added yet. Add JPG, PNG, or WebP images to prepare a local conversion queue.
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <aside className="grid min-h-0 min-w-0 gap-2">
            <Panel className="!h-auto !p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Conversion plan</div>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[color:var(--co-text)]">
                    Choose result
                  </h2>
                </div>
                <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                  {hasConvertedItems ? "ZIP ready" : "ZIP local"}
                </span>
              </div>

              <div className="mt-2 divide-y divide-[color:var(--co-border-soft)]">
                {plan.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-1.5 first:pt-0">
                    <span className="text-sm text-[color:var(--co-muted)]">{label}</span>
                    <span className="text-sm font-medium text-[color:var(--co-text)]">{value}</span>
                  </div>
                ))}
              </div>
              {selectedFormatWarning ? (
                <div className="mt-2 rounded-[0.85rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/45 px-3 py-2 text-xs leading-5 text-[color:var(--co-muted)]">
                  {selectedFormatWarning}
                </div>
              ) : null}
            </Panel>

            <Panel className="!h-auto !p-3">
              <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Presets</div>
              <div className="mt-2 grid gap-1.5 xl:grid-cols-2">
                {presets.map((preset) => {
                  const active = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updatePreset(preset.id)}
                      className={[
                        "rounded-[0.85rem] border px-3 py-1.5 text-left transition pressable",
                        active
                          ? "border-[color:var(--co-text)]/35 bg-[color:var(--co-surface-active)]"
                          : "border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/45 hover:bg-[color:var(--co-surface-active)]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-[color:var(--co-text)]">{preset.title}</div>
                        <div className="text-[11px] text-[color:var(--co-muted)]">{preset.targetFormat}</div>
                      </div>
                      <div className="mt-1 text-xs leading-4 text-[color:var(--co-muted)]">{preset.description}</div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </aside>
        </div>

        <section className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="co-shell-strip rounded-[1.1rem] px-4 py-3">
            <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Local-first by design</div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[color:var(--co-muted)] sm:text-sm">
              Files are added, converted, and packed locally in your browser. Nothing is uploaded for this conversion step.
            </p>
          </div>

          <div className="co-shell-strip flex flex-wrap items-center gap-3 rounded-[1.1rem] px-4 py-3 lg:justify-end">
            <Link
              to="/prototype/library"
              className="rounded-full bg-[color:var(--co-text)] px-5 py-2.5 text-sm font-medium text-[color:var(--co-bg)] pressable"
            >
              Back to workspace
            </Link>
            <Link
              to="/prototype/bio-builder"
              className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-5 py-2.5 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable"
            >
              Open Profile Handoff
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
