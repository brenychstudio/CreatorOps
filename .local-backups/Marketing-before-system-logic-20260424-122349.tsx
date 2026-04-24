// src/pages/Marketing.tsx
import RoadmapSection from "../components/marketing/RoadmapSection";

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
  { title: "Library", desc: "Collect and pick your strongest assets." },
  { title: "Smart Mix", desc: "Auto-curated 3Г—3 candidates with guardrails." },
  { title: "Sequence", desc: "Turn the best mix into a weekly plan." },
  { title: "Planner", desc: "Drag & drop slots. Stay flexible." },
  { title: "Captions", desc: "Generate copy + hashtags per post." },
  { title: "Export", desc: "Download a publish-ready pack." },
];

const BENEFITS = [
  { title: "Less decisions", desc: "The system proposes вЂ” you approve." },
  { title: "No repeats", desc: "Basic anti-pattern guardrails in the mix." },
  { title: "Publish-ready output", desc: "Captions + hashtags in one export pack." },
];

const OUTPUTS = [
  "Export pack (captions + hashtags)",
  "Per-post variations (Primary / Alt)",
  "Weekly plan preview (7-day context)",
  "Prototype flow in ~2 minutes",
];

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
            required for the demo.
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
  { id: "modules", label: "Flow" },
  { id: "roadmap", label: "Roadmap" },
  { id: "output", label: "Output" },
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
    desc: "Captions + hashtags + week context вЂ” clean handoff, zero integrations.",
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
    desc: "See the sequence as a week вЂ” then export a publish-ready pack.",
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
        One deliverable: captions, hashtags, week plan, checklist вЂ” ready to publish.
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
        The mix is proposed with simple constraints вЂ” so you donвЂ™t fight repeats later.
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
                <div className="text-black/55">Short reasons вЂ” fast approval.</div>
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
            Example: вЂњ3Г—3 candidates with guardrails вЂ” pick best в†’ continue.вЂќ
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
        Sequence turns decisions into a weekly context вЂ” then export.
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
            Preview only вЂ” the prototype shows the full flow end-to-end.
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm">
          <div className="text-sm font-medium text-black">Ship checklist</div>
          <div className="mt-3 space-y-2 text-sm text-black/65">
            <div>вЂў Pick sequence</div>
            <div>вЂў Copy captions</div>
            <div>вЂў Paste hashtags</div>
            <div>вЂў Post / schedule</div>
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

      <div className="relative mx-auto w-full max-w-6xl px-6">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          {/* Left: copy + controls */}
          <div className="lg:col-span-5">
            <div className="text-xs uppercase tracking-wide text-black/40">Output</div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-black">
              A keynote-style preview.
            </h2>
            <p className="mt-3 max-w-[52ch] text-sm text-black/55">
              Artifacts-only preview вЂ” clean, fast, no duplicated marketing copy.
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
                to="/prototype"
                className="pressable inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
              >
                Open prototype
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
              Build a weekly plan, generate captions, export a pack. No integrations required for the demo.
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
    <section id="output" className="relative scroll-mt-24 bg-[#f5f5f7] text-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_46%,rgba(15,23,42,0.035),rgba(15,23,42,0)_34%)]" />

      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-18 sm:py-20 lg:py-24">
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
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/24">Output</div>

            <h2 className="mt-4 max-w-[8ch] text-[clamp(2.6rem,5vw,4.3rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-black">
              A ready-to-publish pack.
            </h2>

            <p className="mt-5 max-w-[31ch] text-[15px] leading-8 text-black/42">
              CreatorOps turns a week of content decisions into one clean export package вЂ”
              ordered visuals, captions, hashtags, and handoff files that are easy to ship.
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
                Open prototype
              </a>

              <a
                href="#waitlist"
                className="inline-flex items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm text-black/68 transition hover:bg-black/[0.03]"
              >
                Join waitlist
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

            <div className="rounded-[1.9rem] border border-black/8 bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4 pb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/24">Final pack</div>
                  <div className="mt-1 text-[1.05rem] font-medium tracking-[-0.035em] text-black">
                    3Г—3 export preview
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
                      className="h-full w-full object-cover"
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
                Ordered exactly as exported: <span className="text-black/52">01 в†’ 09</span>
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
    text: "Collect and filter the strongest source assets.",
  },
  {
    title: "Smart Mix",
    text: "Generate ranked 3×3 candidates with calm guardrails.",
  },
  {
    title: "Export",
    text: "Ship a clean pack with ordered visuals and captions.",
  },
  {
    title: "Bio Builder",
    text: "Carry the selected pack into a profile-ready simulator.",
  },
] as const;

