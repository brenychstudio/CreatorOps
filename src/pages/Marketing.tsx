import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CreatorOpsDeviceShowcase } from "../features/creatorops/CreatorOpsDeviceShowcase";
import { AtmosphericBackdrop } from "../systems/atmospheric-backdrop";

const WIDE_SHELL = "mx-auto w-full max-w-[1520px] px-5 sm:px-6 lg:px-8";

const THUMBS = [
  "/creatorops/thumbs/4x5/thumb-4x5-01.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-02.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-03.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-04.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-05.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-06.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-07.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-08.jpg",
  "/creatorops/thumbs/4x5/thumb-4x5-09.jpg",
] as const;

const EXTENDED_THUMBS = [...THUMBS, ...THUMBS] as const;

const PHONE_HIGHLIGHT_LABELS = ["Week 1", "Mood", "Flow", "Week 2"] as const;

const PRODUCT_EVIDENCE = [
  {
    title: "Smart Mix / rhythm",
    label: "Workspace proof",
    image: "/creatorops/marketing/hero/smart-mix.png",
    copy: "A reusable product stage for Smart Mix, planning, export, review, and handoff proof.",
  },
  {
    title: "Week Pack / Extended Pack",
    label: "Capacity proof",
    image: "/creatorops/marketing/hero/week-pack.png",
    copy: "Show 9-post Week Packs and 18-post Extended Packs as real planning surfaces.",
  },
  {
    title: "Output / review / profile",
    label: "Delivery proof",
    image: "/creatorops/marketing/hero/export-pack.png",
    copy: "Carry the pack into export, client review, profile handoff, and format conversion.",
  },
] as const;

const WORKFLOW = [
  ["Library", "Collect the strongest visual assets for the week."],
  ["Smart Mix", "Compare ranked rhythms with guardrails."],
  ["Planner", "Shape Week 1 or Week 1 + Week 2 before captions."],
  ["Captions", "Draft captions, CTA lines, and hashtags around the chosen order."],
  ["Export", "Ship ordered images, captions, CSV, manifest, README, and handoffs."],
] as const;

const OUTPUTS = [
  {
    title: "Export ZIP",
    label: "Download pack",
    copy: "Ordered images, captions.txt, captions.csv, manifest.json, and README in one clean package.",
  },
  {
    title: "Media Converter",
    label: "Format handoff",
    copy: "Prepare the final pack for JPG, PNG, or WebP output without uploading files.",
  },
  {
    title: "Client Review",
    label: "Approval surface",
    copy: "Show Week 1, Week 2, or the complete rhythm before final approval.",
  },
  {
    title: "Profile Handoff",
    label: "Bio Builder",
    copy: "Use the first 9 posts to align avatar, bio, CTA, and profile preview.",
  },
] as const;

const PLANS = [
  {
    title: "Free Beta",
    price: "$0",
    note: "For testing the current export-first workspace.",
    items: ["3 Week Packs / month", "9-post Week Pack", "Starter Smart Mix", "Caption drafts", "ZIP export", "Profile Handoff"],
    cta: "Open workspace",
    href: "/prototype/library",
    featured: false,
  },
  {
    title: "Creator Pro",
    price: "Planned: $12 / month",
    note: "For creators and small brands preparing weekly content with more depth.",
    items: ["18-post Extended Pack", "Week 1 + Week 2", "More caption generations", "Saved pack history later", "Larger uploads later", "Bio Pack export"],
    cta: "Join early access",
    href: "#waitlist",
    featured: true,
  },
  {
    title: "Studio",
    price: "Planned: $29 / month",
    note: "For freelancers and small teams preparing client-ready content packs.",
    items: ["Multiple brand profiles later", "Client-ready exports", "Client Review", "More AI credits", "Brand voice presets later", "Priority workflow features"],
    cta: "Join early access",
    href: "#waitlist",
    featured: false,
  },
] as const;

const ROADMAP = [
  {
    title: "Now",
    items: ["Live workspace", "Smart Mix", "Planner", "Captions", "Export ZIP", "Extended Pack", "Media Converter", "Client Review", "Profile Handoff"],
  },
  {
    title: "Next",
    items: ["User accounts", "Saved Week Packs", "Live AI captions", "Pricing plans", "Workspace dashboard", "Cloud storage"],
  },
  {
    title: "Later",
    items: ["Brand presets", "Team workflows", "Public review links", "Instagram Graph API", "Publishing queue", "Analytics layer"],
  },
] as const;

