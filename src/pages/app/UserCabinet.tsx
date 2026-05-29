import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type PackId = (typeof recentPacks)[number]["id"];

const previewSets = {
  draft: [
    "/creatorops/thumbs/4x5/thumb-4x5-01.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-02.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-03.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-04.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-05.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-06.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-07.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-08.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-09.jpg",
  ],
  exported: [
    "/creatorops/thumbs/4x5/thumb-4x5-09.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-08.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-07.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-06.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-05.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-04.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-03.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-02.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-01.jpg",
  ],
  progress: [
    "/creatorops/thumbs/4x5/thumb-4x5-03.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-05.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-07.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-01.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-04.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-06.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-02.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-08.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-09.jpg",
  ],
} as const;

const recentPacks = [
  {
    id: "week-pack-01",
    title: "Week Pack 01",
    status: "Draft saved",
    meta: "9 assets - caption draft ready",
    note: "Your current Week Pack is ready to continue.",
    signal: "Assets ready - Smart Mix selected - captions ready - export ready.",
    action: "Continue",
    primaryLabel: "Continue workspace",
    primaryHref: "/prototype/library",
    secondaryLabel: "Open Export",
    secondaryHref: "/prototype/export",
    progress: ["Assets ready", "Smart Mix selected", "Board ready", "Caption draft ready", "Export ready"],
    preview: previewSets.draft,
  },
  {
    id: "week-pack-02",
    title: "Week Pack 02",
    status: "Exported",
    meta: "9 assets - ZIP ready",
    note: "This pack has a clean export ready to review.",
    signal: "Export ready - ZIP packed - captions included - bio handoff available.",
    action: "Review",
    primaryLabel: "Open Export",
    primaryHref: "/prototype/export",
    secondaryLabel: "Open workspace",
    secondaryHref: "/prototype/library",
    progress: ["Assets ready", "Smart Mix selected", "Board ready", "Captions ready", "Export ready"],
    preview: previewSets.exported,
  },
  {
    id: "week-pack-03",
    title: "Week Pack 03",
    status: "In progress",
    meta: "6 assets - mix needed",
    note: "This pack is waiting for a stronger visual rhythm.",
    signal: "Assets added - Smart Mix needed - planner not ready yet.",
    action: "Select",
    primaryLabel: "Open Smart Mix",
    primaryHref: "/prototype/smart-mix",
    secondaryLabel: "Open workspace",
    secondaryHref: "/prototype/library",
    progress: ["Assets ready", "Smart Mix needed", "Board pending", "Captions pending", "Export pending"],
    preview: previewSets.progress,
  },
] as const;

const usage = [
  ["Week Packs", "1 / 3"],
  ["Caption drafts", "4 / 20"],
  ["Exports", "1 / 3"],
  ["Storage", "120 MB / 1 GB"],
] as const;

const planItems = ["3 Week Packs / month", "20 caption drafts / month", "ZIP export", "Profile Handoff"] as const;

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-8 items-center justify-center rounded-full border border-[color:var(--co-border-soft)] bg-white/[0.035] px-2.5 text-[11px] text-[color:var(--co-muted)] transition hover:bg-white/[0.065] hover:text-[color:var(--co-text)] sm:h-9 sm:px-3 sm:text-xs"
    >
      {children}
    </Link>
  );
}

function PrimaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="pressable inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full bg-[color:var(--co-text)] px-3 text-[11px] font-medium text-[color:var(--co-bg)] transition hover:opacity-90 sm:h-10 sm:px-4 sm:text-sm"
    >
      {children}
    </Link>
  );
}

function QuietLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="pressable inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full border border-[color:var(--co-border-soft)] bg-white/[0.028] px-3 text-[11px] text-[color:var(--co-text)] transition hover:bg-white/[0.06] sm:h-10 sm:px-4 sm:text-sm"
    >
      {children}
    </Link>
  );
}

function QuietButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full border border-[color:var(--co-border-soft)] bg-white/[0.028] px-3 text-[11px] text-[color:var(--co-text)] transition hover:bg-white/[0.06] sm:h-10 sm:px-4 sm:text-sm"
    >
      {children}
    </button>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={[
        "min-w-0 border border-[color:var(--co-border-soft)] bg-white/[0.035] shadow-[0_22px_80px_-64px_rgba(0,0,0,0.9)] backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function PreviewGrid({ images }: { images: readonly string[] }) {
  return (
    <div className="rounded-[1.15rem] border border-[color:var(--co-border-soft)] bg-black/20 p-1.5 shadow-[0_18px_54px_-42px_rgba(0,0,0,0.9)] sm:rounded-[1.45rem] sm:p-2">
      <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-[0.85rem] sm:gap-2 sm:rounded-[1.1rem]">
        {images.map((src, index) => (
          <div key={`${src}-${index}`} className="relative aspect-[4/5] overflow-hidden bg-white/[0.04]">
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <div className="absolute left-1 top-1 rounded-full bg-black/35 px-1.5 py-0.5 text-[8px] text-white/72 backdrop-blur sm:text-[9px]">
              {String(index + 1).padStart(2, "0")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={[
        "fixed inset-0 z-50 flex items-center justify-center px-3 py-6 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        open ? "pointer-events-auto bg-black/68 opacity-100 backdrop-blur-xl" : "pointer-events-none bg-black/0 opacity-0 backdrop-blur-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      <button type="button" aria-label="Close subscription modal" className="absolute inset-0 cursor-default" onClick={onClose} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-title"
        className={[
          "relative w-full max-w-[760px] overflow-hidden rounded-[1.7rem] border border-white/12 bg-[#11161c]/95 shadow-[0_34px_120px_rgba(0,0,0,0.55)] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-5 scale-[0.96] opacity-0",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))]" />

        <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--co-muted)]">Subscription</div>
            <h2 id="subscription-title" className="mt-2 text-3xl font-semibold leading-none tracking-[-0.055em] sm:text-5xl">
              Free Beta
            </h2>
            <p className="mt-3 max-w-[34rem] text-sm leading-6 text-[color:var(--co-muted)]">
              Your current plan is active for the workspace shell. Billing is not live yet; paid subscription management will connect through Stripe when the SaaS release opens.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                ["Week Packs", "1 / 3 used"],
                ["Caption drafts", "4 / 20 used"],
                ["Exports", "1 / 3 used"],
                ["Storage", "120 MB / 1 GB"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1rem] border border-[color:var(--co-border-soft)] bg-white/[0.035] p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--co-muted)]">{label}</div>
                  <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.25rem] border border-[color:var(--co-border-soft)] bg-black/18 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Plan details</div>
            <div className="mt-3 grid gap-2 text-sm text-[color:var(--co-muted)]">
              <div>3 Week Packs / month</div>
              <div>20 caption drafts / month</div>
              <div>ZIP export</div>
              <div>Profile Handoff</div>
            </div>

            <div className="my-4 h-px bg-[color:var(--co-border-soft)]" />

            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Planned upgrades</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <span>Creator Pro</span>
                <span className="text-[color:var(--co-muted)]">$12 / month</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Studio</span>
                <span className="text-[color:var(--co-muted)]">$29 / month</span>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled
                className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-full border border-[color:var(--co-border-soft)] bg-white/[0.04] px-4 text-sm text-[color:var(--co-muted)]"
              >
                Subscription management planned
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--co-text)] px-4 text-sm font-medium text-[color:var(--co-bg)] transition hover:opacity-90"
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default function UserCabinet() {
  const [selectedPackId, setSelectedPackId] = useState<PackId>(recentPacks[0].id);
  const [pricingOpen, setPricingOpen] = useState(false);
  const selectedPack = useMemo(
    () => recentPacks.find((pack) => pack.id === selectedPackId) ?? recentPacks[0],
    [selectedPackId],
  );

  return (
    <div className="h-dvh overflow-hidden bg-[color:var(--co-bg)] text-[color:var(--co-text)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(188,205,255,0.045),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_46%,rgba(0,0,0,0.18))]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.11)_1px,transparent_1px)] [background-size:128px_128px]" />
      </div>

      <div className="relative mx-auto grid h-full w-full max-w-[1360px] grid-rows-[auto_auto_minmax(0,1fr)] gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 lg:gap-4 lg:px-8 lg:py-5">
        <header className="flex min-h-0 flex-col gap-2 rounded-[1.05rem] border border-[color:var(--co-border-soft)] bg-white/[0.035] px-3 py-2 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-[color:var(--co-text)]">CreatorOps</div>
            <div className="mt-0.5 text-[11px] text-[color:var(--co-muted)]">
              {selectedPack.title} &middot; {selectedPack.status.toLowerCase()}
            </div>
          </div>

          <nav className="flex min-w-0 flex-wrap gap-2">
            <NavLink to="/prototype/library">Open workspace</NavLink>
            <NavLink to="/story">Story</NavLink>
            <NavLink to="/">Home</NavLink>
          </nav>
        </header>

        <section className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0 overflow-hidden">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Workspace Home</div>
            <h1 className="mt-1 text-[clamp(1.75rem,4.2vw,4rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-[color:var(--co-text)]">
              Workspace Home
            </h1>
            <p className="mt-1.5 max-w-[42rem] truncate text-xs leading-5 text-[color:var(--co-muted)] sm:text-sm sm:leading-6">
              Continue your Week Pack, manage exports, or start a new publishing flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PrimaryLink to="/prototype/library">Create Week Pack</PrimaryLink>
            <QuietLink to="/prototype/library">Open current workspace</QuietLink>
          </div>
        </section>

        <main className="grid min-h-0 content-start gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(305px,360px)] lg:gap-4">
          <Panel className="rounded-[1.15rem] p-2.5 sm:rounded-[1.35rem] sm:p-4 lg:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(322px,368px)] md:items-start">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Current Week Pack</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-[clamp(1.45rem,3.2vw,2.85rem)] font-semibold leading-none tracking-[-0.045em]">
                    {selectedPack.title}
                  </h2>
                  <span className="rounded-full border border-[color:var(--co-border-soft)] bg-white/[0.035] px-2.5 py-1 text-[11px] text-[color:var(--co-muted)]">
                    {selectedPack.status}
                  </span>
                </div>

                <p className="mt-1.5 max-w-[32rem] text-xs leading-5 text-[color:var(--co-muted)] sm:mt-2 sm:text-sm sm:leading-6">
                  {selectedPack.note}
                </p>

                <p className="mt-1.5 text-[10px] leading-4 text-[color:var(--co-muted)] sm:hidden">{selectedPack.signal}</p>

                <div className="mt-3 hidden flex-wrap gap-1.5 sm:mt-4 sm:flex sm:gap-2">
                  {selectedPack.progress.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[color:var(--co-border-soft)] bg-white/[0.028] px-2.5 py-1.5 text-[10px] font-medium leading-none text-[color:var(--co-text)] sm:px-3 sm:py-2 sm:text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
                  <PrimaryLink to={selectedPack.primaryHref}>{selectedPack.primaryLabel}</PrimaryLink>
                  <QuietLink to={selectedPack.secondaryHref}>{selectedPack.secondaryLabel}</QuietLink>
                </div>
              </div>

              <div className="w-full max-w-[253px] sm:max-w-[368px] md:max-w-[368px] md:justify-self-end">
                <PreviewGrid images={selectedPack.preview} />
              </div>
            </div>
          </Panel>

          <Panel className="rounded-[1.15rem] p-2 sm:rounded-[1.35rem] sm:p-4 lg:col-start-2 lg:row-span-2 lg:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Account Snapshot</div>
              <div className="text-right">
                <div className="text-[10px] text-[color:var(--co-muted)]">Current plan</div>
                <div className="mt-0.5 text-sm font-semibold text-[color:var(--co-text)]">Free Beta</div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-[color:var(--co-border-soft)] pt-2 sm:mt-4 sm:grid-cols-1 sm:gap-0 sm:pt-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Usage</div>
                <div className="mt-1.5 grid gap-1 sm:mt-2 sm:gap-1.5">
                  {usage.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2 text-[10px] sm:text-sm">
                      <span className="text-[color:var(--co-muted)]">{label}</span>
                      <span className="text-right font-medium text-[color:var(--co-text)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-l border-[color:var(--co-border-soft)] pl-3 sm:mt-4 sm:border-l-0 sm:border-t sm:pl-0 sm:pt-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Plan</div>
                <div className="mt-1.5 grid gap-0.5 text-[10px] text-[color:var(--co-muted)] sm:mt-2 sm:gap-1 sm:text-sm">
                  {planItems.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
                <div className="mt-2 sm:mt-3">
                  <QuietButton onClick={() => setPricingOpen(true)}>View pricing preview</QuietButton>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="rounded-[1.1rem] p-2.5 sm:p-3 lg:col-start-1">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Recent Week Packs</div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {recentPacks.map((pack) => {
                const isSelected = pack.id === selectedPack.id;

                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={[
                      "group min-w-0 rounded-[0.85rem] border p-1.5 text-left transition sm:p-3",
                      isSelected
                        ? "border-white/22 bg-white/[0.06]"
                        : "border-[color:var(--co-border-soft)] bg-white/[0.024] hover:bg-white/[0.055]",
                    ].join(" ")}
                    aria-pressed={isSelected}
                  >
                    <div className="truncate text-xs font-medium text-[color:var(--co-text)] sm:text-sm">{pack.title}</div>
                    <div className="mt-0.5 truncate text-[10px] text-[color:var(--co-muted)]">{pack.status}</div>
                    <div className="mt-1 truncate text-[10px] text-[color:var(--co-muted)] sm:text-xs">{pack.meta}</div>
                    <div className="mt-0.5 text-[10px] text-[color:var(--co-muted)] group-hover:text-[color:var(--co-text)] sm:mt-2 sm:text-xs">
                      {isSelected ? "Selected" : pack.action}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="rounded-[1.1rem] p-2 sm:p-3 lg:col-start-1">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">Profile Handoff</div>
                <p className="mt-1 text-xs font-medium leading-4 text-[color:var(--co-text)] sm:text-sm sm:leading-5">
                  Turn the selected Week Pack into a Bio Pack when the export is ready.
                </p>
              </div>
              <QuietLink to="/prototype/bio-builder">Open Profile Handoff</QuietLink>
            </div>
          </Panel>
        </main>
      </div>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
