import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";

const DEMO_GRID = [
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

type ToneKey = "clear" | "warm" | "premium";
type CtaGoalKey = "dm" | "book" | "join" | "browse";

type FormState = {
  displayName: string;
  handle: string;
  category: string;
  niche: string;
  audience: string;
  offer: string;
  proof: string;
  tone: ToneKey;
  ctaGoal: CtaGoalKey;
  linkLabel: string;
  linkUrl: string;
};

type BioVariant = {
  key: string;
  label: string;
  summary: string;
  lines: string[];
};

const INITIAL_FORM: FormState = {
  displayName: "Your Name / Brand",
  handle: "yourhandle",
  category: "Creator / Studio / Category",
  niche: "Content strategy",
  audience: "creators and small brands",
  offer: "turn content chaos into a calm publishing system",
  proof: "Strategy-first thinking. Premium execution.",
  tone: "clear",
  ctaGoal: "dm",
  linkLabel: "link-in-bio",
  linkUrl: "yourbrand.com",
};

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function clip(value: string, max: number) {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function titleCase(value: string) {
  return clean(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sentence(value: string) {
  const text = clean(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ctaText(goal: CtaGoalKey) {
  switch (goal) {
    case "book":
      return "Book a call ↓";
    case "join":
      return "Join the waitlist ↓";
    case "browse":
      return "Explore the work ↓";
    case "dm":
    default:
      return "DM to start ↓";
  }
}

function buildBioVariants(form: FormState): BioVariant[] {
  const niche = titleCase(form.niche || "Content systems");
  const audience = clean(form.audience || "creators");
  const offer = sentence(form.offer || "turn content chaos into a calm publishing system");
  const proof = sentence(form.proof || "Calm systems. Better publishing rhythm.");
  const category = titleCase(form.category || "Creator / Studio");
  const cta = ctaText(form.ctaGoal);

  const clearLines = [
    clip(`${niche} for ${audience}`, 38),
    clip(offer, 46),
    clip(proof, 34),
    clip(cta, 24),
  ].filter(Boolean);

  const warmLines = [
    clip(`Helping ${audience} ${clean(form.offer || "ship better content").toLowerCase()}`, 46),
    clip(proof, 36),
    clip(cta, 24),
  ].filter(Boolean);

  const premiumLines = [
    clip(category, 32),
    clip(`${niche}. ${offer}`, 46),
    clip(cta, 24),
  ].filter(Boolean);

  if (form.tone === "warm") {
    return [
      { key: "warm", label: "Warm", summary: "Human, approachable, creator-led", lines: warmLines },
      { key: "clear", label: "Clear", summary: "Direct and easy to scan", lines: clearLines },
      { key: "premium", label: "Premium", summary: "Refined and concise", lines: premiumLines },
    ];
  }

  if (form.tone === "premium") {
    return [
      { key: "premium", label: "Premium", summary: "Refined, concise, brand-forward", lines: premiumLines },
      { key: "clear", label: "Clear", summary: "Direct and structured", lines: clearLines },
      { key: "warm", label: "Warm", summary: "Softer and more personal", lines: warmLines },
    ];
  }

  return [
    { key: "clear", label: "Clear", summary: "Direct, structured, easy to scan", lines: clearLines },
    { key: "premium", label: "Premium", summary: "Refined and brand-forward", lines: premiumLines },
    { key: "warm", label: "Warm", summary: "Softer, more personal", lines: warmLines },
  ];
}

function shortLabel(value: string, fallback: string) {
  const text = clean(value);
  if (!text) return fallback;
  const first = text.split(/[ /,-]+/).filter(Boolean)[0] ?? fallback;
  return first.length > 10 ? `${first.slice(0, 9)}…` : titleCase(first);
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildProfilePack(args: {
  form: FormState;
  activeVariant: BioVariant;
  highlights: string[];
  postsCount: number;
}) {
  const { form, activeVariant, highlights, postsCount } = args;
  const handle = form.handle.replace(/^@+/, "") || "yourhandle";
  const cta = ctaText(form.ctaGoal);

  return [
    "CreatorOps Bio Pack",
    "",
    `Display name: ${form.displayName || "Your Name / Brand"}`,
    `Handle: @${handle}`,
    `Category: ${form.category || "Creator / Studio / Category"}`,
    `Tone: ${titleCase(form.tone)}`,
    `CTA goal: ${titleCase(form.ctaGoal)}`,
    "",
    "Selected bio:",
    ...activeVariant.lines,
    "",
    `CTA line: ${cta}`,
    `Link: ${form.linkUrl || "yourbrand.com"} / ${form.linkLabel || "link-in-bio"}`,
    "",
    `Highlights: ${highlights.join(" / ")}`,
    `Posts preview count: ${postsCount}`,
    "",
    "Profile direction:",
    `Niche: ${form.niche}`,
    `Audience: ${form.audience}`,
    `Offer: ${form.offer}`,
    `Proof: ${form.proof}`,
  ].join("\n");
}

export default function BioBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const assets = usePrototypeStore((s: any) => s.assets ?? []);
  const selectedAssetIds = usePrototypeStore((s: any) => s.selectedAssetIds ?? []);
  const planner = usePrototypeStore((s: any) => s.planner ?? []);
  const getAssetById = usePrototypeStore((s: any) => s.getAssetById);
  const captions = usePrototypeStore((s: any) => s.captions ?? null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [variantIndex, setVariantIndex] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(DEMO_GRID[0]);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const captionPreview = useMemo(() => {
    const maybeCaption =
      captions?.variants?.[0] ||
      captions?.primary ||
      captions?.caption ||
      "Helping creators turn content chaos into a cleaner, calmer publishing system.";
    return String(maybeCaption);
  }, [captions]);

  const openedFromExport = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const state = location.state as any;

    return (
      params.get("source") === "export" ||
      state?.source === "export" ||
      state?.useCurrentExportPack === true
    );
  }, [location.search, location.state]);

  const weekA = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayIndex) =>
      planner.find((slot: any) => slot.dayIndex === dayIndex && slot.slotIndex === 0)?.tileId
    );
  }, [planner]);

  const usedWeekA = useMemo(() => new Set(weekA.filter(Boolean) as string[]), [weekA]);

  const suggestionIds = useMemo(() => {
    const seed = selectedAssetIds.length
      ? selectedAssetIds
      : assets.filter((asset: any) => asset.status === "ready").map((asset: any) => asset.id);

    const candidates = Array.from(
      new Set([
        ...seed,
        ...assets.filter((asset: any) => asset.status === "ready").map((asset: any) => asset.id),
      ])
    )
      .map((id) => getAssetById?.(id))
      .filter(Boolean)
      .filter((asset: any) => asset.status === "ready" && asset.ratio === "4:5")
      .filter((asset: any) => !usedWeekA.has(asset.id))
      .map((asset: any) => asset.id);

    return candidates.slice(0, 2);
  }, [assets, selectedAssetIds, getAssetById, usedWeekA]);

  const exportGridIds = useMemo(() => {
    return [...weekA, ...suggestionIds].slice(0, 9);
  }, [weekA, suggestionIds]);

  const exportGridUrls = useMemo(() => {
    return exportGridIds
      .map((id) => {
        if (!id) return null;
        const asset = getAssetById?.(id);
        return asset?.thumbUrl ?? null;
      })
      .filter(Boolean)
      .slice(0, 9) as string[];
  }, [exportGridIds, getAssetById]);

  const usingExportPack = openedFromExport && exportGridUrls.length > 0;

  const profileGrid = useMemo(() => {
    if (!usingExportPack) return DEMO_GRID;

    return [...exportGridUrls, ...DEMO_GRID].slice(0, 9);
  }, [exportGridUrls, usingExportPack]);

  const defaultAvatarUrl = profileGrid[0] ?? DEMO_GRID[0];

  const variants = useMemo(() => buildBioVariants(form), [form]);
  const activeVariant = variants[variantIndex] ?? variants[0];

  const postsCount = useMemo(() => {
    if (usingExportPack) return profileGrid.length;
    return Math.max(selectedAssetIds.length || 0, 18);
  }, [profileGrid.length, selectedAssetIds.length, usingExportPack]);

  const highlights = useMemo(
    () => [
      shortLabel(form.niche, "Start"),
      "Work",
      "Proof",
      shortLabel(form.offer, "Offer"),
      "Contact",
    ],
    [form.niche, form.offer]
  );

  const profilePackText = useMemo(
    () =>
      buildProfilePack({
        form,
        activeVariant,
        highlights,
        postsCount,
      }),
    [form, activeVariant, highlights, postsCount]
  );

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) {
        URL.revokeObjectURL(avatarObjectUrl);
      }
    };
  }, [avatarObjectUrl]);

  useEffect(() => {
    if (!usingExportPack) return;
    if (avatarObjectUrl) return;
    if (avatarUrl !== DEMO_GRID[0]) return;
    if (!defaultAvatarUrl || defaultAvatarUrl === DEMO_GRID[0]) return;

    setAvatarUrl(defaultAvatarUrl);
  }, [avatarObjectUrl, avatarUrl, defaultAvatarUrl, usingExportPack]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);

    if (avatarObjectUrl) {
      URL.revokeObjectURL(avatarObjectUrl);
    }

    setAvatarObjectUrl(nextUrl);
    setAvatarUrl(nextUrl);
  };

  const onReset = () => {
    if (avatarObjectUrl) {
      URL.revokeObjectURL(avatarObjectUrl);
    }

    setAvatarObjectUrl(null);
    setAvatarUrl(defaultAvatarUrl);
    setForm(INITIAL_FORM);
    setVariantIndex(0);
    setShowAdvanced(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const applyCoreContext = () => {
    setForm((prev) => ({
      ...prev,
      niche: prev.niche === INITIAL_FORM.niche ? "Content systems" : prev.niche,
      offer:
        prev.offer === INITIAL_FORM.offer
          ? "turn content chaos into a calmer publishing workflow"
          : prev.offer,
      proof: clip(captionPreview, 46),
    }));
  };

  return (
    <div className="space-y-5 text-[color:var(--co-text)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg text-[color:var(--co-text)]">Bio Builder</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            A profile simulator for shaping avatar, positioning, bio, and CTA as one system.
          </div>
        </div>

        <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
          MVP / Live Preview
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(380px,0.98fr)_minmax(420px,1.02fr)]">
        <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
            Builder
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[34rem]">
              <h2 className="max-w-[14ch] text-[2rem] font-semibold leading-[0.92] tracking-[-0.055em] text-[color:var(--co-text)]">
                Build a profile that matches the content.
              </h2>

              <p className="mt-3 max-w-[36ch] text-[13px] leading-6 text-[color:var(--co-muted)]">
                Fill the core fields, choose a structured bio variant, and export one clean
                profile brief.
              </p>
            </div>

            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
              Simplified pass
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]">
                  <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                </div>

                <div>
                  <div className="text-sm font-medium text-[color:var(--co-text)]">Avatar</div>
                  <div className="mt-1 text-[12px] text-[color:var(--co-muted)]">
                    Upload a profile image for the simulator preview.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable"
                >
                  Upload avatar
                </button>

                <button
                  type="button"
                  onClick={() => setAvatarUrl(defaultAvatarUrl)}
                  className="rounded-full border border-[color:var(--co-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] pressable"
                >
                  Use demo
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onAvatarSelect}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <div className="text-xs text-[color:var(--co-muted)]">Display name</div>
              <input
                value={form.displayName}
                onChange={(e) => updateField("displayName", e.target.value)}
                className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
              />
            </label>

            <label className="space-y-2">
              <div className="text-xs text-[color:var(--co-muted)]">Handle</div>
              <input
                value={form.handle}
                onChange={(e) => updateField("handle", e.target.value.replace(/^@+/, ""))}
                className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
              />
            </label>

            <label className="space-y-2">
              <div className="text-xs text-[color:var(--co-muted)]">Audience</div>
              <input
                value={form.audience}
                onChange={(e) => updateField("audience", e.target.value)}
                className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
              />
            </label>

            <label className="space-y-2">
              <div className="text-xs text-[color:var(--co-muted)]">Offer / outcome</div>
              <input
                value={form.offer}
                onChange={(e) => updateField("offer", e.target.value)}
                className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
              />
            </label>

            <label className="space-y-2">
              <div className="text-xs text-[color:var(--co-muted)]">Tone</div>
              <select
                value={form.tone}
                onChange={(e) => updateField("tone", e.target.value as ToneKey)}
                className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
              >
                <option value="clear">Clear</option>
                <option value="warm">Warm</option>
                <option value="premium">Premium</option>
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-xs text-[color:var(--co-muted)]">CTA goal</div>
              <select
                value={form.ctaGoal}
                onChange={(e) => updateField("ctaGoal", e.target.value as CtaGoalKey)}
                className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
              >
                <option value="dm">Direct message</option>
                <option value="book">Book a call</option>
                <option value="join">Join waitlist</option>
                <option value="browse">Browse work</option>
              </select>
            </label>
          </div>

          <div className="mt-3 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)]">
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left pressable"
            >
              <span>
                <span className="block text-xs text-[color:var(--co-muted)]">Advanced details</span>
                <span className="mt-1 block text-[13px] text-[color:var(--co-text)]/78">
                  Category, niche, proof line, and link metadata.
                </span>
              </span>

              <span className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                {showAdvanced ? "Hide" : "Show"}
              </span>
            </button>

            {showAdvanced && (
              <div className="grid gap-3 border-t border-[color:var(--co-border)] px-4 pb-4 pt-4 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-xs text-[color:var(--co-muted)]">Category / role</div>
                  <input
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs text-[color:var(--co-muted)]">Niche</div>
                  <input
                    value={form.niche}
                    onChange={(e) => updateField("niche", e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className="text-xs text-[color:var(--co-muted)]">Proof line</div>
                  <input
                    value={form.proof}
                    onChange={(e) => updateField("proof", e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs text-[color:var(--co-muted)]">Link label</div>
                  <input
                    value={form.linkLabel}
                    onChange={(e) => updateField("linkLabel", e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <div className="text-xs text-[color:var(--co-muted)]">Link URL</div>
                  <input
                    value={form.linkUrl}
                    onChange={(e) => updateField("linkUrl", e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-2.5 text-sm text-[color:var(--co-text)] outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[color:var(--co-muted)]">Generated bio variants</div>
                <div className="mt-1 text-[13px] leading-5 text-[color:var(--co-text)]/78">
                  Pick one structured direction for the live preview.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyCoreContext}
                  className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90 pressable"
                >
                  Use core context
                </button>

                {variants.map((variant, index) => {
                  const active = index === variantIndex;
                  return (
                    <button
                      key={variant.key}
                      type="button"
                      onClick={() => setVariantIndex(index)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-xs transition pressable",
                        "border-[color:var(--co-border)]",
                        active
                          ? "bg-[color:var(--co-surface)] text-[color:var(--co-text)]"
                          : "bg-transparent text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)]",
                      ].join(" ")}
                    >
                      {variant.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-4">
              <div className="text-[12px] text-[color:var(--co-muted)]">{activeVariant.summary}</div>
              <div className="mt-2 space-y-1 text-[13px] leading-6 text-[color:var(--co-text)]">
                {activeVariant.lines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/prototype/export")}
              className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 pressable"
            >
              Back to Export
            </button>

            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-[color:var(--co-border)] bg-transparent px-4 py-2 text-sm text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] pressable"
            >
              Reset form
            </button>

            <button
              type="button"
              onClick={() => downloadTextFile("creatorops-bio-pack.txt", profilePackText)}
              className="rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 pressable"
            >
              Download .txt
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                Profile simulator
              </div>
              <div className="mt-2 text-lg font-medium tracking-[-0.03em] text-[color:var(--co-text)]">
                Instagram-style preview
              </div>
            </div>

            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
              {usingExportPack ? "Export pack" : "Live"}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[2rem] border border-[color:var(--co-border)] bg-[#111317] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
              <div className="text-[13px] font-medium text-white/92">{form.handle || "yourhandle"}</div>
              <div className="flex items-center gap-3 text-white/70">
                <span className="text-xs">＋</span>
                <span className="text-xs">≡</span>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-[72px_1fr] items-start gap-4 sm:grid-cols-[84px_1fr]">
                <div className="h-[72px] w-[72px] overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] sm:h-[84px] sm:w-[84px]">
                  <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover opacity-95" />
                </div>

                <div className="min-w-0">
                  <div className="grid grid-cols-3 gap-3 text-center text-white/92">
                    <div>
                      <div className="text-sm font-semibold">{postsCount}</div>
                      <div className="mt-1 text-[11px] text-white/55">posts</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">12.4K</div>
                      <div className="mt-1 text-[11px] text-white/55">followers</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">321</div>
                      <div className="mt-1 text-[11px] text-white/55">following</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-[#2b2f36] px-3 py-2 text-[12px] font-medium text-white/92"
                    >
                      Follow
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 bg-[#1a1d22] px-3 py-2 text-[12px] font-medium text-white/88"
                    >
                      Message
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="text-[13px] font-medium text-white/95">{form.displayName || "Your Name / Brand"}</div>
                <div className="text-[12px] text-white/50">{form.category || "Creator / Studio / Category"}</div>

                <div className="max-w-[34ch] space-y-1 text-[13px] leading-6 text-white/82">
                  {activeVariant.lines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>

                <div className="text-[12px] text-[#8ab4ff]">
                  {form.linkUrl || "yourbrand.com"} / {form.linkLabel || "link-in-bio"}
                </div>

                <div className="inline-block rounded-full border border-white/10 bg-[#1a1d22] px-3 py-2 text-[12px] text-white/78">
                  {ctaText(form.ctaGoal)}
                </div>
              </div>

              <div className="mt-5 flex gap-4 overflow-x-auto pb-1">
                {highlights.map((item, index) => (
                  <div key={item} className="flex min-w-[62px] flex-col items-center gap-2">
                    <div className="h-[58px] w-[58px] overflow-hidden rounded-full border border-white/12 bg-[#191c21]">
                      <img
                        src={profileGrid[(index + 1) % profileGrid.length] ?? DEMO_GRID[(index + 1) % DEMO_GRID.length]}
                        alt={item}
                        className="h-full w-full object-cover opacity-90"
                      />
                    </div>
                    <div className="text-[11px] text-white/58">{item}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-3 border-y border-white/8 text-center">
                <div className="border-b border-white/70 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/92">
                  Posts
                </div>
                <div className="py-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Reels</div>
                <div className="py-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Tagged</div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-[2px]">
                {profileGrid.map((src, index) => (
                  <div key={`${src}-${index}`} className="aspect-square overflow-hidden bg-white/5">
                    <img
                      src={src}
                      alt={`Grid post ${index + 1}`}
                      className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-[12px] leading-6 text-[color:var(--co-muted)]">
            {usingExportPack
              ? "Using the current 3×3 export pack from CreatorOps. Adjust the profile text, then download the bio pack."
              : "Standalone mode. Fill the fields manually or use CreatorOps context when available."}
          </div>
        </div>
      </div>
    </div>
  );
}
