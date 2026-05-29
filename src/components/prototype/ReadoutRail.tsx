// src/components/prototype/ReadoutRail.tsx
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "../../app/theme/ThemeToggle";
import { useTheme } from "../../app/theme/useTheme";
import { usePrototypeStore } from "../../store/prototypeStore";

type Signal = {
  layer: string;
  label: string;
  copy: string;
};

const routeSignals: Record<string, Signal> = {
  "/prototype/library": {
    layer: "INTAKE",
    label: "Asset intake",
    copy: "Keep only the source material strong enough to shape the Week Pack.",
  },
  "/prototype/smart-mix": {
    layer: "DECISION",
    label: "Candidate rhythm",
    copy: "Choose the strongest visual rhythm for the Week Pack.",
  },
  "/prototype/sequence": {
    layer: "PLAN",
    label: "Publishing shape",
    copy: "The selected rhythm becomes a readable publishing board.",
  },
  "/prototype/planner": {
    layer: "PLAN",
    label: "Publishing shape",
    copy: "Slots stay editable before the pack moves into captions.",
  },
  "/prototype/captions": {
    layer: "VOICE",
    label: "Caption layer",
    copy: "Caption drafts stay aligned with the selected weekly rhythm.",
  },
  "/prototype/export": {
    layer: "OUTPUT",
    label: "Pack readiness",
    copy: "Images, captions, CSV, and manifest converge into one handoff.",
  },
  "/prototype/bio-builder": {
    layer: "PROFILE",
    label: "Profile handoff studio",
    copy: "Profile copy and preview stay aligned with the Week Pack.",
  },
};

type ReadoutRailProps = {
  mode?: "rail" | "compact";
};

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="co-readout-row flex items-baseline justify-between gap-4 py-2.5 first:border-t-0">
      <div className="min-w-0 text-xs text-[color:var(--co-muted)]">{label}</div>
      <div className="text-sm tabular-nums text-[color:var(--co-text)]">{value}</div>
    </div>
  );
}

