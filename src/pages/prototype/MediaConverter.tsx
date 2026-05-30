import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const presets = [
  {
    title: "Make smaller",
    copy: "Reduce file size for faster sharing.",
  },
  {
    title: "Website ready",
    copy: "Prepare web-friendly images.",
  },
  {
    title: "Social media ready",
    copy: "Resize for publishing surfaces.",
  },
  {
    title: "Keep best quality",
    copy: "Convert without aggressive compression.",
  },
  {
    title: "Transparent image",
    copy: "Preserve transparency when possible.",
  },
];

const queue = [
  {
    filename: "portrait-01.jpg",
    format: "JPG -> WebP",
    detail: "Ready for engine",
    status: "Planned",
  },
  {
    filename: "studio-grid.png",
    format: "PNG -> WebP",
    detail: "Transparency detected",
    status: "Ready",
  },
  {
    filename: "cover-export.webp",
    format: "WebP -> JPG",
    detail: "Background required",
    status: "Needs background",
  },
];

const plan = [
  ["Output format", "WebP"],
  ["Quality", "90"],
  ["Resize", "Original size"],
  ["Export", "ZIP"],
];

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

export default function MediaConverter() {
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
              <div className="flex min-h-[12.5rem] min-w-0 flex-col justify-between gap-3 rounded-[1.05rem] border border-dashed border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/35 p-4 sm:min-h-[13.5rem]">
                <div className="max-w-xl">
                  <div className="co-layer-label text-[11px] text-[color:var(--co-muted)]">Local intake</div>
                  <div className="mt-3 text-[clamp(1.5rem,2.8vw,2.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[color:var(--co-text)]">
                    Drop images here
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--co-muted)] sm:text-base">
                    or choose files from your computer.
                  </p>
                  <p className="mt-2 max-w-md text-xs leading-5 text-[color:var(--co-muted)] sm:text-sm">
                    JPG, PNG, and WebP are planned for the first local conversion engine.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm font-medium text-[color:var(--co-text)] opacity-80"
                    aria-describedby="media-converter-intake-note"
                  >
                    Choose images
                  </button>
                  <span
                    id="media-converter-intake-note"
                    className="text-xs leading-5 text-[color:var(--co-muted)]"
                  >
                    Next build: file intake will be enabled here.
                  </span>
                </div>
              </div>
            </Panel>

            <Panel className="!h-auto !p-3">
              <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Queue preview</div>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-[color:var(--co-text)]">
                    Planned batch state
                  </h2>
                </div>
                <span className="text-xs text-[color:var(--co-muted)]">Mock rows only - no file data yet</span>
              </div>

              <div className="mt-2 grid gap-1.5">
                {queue.map((item) => (
                  <div
                    key={item.filename}
                    className="grid min-w-0 items-center gap-2 rounded-[0.85rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/45 px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[color:var(--co-text)]">{item.filename}</div>
                      <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">{item.detail}</div>
                    </div>
                    <div className="text-xs text-[color:var(--co-muted)] sm:text-sm">{item.format}</div>
                    <div className="w-fit rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-text)]">
                      {item.status}
                    </div>
                  </div>
                ))}
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

              <p className="mt-2 text-xs leading-5 text-[color:var(--co-muted)]">
                Advanced settings will stay collapsed by default.
              </p>
            </Panel>

            <Panel className="!h-auto !p-3">
              <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Presets</div>
              <div className="mt-2 grid gap-1.5 xl:grid-cols-2">
                {presets.map((preset) => (
                  <div
                    key={preset.title}
                    className="rounded-[0.85rem] border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)]/45 px-3 py-1.5"
                  >
                    <div className="text-sm font-medium text-[color:var(--co-text)]">{preset.title}</div>
                    <div className="mt-1 text-xs leading-4 text-[color:var(--co-muted)]">{preset.copy}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </div>

        <section className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="co-shell-strip rounded-[1.1rem] px-4 py-3">
            <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Local-first by design</div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[color:var(--co-muted)] sm:text-sm">
              Designed for local processing. The planned v1 engine will convert images in the browser without uploading
              them.
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
