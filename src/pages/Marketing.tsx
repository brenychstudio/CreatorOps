import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

const SHELL = "mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8";

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

function scrollToSection(id: string, reducedMotion: boolean) {
  const target = document.getElementById(id);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
}

function LogoMark({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "co2-mark co2-mark--large" : "co2-mark"} aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <span key={index} style={{ animationDelay: `${index * 32}ms` }} />
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

function MiniGrid({ count, compact = false }: { count: 9 | 18; compact?: boolean }) {
  const items = count === 18 ? EXTENDED_THUMBS : THUMBS;

  return (
    <div className={compact ? "co2-mini-grid co2-mini-grid--compact" : "co2-mini-grid"}>
      {items.slice(0, count).map((src, index) => (
        <div className="co2-mini-tile" key={`${src}-${index}`}>
          <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
          <span>{String(index + 1).padStart(2, "0")}</span>
        </div>
      ))}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="co2-hero-visual" aria-label="CreatorOps product preview">
      <div className="co2-hero-visual__image">
        <img
          src="/creatorops/landing/bg-03-bridge.png"
          alt="CreatorOps Smart Mix preview on a mobile product surface"
          loading="eager"
          decoding="async"
          draggable={false}
        />
      </div>

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

function ProductProof() {
  return (
    <div className="co2-proof-grid">
      <div className="co2-proof-card co2-proof-card--wide">
        <div className="co2-proof-card__head">
          <div>
            <span>Live workspace</span>
            <strong>From selection to export</strong>
          </div>
          <em>current alpha</em>
        </div>

        <div className="co2-proof-flow">
          {["Library", "Smart Mix", "Planner", "Captions", "Export"].map((step, index) => (
            <div key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="co2-proof-card">
        <div className="co2-proof-card__head">
          <div>
            <span>Week Pack</span>
            <strong>9 posts</strong>
          </div>
          <em>3×3</em>
        </div>
        <MiniGrid count={9} compact />
      </div>

      <div className="co2-proof-card">
        <div className="co2-proof-card__head">
          <div>
            <span>Extended Pack</span>
            <strong>18 posts</strong>
          </div>
          <em>2 weeks</em>
        </div>
        <MiniGrid count={18} compact />
      </div>
    </div>
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

  return (
    <main className="co2-page">
      <div className="co2-atmosphere" aria-hidden="true" />

      <header className="co2-nav">
        <div className={`${SHELL} co2-nav__inner`}>
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

      <section id="top" className={`${SHELL} co2-hero`}>
        <div className="co2-hero__copy">
          <div className="co2-hero__signal">
            <LogoMark large />
            <span>Export-first SaaS workspace</span>
          </div>

          <h1>Turn scattered visuals into a ready-to-publish Week Pack.</h1>

          <p>
            Smart Mix, Planner, Captions, Export, Client Review, and Profile Handoff — one calm workspace before
            publishing.
          </p>

          <div className="co2-actions">
            <Link to="/prototype/library">Open workspace</Link>
            <Link to="/story">View product story</Link>
          </div>

          <div className="co2-pill-row">
            <Pill>9-post Week Pack</Pill>
            <Pill>18-post Extended Pack</Pill>
            <Pill>ZIP + captions + CSV</Pill>
            <Pill>Client Review</Pill>
            <Pill>Profile Handoff</Pill>
          </div>
        </div>

        <HeroVisual />
      </section>

      <section className={`${SHELL} co2-section co2-section--proof`}>
        <ProductProof />
      </section>

      <section id="workflow" className={`${SHELL} co2-section co2-split-section`}>
        <SectionHeader
          eyebrow="Workflow"
          title="The product is the path from asset chaos to one clean output."
          copy="CreatorOps stays upstream of publishing. It does not try to become another noisy scheduler; it prepares the package that leaves the workspace."
        />

        <div className="co2-workflow-list">
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

      <section id="packs" className={`${SHELL} co2-section`}>
        <SectionHeader
          eyebrow="Week Pack / Extended Pack"
          title="One-week focus or two-week horizon."
          copy="Extended Pack is not a bigger grid. It is the same calm workflow with more breathing room across Week 1 and Week 2."
        />

        <div className="co2-pack-grid">
          <article className="co2-pack-card">
            <div className="co2-pack-card__meta">
              <span>9 posts</span>
              <em>1-week pack</em>
            </div>

            <h3>Week Pack</h3>
            <MiniGrid count={9} />

            <p>A focused 3×3 publishing pack for one week: visual rhythm, captions, ZIP export, and profile handoff.</p>
          </article>

          <article className="co2-pack-card co2-pack-card--featured">
            <div className="co2-pack-card__meta">
              <span>18 posts</span>
              <em>2-week planning</em>
            </div>

            <h3>Extended Pack</h3>
            <MiniGrid count={18} />

            <p>
              A calmer two-week planning horizon: Week 1 + Week 2, extended ZIP, client review, and format handoff.
            </p>
          </article>
        </div>
      </section>

      <section id="outputs" className={`${SHELL} co2-section`}>
        <SectionHeader
          eyebrow="Output layer"
          title="The result is not a screen. It is a deliverable."
          copy="Each output tool is optional. The core workflow remains simple: prepare the pack, download it, then use the handoff surface you need."
        />

        <div className="co2-output-grid">
          {OUTPUTS.map((item) => (
            <article key={item.title} className="co2-output-card">
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={`${SHELL} co2-section`}>
        <div className="co2-pricing-head">
          <SectionHeader
            eyebrow="Pricing preview"
            title="Simple plans for the first release."
            copy="Billing is not live yet. These plans show the intended SaaS path while the workspace remains open for testing."
          />
        </div>

        <div className="co2-plan-grid">
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

      <section id="trust" className={`${SHELL} co2-section`}>
        <div className="co2-trust-card">
          <SectionHeader
            eyebrow="Trust / SaaS path"
            title="Built for a safer account-based product later."
            copy="The current workspace keeps API secrets out of the browser and stays export-first. Supabase, Stripe, and official Instagram Graph API publishing belong to later product stages."
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

      <section id="roadmap" className={`${SHELL} co2-section`}>
        <SectionHeader eyebrow="Roadmap" title="Now, next, later." />

        <div className="co2-roadmap-grid">
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

      <section id="faq" className={`${SHELL} co2-section`}>
        <SectionHeader eyebrow="FAQ" title="Positioned clearly before backend." />

        <div className="co2-faq-list">
          {FAQ.map((item) => (
            <article key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="waitlist" className={`${SHELL} co2-section co2-waitlist-section`}>
        <div>
          <div className="co2-eyebrow">Next</div>
          <h2 className="co2-section-title mt-4">Join the account-based release.</h2>
          <p className="co2-section-copy mt-5">
            Early access is for testing saved Week Packs, live AI captions, pricing plans, and workspace dashboard.
          </p>
        </div>

        <WaitlistForm />
      </section>

      <footer className={`${SHELL} co2-footer`}>
        <span>CreatorOps</span>
        <span>Export-first Week Pack workspace.</span>
        <Link to="/prototype/library">Open workspace</Link>
      </footer>
    </main>
  );
}
