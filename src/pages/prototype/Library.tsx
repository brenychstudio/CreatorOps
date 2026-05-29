// src/pages/prototype/Library.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";
import OnboardingHint from "../../components/prototype/OnboardingHint";

export default function Library() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadModalTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadModalState, setUploadModalState] = useState<"closed" | "opening" | "open" | "closing">("closed");

  const assets = usePrototypeStore((s) => s.assets);
  const selected = usePrototypeStore((s) => s.selectedAssetIds);
  const toggleSelect = usePrototypeStore((s) => s.toggleSelect);
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
  const hasSelection = selected.length > 0;
  const maxUploads = 12;
  const remaining = Math.max(0, maxUploads - uploadAssetIds.length);

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
  const feedAssets = assets.filter((a) => a.ratio === "4:5");

  // Pre-scan analysis for assets visible in this view (demo + uploads)
  const feedKey = feedAssets.map((a) => a.id).join("|");
  useEffect(() => {
    void scanMissingAssetAnalysis(feedAssets.map((a) => a.id));
  }, [scanMissingAssetAnalysis, feedKey]);

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
  }, [isUploadModalVisible, uploadModalState]);

  const onAddToSmartMix = async () => {
    await generateMixes();
    navigate("/prototype/smart-mix");
  };

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length) {
      await addUploads(files);
      closeUploadModal();
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
      await addUploads(files);
      closeUploadModal();
    }
  };

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes("Files")) setIsDragging(true);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    if (e.dataTransfer?.types?.includes("Files")) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setIsDragging(false);
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length) {
      await addUploads(files);
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
      <div className="co-scene-header flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-base text-[color:var(--co-text)]">Library</div>
          <div className="text-sm text-[color:var(--co-muted)]">Intake field for shaping the week.</div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />

          <button
            type="button"
            onClick={openUploadModal}
            className="flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            title="Upload up to 12 images (<=5MB each)"
          >
            Add photos
            <span className="ml-2 text-[11px] text-[color:var(--co-muted)]">{remaining} left</span>
          </button>

          {uploadAssetIds.length ? (
            <button
              type="button"
              onClick={clearUploads}
              className="flex-1 rounded-full border border-[color:var(--co-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
            >
              Clear uploads
            </button>
          ) : null}

          <button
            type="button"
            onClick={clearSelection}
            disabled={!selected.length}
            className={[
              "flex-1 rounded-full border px-4 py-2 text-sm transition pressable sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              selected.length
                ? "border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-text)] hover:opacity-90"
                : "cursor-not-allowed border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)] opacity-60",
            ].join(" ")}
            title={selected.length ? "Clear selection" : "Select assets first"}
          >
            Clear selection
          </button>

          <button
            type="button"
            onClick={onAddToSmartMix}
            className="relative z-10 flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable sm:flex-none
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Add to Smart Mix
            <span className="ml-2 inline-flex items-center rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-bg)]/70 px-2 py-0.5 text-[11px] tabular-nums text-[color:var(--co-text)]">
              {selected.length ? `${selected.length} selected` : "Week Pack"}
            </span>
          </button>
        </div>
      </div>

      {scanStatus || uploadError ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-[color:var(--co-muted)]">
          {scanStatus ? (
            <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1">
              {scanStatus}
            </span>
          ) : null}
          {uploadError ? (
            <span className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1">
              {uploadError}
            </span>
          ) : null}
        </div>
      ) : null}

      <OnboardingHint />

      <div className="co-scrollbar grid min-h-0 min-w-0 flex-1 content-start gap-2 overflow-y-auto pr-1 sm:gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {feedAssets.map((a) => {
          const isSel = selectedSet.has(a.id);
          const isUpload = a.source === "upload";

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggleSelect(a.id)}
              aria-pressed={isSel}
              className={[
                "group relative overflow-hidden rounded-xl border bg-[color:var(--co-surface-2)] text-left shadow-sm transition pressable",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                isSel
                  ? "border-[color:var(--co-border)] shadow-md"
                  : "border-[color:var(--co-border)] hover:opacity-[0.96]",
              ].join(" ")}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[color:var(--co-surface)]">
                <img
                  src={a.thumbUrl}
                  alt=""
                  className={[
                    "h-full w-full object-cover transition",
                    isSel ? "opacity-100 scale-[1.01]" : "",
                    hasSelection && !isSel
                      ? "opacity-70 saturate-75 group-hover:opacity-100 group-hover:saturate-100"
                      : !hasSelection
                      ? "opacity-95 group-hover:opacity-100"
                      : "",
                  ].join(" ")}
                  draggable={false}
                  loading="lazy"
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
                  {a.ratio}
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
                  Add photos
                </div>
                <div className="mt-2 max-w-[34ch] text-sm leading-6 text-[color:var(--co-muted)]">
                  Drop images here or choose files from your computer.
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
                Up to {remaining} more, 5MB each.
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
