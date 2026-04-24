// src/pages/Story.tsx
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

type Chapter = {
  id: string;
  k: string;
  title: string;
  body: string;
  theme: "dark" | "light";
  bg: string;

  // Premium composition controls (optional)
  bgPos?: string; // CSS object-position, e.g. "60% 50%"
  bgTweak?: string; // (kept for future; not required for this polish pass)
  panelW?: string; // max width for text panel
  panel?: "plain" | "card"; // render text inside a glass card
  overlay?: string; // custom overlay gradient per chapter
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

const STORAGE_SOUND = "creatorops_story_sound_v1";

// Optional audio (disabled for now)
const AUDIO_SRC = ""; // "/creatorops/story/loop.mp3";

// Sticky chrome height compensation for anchor jumps
const SCROLL_OFFSET_PX = 104;

// Subtle “scroll assist” snapping (idle → nearest chapter)
const ENABLE_SCROLL_ASSIST = false;
const SCROLL_ASSIST_IDLE_MS = 140;
const SCROLL_ASSIST_MAX_JUMP_VH = 0.65;
const SCROLL_ASSIST_EPS_PX = 18;

/**
 * Reveal-on-scroll (landing-like): observe the PANEL (not the whole 100svh section),
 * and animate with opacity + translate only (no blur filters).
 */
function Reveal({
  children,
  className = "",
  delayMs = 0,
  reducedMotion = false,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  reducedMotion?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);

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
        "transform-gpu transition-[opacity,transform] duration-[900ms] ease-out will-change-[transform,opacity]",
        on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function Story() {
  const chapters: Chapter[] = useMemo(
    () => [
      {
        id: "ch00",
        k: "00",
        title: "Content chaos → calm pipeline",
        body: "A short film of the system: why it exists, how it works, and what you can ship today.",
        theme: "dark",
        bg: "/creatorops/landing/bg-01-dark.png",
      },
      {
        id: "ch01",
        k: "01",
        title: "The flow",
        body: "Library → Smart Mix → Sequence → Planner → Captions → Export. One loop. Minimal guardrails.",
        theme: "dark",
        bg: "/creatorops/landing/shot-01-dark.png",
      },
      {
        id: "ch02",
        k: "02",
        title: "Smart Mix is the core",
        body: "Ranked 3×3 candidates with guardrails. You approve the best, everything downstream stays consistent.",
        theme: "dark",
        bg: "/creatorops/landing/bg-01-dark.png",
      },
      {
        id: "ch03",
        k: "03",
        title: "Chaos → order",
        body: "Decisions upstream. Calm execution downstream.",
        theme: "light",
        bg: "/creatorops/landing/bg-03-bridge.png",
        bgPos: "58% 52%",
        panelW: "max-w-[420px] md:max-w-[460px] lg:max-w-[440px]",
        panel: "card",
        overlay: "bg-gradient-to-b from-black/35 via-black/10 to-[#f5f5f7]/70",
      },
      {
        id: "ch04",
        k: "04",
        title: "Output you can ship",
        body: "Per-post captions + hashtags, week context, export pack. No integrations needed for the demo.",
        theme: "light",
        bg: "/creatorops/landing/shot-02-light.png",
      },
      {
        id: "ch05",
        k: "05",
        title: "Open the prototype",
        body: "Explore the full loop in ~2 minutes. Regenerate, refine, export again.",
        theme: "light",
        bg: "/creatorops/landing/detail-01-light.png",
      },
    ],
    []
  );

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const bgImgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string>(chapters[0]?.id ?? "ch00");

  useEffect(() => {
    if (typeof window === "undefined") return;
    for (const c of chapters) {
      const img = new Image();
      img.src = c.bg;
    }
  }, [chapters]);

  const [notesOpen, setNotesOpen] = useState(false);
  const soundEnabled = Boolean(AUDIO_SRC);
  const [soundOn, setSoundOn] = useState(false);

  // Reduced motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(Boolean(mq?.matches));
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);

  // Ensure Story opens from top
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Flow guard: disable any global scroll-snap / scroll-anchoring while Story is mounted
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    const prevSnapRoot = root.style.scrollSnapType;
    const prevSnapBody = body.style.scrollSnapType;

    const prevAnchorRoot = (root.style as any).overflowAnchor as string | undefined;
    const prevAnchorBody = (body.style as any).overflowAnchor as string | undefined;

    root.style.scrollSnapType = "none";
    body.style.scrollSnapType = "none";
    (root.style as any).overflowAnchor = "none";
    (body.style as any).overflowAnchor = "none";

    return () => {
      root.style.scrollSnapType = prevSnapRoot;
      body.style.scrollSnapType = prevSnapBody;
      (root.style as any).overflowAnchor = prevAnchorRoot ?? "";
      (body.style as any).overflowAnchor = prevAnchorBody ?? "";
    };
  }, []);

  const scrollToId = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;

      const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX;
      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });

      try {
        window.history.replaceState(null, "", `#${id}`);
      } catch {
        // ignore
      }
    },
    [reducedMotion]
  );

  // Restore sound toggle (only if AUDIO_SRC is enabled)
  useEffect(() => {
    if (!soundEnabled) return;
    const raw = localStorage.getItem(STORAGE_SOUND);
    if (raw === "1") setSoundOn(true);
  }, [soundEnabled]);

  // Sound play/pause (never autoplay)
  useEffect(() => {
    if (!soundEnabled) return;
    const el = audioRef.current;
    if (!el) return;

    if (soundOn) {
      el.volume = 0.15;
      el.play().catch(() => {
        setSoundOn(false);
        localStorage.setItem(STORAGE_SOUND, "0");
      });
      localStorage.setItem(STORAGE_SOUND, "1");
    } else {
      el.pause();
      localStorage.setItem(STORAGE_SOUND, "0");
    }
  }, [soundOn, soundEnabled]);

  // ESC closes notes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotesOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Active chapter detection (for sticky chrome)
  useEffect(() => {
    const els = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        let bestId: string | null = null;
        let bestRatio = 0;

        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          if (ent.intersectionRatio > bestRatio) {
            bestRatio = ent.intersectionRatio;
            bestId = (ent.target as HTMLElement).id;
          }
        }

        if (bestId && bestRatio >= 0.35) setActiveId(bestId);
      },
      { threshold: [0.2, 0.35, 0.5, 0.65] }
    );

    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);

  // Doc progress
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(clamp01(window.scrollY / max) * 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Micro-parallax: animate bg via object-position offset
  useEffect(() => {
    if (reducedMotion) return;

    const secs = sectionRefs.current;
    const imgs = bgImgRefs.current;
    if (!secs.some(Boolean) || !imgs.some(Boolean)) return;

    const baseX: string[] = [];
    const baseY: string[] = [];
    for (let i = 0; i < chapters.length; i++) {
      const pos = chapters[i]?.bgPos ?? "50% 50%";
      const parts = pos.trim().split(/\s+/);
      baseX[i] = parts[0] ?? "50%";
      baseY[i] = parts[1] ?? "50%";
    }

    const target: number[] = new Array(chapters.length).fill(0);
    const cur: number[] = new Array(chapters.length).fill(0);

    let raf = 0;

    const computeTargets = () => {
      const vh = window.innerHeight || 800;
      const vc = vh / 2;

      for (let i = 0; i < chapters.length; i++) {
        const s = secs[i];
        if (!s) continue;

        const r = s.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const delta = (c - vc) / vh; // ~ -1..1
        const amp = chapters[i]?.id === "ch03" ? 10 : 14;
        target[i] = clamp(-delta * amp, -amp, amp);
      }
    };

    const tick = () => {
      for (let i = 0; i < chapters.length; i++) {
        const img = imgs[i];
        if (!img) continue;

        cur[i] = cur[i] + (target[i] - cur[i]) * 0.08;
        img.style.objectPosition = `${baseX[i]} calc(${baseY[i]} + ${cur[i].toFixed(2)}px)`;
        img.style.willChange = "object-position";
      }
      raf = window.requestAnimationFrame(tick);
    };

    const onScroll = () => computeTargets();

    computeTargets();
    raf = window.requestAnimationFrame(tick);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);

      for (let i = 0; i < chapters.length; i++) {
        const img = imgs[i];
        if (!img) continue;
        img.style.objectPosition = `${baseX[i]} ${baseY[i]}`;
        img.style.willChange = "";
      }
    };
  }, [chapters, reducedMotion]);

  // Scroll-assist snap (idle → nearest chapter)
  const snapTimerRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);

  useEffect(() => {
    if (!ENABLE_SCROLL_ASSIST) return;
    if (reducedMotion) return;

    const els = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const clearTimer = () => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    };

    const scheduleSnap = () => {
      if (notesOpen) return;
      if (isSnappingRef.current) return;

      clearTimer();
      snapTimerRef.current = window.setTimeout(() => {
        if (notesOpen) return;
        if (isSnappingRef.current) return;

        const targetTop = window.scrollY + SCROLL_OFFSET_PX;
        let bestId: string | null = null;
        let bestDist = Infinity;

        for (const el of els) {
          const top = el.offsetTop;
          const d = Math.abs(top - targetTop);
          if (d < bestDist) {
            bestDist = d;
            bestId = el.id;
          }
        }

        if (!bestId) return;
        if (bestDist <= SCROLL_ASSIST_EPS_PX) return;

        const vh = window.innerHeight || 800;
        if (bestDist > vh * SCROLL_ASSIST_MAX_JUMP_VH) return;

        isSnappingRef.current = true;
        scrollToId(bestId);

        window.setTimeout(() => {
          isSnappingRef.current = false;
        }, 520);
      }, SCROLL_ASSIST_IDLE_MS);
    };

    const onScroll = () => scheduleSnap();
    const onResize = () => scheduleSnap();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearTimer();
    };
  }, [notesOpen, reducedMotion, scrollToId]);

  const activeIndex = Math.max(0, chapters.findIndex((c) => c.id === activeId));
  const activeChapter = chapters[activeIndex] ?? chapters[0];

  // Theme-aware chrome (keep CH03 as dark-chrome)
  const chromeIsDark = activeChapter?.id === "ch03" || activeChapter?.theme === "dark";

  return (
    <motion.div
      className="min-h-dvh bg-[#0b0f15]"
      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <style>{`
        @keyframes storyGrainShift {
          0%   { transform: translate3d(0,0,0) scale(1.05); }
          25%  { transform: translate3d(-1.2%, 0.8%,0) scale(1.06); }
          50%  { transform: translate3d(1.1%, -0.9%,0) scale(1.07); }
          75%  { transform: translate3d(-0.7%, -0.6%,0) scale(1.06); }
          100% { transform: translate3d(0,0,0) scale(1.05); }
        }

        .story-vignette-dark {
          background: radial-gradient(120% 95% at 50% 40%,
            rgba(0,0,0,0) 52%,
            rgba(0,0,0,0.42) 100%);
          opacity: 0.55;
        }
        .story-vignette-light {
          background: radial-gradient(120% 95% at 50% 40%,
            rgba(255,255,255,0) 58%,
            rgba(0,0,0,0.20) 100%);
          opacity: 0.35;
          mix-blend-mode: multiply;
        }

        .story-grain {
          filter: url(#storyGrain);
          opacity: 0.10;
          mix-blend-mode: soft-light;
          animation: storyGrainShift 8s steps(2, end) infinite;
          will-change: transform, filter;
          pointer-events: none;
        }
        .story-grain--dark { background: rgba(255,255,255,0.18); }
        .story-grain--light { background: rgba(0,0,0,0.12); opacity: 0.08; }

        @media (prefers-reduced-motion: reduce) {
          .story-grain { animation: none; }
        }
      `}</style>

      {soundEnabled ? <audio ref={audioRef} src={AUDIO_SRC} loop preload="none" /> : null}

      {/* Sticky chrome */}
      <div className="sticky top-0 z-50">
        <div className="mx-auto w-full max-w-[1200px] px-3 pt-3 sm:px-4 sm:pt-4">
          <div
            className={[
              "flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-[1.5rem] border px-3 py-2 backdrop-blur sm:flex-nowrap sm:rounded-full sm:py-0",
              "transition-colors duration-500 ease-out",
              chromeIsDark ? "border-white/10 bg-black/35" : "border-black/10 bg-white/55",
            ].join(" ")}
          >
            <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto">
              <Link
                to="/"
                className={[
                  "whitespace-nowrap text-xs pressable",
                  "transition-colors duration-500 ease-out",
                  chromeIsDark ? "text-white/70 hover:text-white" : "text-black/70 hover:text-black",
                ].join(" ")}
              >
                CreatorOps • Story
              </Link>

              <div className="hidden min-w-0 items-center gap-2 md:flex">
                <div
                  className={[
                    "max-w-[560px] truncate whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] ring-1",
                    "transition-colors duration-500 ease-out",
                    chromeIsDark ? "bg-white/10 text-white/70 ring-white/10" : "bg-black/5 text-black/70 ring-black/10",
                  ].join(" ")}
                >
                  CH {activeChapter.k} • {activeChapter.title}
                </div>
              </div>
            </div>

            <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
              {/* progress */}
              <div className="hidden items-center gap-2 sm:flex">
                <div
                  className={[
                    "h-1 w-32 overflow-hidden rounded-full",
                    "transition-colors duration-500 ease-out",
                    chromeIsDark ? "bg-white/10" : "bg-black/10",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "h-full rounded-full",
                      "transition-colors duration-500 ease-out",
                      chromeIsDark ? "bg-white/70" : "bg-black/70",
                    ].join(" ")}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div
                  className={[
                    "w-10 text-right text-xs",
                    "transition-colors duration-500 ease-out",
                    chromeIsDark ? "text-white/55" : "text-black/55",
                  ].join(" ")}
                >
                  {Math.round(progress)}%
                </div>
              </div>

              {/* Notes */}
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className={[
                  "w-[34%] rounded-full px-3 py-1.5 text-xs ring-1 pressable sm:w-auto",
                  "transition-colors duration-500 ease-out",
                  chromeIsDark ? "bg-white/10 text-white ring-white/15 hover:bg-white/15" : "bg-black/5 text-black ring-black/10 hover:bg-black/10",
                ].join(" ")}
              >
                Notes
              </button>

              {/* Sound */}
              <button
                type="button"
                disabled={!soundEnabled}
                onClick={() => {
                  if (!soundEnabled) return;
                  setSoundOn((v) => !v);
                }}
                className={[
                  "hidden rounded-full px-3 py-1.5 text-xs ring-1 pressable sm:inline-flex",
                  "transition-colors duration-500 ease-out",
                  !soundEnabled
                    ? chromeIsDark
                      ? "bg-white/5 text-white/35 ring-white/10 opacity-70 cursor-not-allowed"
                      : "bg-black/5 text-black/35 ring-black/10 opacity-70 cursor-not-allowed"
                    : soundOn
                    ? chromeIsDark
                      ? "bg-white text-black ring-white/20 hover:bg-white/90"
                      : "bg-black text-white ring-black/15 hover:bg-black/90"
                    : chromeIsDark
                    ? "bg-white/10 text-white ring-white/15 hover:bg-white/15"
                    : "bg-black/5 text-black ring-black/10 hover:bg-black/10",
                ].join(" ")}
                title={soundEnabled ? "Toggle sound" : "Sound (add audio later)"}
              >
                Sound{soundEnabled ? (soundOn ? " On" : " Off") : " (soon)"}
              </button>

              <Link
                to="/prototype"
                className={[
                  "flex-1 shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-center text-xs ring-1 pressable sm:flex-none",
                  "transition-colors duration-500 ease-out",
                  chromeIsDark ? "bg-white/10 text-white ring-white/15 hover:bg-white/15" : "bg-black/5 text-black ring-black/10 hover:bg-black/10",
                ].join(" ")}
              >
                Open prototype
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Notes drawer */}
      {notesOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setNotesOpen(false)}
            aria-label="Close notes overlay"
          />

          <div className="absolute right-0 top-0 h-full w-[min(520px,92vw)] border-l border-white/10 bg-[#0b0f15]/95 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white">Notes</div>
              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white ring-1 ring-white/15 hover:bg-white/15 pressable"
              >
                Close
              </button>
            </div>

            <div className="mt-4 text-xs text-white/55">Chapters (jump):</div>

            <div className="mt-3 space-y-2">
              {chapters.map((c) => (
                <a
                  key={c.id}
                  href={`#${c.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setNotesOpen(false);
                    scrollToId(c.id);
                  }}
                  className={[
                    "block rounded-2xl border p-3 pressable",
                    c.id === activeId ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="text-xs text-white/70">CH {c.k}</div>
                  <div className="mt-0.5 text-sm text-white">{c.title}</div>
                </a>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">Tip</div>
              <div className="mt-1 text-sm text-white/75">
                Keep the loop tight: open prototype → run the flow → export → come back.
              </div>

              <div className="mt-4 flex gap-2">
                <Link to="/prototype" className="rounded-full bg-white px-4 py-2 text-sm text-black hover:bg-white/90 pressable">
                  Open prototype
                </Link>
                <Link to="/" className="rounded-full bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15 pressable">
                  Landing
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Chapters */}
      {chapters.map((c, idx) => {
        const isDark = c.theme === "dark";
        const textMain = isDark ? "text-white" : "text-black";
        const textSub = isDark ? "text-white/65" : "text-black/60";
        const chip = isDark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-black/5 text-black ring-1 ring-black/10";

        const panelW = c.panelW ?? "max-w-[680px]";
        const panelShell =
          c.panel === "card"
            ? isDark
              ? "rounded-[28px] border border-white/12 bg-black/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl"
              : "rounded-[28px] border border-black/10 bg-white/60 p-6 md:p-8 shadow-[0_28px_90px_-46px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            : "";

        const overlayClass =
          c.overlay ??
          (isDark
            ? "bg-gradient-to-b from-black/70 via-black/25 to-black/75"
            : "bg-gradient-to-b from-[#f5f5f7]/70 via-[#f5f5f7]/35 to-[#f5f5f7]/85");

        const bgPos = c.bgPos ?? "50% 50%";
        const isBridge = c.id === "ch03";

        return (
          <section
            key={c.id}
            id={c.id}
            ref={(el) => {
              sectionRefs.current[idx] = el;
            }}
            className={[
              "relative isolate w-full overflow-hidden",
              "min-h-[100svh]",
              "scroll-mt-[104px]",
              isDark ? "bg-[#0b0f15]" : "bg-[#f5f5f7]",
            ].join(" ")}
          >
            <img
              ref={(el) => {
                bgImgRefs.current[idx] = el;
              }}
              src={c.bg}
              alt=""
              style={{ objectPosition: bgPos }}
              className={isBridge ? "absolute -inset-1 h-full w-full object-cover contrast-105 saturate-105" : "absolute inset-0 h-full w-full object-cover"}
              draggable={false}
              loading={idx === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={idx === 0 ? "high" : "auto"}
            />

            <div className={["absolute inset-0", overlayClass].join(" ")} />

            {/* Vignette + grain */}
            <div aria-hidden className={["pointer-events-none absolute inset-0", isDark ? "story-vignette-dark" : "story-vignette-light"].join(" ")} />
            <div aria-hidden className={["absolute inset-0 story-grain", isDark ? "story-grain--dark" : "story-grain--light"].join(" ")} />

            <div className="relative mx-auto w-full max-w-[1200px] px-4">
              <div className={["min-h-[100svh] py-24", isBridge ? "lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center" : "flex items-center"].join(" ")}>
                <Reveal
                  reducedMotion={reducedMotion}
                  delayMs={idx === 0 ? 80 : 0}
                  className={["w-full", isBridge ? "lg:col-span-5" : "", panelW, panelShell].join(" ")}
                >
                  <div className={["inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs", chip].join(" ")}>
                    <span className="opacity-80">Chapter</span>
                    <span className="font-medium">{c.k}</span>
                  </div>

                  <h1 className={["mt-6 text-4xl leading-[1.05] tracking-tight", textMain].join(" ")}>{c.title}</h1>
                  <p className={["mt-4 text-sm leading-relaxed", textSub].join(" ")}>{c.body}</p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      to="/prototype"
                      className={[
                        "rounded-full px-5 py-2.5 text-sm pressable",
                        isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90",
                      ].join(" ")}
                    >
                      Open prototype
                    </Link>

                    {idx < chapters.length - 1 ? (
                      <a
                        href={`#${chapters[idx + 1].id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToId(chapters[idx + 1].id);
                        }}
                        className={[
                          "rounded-full px-5 py-2.5 text-sm pressable",
                          isDark ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15" : "border border-black/15 bg-white/70 text-black hover:border-black/25",
                        ].join(" ")}
                      >
                        Next chapter
                      </a>
                    ) : (
                      <Link
                        to="/"
                        className={[
                          "rounded-full px-5 py-2.5 text-sm pressable",
                          isDark ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15" : "border border-black/15 bg-white/70 text-black hover:border-black/25",
                        ].join(" ")}
                      >
                        Back to landing
                      </Link>
                    )}
                  </div>
                </Reveal>

                {isBridge ? <div className="hidden lg:block lg:col-span-7" /> : null}
              </div>
            </div>
          </section>
        );
      })}

      {/* SVG filter defs (procedural grain) */}
      <svg width="0" height="0" aria-hidden className="absolute">
        <filter id="storyGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.35" />
          </feComponentTransfer>
        </filter>
      </svg>
    </motion.div>
  );
}
