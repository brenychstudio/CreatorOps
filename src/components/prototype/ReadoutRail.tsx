// src/components/prototype/ReadoutRail.tsx
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useLocation } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <div className="text-xs text-[color:var(--co-muted)]">{label}</div>
      <div className="text-sm text-[color:var(--co-text)]">{value}</div>
    </div>
  );
}

export default function ReadoutRail() {
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readout = usePrototypeStore((s) => s.readout);

  const uploadAssetIds = usePrototypeStore((s) => s.uploadAssetIds);
  const uploadError = usePrototypeStore((s) => s.uploadError);
  const addUploads = usePrototypeStore((s) => s.addUploads);
  const clearUploads = usePrototypeStore((s) => s.clearUploads);

  const analysisPendingIds = usePrototypeStore((s) => s.analysisPendingIds);

  const MAX_UPLOADS = 12;
  const remaining = Math.max(0, MAX_UPLOADS - uploadAssetIds.length);
  const isLibrary = location.pathname === "/prototype/library";

  const pendingUploads = useMemo(() => {
    if (!uploadAssetIds.length) return 0;
    const set = new Set(uploadAssetIds);
    return (analysisPendingIds ?? []).filter((id) => set.has(id)).length;
  }, [analysisPendingIds, uploadAssetIds]);

  const scanDone = uploadAssetIds.length > 0 && pendingUploads === 0;

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length) {
      await addUploads(files);
    }
    // allow re-picking the same file
    e.currentTarget.value = "";
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
    <div className="space-y-4">
      {/* Machine readout */}
      <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm text-[color:var(--co-text)]">
        <div className="text-xs text-[color:var(--co-muted)]">Machine readout</div>
        <div className="mt-2 h-px w-full bg-[color:var(--co-border)]" />
        <div className="mt-2">
          <Row label="Selected" value={readout.selected} />
          <Row label="Mixes" value={readout.mixes} />
          <Row label="Conflicts avoided" value={readout.conflictsAvoided} />
          <Row label="Time saved (min)" value={readout.minutesSaved} />
        </div>
      </div>

      {/* Uploads panel (only on Library) */}
      {isLibrary ? (
        <div
          className={[
            "relative rounded-2xl border bg-[color:var(--co-surface-2)] p-4 shadow-sm text-[color:var(--co-text)]",
            isDragging ? "border-[color:var(--co-text)]/40" : "border-[color:var(--co-border)]",
          ].join(" ")}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          aria-label="Uploads"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-[color:var(--co-muted)]">Uploads</div>
            <div className="text-xs text-[color:var(--co-muted)] tabular-nums">
              {uploadAssetIds.length}/{MAX_UPLOADS}
            </div>
          </div>
          <div className="mt-2 h-px w-full bg-[color:var(--co-border)]" />

          {/* hidden input */}
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={[
                "w-full rounded-xl border px-3 py-2 text-sm pressable transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                "border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-text)] hover:opacity-90",
              ].join(" ")}
              title="Upload up to 12 images (≤5MB each)"
            >
              Add photos
              <span className="ml-2 text-xs text-[color:var(--co-muted)]">{remaining} remaining · ≤5MB</span>
            </button>

            {uploadAssetIds.length > 0 ? (
              <button
                type="button"
                onClick={clearUploads}
                className="w-full rounded-xl border border-[color:var(--co-border)] bg-transparent px-3 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
                title="Remove uploaded images"
              >
                Clear uploads
              </button>
            ) : null}

            {/* scanning status */}
            {pendingUploads > 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-2">
                <div className="text-xs text-[color:var(--co-muted)]">Scanning…</div>
                <div className="text-xs text-[color:var(--co-text)] tabular-nums">
                  {uploadAssetIds.length - pendingUploads}/{uploadAssetIds.length}
                </div>
              </div>
            ) : scanDone ? (
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-2">
                <div className="text-xs text-[color:var(--co-muted)]">Analysis</div>
                <div className="text-xs text-[color:var(--co-text)]">Ready</div>
              </div>
            ) : null}

            {uploadError ? (
              <div className="text-xs text-[color:var(--co-muted)]">
                <span className="inline-flex rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1">
                  {uploadError}
                </span>
              </div>
            ) : null}

            <div className="text-[11px] text-[color:var(--co-muted)]">Tip: drag & drop images onto this card.</div>
          </div>

          {/* Drag overlay */}
          {isDragging ? (
            <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border border-[color:var(--co-text)]/25 bg-[color:var(--co-bg)]/30 backdrop-blur">
              <div className="text-sm text-[color:var(--co-text)]">Drop images to upload</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