const FAQ = [
  {
    q: "Is CreatorOps a scheduler?",
    a: "Not yet. CreatorOps is export-first: it prepares the package before publishing. Instagram publishing stays for a later official Graph API version.",
  },
  {
    q: "What is a Week Pack?",
    a: "A ready-to-publish package: selected visuals, order, captions, hashtags, export files, and profile handoff.",
  },
  {
    q: "What is an Extended Pack?",
    a: "An 18-post, two-week planning horizon. It is not just a bigger grid; it is Week 1 + Week 2 with calmer sequencing.",
  },
  {
    q: "Is AI live?",
    a: "The caption endpoint is prepared for server-side AI. Until production keys are connected, fallback drafts keep the flow usable.",
  },
  {
    q: "Is the workspace mobile-first?",
    a: "The current workspace is desktop-first. Public pages and review surfaces are responsive; full mobile workspace polish comes later.",
  },
] as const;

type WaitlistRole = "creator" | "studio" | "agency" | "investor";

type WaitlistEntry = {
  email: string;
  name: string;
  role: WaitlistRole;
  ts: number;
};

const WAITLIST_KEY = "creatorops_waitlist_v1";
const WAITLIST_EVENT = "creatorops_waitlist_updated";

function loadWaitlist(): WaitlistEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(WAITLIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as WaitlistEntry[]) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveWaitlistEntry(entry: WaitlistEntry) {
  try {
    if (typeof window === "undefined") return;

    const current = loadWaitlist();
    const next = [
      entry,
      ...current.filter((item) => item.email.toLowerCase() !== entry.email.toLowerCase()),
    ].slice(0, 200);

    window.localStorage.setItem(WAITLIST_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(WAITLIST_EVENT));
  } catch {
    // localStorage may be blocked in privacy mode
  }
}

