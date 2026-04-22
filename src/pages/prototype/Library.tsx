// src/pages/prototype/Library.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";
import OnboardingHint from "../../components/prototype/OnboardingHint";

export default function Library() {
  const navigate = useNavigate();

  const assets = usePrototypeStore((s) => s.assets);
  const selected = usePrototypeStore((s) => s.selectedAssetIds);
  const toggleSelect = usePrototypeStore((s) => s.toggleSelect);
  const clearSelection = usePrototypeStore((s) => s.clearSelection);
  const generateMixes = usePrototypeStore((s) => s.generateMixes);
  const scanMissingAssetAnalysis = usePrototypeStore((s) => s.scanMissingAssetAnalysis);

  const removeUpload = usePrototypeStore((s) => s.removeUpload);

  const selectedSet = new Set(selected);
  const hasSelection = selected.length > 0;

  // показуємо тільки 4:5 (Instagram feed)
  const feedAssets = assets.filter((a) => a.ratio === "4:5");

  // Pre-scan analysis for assets visible in this view (demo + uploads)
  const feedKey = feedAssets.map((a) => a.id).join("|");
  useEffect(() => {
    void scanMissingAssetAnalysis(feedAssets.map((a) => a.id));
  }, [scanMissingAssetAnalysis, feedKey]);

  const onAddToSmartMix = async () => {
    await generateMixes();
    navigate("/prototype/smart-mix");
  };

  return (
    <div className="space-y-4 text-[color:var(--co-text)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-lg text-[color:var(--co-text)]">Library</div>
          <div className="text-sm text-[color:var(--co-muted)]">Select assets to curate.</div>
        </div>

        {/* Header actions (no uploader here; uploader lives in right rail) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={clearSelection}
            disabled={!selected.length}
            className={[
              "rounded-full border px-4 py-2 text-sm transition pressable",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              selected.length
                ? "border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-text)] hover:opacity-90"
                : "cursor-not-allowed border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)] opacity-60",
            ].join(" ")}
            title={selected.length ? "Clear selection" : "Select assets first"}
          >
            Restart
          </button>

          <button
            type="button"
            onClick={onAddToSmartMix}
            className="relative z-10 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]"
          >
            Add to Smart Mix
            <span className="ml-2 inline-flex items-center rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-bg)]/70 px-2 py-0.5 text-[11px] tabular-nums text-[color:var(--co-text)]">
              {selected.length ? `${selected.length} selected` : "auto"}
            </span>
          </button>
        </div>
      </div>

      <OnboardingHint />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                "group relative overflow-hidden rounded-2xl border bg-[color:var(--co-surface-2)] text-left shadow-sm transition pressable",
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
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[color:var(--co-text)]/[0.10]" />
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-[color:var(--co-text)]/20 ring-inset" />
                  </>
                ) : (
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-transparent ring-inset transition group-hover:ring-[color:var(--co-border)]" />
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
    </div>
  );
}