// src/pages/Marketing.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "../app/theme/useTheme";

const MODULES = [
  { title: "Library", desc: "Collect the strongest visual assets for the week." },
  { title: "Smart Mix", desc: "Compare ranked 3x3 candidates and select the strongest rhythm." },
  { title: "Planner", desc: "Shape the publishing board before captions and export." },
  { title: "Captions", desc: "Create caption drafts, CTA lines, and hashtags for the selected rhythm." },
  { title: "Export", desc: "Download a clean ZIP pack with ordered files and copy." },
  { title: "Profile Handoff", desc: "Align avatar, bio, CTA, and profile preview with the Week Pack." },
];

const BENEFITS = [
  { title: "Less decisions", desc: "The system proposes - you approve." },
  { title: "No repeats", desc: "Basic anti-pattern guardrails in the mix." },
  { title: "Publish-ready output", desc: "Captions + hashtags in one export pack." },
];

const OUTPUTS = [
  "Export pack (captions + hashtags)",
  "Per-post variations (Primary / Alt)",
  "Weekly plan preview (7-day context)",
  "Workspace flow in ~2 minutes",
];

const SHELL_CLASS = "mx-auto w-full max-w-[1240px] px-6 md:px-10 lg:px-14";

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="text-sm text-black">{title}</div>
      <div className="mt-1 text-sm text-black/55">{desc}</div>
    </div>
  );
}