export default function ReadoutRail({ mode = "rail" }: ReadoutRailProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { theme, setTheme } = useTheme();

  const readout = usePrototypeStore((s) => s.readout);

  const uploadAssetIds = usePrototypeStore((s) => s.uploadAssetIds);
  const uploadError = usePrototypeStore((s) => s.uploadError);
  const addUploads = usePrototypeStore((s) => s.addUploads);
  const clearUploads = usePrototypeStore((s) => s.clearUploads);

  const analysisPendingIds = usePrototypeStore((s) => s.analysisPendingIds);
  const planner = usePrototypeStore((s) => s.planner);
  const captions = usePrototypeStore((s) => s.captions);

  const MAX_UPLOADS = 12;
  const remaining = Math.max(0, MAX_UPLOADS - uploadAssetIds.length);
  const routePath = location.pathname === "/prototype/sequence" ? "/prototype/planner" : location.pathname;
  const isLibrary = location.pathname === "/prototype/library";
  const isSmartMix = location.pathname === "/prototype/smart-mix";
  const signal = routeSignals[routePath] ?? routeSignals["/prototype/library"];
  const visibleMixStates = isSmartMix ? Math.min(readout.mixes, 3) : readout.mixes;
  const bioBuilderState =
    location.pathname === "/prototype/export"
      ? {
          source: "export",
          useCurrentExportPack: true,
        }
      : undefined;

  const pendingUploads = useMemo(() => {
    if (!uploadAssetIds.length) return 0;
    const set = new Set(uploadAssetIds);
    return (analysisPendingIds ?? []).filter((id) => set.has(id)).length;
  }, [analysisPendingIds, uploadAssetIds]);

  const scanDone = uploadAssetIds.length > 0 && pendingUploads === 0;
  const plannedSlots = useMemo(() => planner.filter((slot) => Boolean(slot.tileId)).length, [planner]);
  const hasCaptionDraft = useMemo(
    () => Boolean(captions?.variants?.some((variant) => variant?.trim()) || captions?.hashtags?.length),
    [captions]
  );

  const packState = useMemo(() => {
    if (routePath === "/prototype/library") {
      return readout.selected > 0 ? `${readout.selected} selected` : "ready to start";
    }

    if (routePath === "/prototype/smart-mix") {
      return "candidates ready";
    }

    if (routePath === "/prototype/planner") {
      return plannedSlots > 0 ? "board ready" : "board draft";
    }

    if (routePath === "/prototype/captions") {
      return hasCaptionDraft ? "caption draft ready" : "caption draft";
    }

    if (routePath === "/prototype/export") {
      return "ZIP ready";
    }

    if (routePath === "/prototype/bio-builder") {
      return "profile ready";
    }

    return "ready";
  }, [hasCaptionDraft, plannedSlots, readout.selected, routePath, visibleMixStates]);

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length) {
      await addUploads(files);
    }
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

  if (mode === "compact") {
    const nextTheme = theme === "dark" ? "light" : "dark";

    return (
      <div className="co-signal-strip min-w-0">
        <div className="co-signal-pill co-signal-pill--primary">
          <strong className="co-layer-label">{signal.layer}</strong>
          <span>&middot;</span>
          <span className="truncate">{signal.label}</span>
        </div>

        <div className="co-signal-pill">
          <strong>Week Pack 01</strong>
          <span>&middot;</span>
          <span className="tabular-nums">{packState}</span>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/prototype/bio-builder", {
              state: bioBuilderState,
            })
          }
          className="co-signal-pill hover:bg-[color:var(--co-surface-active)] pressable"
        >
          <strong>Profile Handoff</strong>
        </button>

        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          className="co-signal-pill co-signal-theme hover:bg-[color:var(--co-surface-active)] pressable"
          aria-label={`Switch to ${nextTheme} theme`}
        >
          <strong>Theme</strong>
          <span>&middot;</span>
          <span>{theme === "dark" ? "Dark" : "Light"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="co-readout-rail co-scrollbar flex h-full min-w-0 flex-col gap-3 overflow-y-auto pr-1">
      <div className="co-readout-panel min-w-0 rounded-[1.05rem] p-3.5 text-[color:var(--co-text)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Workflow signal</div>
            <div className="mt-2 text-sm font-medium text-[color:var(--co-text)]">{signal.label}</div>
          </div>
          <div className="shrink-0 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-2.5 py-1 text-[11px] text-[color:var(--co-muted)]">
            {signal.layer}
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-5 text-[color:var(--co-muted)]">{signal.copy}</p>

        <div className="mt-3">
          <Row label="Week Pack" value={readout.selected} />
          <Row label="Candidates" value={visibleMixStates} />
          <Row label="Board slots" value={plannedSlots} />
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          navigate("/prototype/bio-builder", {
            state: bioBuilderState,
          })
        }
        className="co-readout-panel min-w-0 rounded-[1.05rem] px-3.5 py-3 text-left text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Profile tool</div>
            <div className="mt-1 truncate text-xs text-[color:var(--co-text)]">Bio Builder</div>
          </div>
          <div className="shrink-0 rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-2.5 py-1 text-[11px] text-[color:var(--co-muted)]">
            Open
          </div>
        </div>
      </button>

      <div className="co-readout-panel min-w-0 rounded-[1.05rem] px-3.5 py-3 text-[color:var(--co-text)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Theme</div>
            <div className="mt-1 truncate text-xs text-[color:var(--co-text)]">Workspace mode</div>
          </div>
        </div>
        <ThemeToggle className="mt-3 inline-flex w-full justify-center" />
      </div>

      {isLibrary ? (
        <div
          className={[
            "co-readout-panel relative min-w-0 rounded-[1.05rem] p-3.5 text-[color:var(--co-text)]",
            isDragging ? "border-[color:var(--co-text)]/30" : "",
          ].join(" ")}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          aria-label="Uploads"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Intake uploads</div>
              <div className="mt-1 text-xs text-[color:var(--co-muted)]">Drop assets into the field.</div>
            </div>
            <div className="text-xs tabular-nums text-[color:var(--co-muted)]">
              {uploadAssetIds.length}/{MAX_UPLOADS}
            </div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={[
                "w-full rounded-xl border px-3 py-2 text-sm pressable transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                "border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)]",
              ].join(" ")}
              title="Upload up to 12 images (<=5MB each)"
            >
              Add photos
              <span className="ml-2 text-xs text-[color:var(--co-muted)]">{remaining} remaining - &lt;=5MB</span>
            </button>

            {uploadAssetIds.length > 0 ? (
              <button
                type="button"
                onClick={clearUploads}
                className="w-full rounded-xl border border-[color:var(--co-border-soft)] bg-transparent px-3 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface)] pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
                title="Remove uploaded images"
              >
                Clear uploads
              </button>
            ) : null}

            {pendingUploads > 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-2">
                <div className="text-xs text-[color:var(--co-muted)]">Scanning</div>
                <div className="text-xs tabular-nums text-[color:var(--co-text)]">
                  {uploadAssetIds.length - pendingUploads}/{uploadAssetIds.length}
                </div>
              </div>
            ) : scanDone ? (
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-2">
                <div className="text-xs text-[color:var(--co-muted)]">Analysis</div>
                <div className="text-xs text-[color:var(--co-text)]">Ready</div>
              </div>
            ) : null}

            {uploadError ? (
              <div className="text-xs text-[color:var(--co-muted)]">
                <span className="inline-flex rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1">
                  {uploadError}
                </span>
              </div>
            ) : null}
          </div>

          {isDragging ? (
            <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-xl border border-[color:var(--co-text)]/25 bg-[color:var(--co-bg)]/45 backdrop-blur">
              <div className="text-sm text-[color:var(--co-text)]">Drop images to upload</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