function downloadWaitlistCsv(rows: WaitlistEntry[]) {
  try {
    const escape = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      "email,name,role,created_at",
      ...rows.map((row) =>
        [row.email, row.name, row.role, new Date(row.ts).toISOString()].map(escape).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `creatorops-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  } catch {
    // ignore local export errors
  }
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(Boolean(mediaQuery?.matches));

    update();
    mediaQuery?.addEventListener?.("change", update);

    return () => mediaQuery?.removeEventListener?.("change", update);
  }, []);

  return reducedMotion;
}

function useRevealOnScroll(reducedMotion: boolean) {
  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!revealItems.length) return;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -14% 0px", threshold: 0.16 }
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [reducedMotion]);
}

function scrollToSection(id: string, reducedMotion: boolean) {
  const target = document.getElementById(id);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
}

function LogoMark({ large = false }: { large?: boolean }) {
  return (
    <div
      className={large ? "co2-mark co2-mark--large" : "co2-mark"}
      aria-hidden="true"
      title="CreatorOps ordered Week 1 + Week 2 content mark"
    >
      {Array.from({ length: 18 }).map((_, index) => (
        <span key={index} className={index < 9 ? "is-week-one" : "is-week-two"} />
      ))}
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="co2-pill">{children}</span>;
}

function SectionHeader({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="max-w-[760px]">
      <div className="co2-eyebrow">{eyebrow}</div>
      <h2 className="co2-section-title mt-4">{title}</h2>
      {copy ? <p className="co2-section-copy mt-5">{copy}</p> : null}
    </div>
  );
}

function WeekGrid({ items = THUMBS, offset = 0, compact = false }: { items?: readonly string[]; offset?: number; compact?: boolean }) {
  return (
    <div className={compact ? "co2-mini-grid co2-mini-grid--compact" : "co2-mini-grid"}>
      {items.slice(0, 9).map((src, index) => (
        <div className="co2-mini-tile" key={`${src}-${index}`}>
          <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
          <span>{String(offset + index + 1).padStart(2, "0")}</span>
        </div>
      ))}
    </div>
  );
}

function ExtendedWeekGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "co2-extended-week-grid co2-extended-week-grid--compact" : "co2-extended-week-grid"}>
      <div className="co2-extended-week">
        <div className="co2-extended-week__head">
          <span>Week 1</span>
          <em>Posts 01-09</em>
        </div>
        <WeekGrid items={EXTENDED_THUMBS.slice(0, 9)} compact offset={0} />
      </div>

      <div className="co2-extended-week">
        <div className="co2-extended-week__head">
          <span>Week 2</span>
          <em>Posts 10-18</em>
        </div>
        <WeekGrid items={EXTENDED_THUMBS.slice(9, 18)} compact offset={9} />
      </div>
    </div>
  );
}

function ExtendedPackPhonePreview() {
  const phoneItems = EXTENDED_THUMBS.slice(0, 18);
  const highlights = [phoneItems[0], phoneItems[4], phoneItems[8], phoneItems[13]].filter(Boolean);
  const [surface, setSurface] = useState<"instagram" | "tiktok">("instagram");
  const tiktokPlayCounts = ["8.2K", "12K", "6.4K", "9.8K", "7.1K", "10K", "5.6K", "11K", "4.9K"];

  const renderTikTokProfileTile = (src: string, index: number) => (
    <div className="co-planner-tiktok-profile-tile" key={`${src}-tiktok-${index}`}>
      <img className="co-planner-tiktok-profile-tile-media" src={src} alt="" draggable={false} loading="lazy" decoding="async" />
      <span className="co-planner-tiktok-profile-plays">
        <span aria-hidden="true" />
        {tiktokPlayCounts[index % tiktokPlayCounts.length]}
      </span>
    </div>
  );

  return (
    <article className="co2-pack-card co2-pack-card--featured co2-pack-card--phone">
      <div className="co2-pack-card__meta">
        <span>18 posts</span>
        <em>Week 1 + Week 2</em>
      </div>

      <div className="co2-pack-phone-head">
        <div>
          <h3>Extended Pack</h3>
          <p>An 18-post planning horizon for two connected weeks before the pack leaves the workspace.</p>
        </div>
        <div className="co2-pack-surface-toggle" role="group" aria-label="Phone interface preview">
          <button
            type="button"
            className={surface === "instagram" ? "is-active" : undefined}
            onClick={() => setSurface("instagram")}
            aria-pressed={surface === "instagram"}
          >
            Instagram
          </button>
          <button
            type="button"
            className={surface === "tiktok" ? "is-active" : undefined}
            onClick={() => setSurface("tiktok")}
            aria-pressed={surface === "tiktok"}
          >
            TikTok
          </button>
        </div>
      </div>

      <div className="co2-pack-phone-frame" aria-label={`Extended Pack ${surface} mobile preview`}>
        <div className="co-iphone-shell co-planner-phone-shell co-extended-planner-phone-shell co2-pack-phone-shell">
          <div className="co-iphone-island" aria-hidden="true" />
          <div className="co-iphone-screen">
            {surface === "instagram" ? (
              <>
                <div className="co2-pack-phone-topbar">
                  <strong>creatorops</strong>
                  <span aria-hidden="true">+</span>
                </div>

                <div className="co-planner-phone-body co2-pack-phone-body">
                  <div className="co-planner-phone-profile">
                    <div className="co-planner-phone-account">
                      <div className="co-planner-phone-avatar">
                        <img src={phoneItems[0]} alt="" loading="lazy" decoding="async" draggable={false} />
                      </div>

                      <div className="co-planner-phone-stats">
                        <div>
                          <strong>18</strong>
                          <span>posts</span>
                        </div>
                        <div>
                          <strong>12.4K</strong>
                          <span>followers</span>
                        </div>
                        <div>
                          <strong>321</strong>
                          <span>following</span>
                        </div>
                      </div>
                    </div>

                    <div className="co-planner-phone-actions">
                      <button type="button" tabIndex={-1}>
                        Follow
                      </button>
                      <button type="button" tabIndex={-1}>
                        Message
                      </button>
                    </div>

                    <div className="co-planner-phone-bio">
                      <strong>CreatorOps</strong>
                      <span>Calm weekly content systems.</span>
                      <span>Week 1 + Week 2 ready for captions.</span>
                      <a href="#packs" onClick={(event) => event.preventDefault()}>
                        creatorops.studio/extended-pack
                      </a>
                    </div>

                    <div className="co-planner-phone-highlights">
                      {highlights.map((src, index) => (
                        <div className="co-planner-phone-highlight" key={`${src}-highlight-${index}`}>
                          <div className="co-planner-phone-highlight-thumb">
                            <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
                          </div>
                          <span>{PHONE_HIGHLIGHT_LABELS[index]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="co-planner-phone-tabs" aria-hidden="true">
                    <span>Posts</span>
                    <span>Reels</span>
                    <span>Tagged</span>
                  </div>

                  <div className="co-planner-phone-grid">
                    {phoneItems.map((src, index) => (
                      <div className="co-planner-phone-tile" key={`${src}-phone-${index}`}>
                        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="co-planner-tiktok-body">
                <div className="co-planner-tiktok-scroll">
                  <div className="co-planner-tiktok-appbar" aria-label="TikTok profile controls">
                    <span className="co-planner-tiktok-icon co-planner-tiktok-icon--person" aria-hidden="true" />
                    <div className="co-planner-tiktok-appbar-actions">
                      <span className="co-planner-tiktok-icon co-planner-tiktok-icon--steps" aria-hidden="true" />
                      <span className="co-planner-tiktok-icon co-planner-tiktok-icon--share" aria-hidden="true" />
                      <span className="co-planner-tiktok-icon co-planner-tiktok-icon--menu" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="co-planner-tiktok-profile">
                    <div className="co-planner-tiktok-profile-avatar">
                      <img src={phoneItems[0]} alt="" draggable={false} loading="lazy" decoding="async" />
                      <span aria-hidden="true">+</span>
                    </div>
                    <div className="co-planner-tiktok-name-row">
                      <strong>CreatorOps</strong>
                      <span>1</span>
                      <button type="button" aria-label="Edit profile preview" tabIndex={-1} />
                    </div>
                    <div className="co-planner-tiktok-handle">@creatorops</div>
                    <div className="co-planner-tiktok-profile-stats" aria-label="TikTok profile stats">
                      <div>
                        <b>321</b>
                        <span>Following</span>
                      </div>
                      <div>
                        <b>12.4K</b>
                        <span>Followers</span>
                      </div>
                      <div>
                        <b>84K</b>
                        <span>Likes</span>
                      </div>
                    </div>
                    <p>Calm weekly content systems. Extended Pack rhythm ready for captions.</p>
                    <div className="co-planner-tiktok-studio">
                      <span aria-hidden="true" />
                      TikTok Studio
                    </div>
                    <a href="#packs" onClick={(event) => event.preventDefault()}>
                      creatorops.studio/extended-pack
                    </a>
                  </div>

                  <div className="co-planner-tiktok-profile-tabs">
                    <span className="is-active" aria-label="Videos" />
                    <span aria-label="Shop" />
                    <span aria-label="Private" />
                    <span aria-label="Saved" />
                    <span aria-label="Liked" />
                  </div>

                  <div className="co-planner-tiktok-profile-grid">{phoneItems.map(renderTikTokProfileTile)}</div>
                </div>

                <div className="co-planner-tiktok-bottom-nav" aria-label="TikTok bottom navigation preview">
                  <span>Home</span>
                  <span>Friends</span>
                  <strong>+</strong>
                  <span>Inbox</span>
                  <span className="is-active">Profile</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function HeroVisual() {
  return (
    <div className="co2-hero-visual" aria-label="CreatorOps desktop workspace preview">
      <CreatorOpsDeviceShowcase variant="hero" motion="subtle-float" showCompanion={false} />

      <div className="co2-floating-card co2-floating-card--top">
        <span>Output</span>
        <strong>Extended Pack ready</strong>
        <small>18 ordered posts · Week 1 + Week 2</small>
      </div>

      <div className="co2-floating-card co2-floating-card--bottom">
        <span>Handoff</span>
        <strong>ZIP + captions + review</strong>
        <small>One package leaves the workspace.</small>
      </div>
    </div>
  );
}

function ProductEvidence() {
  const [activeEvidence, setActiveEvidence] = useState<(typeof PRODUCT_EVIDENCE)[number] | null>(null);

  useEffect(() => {
    if (!activeEvidence) return;

    const previousOverflow = document.documentElement.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveEvidence(null);
    };

    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeEvidence]);

  const lightbox =
    activeEvidence && typeof document !== "undefined"
      ? createPortal(
          <div className="co2-lightbox" role="dialog" aria-modal="true" aria-label={`${activeEvidence.title} screenshot preview`}>
            <button
              type="button"
              className="co2-lightbox__backdrop"
              onClick={() => setActiveEvidence(null)}
              aria-label="Close screenshot preview"
            />
            <div className="co2-lightbox__panel">
              <div className="co2-lightbox__head">
                <div>
                  <span>{activeEvidence.label}</span>
                  <strong>{activeEvidence.title}</strong>
                </div>
                <button type="button" onClick={() => setActiveEvidence(null)}>
                  Close
                </button>
              </div>
              <img src={activeEvidence.image} alt={`${activeEvidence.title} full screenshot`} draggable={false} />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="co2-evidence-grid">
        {PRODUCT_EVIDENCE.map((item) => (
          <article key={item.title} className="co2-evidence-card">
            <button
              type="button"
              className="co2-evidence-card__image"
              onClick={() => setActiveEvidence(item)}
              aria-label={`Open ${item.title} screenshot`}
            >
              <img src={item.image} alt={`${item.title} product evidence`} loading="lazy" decoding="async" draggable={false} />
            </button>

            <div className="co2-evidence-card__body">
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </div>
          </article>
        ))}
      </div>

      {lightbox}
    </>
  );
}

function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WaitlistRole>("creator");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [count, setCount] = useState(() => loadWaitlist().length);

  const admin = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("admin") === "1";
  }, []);

  useEffect(() => {
    const update = () => setCount(loadWaitlist().length);
    window.addEventListener(WAITLIST_EVENT, update);

    return () => window.removeEventListener(WAITLIST_EVENT, update);
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (!/.+@.+\..+/.test(cleanEmail)) {
      setStatus("error");
      return;
    }

    saveWaitlistEntry({
      email: cleanEmail,
      name: cleanName,
      role,
      ts: Date.now(),
    });

    setStatus("ok");
  }

  return (
    <form onSubmit={onSubmit} className="co2-waitlist-card">
      <div className="co2-waitlist-card__head">
        <div>
          <span>Waitlist</span>
          <h3>Get early access.</h3>
          <p>Early build access, private updates, and short onboarding when saved workspaces open.</p>
        </div>

        <div className="co2-count-pill">{count} saved</div>
      </div>

      <div className="co2-form-grid">
        <label>
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
        </label>

        <label>
          <span>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@domain.com"
            inputMode="email"
          />
        </label>

        <label>
          <span>Profile</span>
          <select value={role} onChange={(event) => setRole(event.target.value as WaitlistRole)}>
            <option value="creator">Creator</option>
            <option value="studio">Studio</option>
            <option value="agency">Agency</option>
            <option value="investor">Investor</option>
          </select>
        </label>
      </div>

      <div className="co2-form-actions">
        <button type="submit">Join waitlist</button>

        {admin ? (
          <button type="button" onClick={() => downloadWaitlistCsv(loadWaitlist())}>
            Export CSV
          </button>
        ) : null}

        {status === "ok" ? <span>Added. Stored locally for now.</span> : null}
        {status === "error" ? <span className="co2-error">Enter a valid email.</span> : null}
      </div>
    </form>
  );
}

export default function Marketing() {
  const reducedMotion = useReducedMotion();
  useRevealOnScroll(reducedMotion);

  return (
    <main className="co2-page">
      <AtmosphericBackdrop variant="studio" intensity="medium" />

      <header className="co2-nav">
        <div className={`${WIDE_SHELL} co2-nav__inner`}>
          <button type="button" className="co2-nav__brand" onClick={() => scrollToSection("top", reducedMotion)}>
            <LogoMark />
            <span>CreatorOps</span>
          </button>

          <nav aria-label="Landing navigation">
            <button type="button" onClick={() => scrollToSection("workflow", reducedMotion)}>
              Workflow
            </button>
            <button type="button" onClick={() => scrollToSection("packs", reducedMotion)}>
              Packs
            </button>
            <button type="button" onClick={() => scrollToSection("pricing", reducedMotion)}>
              Pricing
            </button>
          </nav>

          <Link to="/prototype/library">Open workspace</Link>
        </div>
      </header>

      <section id="top" className={`${WIDE_SHELL} co2-hero`}>
        <div className="co2-hero__copy">
          <div className="co2-hero__signal co2-reveal co2-reveal-delay-1" data-reveal>
            <LogoMark large />
            <span>Export-first SaaS workspace</span>
          </div>

          <h1 className="co2-reveal co2-reveal-delay-2" data-reveal>
            Turn scattered visuals into a ready-to-publish Week Pack.
          </h1>

          <p className="co2-reveal co2-reveal-delay-3" data-reveal>
            A desktop-first workspace for Smart Mix, planning, captions, export, client review, and profile handoff
            before publishing.
          </p>

          <div className="co2-status-row co2-reveal co2-reveal-delay-4" data-reveal>
            <span>Desktop workspace alpha</span>
            <span>Responsive public review surfaces</span>
            <span>Mobile workspace polish later</span>
          </div>

          <div className="co2-actions co2-reveal co2-reveal-delay-5" data-reveal>
            <Link to="/prototype/library">Open workspace</Link>
            <button type="button" disabled aria-disabled="true">
              View product story
            </button>
          </div>

          <div className="co2-pill-row co2-reveal co2-reveal-delay-6" data-reveal>
            <Pill>9-post Week Pack</Pill>
            <Pill>18-post Extended Pack</Pill>
            <Pill>ZIP + captions + CSV</Pill>
            <Pill>Client Review</Pill>
            <Pill>Profile Handoff</Pill>
          </div>
        </div>

        <div className="co2-reveal co2-reveal-delay-4" data-reveal>
          <HeroVisual />
        </div>
      </section>

      <section id="evidence" className={`${WIDE_SHELL} co2-section co2-section--evidence co2-reveal`} data-reveal>
        <SectionHeader
          eyebrow="Product evidence"
          title="A real workspace, not another content calendar promise."
          copy="CreatorOps already supports the export-first loop: selected visuals, Smart Mix, planning board, captions, ZIP export, and optional handoffs."
        />

        <div className="co2-reveal-group">
          <ProductEvidence />
        </div>
      </section>

      <section id="workflow" className={`${WIDE_SHELL} co2-section co2-split-section co2-reveal`} data-reveal>
        <SectionHeader
          eyebrow="Workflow"
          title="The product is the path from asset chaos to one clean output."
          copy="CreatorOps stays upstream of publishing. It does not try to become another noisy scheduler; it prepares the package that leaves the workspace."
        />

        <div className="co2-workflow-list co2-reveal-group">
          {WORKFLOW.map(([title, text], index) => (
            <div key={title} className="co2-workflow-row">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="packs" className={`${WIDE_SHELL} co2-section co2-reveal`} data-reveal>
        <SectionHeader
          eyebrow="Week Pack / Extended Pack"
          title="One-week focus or two-week horizon."
          copy="Extended Pack is not a bigger grid. It is the same calm workflow with more breathing room across Week 1 and Week 2."
        />

        <div className="co2-pack-grid co2-reveal-group">
          <article className="co2-pack-card">
            <div className="co2-pack-card__meta">
              <span>9 posts</span>
              <em>one-week focus</em>
            </div>

            <h3>Week Pack</h3>
            <WeekGrid />

            <p>A focused one-week pack: visual rhythm, captions, ZIP export, and profile handoff.</p>
          </article>

          <ExtendedPackPhonePreview />
        </div>
      </section>

      <section id="outputs" className={`${WIDE_SHELL} co2-section co2-reveal`} data-reveal>
        <SectionHeader
          eyebrow="Output layer"
          title="The result is not a screen. It is a deliverable."
          copy="Each output tool is optional. The core workflow remains simple: prepare the pack, download it, then use the handoff surface you need."
        />

        <div className="co2-output-grid co2-reveal-group">
          {OUTPUTS.map((item) => (
            <article key={item.title} className="co2-output-card">
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={`${WIDE_SHELL} co2-section co2-reveal`} data-reveal>
        <div className="co2-pricing-head">
          <SectionHeader
            eyebrow="Pricing preview"
            title="Simple plans for the first release."
            copy="Billing is not live yet. These plans show the intended SaaS path while the workspace remains open for testing."
          />
        </div>

        <div className="co2-plan-grid co2-reveal-group">
          {PLANS.map((plan) => (
            <article key={plan.title} className={plan.featured ? "co2-plan-card co2-plan-card--featured" : "co2-plan-card"}>
              <div>
                <span>{plan.title}</span>
                <h3>{plan.price}</h3>
                <p>{plan.note}</p>
              </div>

              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <a href={plan.href}>{plan.cta}</a>
            </article>
          ))}
        </div>
      </section>

      <section id="trust" className={`${WIDE_SHELL} co2-section co2-reveal`} data-reveal>
        <div className="co2-trust-card">
          <SectionHeader
            eyebrow="Trust / SaaS path"
            title="Built for a safer account-based product later."
            copy="The current workspace is desktop-first, keeps API secrets out of the browser, and stays export-first. Supabase, Stripe, and official Instagram Graph API publishing belong to later product stages."
          />

          <div className="co2-trust-list">
            <span>Server-side AI endpoint prepared</span>
            <span>No API keys in frontend</span>
            <span>Export-first workflow</span>
            <span>Supabase Auth + Storage planned</span>
            <span>Stripe billing path planned</span>
            <span>Instagram V2 via Graph API only</span>
          </div>
        </div>
      </section>

      <section id="roadmap" className={`${WIDE_SHELL} co2-section co2-reveal`} data-reveal>
        <SectionHeader eyebrow="Roadmap" title="Now, next, later." />

        <div className="co2-roadmap-grid co2-reveal-group">
          {ROADMAP.map((group) => (
            <article key={group.title} className="co2-roadmap-card">
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className={`${WIDE_SHELL} co2-section co2-reveal`} data-reveal>
        <SectionHeader eyebrow="FAQ" title="Positioned clearly before backend." />

        <div className="co2-faq-list co2-reveal-group">
          {FAQ.map((item) => (
            <article key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="waitlist" className={`${WIDE_SHELL} co2-section co2-waitlist-section co2-reveal`} data-reveal>
        <div className="co2-waitlist-copy">
          <div className="co2-eyebrow">Next</div>
          <h2 className="co2-section-title mt-4">Join the account-based release.</h2>
          <p className="co2-section-copy mt-5">
            Early access is for testing saved Week Packs, live AI captions, pricing plans, and workspace dashboard.
          </p>
        </div>

        <WaitlistForm />
      </section>

      <footer className={`${WIDE_SHELL} co2-footer co2-reveal`} data-reveal>
        <div className="co2-footer__top">
          <div className="co2-footer__brand">
            <div className="co2-footer__mark">
              <LogoMark />
              <span>CreatorOps</span>
            </div>
            <p>Export-first Week Pack workspace for creators and small studios.</p>
          </div>

          <nav className="co2-footer__nav" aria-label="Footer navigation">
            <div>
              <span>Product</span>
              <Link to="/prototype/library">Workspace</Link>
              <Link to="/story">Story</Link>
              <a href="#pricing">Pricing</a>
              <a href="#roadmap">Roadmap</a>
            </div>

            <div>
              <span>Status</span>
              <p>Desktop workspace alpha</p>
              <p>Export-first workflow</p>
              <p>Instagram publishing V2 later</p>
              <p>Supabase accounts planned</p>
            </div>

            <div>
              <span>Access</span>
              <Link className="co2-footer__cta" to="/prototype/library">
                Open workspace
              </Link>
              <p className="co2-footer__planned">Privacy / Terms planned for SaaS release</p>
              <p className="co2-footer__planned">Contact planned</p>
            </div>
          </nav>
        </div>

        <div className="co2-footer__bottom">
          <span>
            © 2026 CreatorOps /{" "}
            <a href="https://brenychstudio.com/" target="_blank" rel="noreferrer">
              Brenych Studio
            </a>
          </span>
          <span>Export-first now. Account-based SaaS later.</span>
        </div>
      </footer>
    </main>
  );
}
