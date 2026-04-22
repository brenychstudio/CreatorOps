// src/components/marketing/RoadmapSection.tsx
import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

const ROADMAP_PDF = "/creatorops/roadmap.pdf"; // public/creatorops/roadmap.pdf

type Column = {
  title: "Now" | "Next" | "Later";
  pill: string;
  items: string[];
};

const COLUMNS: Column[] = [
  {
    title: "Now",
    pill: "Demo-ready",
    items: [
      "Smart Mix алгоритм + guardrails (no repeats / balance)",
      "Upload до 12 assets (demo cap)",
      "Export pack (ZIP + captions + hashtags)",
      "Waitlist polish + basic instrumentation",
      "SEO foundations (landing hygiene)",
    ],
  },
  {
    title: "Next",
    pill: "Pro plan",
    items: [
      "Pricing value: 9 vs 18 (3×3 / 3×6)",
      "Week 1 / Week 2 у Sequence",
      "Persistence (saved plans / history)",
      "Optional AI captions (backend-ready)",
      "Team/Agency basics (roles, shared library)",
    ],
  },
  {
    title: "Later",
    pill: "Expansion",
    items: [
      "Reels: export-first → publish",
      "Bio Builder module",
      "Instagram publish backend (OAuth/tokens/queue)",
      "Graph API publishing + logs/retry",
    ],
  },
];

type ModuleCard = {
  title: string;
  pill: string;
  text: string;
};

const MODULES: ModuleCard[] = [
  {
    title: "Bio Builder",
    pill: "Module",
    text: "Make a clean, shippable bio page from your weekly plan — fast, consistent, on-brand.",
  },
  {
    title: "Pricing Value: 9 vs 18",
    pill: "Value",
    text: "A clear PRO unlock: 9-grid vs 18-grid planning with Week 1 / Week 2 context.",
  },
  {
    title: "Reels Expansion",
    pill: "Expansion",
    text: "Start export-first. Add publish later with Graph API + backend orchestration.",
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.04] px-2.5 py-1 text-[11px] leading-none text-black/55">
      {children}
    </span>
  );
}

function Card({
  title,
  pill,
  children,
}: {
  title: string;
  pill?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.10)] backdrop-blur-md transition hover:border-black/15">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium text-black/85">{title}</div>
        {pill ? <Pill>{pill}</Pill> : null}
      </div>
      {children}
    </div>
  );
}

export default function RoadmapSection() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(Boolean(mq?.matches));
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);

  const viewport = { once: true, amount: 0.26, margin: "0px 0px -140px 0px" } as const;

  const initial = reducedMotion
    ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
    : { opacity: 0, y: 22, scale: 1, filter: "blur(12px)" };

  const inView = { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" };

  const transitionBase = reducedMotion
    ? { duration: 0 }
    : { duration: 0.85, ease: "easeOut" };

  const item = (delay: number): any => ({
  initial,
  whileInView: inView,
  transition: reducedMotion ? { duration: 0 } : { ...transitionBase, delay },
  viewport,
  style: { willChange: "transform, opacity, filter" } as React.CSSProperties,
} as any);

  return (
    <section
      id="roadmap"
      className="relative -mt-[2px] -mb-[2px] overflow-hidden bg-[#f5f5f7] text-black scroll-mt-[104px]"
    >
      {/* Blend helpers: keep canvas clean at top/bottom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[240px] bg-gradient-to-b from-[#f5f5f7] via-[#f5f5f7]/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[260px] bg-gradient-to-t from-[#f5f5f7] via-[#f5f5f7]/85 to-transparent" />

      {/* background layers */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <img
          src="/creatorops/landing/detail-01-light.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.08]"
          draggable={false}
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_0%,rgba(0,0,0,0.06),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_420px_at_85%_20%,rgba(0,0,0,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/30 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
        {/* Header (first) + Shine sweep */}
        <motion.div {...item(0)} className="relative">
          <div className="pointer-events-none absolute inset-[-10px] overflow-hidden rounded-[32px]">
            <motion.div
              initial={reducedMotion ? { opacity: 0, x: 0 } : { opacity: 0, x: -720 }}
              whileInView={
                reducedMotion
                  ? { opacity: 0, x: 0 }
                  : { opacity: [0, 0.28, 0], x: [-720, 860, 1120] }
              }
              transition={reducedMotion ? { duration: 0 } : { duration: 1.35, ease: "easeOut", delay: 0.12 }}
              viewport={{ once: true, amount: 0.6, margin: "0px 0px -140px 0px" }}
              className="absolute -inset-y-10 w-[560px] -skew-x-12 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.55),transparent)]"
              style={{ mixBlendMode: "soft-light" }}
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] tracking-[0.18em] text-black/45">ROADMAP</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
                Demo → Monetization → Expansion
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-black/55">
                A clear trajectory for community, investors, and users — without heavy scroll scenes. We keep the “Awards”
                director scroll intact.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                className="pressable inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
                href={ROADMAP_PDF}
                target="_blank"
                rel="noreferrer"
              >
                Download Roadmap PDF
              </a>
              <a
                className="pressable inline-flex items-center justify-center rounded-full border border-black/10 bg-white/60 px-4 py-2 text-sm font-medium text-black/80 backdrop-blur hover:bg-white/80"
                href="#roadmap-modules"
              >
                See modules
              </a>
            </div>
          </div>
        </motion.div>

        {/* Columns (second, stagger via delay) */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((c, idx) => (
            <motion.div key={c.title} {...item(0.18 + idx * 0.08)}>
              <Card title={c.title} pill={c.pill}>
                <ul className="space-y-2.5 text-sm text-black/60">
                  {c.items.map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-black/25" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Modules (third, delayed stagger) */}
        <div id="roadmap-modules" className="mt-16">
          <motion.div {...item(0.46)}>
            <div className="text-[11px] tracking-[0.18em] text-black/45">MODULES</div>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-black/85">
              What expands the system
            </h3>
          </motion.div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {MODULES.map((m, idx) => (
              <motion.div key={m.title} {...item(0.54 + idx * 0.08)}>
                <Card title={m.title} pill={m.pill}>
                  <p className="text-sm leading-relaxed text-black/60">{m.text}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}