/** Soft reveal: fade + blur + lift */
function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);

  // Reduced motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(Boolean(mq?.matches));
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setOn(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          setOn(true);
          io.disconnect();
          break;
        }
      },
      {
        threshold: 0.18,
        root: null,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={[
        "transition-[opacity,transform,filter] duration-700 ease-out will-change-[opacity,transform,filter]",
        on ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-3 blur-[6px]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

type WaitlistRole = "creator" | "studio" | "agency" | "investor";
type WaitlistEntry = { email: string; name: string; role: WaitlistRole; ts: number };

const WAITLIST_KEY = "creatorops_waitlist_v1";
const WAITLIST_EVT = "creatorops_waitlist_updated";

function loadWaitlist(): WaitlistEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(WAITLIST_KEY);
    const list = raw ? (JSON.parse(raw) as WaitlistEntry[]) : [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveWaitlistEntry(entry: WaitlistEntry) {
  try {
    if (typeof window === "undefined") return;

    const list = loadWaitlist();

    // avoid duplicates by email (case-insensitive)
    const next = [entry, ...list.filter((x) => (x?.email ?? "").toLowerCase() !== entry.email.toLowerCase())].slice(
      0,
      200
    );

    window.localStorage.setItem(WAITLIST_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(WAITLIST_EVT));
  } catch {
    // ignore (privacy mode / storage blocked)
  }
}

function toCSV(rows: WaitlistEntry[]) {
  const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = ["email", "name", "role", "ts"].join(",");
  const lines = rows.map((r) => [r.email, r.name, r.role, new Date(r.ts).toISOString()].map(esc).join(","));
  return [header, ...lines].join("\n");
}

function downloadCSV(rows: WaitlistEntry[]) {
  try {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creatorops-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WaitlistRole>("creator");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const admin = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("admin") === "1";
  }, []);

  const [count, setCount] = useState<number>(() => loadWaitlist().length);

  useEffect(() => {
    const onUpd = () => setCount(loadWaitlist().length);
    window.addEventListener(WAITLIST_EVT, onUpd);
    return () => window.removeEventListener(WAITLIST_EVT, onUpd);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanEmail = email.trim();
    const okEmail = /.+@.+\..+/.test(cleanEmail);

    if (!okEmail) {
      setStatus("error");
      return;
    }

    saveWaitlistEntry({
      name: name.trim(),
      email: cleanEmail,
      role,
      ts: Date.now(),
    });

    setStatus("ok");
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white/75 shadow-sm backdrop-blur">
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/5" />
        <div className="relative p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-black/60">Waitlist</div>
              <div className="mt-2 text-2xl text-black">Get early access.</div>
            </div>

            <div className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-black/60">
              {count} saved
            </div>
          </div>

          <div className="mt-2 max-w-[640px] text-sm text-black/55">
            Early build access, private updates, and a short onboarding when the beta opens. No spam. No integrations
            required for the workspace.
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <div className="text-xs text-black/55">Name (optional)</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm text-black outline-none ring-0 placeholder:text-black/35 focus:border-black/20"
              />
            </div>

            <div className="sm:col-span-5">
              <div className="text-xs text-black/55">Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                inputMode="email"
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm text-black outline-none ring-0 placeholder:text-black/35 focus:border-black/20"
              />
            </div>

            <div className="sm:col-span-3">
              <div className="text-xs text-black/55">Profile</div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as WaitlistRole)}
                className="mt-1 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm text-black outline-none ring-0 focus:border-black/20"
              >
                <option value="creator">Creator</option>
                <option value="studio">Studio</option>
                <option value="agency">Agency</option>
                <option value="investor">Investor</option>
              </select>
            </div>

            <div className="sm:col-span-12 mt-1 flex flex-wrap items-center gap-3">
              <button type="submit" className="rounded-full bg-black px-5 py-2.5 text-sm text-white hover:bg-black/90 pressable">
                Join waitlist
              </button>

              {admin ? (
                <button
                  type="button"
                  onClick={() => downloadCSV(loadWaitlist())}
                  className="rounded-full border border-black/15 bg-white/70 px-5 py-2.5 text-sm text-black hover:border-black/25 pressable"
                  title="Exports local waitlist from this browser"
                >
                  Export CSV
                </button>
              ) : null}

              {status === "ok" && <span className="text-sm text-black/60">Added. (Stored locally for now.)</span>}
              {status === "error" && <span className="text-sm text-red-600/80">Please enter a valid email.</span>}
            </div>

            <div className="sm:col-span-12 mt-1 text-xs text-black/45">Private beta updates only. No spam. Unsubscribe anytime.</div>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Landing anchors + rail */
const LANDING_SCROLL_OFFSET_PX = 96;

const LANDING_SECTIONS = [
  { id: "top", label: "Top" },
  { id: "week-pack", label: "Week Pack" },
  { id: "system-logic", label: "Flow" },
  { id: "workspace", label: "Workspace" },
  { id: "pricing", label: "Pricing" },
  { id: "trust", label: "Trust" },
  { id: "roadmap", label: "Roadmap" },
  { id: "waitlist", label: "Waitlist" },
] as const;

type LandingSectionId = (typeof LANDING_SECTIONS)[number]["id"];

// ===== Output: Auto-Advance Stage (Awards, non-blocking) =====

type OutputSlideKey = "export" | "guardrails" | "week";

const OUTPUT_SLIDES: Array<{
  key: OutputSlideKey;
  label: string;
  title: string;
  desc: string;
}> = [
  {
    key: "export",
    label: "Export pack",
    title: "A bundle you can ship today.",
    desc: "Captions + hashtags + week context - clean handoff, zero integrations.",
  },
  {
    key: "guardrails",
    label: "Guardrails",
    title: "No repeats. Balanced mix.",
    desc: "Basic rules upstream so the rest of the pipeline stays calm.",
  },
  {
    key: "week",
    label: "Week plan",
    title: "A clear 7-day context.",
    desc: "See the publishing board as a week - then export a publish-ready pack.",
  },
];

function MiniTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-black/60 backdrop-blur">
      {children}
    </span>
  );
}

function SlideExport() {
  return (
    <div className="h-full">
      <div className="text-xs uppercase tracking-wide text-black/45">Export pack</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-black">creatorops-export-pack.zip</div>
      <div className="mt-2 max-w-[56ch] text-sm text-black/55">
        One deliverable: captions, hashtags, week plan, checklist - ready to publish.
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {[
            { k: "captions/post-01.md", v: "Primary + Alt" },
            { k: "captions/post-02.md", v: "Primary + Alt" },
            { k: "hashtags/hashtags.txt", v: "Grouped" },
            { k: "week/week-plan.json", v: "7-day context" },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl border border-black/10 bg-white/75 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-black">{x.k}</div>
                <div className="text-xs text-black/45">{x.v}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-black">Structure</div>
            <div className="rounded-full border border-black/15 bg-white/80 px-3 py-1 text-xs text-black/55">
              preview
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 p-4 font-mono text-xs text-black/60">
            <div>creatorops-export-pack/</div>
            <div className="pl-3">captions/</div>
            <div className="pl-6">post-01.md</div>
            <div className="pl-6">post-02.md</div>
            <div className="pl-3">hashtags/</div>
            <div className="pl-6">hashtags.txt</div>
            <div className="pl-3">week/</div>
            <div className="pl-6">week-plan.json</div>
            <div className="pl-6">checklist.txt</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideGuardrails() {
  return (
    <div className="h-full">
      <div className="text-xs uppercase tracking-wide text-black/45">Guardrails</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-black">Upstream rules. Downstream calm.</div>
      <div className="mt-2 max-w-[56ch] text-sm text-black/55">
        The mix is proposed with simple constraints - so you don't fight repeats later.
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm">
          <div className="text-sm font-medium text-black">Rules</div>
          <div className="mt-3 space-y-2 text-sm text-black/65">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-black/25" />
              <div>
                <div className="font-medium text-black/80">No duplicates</div>
                <div className="text-black/55">Avoid repeating near-identical visuals.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-black/25" />
              <div>
                <div className="font-medium text-black/80">Balance</div>
                <div className="text-black/55">Keep variety across tone / series / rhythm.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-black/25" />
              <div>
                <div className="font-medium text-black/80">Explainable picks</div>
                <div className="text-black/55">Short reasons - fast approval.</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <MiniTag>no repeats</MiniTag>
            <MiniTag>balanced</MiniTag>
            <MiniTag>explainable</MiniTag>
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm">
          <div className="text-sm font-medium text-black">Mix preview</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl border border-black/10 bg-white/70"
              />
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 p-3 text-xs text-black/55">
            Example: "3x3 candidates with guardrails - pick best to continue."
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideWeek() {
  return (
    <div className="h-full">
      <div className="text-xs uppercase tracking-wide text-black/45">Week plan</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-black">A week you can see.</div>
      <div className="mt-2 max-w-[56ch] text-sm text-black/55">
        Planner turns decisions into a weekly context - then export.
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm">
          <div className="text-sm font-medium text-black">7-day context</div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-white/70 p-2 text-center">
                <div className="text-[11px] text-black/45">{d}</div>
                <div className="mt-2 h-10 rounded-xl border border-black/10 bg-white/80" />
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-black/50">
            The workspace shows the full flow end-to-end.
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm">
          <div className="text-sm font-medium text-black">Ship checklist</div>
          <div className="mt-3 space-y-2 text-sm text-black/65">
            <div>- Pick weekly order</div>
            <div>- Copy captions</div>
            <div>- Paste hashtags</div>
            <div>- Post / schedule</div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <MiniTag>week context</MiniTag>
            <MiniTag>export-first</MiniTag>
            <MiniTag>publish-ready</MiniTag>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSlide(key: OutputSlideKey) {
  switch (key) {
    case "export":
      return <SlideExport />;
    case "guardrails":
      return <SlideGuardrails />;
    case "week":
      return <SlideWeek />;
  }
}

function AutoAdvanceOutputStage({
  onJump,
}: {
  onJump?: (id: LandingSectionId) => void;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseRef = useRef(false);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(Boolean(mq?.matches));
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    pauseRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (reducedMotion) return;

    let t: number | undefined;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (pauseRef.current) return;
      setActive((i) => (i + 1) % OUTPUT_SLIDES.length);
    };

    t = window.setInterval(tick, 4200);

    const onVis = () => {
      // no-op; tick checks visibility
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (t) window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reducedMotion]);

  const slide = OUTPUT_SLIDES[active];

  const go = (i: number) => setActive((i + OUTPUT_SLIDES.length) % OUTPUT_SLIDES.length);

  return (
    <section id="output" className="relative -mt-[2px] bg-[#f5f5f7] pt-24 pb-32">
      {/* subtle paper texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <img
          src="/creatorops/landing/detail-01-light.png"
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className={[SHELL_CLASS, "py-18 sm:py-20 lg:py-24"].join(" ")}>
        <div className="grid items-start gap-10 lg:grid-cols-12">
          {/* Left: copy + controls */}
          <div className="lg:col-span-5">
            <div className="text-xs uppercase tracking-wide text-black/40">Output</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-black">
              A keynote-style preview.
            </h2>
            <p className="mt-3 max-w-[52ch] text-sm text-black/55">
              Artifacts-only preview - clean, fast, no duplicated marketing copy.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="text-xs text-black/45">
                {String(active + 1).padStart(2, "0")} / {String(OUTPUT_SLIDES.length).padStart(2, "0")}
              </div>

              <div className="flex items-center gap-2">
                {OUTPUT_SLIDES.map((s, i) => {
                  const isOn = i === active;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => go(i)}
                      className={[
                        "h-2 w-2 rounded-full transition",
                        isOn ? "bg-black" : "bg-black/25 hover:bg-black/45",
                      ].join(" ")}
                      aria-label={`Show ${s.label}`}
                    />
                  );
                })}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(active - 1)}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-black/70 hover:bg-white"
                  aria-label="Previous"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => go(active + 1)}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-black/70 hover:bg-white"
                  aria-label="Next"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-black/40">{slide.label}</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-black">{slide.title}</div>
              <div className="mt-2 text-sm text-black/55">{slide.desc}</div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/prototype/library"
                className="pressable inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
              >
                Open workspace
              </Link>
              <button
                type="button"
                onClick={() => onJump?.("waitlist")}
                className="pressable inline-flex items-center justify-center rounded-full border border-black/15 bg-white/70 px-5 py-2.5 text-sm font-medium text-black"
              >
                Join waitlist
              </button>
            </div>
          </div>

          {/* Right: stage */}
          <div className="lg:col-span-7">
            <div
              className="relative overflow-hidden rounded-[40px] border border-black/10 bg-white/60 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocusCapture={() => setPaused(true)}
              onBlurCapture={() => setPaused(false)}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,0,0,0.05),transparent_55%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,0,0,0.035),transparent_55%)]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/35 via-white/55 to-white/75" />

              <div className="relative p-8 min-h-[520px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide.key}
                    initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, filter: "blur(8px)" }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(8px)" }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    {renderSlide(slide.key)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-3 text-xs text-black/45">
              Build a weekly plan, generate captions, export a pack. No integrations required.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OutputPackShowcase({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const previewImages = [
    "/creatorops/thumbs/4x5/thumb-4x5-01.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-02.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-03.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-04.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-05.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-06.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-07.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-08.jpg",
    "/creatorops/thumbs/4x5/thumb-4x5-09.jpg",
  ];

  return (
    <section id="workspace" className="relative scroll-mt-24 bg-[#f5f5f7] text-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_46%,rgba(15,23,42,0.035),rgba(15,23,42,0)_34%)]" />

      <div className={[SHELL_CLASS, "py-18 sm:py-20 lg:py-24"].join(" ")}>
        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-14">
          <motion.div
            initial={
              reducedMotion
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 28, filter: "blur(10px)" }
            }
            whileInView={
              reducedMotion
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 1.08, ease: [0.22, 1, 0.36, 1] }
            }
            viewport={{ once: true, amount: 0.42 }}
            className="max-w-[320px]"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/24">Workspace</div>

            <h2 className="mt-4 max-w-[8ch] text-[clamp(2.6rem,5vw,4.3rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-black">
              A working creator workspace.
            </h2>

            <p className="mt-5 max-w-[31ch] text-[15px] leading-8 text-black/42">
              CreatorOps keeps decisions upstream. The workspace guides assets through selection, planning, captions, export, and profile handoff without adding more workflow noise.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-[12px] text-black/52">
                9 ordered images
              </span>
              <span className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-[12px] text-black/52">
                captions + hashtags
              </span>
              <span className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-[12px] text-black/52">
                one clean export
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/prototype/library"
                className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm text-white transition hover:opacity-90"
              >
                Open workspace
              </a>

              <a
                href="/story"
                className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm text-black/68 transition hover:bg-black/[0.03]"
              >
                View story
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={
              reducedMotion
                ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                : { opacity: 0, y: 34, scale: 0.985, filter: "blur(12px)" }
            }
            whileInView={
              reducedMotion
                ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 1.18, delay: 0.12, ease: [0.22, 1, 0.36, 1] }
            }
            viewport={{ once: true, amount: 0.38 }}
            className="relative ml-auto w-full max-w-[610px]"
          >
            <div className="pointer-events-none absolute left-[-14%] top-[56%] h-px w-[22rem] rotate-[10deg] bg-[linear-gradient(90deg,rgba(15,23,42,0),rgba(15,23,42,0.08),rgba(15,23,42,0))]" />

            <div className="co-motion-card-slow rounded-[1.9rem] border border-black/8 bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4 pb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/24">Final pack</div>
                  <div className="mt-1 text-[1.05rem] font-medium tracking-[-0.035em] text-black">
                    3x3 export preview
                  </div>
                </div>

                <div className="rounded-full border border-black/8 bg-black/[0.03] px-3 py-1 text-[11px] text-black/34">
                  ZIP ready
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {previewImages.map((src, index) => (
                  <div
                    key={index}
                    className="relative aspect-[4/5] overflow-hidden rounded-[1.08rem] bg-[#e9e9e7]"
                  >
                    <img
                      src={src}
                      alt=""
                      className="co-motion-image h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_24%,rgba(255,255,255,0.12),rgba(255,255,255,0)_42%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.08))]" />
                    <div className="absolute left-2 top-2 rounded-full border border-white/12 bg-black/20 px-2 py-1 text-[10px] text-white/78 backdrop-blur">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-[12px] text-black/36">
                Ordered exactly as exported: <span className="text-black/52">01 to 09</span>
              </div>
            </div>

            <div className="mt-4 pl-1 text-[12px] leading-6 text-black/30">
              Export-first by design: a clean outcome, not another layer of workflow noise.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const HERO_FLOW = [
  {
    title: "Library",
    text: "Collect the strongest visual assets for the week.",
  },
  {
    title: "Smart Mix",
    text: "Compare ranked 3x3 candidates with calm guardrails.",
  },
  {
    title: "Planner",
    text: "Shape the publishing board before captions and export.",
  },
  {
    title: "Profile Handoff",
    text: "Carry the Week Pack into bio, CTA, and profile preview.",
  },
] as const;

const HERO_STATS = [
  "9 visual assets",
  "Smart Mix",
  "Caption draft",
  "ZIP export",
  "Profile Handoff",
] as const;

const HERO_PREVIEW_IMAGES = [
  "/creatorops/thumbs/4x5/thumb-4x5-01.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-02.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-03.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-04.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-05.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-06.jpg",
] as const;

const WEEK_PACK_OUTCOMES = [
  "Selected visuals",
  "Publishing board",
  "Caption drafts",
  "ZIP export",
  "Profile handoff",
] as const;

const WORKFLOW_STEPS = [
  { title: "Library", text: "Collect the strongest visual assets for the week." },
  { title: "Smart Mix", text: "Compare ranked 3x3 candidates and select the strongest rhythm." },
  { title: "Planner", text: "Shape the publishing board before captions and export." },
  { title: "Captions", text: "Create caption drafts, CTA lines, and hashtags for the selected rhythm." },
  { title: "Export", text: "Download a clean ZIP pack with ordered files and copy." },
  { title: "Profile Handoff", text: "Align avatar, bio, CTA, and profile preview with the Week Pack." },
] as const;

const PRODUCT_FEATURES = [
  {
    title: "Smart Mix",
    text: "Ranked visual sets with guardrails for rhythm, variety, and duplicate control.",
  },
  {
    title: "Publishing Board",
    text: "A clean weekly order that drives captions and export.",
  },
  {
    title: "Caption Composer",
    text: "Draft captions, CTA lines, and hashtags around the selected visual rhythm.",
  },
  {
    title: "Export Pack",
    text: "Download ordered images, captions, hashtags, CSV, manifest, and README.",
  },
  {
    title: "Profile Handoff",
    text: "Carry the Week Pack into a profile preview and bio pack.",
  },
  {
    title: "AI-ready generation layer",
    text: "The caption workflow is prepared for live AI generation while keeping fallback drafts safe.",
  },
] as const;

const PRICING_PLANS = [
  {
    title: "Free Beta",
    price: "$0",
    text: "For testing the Week Pack workflow.",
    items: ["3 Week Packs / month", "Starter Smart Mix", "Caption drafts", "ZIP export", "Profile Handoff"],
    cta: "Try workspace",
    href: "/prototype/library",
  },
  {
    title: "Creator Pro",
    price: "Planned: $12 / month",
    text: "For creators and small brands building weekly content packs.",
    items: ["Unlimited Week Packs", "More caption generations", "Saved pack history", "Larger uploads", "Bio Pack export"],
    cta: "Join early access",
    href: "#waitlist",
  },
  {
    title: "Studio",
    price: "Planned: $29 / month",
    text: "For freelancers and small teams managing multiple brands.",
    items: ["Multiple brand profiles", "Client-ready exports", "More AI credits", "Brand voice presets", "Priority workflow features"],
    cta: "Join early access",
    href: "#waitlist",
  },
] as const;

const TRUST_ITEMS = [
  "Server-side AI endpoint",
  "No API keys in frontend",
  "Export-first workflow",
  "Future account-based storage",
  "Stripe-ready billing path",
] as const;

const ROADMAP_LANES = [
  {
    title: "Now",
    items: ["Live workspace", "Smart Mix", "Planner", "Caption Composer", "Export ZIP", "Profile Handoff"],
  },
  {
    title: "Next",
    items: ["User accounts", "Saved Week Packs", "Live AI captions", "Pricing plans", "Workspace dashboard"],
  },
  {
    title: "Later",
    items: ["Brand presets", "Team workflows", "Instagram integration", "Publishing queue", "Analytics layer"],
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Is this a scheduler?",
    a: "Not yet. CreatorOps is export-first: it helps shape and package content before publishing.",
  },
  {
    q: "Is AI live?",
    a: "The caption layer is AI-ready. Live AI generation will be enabled through the server-side endpoint after production API setup.",
  },
  {
    q: "Can I use it now?",
    a: "Yes, the workspace preview is available. Account-based saving and pricing plans are planned for the SaaS release.",
  },
  {
    q: "What is a Week Pack?",
    a: "A structured weekly content pack: selected visuals, order, captions, hashtags, export files, and profile handoff.",
  },
  {
    q: "Who is it for?",
    a: "Creators, small brands, SMM freelancers, and creative studios that need a calmer pre-publishing workflow.",
  },
] as const;

function WeekPackSection() {
  return (
    <section id="week-pack" className="relative overflow-hidden bg-[#06080d] px-4 py-20 text-white sm:px-6 md:px-10 lg:px-14 lg:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_76%_44%,rgba(255,255,255,0.045),transparent_32%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#06080d]" />
      </div>

      <div className={[SHELL_CLASS, "relative grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16"].join(" ")}>
        <div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/42">
            Week Pack
          </div>
          <h2 className="mt-5 max-w-[12ch] text-[clamp(2.5rem,5vw,5.5rem)] font-medium leading-[0.9] tracking-[-0.06em] text-white">
            One Week Pack. One calm workflow.
          </h2>
          <p className="mt-6 max-w-[35rem] text-[15px] leading-7 text-white/52">
            CreatorOps turns a loose batch of visuals into a structured publishing pack: selected images, weekly order, caption drafts, hashtags, export files, and profile handoff.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {WEEK_PACK_OUTCOMES.map((item, index) => (
            <div
              key={item}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/30">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="mt-4 text-[17px] font-medium text-white/88">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSaaSSections() {
  return (
    <>
      <section id="features" className="bg-[#f5f5f7] text-black">
        <div className={[SHELL_CLASS, "py-20 lg:py-24"].join(" ")}>
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.18em] text-black/38">Features</div>
            <h2 className="mt-3 text-[clamp(2.2rem,4vw,4.2rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-black">
              Built for export-first creators
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-[28px] border border-black/8 bg-white/72 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.045)] backdrop-blur">
                <div className="text-[15px] font-medium text-black">{feature.title}</div>
                <p className="mt-3 text-[13px] leading-6 text-black/52">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#f5f5f7] text-black scroll-mt-[96px]">
        <div className={[SHELL_CLASS, "py-20 lg:py-24"].join(" ")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-black/38">Pricing preview</div>
              <h2 className="mt-3 text-[clamp(2.2rem,4vw,4rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-black">
                Simple plans for the first release
              </h2>
            </div>
            <p className="max-w-[31rem] text-[14px] leading-7 text-black/50">
              Billing is not live yet. These plans show the intended SaaS path while the workspace remains open for testing.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <div key={plan.title} className="flex min-h-[28rem] flex-col rounded-[30px] border border-black/8 bg-white/78 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.055)] backdrop-blur">
                <div className="text-[15px] font-medium text-black">{plan.title}</div>
                <div className="mt-4 text-[28px] font-semibold tracking-[-0.04em] text-black">{plan.price}</div>
                <p className="mt-3 text-[13px] leading-6 text-black/52">{plan.text}</p>
                <ul className="mt-6 space-y-2.5 text-[13px] text-black/58">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-black/25" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className="mt-auto inline-flex items-center justify-center rounded-full border border-black/10 bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="bg-[#f5f5f7] text-black scroll-mt-[96px]">
        <div className={[SHELL_CLASS, "py-20 lg:py-24"].join(" ")}>
          <div className="rounded-[34px] border border-black/8 bg-white/72 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.055)] backdrop-blur md:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-black/38">Trust</div>
                <h2 className="mt-3 text-[clamp(2rem,3.8vw,3.8rem)] font-semibold leading-[0.95] tracking-[-0.055em] text-black">
                  Built with a secure SaaS path
                </h2>
                <p className="mt-5 max-w-[38rem] text-[14px] leading-7 text-black/52">
                  CreatorOps is moving toward account-based workspaces, server-side AI keys, protected uploads, and Stripe-powered billing. The current workspace keeps API secrets out of the browser and is designed for export-first workflows.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {TRUST_ITEMS.map((item) => (
                  <div key={item} className="rounded-[20px] border border-black/8 bg-black/[0.025] px-4 py-4 text-[13px] text-black/62">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="bg-[#f5f5f7] text-black scroll-mt-[96px]">
        <div className={[SHELL_CLASS, "py-20 lg:py-24"].join(" ")}>
          <div className="text-[11px] uppercase tracking-[0.18em] text-black/38">Roadmap</div>
          <h2 className="mt-3 text-[clamp(2.2rem,4vw,4rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-black">
            Now, next, later
          </h2>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {ROADMAP_LANES.map((lane) => (
              <div key={lane.title} className="rounded-[28px] border border-black/8 bg-white/72 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.045)] backdrop-blur">
                <div className="text-[15px] font-medium text-black">{lane.title}</div>
                <ul className="mt-5 space-y-2.5 text-[13px] text-black/58">
                  {lane.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-black/25" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f5f5f7] text-black">
        <div className={[SHELL_CLASS, "py-20 lg:py-24"].join(" ")}>
          <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-black/38">FAQ</div>
              <h2 className="mt-3 text-[clamp(2rem,3.4vw,3.5rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-black">
                Clear before you open the workspace
              </h2>
            </div>

            <div className="grid gap-3">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="rounded-[24px] border border-black/8 bg-white/72 p-5 backdrop-blur">
                  <div className="text-[14px] font-medium text-black">{item.q}</div>
                  <p className="mt-2 text-[13px] leading-6 text-black/52">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f7] text-black">
        <div className={[SHELL_CLASS, "pb-20 pt-10 lg:pb-24"].join(" ")}>
          <div className="rounded-[36px] border border-black/8 bg-white/78 p-7 shadow-[0_22px_70px_rgba(15,23,42,0.06)] backdrop-blur md:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h2 className="text-[clamp(2.2rem,4vw,4.2rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-black">
                  Build your first Week Pack.
                </h2>
                <p className="mt-4 max-w-[42rem] text-[14px] leading-7 text-black/52">
                  Open the workspace, test the flow, and see how CreatorOps turns scattered visuals into a ready-to-publish pack.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="/prototype/library" className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90">
                  Open workspace
                </a>
                <a href="/story" className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black/70 transition hover:bg-black/[0.03]">
                  Watch story
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Marketing() {
  const [activeSection, setActiveSection] = useState<LandingSectionId>("top");
  const { asset } = useTheme();

  // Reduced motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(Boolean(mq?.matches));
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);

  const shellClass = SHELL_CLASS;

  const getRevealProps = (delay = 0, distance = 28) =>
    reducedMotion
      ? {
          initial: false as const,
        }
      : {
          initial: { opacity: 0, y: distance, filter: "blur(10px)" },
          whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
          viewport: { once: true, amount: 0.2 },
          transition: {
            duration: 0.9,
            delay,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        };

     // Ensure refresh/mount starts at top (override browser scroll restoration for this page)
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      // ignore
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    // If a hash is present (e.g. #output), clear it so refresh never "jumps down".
    // Rail navigation stays internal; we intentionally keep the URL clean.
    if (window.location.hash) {
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {
        // ignore
      }
    }

    return () => {
      try {
        window.history.scrollRestoration = prev;
      } catch {
        // ignore
      }
    };
  }, []);

  const scrollToSection = useCallback(
    (id: LandingSectionId) => {
      const el = document.getElementById(id);
      if (!el) return;

      const top = el.getBoundingClientRect().top + window.scrollY - LANDING_SCROLL_OFFSET_PX;
      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    },
    [reducedMotion]
  );

  // Prefetch key images (avoid flashes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const imgs = [
      "/creatorops/landing/bg-01-dark.png",
      "/creatorops/landing/shot-01-dark.png",
      "/creatorops/landing/bg-03-bridge.png",
      "/creatorops/landing/bg-02-light.png",
      "/creatorops/landing/shot-02-light.png",
      "/creatorops/landing/detail-01-light.png",
    ];
    for (const src of imgs) {
      const im = new Image();
      im.src = src;
    }
  }, []);

  // Active section detection (for rail)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const els = LANDING_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        let best: { id: LandingSectionId; ratio: number } | null = null;

        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          const id = (ent.target as HTMLElement).id as LandingSectionId;
          const ratio = ent.intersectionRatio;
          if (!best || ratio > best.ratio) best = { id, ratio };
        }

        if (best && best.ratio >= 0.35) setActiveSection(best.id);
      },
      { threshold: [0.2, 0.35, 0.5, 0.65] }
    );

    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Parallax (stronger, but safe). Applies only to large background photos. */
  const parallaxItems = useRef<Array<{ el: HTMLImageElement; speed: number; baseScale: number }>>([]);

  const makeParallaxRef = useCallback((speed: number, baseScale = 1.06) => {
    return (el: HTMLImageElement | null) => {
      if (!el) return;
      parallaxItems.current = parallaxItems.current.filter((x) => x.el !== el);
      parallaxItems.current.push({ el, speed, baseScale });
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (reducedMotion) {
      for (const x of parallaxItems.current) x.el.style.transform = "";
      return;
    }

    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY || 0;
      for (const x of parallaxItems.current) {
        const ty = -y * x.speed;
        x.el.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${x.baseScale})`;
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(tick);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const railIsDark = activeSection === "top" || activeSection === "week-pack" || activeSection === "system-logic";
  const railShell = railIsDark
    ? "border-white/10 bg-black/30 text-white/70"
    : "border-black/10 bg-white/70 text-black/60";

  const railDotActive = railIsDark ? "bg-white" : "bg-black";
  const railDotIdle = railIsDark ? "bg-white/40 group-hover:bg-white/70" : "bg-black/35 group-hover:bg-black/60";
  const railBtnActive = railIsDark ? "bg-white/15 text-white" : "bg-black/5 text-black";
  const railBtnIdle = railIsDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black";
  const railTag = railIsDark ? "border-white/10 bg-black/55 text-white/85" : "border-black/10 bg-white/90 text-black/70";

  return (
    <div className="min-h-dvh bg-[#0b0f15]">
      {/* Section rail (guided jumps) */}
      <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <div
  className={[
    "rounded-full border p-2 backdrop-blur",
    "w-[40px] overflow-visible",              // slim line, tooltip can overflow
    "transition-colors duration-500 ease-out", // smooth dark->light
    railShell,
  ].join(" ")}
>

          <div className="flex flex-col gap-2">
            {LANDING_SECTIONS.map((s) => {
              const isActive = activeSection === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className={[
  "group relative flex w-full items-center gap-2 rounded-full px-2 py-1.5 text-xs pressable",
  "transition-colors duration-500 ease-out",
  isActive ? railBtnActive : railBtnIdle,
].join(" ")}

                  aria-label={`Go to ${s.label}`}
                >
                  <span
  className={[
    "h-1.5 w-1.5 shrink-0 rounded-full transition-[transform,background-color] duration-500 ease-out",
    isActive ? `${railDotActive} scale-110` : railDotIdle,
  ].join(" ")}/>
                
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* HERO (dark) */}
      <section id="top" className="relative overflow-hidden border-b border-white/8 bg-[#06080d]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_72%_32%,rgba(130,150,255,0.08),transparent_26%),radial-gradient(circle_at_52%_78%,rgba(255,255,255,0.06),transparent_24%)]" />
          <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:120px_120px]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#071019]/80" />
        </div>

        <div className={[shellClass, "grid grid-cols-1 gap-14 pb-20 pt-10 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-center lg:gap-18 lg:pb-24 lg:pt-14"].join(" ")}>
          <motion.div className="max-w-[560px]" {...getRevealProps(0.04, 26)}>
            <div className="mb-6 flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                CreatorOps
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/45">
                Week Pack workspace
              </span>
            </div>

            <h1 className="max-w-[11ch] text-[clamp(2.8rem,5.6vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.05em] text-white">
              Turn content chaos into a calm pipeline.
            </h1>

            <p className="mt-6 max-w-[38rem] text-[15px] leading-7 text-white/62 md:text-[16px]">
              From scattered visuals to a ready-to-publish Week Pack: Smart Mix, Planner, Captions, Export, and Profile Handoff.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/prototype/library"
                className="inline-flex items-center rounded-full bg-white px-5 py-3 text-[14px] font-medium text-black transition hover:bg-white/90"
              >
                Open workspace
              </a>

              <a
                href="/story"
                className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-[14px] font-medium text-white/88 transition hover:bg-white/10"
              >
                Watch story
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {HERO_STATS.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/55"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {HERO_FLOW.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-[20px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.065] hover:shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[12px] uppercase tracking-[0.18em] text-white/35">
                      0{index + 1}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                  </div>
                  <div className="text-[15px] font-medium text-white">{item.title}</div>
                  <p className="mt-2 text-[13px] leading-6 text-white/48">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="relative" {...getRevealProps(0.16, 34)}>
            <div className="pointer-events-none absolute -inset-10 rounded-[48px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.11),transparent_58%)] blur-3xl" />

            <div className="relative mx-auto max-w-[700px]">
              <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                <div className="co-motion-card rounded-[30px] border border-white/10 bg-[#0b1119]/88 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                        Product preview
                      </div>
                      <div className="mt-1 text-[18px] font-medium text-white">
                        Calm output, not more noise.
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] text-white/55">
                      Export-ready
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {HERO_PREVIEW_IMAGES.map((src, index) => (
                      <div
                        key={src}
                        className="group relative aspect-[4/5] overflow-hidden rounded-[18px] border border-white/8 bg-white/5"
                      >
                        <img
                          src={src}
                          alt={`Preview ${index + 1}`}
                          className="co-motion-image h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                        />
                        <div className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                          0{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                      ordered grid
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                      captions + CSV
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/50">
                      profile handoff
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="co-motion-card-slow co-motion-delay-1 rounded-[26px] border border-white/10 bg-[#0b1119]/82 p-4 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                      Smart Mix
                    </div>
                    <div className="mt-2 text-[24px] font-medium tracking-[-0.03em] text-white">
                      4
                    </div>
                    <div className="mt-1 text-[13px] leading-6 text-white/46">
                      ranked candidates with balance guardrails and duplicate avoidance.
                    </div>
                  </div>

                  <div className="co-motion-card-slow co-motion-delay-2 rounded-[26px] border border-white/10 bg-[#0b1119]/82 p-4 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                      Profile Handoff
                    </div>
                    <div className="mt-2 text-[15px] font-medium text-white">
                      Carry the Week Pack into a profile preview.
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-white/46">
                      Align avatar, bio, CTA, and handoff files around the selected visual rhythm.
                    </p>
                  </div>

                  <div className="co-motion-card-slow co-motion-delay-3 rounded-[26px] border border-white/10 bg-[#0b1119]/82 p-4 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                      System signal
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-white/48">
                      Minimal guardrails upstream. Faster approval downstream.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <WeekPackSection />

      <motion.section
        id="system-logic"
        className="relative overflow-hidden border-y border-white/[0.07] bg-[#06080d] px-4 py-20 sm:px-6 md:px-10 lg:px-14 lg:py-40"
        initial={
          reducedMotion
            ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, y: 72, scale: 0.985, filter: "blur(12px)" }
        }
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.22 }}
        transition={{ duration: reducedMotion ? 0 : 1.05, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_30%,rgba(255,255,255,0.075),transparent_30%),radial-gradient(circle_at_74%_38%,rgba(255,255,255,0.045),transparent_28%),radial-gradient(circle_at_52%_100%,rgba(255,255,255,0.08),transparent_34%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:160px_160px]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-[#06080d]/60 to-[#080d12]" />
        </div>

        <div className={[shellClass, "grid gap-12 lg:grid-cols-[0.94fr_1.06fr] lg:items-start lg:gap-28"].join(" ")}>
          <motion.div {...getRevealProps(0.04, 24)}>
            <div className="mb-7 inline-flex rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/42">
              From assets to export
            </div>

            <h2 className="max-w-[11ch] text-[clamp(2.7rem,5vw,5.9rem)] font-medium leading-[0.88] tracking-[-0.065em] text-white">
              How CreatorOps works.
            </h2>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-7 text-white/52">
              CreatorOps reduces the decision field before export. The flow guides assets through selection, planning, captions, export, and profile handoff without adding workflow noise.
            </p>

            <div className="mt-10 h-px w-full max-w-[30rem] bg-gradient-to-r from-white/22 via-white/8 to-transparent" />

            <div className="mt-10 grid max-w-[36rem] gap-5">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step.title} className="group grid grid-cols-[42px_1fr] gap-4">
                  <div className="relative flex justify-center">
                    <div className="h-8 w-8 rounded-full border border-white/12 bg-white/[0.035] text-center text-[11px] leading-8 text-white/50">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 ? (
                      <div className="absolute top-9 h-full w-px bg-gradient-to-b from-white/16 to-transparent" />
                    ) : null}
                  </div>

                  <div className={index < WORKFLOW_STEPS.length - 1 ? "pb-3" : ""}>
                    <div className="text-[15px] font-medium text-white">{step.title}</div>
                    <p className="mt-2 text-[13px] leading-6 text-white/46">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="relative grid gap-4 lg:block lg:min-h-[680px]" {...getRevealProps(0.18, 30)}>
            <div className="pointer-events-none absolute inset-0 hidden lg:block">
              <div className="co-motion-line absolute left-[8%] top-[16%] h-[68%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              <div className="co-motion-line absolute left-[8%] top-[48%] h-px w-[82%] bg-gradient-to-r from-white/12 via-white/7 to-transparent" />
              <div className="co-motion-line absolute left-[30%] top-[29%] h-px w-[48%] rotate-[-14deg] bg-gradient-to-r from-transparent via-white/7 to-transparent" />
              <div className="co-motion-line absolute left-[38%] top-[71%] h-px w-[42%] rotate-[11deg] bg-gradient-to-r from-transparent via-white/7 to-transparent" />

              <div className="co-motion-dot absolute left-[4%] top-[45%] h-3 w-3 rounded-full border border-white/16 bg-white/[0.035] shadow-[0_0_42px_rgba(255,255,255,0.15)]" />
              <div className="co-motion-dot absolute left-[48%] top-[25%] h-2 w-2 rounded-full bg-white/20 shadow-[0_0_34px_rgba(255,255,255,0.16)]" />
              <div className="co-motion-dot absolute right-[10%] top-[48%] h-3 w-3 rounded-full border border-white/14 bg-white/[0.032] shadow-[0_0_46px_rgba(255,255,255,0.14)]" />
              <div className="co-motion-dot absolute left-[54%] bottom-[14%] h-2 w-2 rounded-full bg-white/18 shadow-[0_0_32px_rgba(255,255,255,0.14)]" />

              <div className="co-motion-glow absolute left-[10%] top-[16%] h-52 w-52 rounded-full bg-white/[0.025] blur-3xl" />
              <div className="co-motion-glow absolute right-[4%] top-[38%] h-64 w-64 rounded-full bg-white/[0.02] blur-3xl" />
              <div className="co-motion-glow absolute left-[28%] bottom-[6%] h-56 w-56 rounded-full bg-white/[0.018] blur-3xl" />
            </div>

            <div className="relative max-w-none rounded-[24px] border border-white/10 bg-white/[0.025] p-5 lg:absolute lg:left-[0%] lg:top-[4%] lg:max-w-[18rem] lg:border-0 lg:bg-transparent lg:p-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/26">
                Input field
              </div>
              <div className="mt-4 text-[20px] font-medium leading-[1.02] tracking-[-0.04em] text-white/84">
                Many assets enter.
              </div>
              <p className="mt-4 text-[13px] leading-6 text-white/38">
                The system keeps only the signals strong enough to shape a week.
              </p>
            </div>

            <div className="relative max-w-none rounded-[24px] border border-white/10 bg-white/[0.025] p-5 lg:absolute lg:right-[0%] lg:top-[34%] lg:max-w-[20rem] lg:border-0 lg:bg-transparent lg:p-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/26">
                Guardrail layer
              </div>
              <div className="mt-4 text-[20px] font-medium leading-[1.02] tracking-[-0.04em] text-white/84">
                Noise is reduced before planning.
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-[12px] text-white/42">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/22" />
                  <span>No near-duplicates</span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-white/42">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/22" />
                  <span>Balanced rhythm</span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-white/42">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/22" />
                  <span>Explainable pick</span>
                </div>
              </div>
            </div>

            <div className="relative max-w-none rounded-[24px] border border-white/10 bg-white/[0.025] p-5 lg:absolute lg:bottom-[2%] lg:left-[22%] lg:max-w-[25rem] lg:border-0 lg:bg-transparent lg:p-0">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/26">
                Output contract
              </div>
              <div className="mt-4 text-[26px] font-medium leading-[1] tracking-[-0.05em] text-white/90">
                One clean pack leaves.
              </div>
              <p className="mt-4 text-[13px] leading-6 text-white/40">
                Ordered images, captions, CSV, manifest, and profile handoff become a single exportable outcome.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[11px] text-white/42">
                  images
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[11px] text-white/42">
                  captions
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[11px] text-white/42">
                  CSV
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[11px] text-white/42">
                  bio
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* TRANSITION (dark -> light) */}
<section className="relative -mt-[2px] -mb-[2px] overflow-hidden bg-[#f5f5f7]">
  <div className="absolute inset-0">
    <img
      src="/creatorops/landing/bg-03-bridge.png"
      alt=""
      className="h-full w-full object-cover object-center md:object-contain"
      draggable={false}
      loading="lazy"
      decoding="async"
    />

    {/* TOP CAP: makes the very start identical to the dark section above (kills the hard seam) */}
    <div className="absolute inset-x-0 top-0 h-[180px] bg-[#0b0f15]" />
    {/* TOP FEATHER: slowly reveals the bridge image (restores as was smoothness) */}
    <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#0b0f15] via-[#0b0f15]/75 to-transparent" />

    {/* Global dark->light wash (keeps the premium falloff) */}
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0b0f15_0%,rgba(11,15,21,0.92)_28%,rgba(11,15,21,0.55)_52%,rgba(245,245,247,0)_78%,rgba(245,245,247,0)_100%)]" />

    {/* Bottom feather to match Roadmap canvas (keep what we already fixed) */}
    <div className="absolute inset-x-0 bottom-0 h-[360px] bg-gradient-to-b from-transparent via-[#f5f5f7]/85 to-[#f5f5f7]" />
  </div>

  <div className={shellClass}>
    <div className="flex min-h-[64svh] items-center py-16 md:min-h-[92svh] md:py-24">
      <motion.div className="max-w-[560px]" {...getRevealProps(0.04, 22)}>
        <div className="text-sm text-white/70">From chaos to system</div>
        <h2 className="mt-2 text-3xl tracking-tight text-white md:text-4xl">
          Same assets. Better structure.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          CreatorOps keeps decisions upstream (Smart Mix) so the rest becomes calm execution.
        </p>
      </motion.div>
    </div>
  </div>

  {/* bottom seal (sub-pixel seam guard) */}
  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[#f5f5f7]" />
</section>

      <OutputPackShowcase reducedMotion={reducedMotion} />

      <ProductSaaSSections />

      {/* WAITLIST */}
<section id="waitlist" className="bg-[#f5f5f7] text-black scroll-mt-[96px]">
  <div className={[shellClass, "pb-20"].join(" ")}>
    <motion.div
      initial={
        reducedMotion
          ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          : { opacity: 0, y: 96, scale: 0.985, filter: "blur(14px)" }
      }
      whileInView={
        reducedMotion
          ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
      }
      transition={
  reducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 90, damping: 26, mass: 1.25 }
}
      viewport={{ once: true, amount: 0.62, margin: "0px 0px -180px 0px" }}
      style={{ willChange: "transform, opacity, filter" }}
    >
      <div className="grid gap-10 lg:grid-cols-12">
        <motion.div className="lg:col-span-5" {...getRevealProps(0.04, 22)}>
          <div className="text-sm text-black/60">Next</div>
          <h2 className="mt-2 text-2xl text-black">Join the waitlist.</h2>
          <p className="mt-3 text-sm text-black/55">
            Join early access for the account-based SaaS release, pricing updates, and product notes.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-black/65">
            <li className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-black/35" />
              <span>Early access + onboarding</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-black/35" />
              <span>Private build updates</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-black/35" />
              <span>First invite when saved workspaces and live AI captions land</span>
            </li>
          </ul>
        </motion.div>

        <motion.div className="lg:col-span-7" {...getRevealProps(0.14, 24)}>
          <WaitlistForm />
        </motion.div>
      </div>
    </motion.div>
  </div>
</section>

      {/* FOOTER */}
      <footer className="bg-[#f5f5f7]">
        <div className={[shellClass, "pb-10"].join(" ")}>
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/70 px-6 py-4 text-sm text-black/60 backdrop-blur">
              <div>CreatorOps</div>
              <div className="flex items-center gap-4">
                <Link to="/" className="hover:text-black">
                  Product
                </Link>
                <Link to="/story" className="hover:text-black">
                  Story
                </Link>
                <Link to="/prototype/library" className="hover:text-black">
                  Workspace
                </Link>
                <a href="#pricing" className="hover:text-black">
                  Pricing preview
                </a>
                <a href="#roadmap" className="hover:text-black">
                  Roadmap
                </a>
                <button type="button" onClick={() => scrollToSection("waitlist")} className="hover:text-black">
                  Waitlist
                </button>
                <a href="https://brenychstudio.com/" target="_blank" rel="noreferrer" className="hover:text-black">
                  Design & development - brenychstudio
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </footer>
    </div>
  );
}


