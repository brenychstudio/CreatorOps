import type { DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

type ConverterPresetId = "smaller" | "website" | "social" | "quality" | "transparent";
type TargetFormat = "JPG" | "PNG" | "WebP";
type FormatLabel = TargetFormat | "Unknown";

type ConverterQueueStatus =
  | "ready"
  | "planned"
  | "needs-background"
  | "unsupported"
  | "too-large"
  | "metadata-loading"
  | "metadata-failed";

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
};

const MAX_FILES = 20;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function getFormatLabel(file: File): FormatLabel {
  if (file.type === "image/jpeg") return "JPG";
  if (file.type === "image/png") return "PNG";
  if (file.type === "image/webp") return "WebP";
  return "Unknown";
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

function createQueueId(file: File) {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${file.name}-${file.lastModified}-${randomPart}`;
}

export default function MediaConverter() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<ConverterQueueItem[]>([]);
  const [queue, setQueue] = useState<ConverterQueueItem[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<ConverterPresetId>("website");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId) ?? presets[1];

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    };
  }, []);

  const plan = useMemo(
    () => [
      ["Selected preset", selectedPreset.title],
      ["Output format", selectedPreset.targetFormat],
      ["Quality", String(selectedPreset.quality)],
      ["Resize", "Original size"],
      ["Queue", queue.length ? `${queue.length} image${queue.length === 1 ? "" : "s"} ready` : "Waiting for images"],
      ["Export", "ZIP planned"],
    ],
    [queue.length, selectedPreset.quality, selectedPreset.targetFormat, selectedPreset.title],
  );

  const updatePreset = (presetId: ConverterPresetId) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setQueue((items) =>
      items.map((item) => {
        const state = plannedState(item.formatLabel, preset.targetFormat);
        return {
          ...item,
          presetId,
          targetFormat: preset.targetFormat,
          status: item.status === "metadata-loading" || item.status === "metadata-failed" ? item.status : state.status,
          message: item.status === "metadata-loading" || item.status === "metadata-failed" ? item.message : state.message,
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
      };

      accepted.push(item);
    }

    if (accepted.length) {
      setQueue((items) => [...items, ...accepted]);
      accepted.forEach(loadDimensions);
    }

    setWarnings(Array.from(nextWarnings));
  };

  const removeItem = (id: string) => {
    setQueue((items) => {
      const item = items.find((current) => current.id === id);
      if (item) URL.revokeObjectURL(item.objectUrl);
      return items.filter((current) => current.id !== id);
    });
  };

  const clearQueue = () => {
    setQueue((items) => {
      items.forEach((item) => URL.revokeObjectURL(item.objectUrl));
      return [];
    });
    setWarnings([]);
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
                    Files stay on your device. Conversion engine comes next.
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
                </div>
              </div>
            </Panel>

            <Panel className="!h-auto !p-3">
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Local queue</div>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-[color:var(--co-text)]">
                    {queue.length ? "Conversion queue" : "No files added yet."}
                  </h2>
                </div>
                <span className="text-xs text-[color:var(--co-muted)]">
                  {queue.length
                    ? "These files are ready for the browser conversion engine."
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
                            {item.formatLabel} · {dimensions} · {item.sizeLabel}
                          </div>
                        <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">
                          {preset.title} · {item.formatLabel} -&gt; {item.targetFormat}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-text)]">
                            {item.message || statusLabel(item.status)}
                        </span>
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
                  ZIP planned
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
              Files are added locally in your browser. The planned v1 conversion engine will process them without
              uploading.
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