const HERO_STATS = [
  "9 ordered images",
  "4 ranked candidates",
  "ZIP + captions + CSV",
] as const;

const HERO_PREVIEW_IMAGES = [
  "/creatorops/thumbs/4x5/thumb-4x5-01.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-02.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-03.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-04.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-05.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-06.jpg",
] as const;

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

     // Ensure refresh/mount starts at top (override browser scroll restoration for this page)
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      // ignore
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    // If a hash is present (e.g. #output), clear it so refresh never вЂњjumps downвЂќ.
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

  const railIsDark = activeSection === "top" || activeSection === "modules";
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
    "w-[40px] overflow-visible",              // slim вЂњlineвЂќ, tooltip can overflow
    "transition-colors duration-500 ease-out", // smooth darkв†”light
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

        <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-14 px-6 pb-20 pt-10 md:px-10 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:px-14 lg:pb-24 lg:pt-14">
          <div className="max-w-[560px]">
            <div className="mb-6 flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                CreatorOps
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/45">
                Premium prototype
              </span>
            </div>

            <h1 className="max-w-[11ch] text-[clamp(2.8rem,5.6vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.05em] text-white">
              Turn content chaos into a calm pipeline.
            </h1>

            <p className="mt-6 max-w-[38rem] text-[15px] leading-7 text-white/62 md:text-[16px]">
              Library &gt; Smart Mix &gt; Sequence &gt; Planner &gt; Captions &gt; Export &gt; Bio Builder.
              One quiet system that turns scattered content into a cleaner publishing outcome.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/prototype/library"
                className="inline-flex items-center rounded-full bg-white px-5 py-3 text-[14px] font-medium text-black transition hover:bg-white/90"
              >
                Start demo
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
                  className="rounded-[20px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm transition duration-300 hover:border-white/16 hover:bg-white/[0.06]"
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
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-10 rounded-[48px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.11),transparent_58%)] blur-3xl" />

            <div className="relative mx-auto max-w-[700px]">
              <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[30px] border border-white/10 bg-[#0b1119]/88 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
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
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
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
                  <div className="rounded-[26px] border border-white/10 bg-[#0b1119]/82 p-4 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
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

                  <div className="rounded-[26px] border border-white/10 bg-[#0b1119]/82 p-4 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/32">
                      Bio Builder
                    </div>
                    <div className="mt-2 text-[15px] font-medium text-white">
                      Carry the selected pack into a profile simulator.
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-white/46">
                      Use the final pack as the visual base for a cleaner profile direction.
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-[#0b1119]/82 p-4 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
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
          </div>
        </div>
      </section>

      {/* MODULES (dark) */}
      <section id="story" className="relative bg-[#0b0f15] scroll-mt-[96px]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <div className="text-sm text-white/70">How it works</div>
                <h2 className="mt-2 text-2xl text-white">A simple flow. One system.</h2>
                <p className="mt-3 text-sm text-white/60">
                  The prototype shows the full pipeline end-to-end. Smart Mix is the core: it proposes ranked candidates,
                  you pick the best, then everything downstream stays consistent.
                </p>
              </Reveal>

              <Reveal delayMs={80}>
                <div className="mt-6 space-y-3">
                  {MODULES.map((m) => (
                    <div key={m.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-white">{m.title}</div>
                      <div className="mt-1 text-sm text-white/60">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delayMs={140}>
                <div className="mt-7 flex gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToSection("output")}
                    className="rounded-full bg-white/10 px-5 py-2.5 text-sm text-white ring-1 ring-white/15 hover:bg-white/15 pressable"
                  >
                    See output
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection("waitlist")}
                    className="rounded-full bg-white/5 px-5 py-2.5 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/10 pressable"
                  >
                    Join waitlist
                  </button>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-7">
              <Reveal delayMs={80}>
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm">
                  <img
                    src="/creatorops/landing/shot-01-dark.png"
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              </Reveal>

              <Reveal delayMs={140}>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-white/10">ranked candidates</span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-white/10">guardrails</span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-white/10">3Г—3 feed grid</span>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSITION (dark в†’ light) */}
<section className="relative -mt-[2px] -mb-[2px] overflow-hidden bg-[#f5f5f7]">
  <div className="absolute inset-0">
    <img
      src="/creatorops/landing/bg-03-bridge.png"
      alt=""
      className="h-full w-full object-contain object-center"
      draggable={false}
      loading="lazy"
      decoding="async"
    />

    {/* TOP CAP: makes the very start identical to the dark section above (kills the hard seam) */}
    <div className="absolute inset-x-0 top-0 h-[180px] bg-[#0b0f15]" />
    {/* TOP FEATHER: slowly reveals the bridge image (restores вЂњas wasвЂќ smoothness) */}
    <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#0b0f15] via-[#0b0f15]/75 to-transparent" />

    {/* Global darkв†’light wash (keeps the premium falloff) */}
    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0b0f15_0%,rgba(11,15,21,0.92)_28%,rgba(11,15,21,0.55)_52%,rgba(245,245,247,0)_78%,rgba(245,245,247,0)_100%)]" />

    {/* Bottom feather to match Roadmap canvas (keep what we already fixed) */}
    <div className="absolute inset-x-0 bottom-0 h-[360px] bg-gradient-to-b from-transparent via-[#f5f5f7]/85 to-[#f5f5f7]" />
  </div>

  <div className="relative mx-auto w-full max-w-[1200px] px-4">
    <div className="min-h-[92svh] py-24 flex items-center">
      <div className="max-w-[560px]">
        <div className="text-sm text-white/70">From chaos to system</div>
        <h2 className="mt-2 text-3xl tracking-tight text-white md:text-4xl">
          Same assets. Better structure.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          CreatorOps keeps decisions upstream (Smart Mix) so the rest becomes calm execution.
        </p>
      </div>
    </div>
  </div>

  {/* bottom seal (sub-pixel seam guard) */}
  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[#f5f5f7]" />
</section>

      {/* Roadmap (light canvas, no scroll-driven scene) */}
<RoadmapSection />

       <OutputPackShowcase reducedMotion={reducedMotion} />

      {/* WAITLIST */}
<section id="waitlist" className="bg-[#f5f5f7] text-black scroll-mt-[96px]">
  <div className="mx-auto w-full max-w-[1200px] px-4 pb-20">
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
        <div className="lg:col-span-5">
          <div className="text-sm text-black/60">Next</div>
          <h2 className="mt-2 text-2xl text-black">Join the waitlist.</h2>
          <p className="mt-3 text-sm text-black/55">
            WeвЂ™ll validate the loop (time saved + output quality), then ship beta access.
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
              <span>First invite when scheduling/publishing lands</span>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-7">
          <WaitlistForm />
        </div>
      </div>
    </motion.div>
  </div>
</section>

      {/* FOOTER */}
      <footer className="bg-[#f5f5f7]">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-10">
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/70 px-6 py-4 text-sm text-black/60 backdrop-blur">
              <div>CreatorOps вЂ” prototype (offline demo)</div>
              <div className="flex items-center gap-4">
                <Link to="/story" className="hover:text-black">
                  Story
                </Link>
                <Link to="/prototype" className="hover:text-black">
                  Prototype
                </Link>
                <button type="button" onClick={() => scrollToSection("waitlist")} className="hover:text-black">
                  Waitlist
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </footer>
    </div>
  );
}


