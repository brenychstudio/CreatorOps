import { type ChangeEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../../store/prototypeStore";

const STARTER_GRID = [
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
type BioVariantId = "clear" | "premium" | "warm";

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

type ResolvedProfileState = {
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
  id: BioVariantId;
  label: string;
  description: string;
  bioLines: string[];
  ctaLine: string;
  highlights: string[];
  proofLine?: string;
};

const CTA_GOAL_LABELS: Record<CtaGoalKey, string> = {
  dm: "Direct message",
  book: "Book a call",
  join: "Join waitlist",
  browse: "Browse work",
};

const TONE_LABELS: Record<ToneKey, string> = {
  clear: "Clear",
  warm: "Warm",
  premium: "Premium",
};

const CTA_GOAL_SHORT_LABELS: Record<CtaGoalKey, string> = {
  dm: "DM",
  book: "Book",
  join: "Join",
  browse: "Browse",
};

const FORM_FIELDS: Array<keyof FormState> = [
  "displayName",
  "handle",
  "category",
  "niche",
  "audience",
  "offer",
  "proof",
  "tone",
  "ctaGoal",
  "linkLabel",
  "linkUrl",
];

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
  return `${text.slice(0, max - 3).trim()}...`;
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

function sentenceWithPeriod(value: string) {
  const text = sentence(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function shortLabel(value: string, fallback: string) {
  const text = clean(value);
  if (!text) return fallback;
  const first = text.split(/[ /,-]+/).filter(Boolean)[0] ?? fallback;
  return first.length > 10 ? `${first.slice(0, 9)}...` : titleCase(first);
}

function sanitizeFilenamePart(value: string) {
  return clean(value)
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveProfileState(form: FormState): ResolvedProfileState {
  return {
    displayName: clean(form.displayName) || INITIAL_FORM.displayName,
    handle: clean(form.handle).replace(/^@+/, "") || INITIAL_FORM.handle,
    category: clean(form.category) || INITIAL_FORM.category,
    niche: clean(form.niche) || INITIAL_FORM.niche,
    audience: clean(form.audience) || INITIAL_FORM.audience,
    offer: clean(form.offer) || INITIAL_FORM.offer,
    proof: sentence(form.proof) || sentence(INITIAL_FORM.proof),
    tone: form.tone || INITIAL_FORM.tone,
    ctaGoal: form.ctaGoal || INITIAL_FORM.ctaGoal,
    linkLabel: clean(form.linkLabel) || INITIAL_FORM.linkLabel,
    linkUrl: clean(form.linkUrl) || INITIAL_FORM.linkUrl,
  };
}

function getToneFlavor(tone: ToneKey) {
  switch (tone) {
    case "premium":
      return { edge: "polished", note: "premium polish" };
    case "warm":
      return { edge: "human", note: "warm clarity" };
    case "clear":
    default:
      return { edge: "direct", note: "clear structure" };
  }
}

function buildCtaLine(profile: ResolvedProfileState, variantId: BioVariantId) {
  const handle = `@${profile.handle}`;
  const linkLabel = shortLabel(profile.linkLabel, "Link");

  switch (profile.ctaGoal) {
    case "book":
      if (variantId === "premium") return `Book via ${linkLabel}`;
      if (variantId === "warm") return `Book a call via ${linkLabel}`;
      return "Book a call";
    case "join":
      if (variantId === "premium") return `Request access via ${linkLabel}`;
      if (variantId === "warm") return `Join via ${linkLabel}`;
      return `Join via ${linkLabel}`;
    case "browse":
      if (variantId === "premium") return `View the portfolio via ${linkLabel}`;
      if (variantId === "warm") return `Take a look via ${linkLabel}`;
      return `Browse the work via ${linkLabel}`;
    case "dm":
    default:
      if (variantId === "premium") return `Inquiries via ${handle}`;
      if (variantId === "warm") return `Send a DM to ${handle}`;
      return `DM ${handle} to start`;
  }
}

function buildBioVariants(profileState: FormState): BioVariant[] {
  const profile = resolveProfileState(profileState);
  const toneFlavor = getToneFlavor(profile.tone);
  const audienceLower = clean(profile.audience).toLowerCase();
  const offerSentence = sentenceWithPeriod(profile.offer);
  const category = titleCase(profile.category);
  const niche = titleCase(profile.niche);
  const displayName = profile.displayName;

  return [
    {
      id: "clear",
      label: "Clear",
      description: `Direct structure with a ${toneFlavor.edge} edge.`,
      bioLines: [
        `${niche} for ${audienceLower}.`,
        offerSentence,
        `${category}. ${titleCase(toneFlavor.note)}.`,
      ].filter(Boolean),
      proofLine: clip(profile.proof, 42),
      ctaLine: clip(buildCtaLine(profile, "clear"), 38),
      highlights: [
        shortLabel(profile.niche, "Focus"),
        "Offer",
        shortLabel(profile.proof, "Proof"),
        shortLabel(profile.linkLabel, "Start"),
      ],
    },
    {
      id: "premium",
      label: "Premium",
      description: `Refined positioning with ${toneFlavor.note}.`,
      bioLines: [
        `${category}.`,
        `${niche}. ${offerSentence}`,
        `Built for ${audienceLower}.`,
      ].filter(Boolean),
      proofLine: clip(profile.proof, 42),
      ctaLine: clip(buildCtaLine(profile, "premium"), 38),
      highlights: [
        shortLabel(profile.category, "Studio"),
        shortLabel(profile.niche, "Work"),
        "Proof",
        shortLabel(profile.linkLabel, "Access"),
      ],
    },
    {
      id: "warm",
      label: "Warm",
      description: `Human-led profile language with ${toneFlavor.note}.`,
      bioLines: [
        `Helping ${audienceLower}.`,
        offerSentence,
        `Built by ${displayName}.`,
      ].filter(Boolean),
      proofLine: clip(profile.proof, 42),
      ctaLine: clip(buildCtaLine(profile, "warm"), 38),
      highlights: [
        shortLabel(profile.audience, "People"),
        "Story",
        shortLabel(profile.offer, "Offer"),
        shortLabel(profile.linkLabel, "Start"),
      ],
    },
  ];
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

async function copyTextToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to execCommand fallback.
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

function formsMatch(a: FormState, b: FormState) {
  return FORM_FIELDS.every((field) => a[field] === b[field]);
}

function buildProfilePack(args: {
  profile: ResolvedProfileState;
  activeVariant: BioVariant;
  gridSourceLabel: string;
}) {
  const { profile, activeVariant, gridSourceLabel } = args;

  return [
    "CreatorOps Bio Pack",
    "",
    "Profile",
    `Display name: ${profile.displayName}`,
    `Handle: @${profile.handle}`,
    `Category: ${profile.category}`,
    `Niche: ${profile.niche}`,
    `Audience: ${profile.audience}`,
    `Offer / outcome: ${profile.offer}`,
    `Tone: ${titleCase(profile.tone)}`,
    `CTA goal: ${CTA_GOAL_LABELS[profile.ctaGoal]}`,
    "",
    `Selected variant: ${activeVariant.label}`,
    "",
    "Bio",
    ...activeVariant.bioLines,
    ...(activeVariant.proofLine ? [activeVariant.proofLine] : []),
    "",
    "CTA",
    activeVariant.ctaLine,
    "",
    "Highlights",
    ...activeVariant.highlights.map((item) => `- ${item}`),
    "",
    "Link",
    `Label: ${profile.linkLabel}`,
    `URL: ${profile.linkUrl}`,
    "",
    "Profile grid source",
    gridSourceLabel,
    "",
    "Notes",
    "Draft structure prepared inside CreatorOps Profile Handoff.",
    "Draft structure ready for the current Week Pack.",
  ].join("\n");
}

export default function BioBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gridInputRef = useRef<HTMLInputElement | null>(null);
  const phoneScrollRef = useRef<HTMLDivElement | null>(null);
  const phoneDragRef = useRef({
    pointerId: -1,
    startY: 0,
    scrollTop: 0,
    dragging: false,
  });

  const assets = usePrototypeStore((s: any) => s.assets ?? []);
  const selectedAssetIds = usePrototypeStore((s: any) => s.selectedAssetIds ?? []);
  const planner = usePrototypeStore((s: any) => s.planner ?? []);
  const getAssetById = usePrototypeStore((s: any) => s.getAssetById);
  const captions = usePrototypeStore((s: any) => s.captions ?? null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [generatedForm, setGeneratedForm] = useState<FormState>(INITIAL_FORM);
  const [activeVariantId, setActiveVariantId] = useState<BioVariantId>("clear");
  const [avatarUrl, setAvatarUrl] = useState(STARTER_GRID[0]);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [uploadedGridUrls, setUploadedGridUrls] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionStatus, setActionStatus] = useState("Bio Pack ready");

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

  const usingUploadedGrid = uploadedGridUrls.length > 0;
  const hasConnectedExportPack = openedFromExport && exportGridUrls.length > 0;
  const usingExportPack = hasConnectedExportPack && !usingUploadedGrid;

  const profileGrid = useMemo(() => {
    if (usingUploadedGrid) {
      return [...uploadedGridUrls, ...STARTER_GRID].slice(0, 9);
    }

    if (usingExportPack) {
      return [...exportGridUrls, ...STARTER_GRID].slice(0, 9);
    }

    return STARTER_GRID;
  }, [exportGridUrls, uploadedGridUrls, usingExportPack, usingUploadedGrid]);

  const defaultAvatarUrl = profileGrid[0] ?? STARTER_GRID[0];
  const gridSourceLabel = usingUploadedGrid ? "Uploaded grid" : usingExportPack ? "Week Pack 01" : "Starter grid";
  const avatarSourceLabel = usingExportPack ? "Use pack image" : usingUploadedGrid ? "Use source" : "Use starter";
  const profilePreviewNote = usingUploadedGrid
    ? "Using the uploaded grid for this profile preview."
    : usingExportPack
      ? "Using the current Week Pack from CreatorOps."
      : "Starter grid active. Start from Library to use a Week Pack.";
  const profileGridNote = usingUploadedGrid
    ? "Uploaded images are driving this preview."
    : usingExportPack
      ? "Using exported grid order."
      : "Starter grid active. Start from Library to use a Week Pack.";

  const generatedVariants = useMemo(() => buildBioVariants(generatedForm), [generatedForm]);
  const activeVariant =
    generatedVariants.find((variant) => variant.id === activeVariantId) ?? generatedVariants[0];
  const generatedProfile = useMemo(() => resolveProfileState(generatedForm), [generatedForm]);
  const hasUngeneratedChanges = useMemo(() => !formsMatch(form, generatedForm), [form, generatedForm]);

  const postsCount = useMemo(() => {
    if (usingUploadedGrid || usingExportPack) return profileGrid.length;
    return Math.max(selectedAssetIds.length || 0, 18);
  }, [profileGrid.length, selectedAssetIds.length, usingExportPack, usingUploadedGrid]);

  const profilePackText = useMemo(
    () =>
      buildProfilePack({
        profile: generatedProfile,
        activeVariant,
        gridSourceLabel,
      }),
    [generatedProfile, activeVariant, gridSourceLabel]
  );

  const bioCopyText = useMemo(() => {
    return [...activeVariant.bioLines, activeVariant.proofLine].filter(Boolean).join("\n");
  }, [activeVariant.bioLines, activeVariant.proofLine]);

  const profilePackFilename = useMemo(() => {
    const safeHandle = sanitizeFilenamePart(generatedProfile.handle);
    const safeName = sanitizeFilenamePart(generatedProfile.displayName);
    const handleIsCustom = safeHandle && safeHandle !== sanitizeFilenamePart(INITIAL_FORM.handle);
    const nameIsCustom = safeName && safeName !== sanitizeFilenamePart(INITIAL_FORM.displayName);
    const suffix = handleIsCustom ? safeHandle : nameIsCustom ? safeName : "";
    return suffix ? `creatorops-bio-pack-${suffix}.txt` : "creatorops-bio-pack.txt";
  }, [generatedProfile.displayName, generatedProfile.handle]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) {
        URL.revokeObjectURL(avatarObjectUrl);
      }
    };
  }, [avatarObjectUrl]);

  useEffect(() => {
    return () => {
      uploadedGridUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadedGridUrls]);

  useEffect(() => {
    if (!usingExportPack && !usingUploadedGrid) return;
    if (avatarObjectUrl) return;
    if (!defaultAvatarUrl || avatarUrl === defaultAvatarUrl) return;
    setAvatarUrl(defaultAvatarUrl);
  }, [avatarObjectUrl, avatarUrl, defaultAvatarUrl, usingExportPack, usingUploadedGrid]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetAvatarToSource = () => {
    setAvatarObjectUrl(null);
    setAvatarUrl(defaultAvatarUrl);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setAvatarObjectUrl(nextUrl);
    setAvatarUrl(nextUrl);
  };

  const onGridSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024)
      .slice(0, 9);

    if (!files.length) return;

    const nextUrls = files.map((file) => URL.createObjectURL(file));
    setUploadedGridUrls(nextUrls);

    if (!avatarObjectUrl && nextUrls[0]) {
      setAvatarUrl(nextUrls[0]);
    }

    if (gridInputRef.current) {
      gridInputRef.current.value = "";
    }
  };

  const clearUploadedGrid = () => {
    setUploadedGridUrls([]);

    if (!avatarObjectUrl) {
      setAvatarUrl(hasConnectedExportPack ? exportGridUrls[0] ?? STARTER_GRID[0] : STARTER_GRID[0]);
    }

    if (gridInputRef.current) {
      gridInputRef.current.value = "";
    }
  };

  const onReset = () => {
    setAvatarObjectUrl(null);
    setUploadedGridUrls([]);
    setAvatarUrl(hasConnectedExportPack ? exportGridUrls[0] ?? STARTER_GRID[0] : STARTER_GRID[0]);
    setForm(INITIAL_FORM);
    setGeneratedForm(INITIAL_FORM);
    setActiveVariantId("clear");
    setShowAdvanced(false);
    setActionStatus("Bio Pack ready");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (gridInputRef.current) {
      gridInputRef.current.value = "";
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
      proof: clip(captionPreview, 54),
    }));
  };

  const onGenerateVariants = () => {
    setGeneratedForm({ ...form });
    setActionStatus("Bio Pack ready");
  };

  const onCopyBio = async () => {
    const copied = await copyTextToClipboard(bioCopyText);
    setActionStatus(copied ? "Bio copied" : "Copy unavailable");
  };

  const onCopyCta = async () => {
    const copied = await copyTextToClipboard(activeVariant.ctaLine);
    setActionStatus(copied ? "CTA copied" : "Copy unavailable");
  };

  const onPhonePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;

    phoneDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: event.currentTarget.scrollTop,
      dragging: true,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPhonePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = phoneDragRef.current;
    if (!drag.dragging || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollTop = drag.scrollTop + drag.startY - event.clientY;
  };

  const endPhoneDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = phoneDragRef.current;
    if (drag.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    phoneDragRef.current = {
      pointerId: -1,
      startY: 0,
      scrollTop: 0,
      dragging: false,
    };
  };

  return (
    <div className="co-workspace-page co-scene co-profile-studio">
      <div className="co-scene-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base text-[color:var(--co-text)]">Bio Builder</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Profile handoff studio for aligning avatar, positioning, bio, and CTA.
          </div>
        </div>

        <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
          Profile Handoff
        </div>
      </div>

      <div className="co-bio-workbench">
        <div className="co-bio-builder-panel co-stage-card min-h-0 min-w-0 rounded-2xl">
          <div className="co-bio-tool-header">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                Builder
              </div>
              <h2 className="mt-1 text-xl font-semibold leading-tight text-[color:var(--co-text)]">
                Profile setup
              </h2>
            </div>

            <div
              className={[
                "co-bio-status-pill",
                hasUngeneratedChanges ? "co-bio-status-pill--warning" : "",
              ].join(" ")}
            >
              {hasUngeneratedChanges ? "Needs generate" : "Preview synced"}
            </div>
          </div>

          <div className="co-bio-section co-bio-identity-card">
            <div className="co-bio-avatar-compact">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]">
                <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="co-bio-section-kicker">01 Identity</div>
                <div className="co-bio-section-title">Avatar and handle</div>
                <div className="co-bio-mini-actions">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="pressable">
                    Upload
                  </button>
                  <button type="button" onClick={resetAvatarToSource} className="pressable">
                    {avatarSourceLabel}
                  </button>
                </div>
              </div>
            </div>

            <div className="co-bio-core-fields co-bio-core-fields--identity grid gap-3 md:grid-cols-2">
              <label className="co-bio-field">
                <span>Display name</span>
                <input
                  value={form.displayName}
                  onChange={(e) => updateField("displayName", e.target.value)}
                  className="co-bio-input"
                />
              </label>

              <label className="co-bio-field">
                <span>Handle</span>
                <input
                  value={form.handle}
                  onChange={(e) => updateField("handle", e.target.value.replace(/^@+/, ""))}
                  className="co-bio-input"
                />
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onAvatarSelect}
            />
          </div>

          <div className="co-bio-section">
            <div className="co-bio-section-head">
              <div>
                <div className="co-bio-section-kicker">02 Positioning</div>
                <div className="co-bio-section-title">Who it is for, what it does</div>
              </div>
              <button type="button" onClick={applyCoreContext} className="co-bio-quiet-button pressable">
                Use context
              </button>
            </div>

            <div className="co-bio-core-fields grid gap-3 md:grid-cols-2">
              <label className="co-bio-field">
                <span>Audience</span>
                <input
                  value={form.audience}
                  onChange={(e) => updateField("audience", e.target.value)}
                  className="co-bio-input"
                />
              </label>

              <label className="co-bio-field">
                <span>Offer</span>
                <input
                  value={form.offer}
                  onChange={(e) => updateField("offer", e.target.value)}
                  className="co-bio-input"
                />
              </label>
            </div>
          </div>

          <div className="co-bio-section co-bio-controls-section">
            <div>
              <div className="co-bio-section-kicker">03 Voice</div>
              <div className="co-bio-segmented" role="group" aria-label="Tone">
                {(["clear", "warm", "premium"] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    aria-pressed={form.tone === tone}
                    onClick={() => updateField("tone", tone)}
                    className={[
                      "co-bio-chip pressable",
                      form.tone === tone ? "co-bio-chip--active" : "",
                    ].join(" ")}
                  >
                    {TONE_LABELS[tone]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="co-bio-section-kicker">CTA goal</div>
              <div className="co-bio-segmented" role="group" aria-label="CTA goal">
                {(["dm", "book", "join", "browse"] as const).map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    aria-pressed={form.ctaGoal === goal}
                    onClick={() => updateField("ctaGoal", goal)}
                    className={[
                      "co-bio-chip pressable",
                      form.ctaGoal === goal ? "co-bio-chip--active" : "",
                    ].join(" ")}
                  >
                    {CTA_GOAL_SHORT_LABELS[goal]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="co-bio-advanced-card">
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="co-bio-advanced-toggle pressable"
            >
              <span>Advanced fields</span>
              <span>{showAdvanced ? "Hide" : "Show"}</span>
            </button>

            {showAdvanced && (
              <div className="co-bio-advanced-fields grid gap-3 md:grid-cols-2">
                <label className="co-bio-field">
                  <span>Category</span>
                  <input
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="co-bio-input"
                  />
                </label>

                <label className="co-bio-field">
                  <span>Niche</span>
                  <input
                    value={form.niche}
                    onChange={(e) => updateField("niche", e.target.value)}
                    className="co-bio-input"
                  />
                </label>

                <label className="co-bio-field md:col-span-2">
                  <span>Proof line</span>
                  <input
                    value={form.proof}
                    onChange={(e) => updateField("proof", e.target.value)}
                    className="co-bio-input"
                  />
                </label>

                <label className="co-bio-field">
                  <span>Link label</span>
                  <input
                    value={form.linkLabel}
                    onChange={(e) => updateField("linkLabel", e.target.value)}
                    className="co-bio-input"
                  />
                </label>

                <label className="co-bio-field">
                  <span>Website</span>
                  <input
                    value={form.linkUrl}
                    onChange={(e) => updateField("linkUrl", e.target.value)}
                    className="co-bio-input"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="co-bio-section co-bio-variants-card">
            <div className="co-bio-section-head">
              <div>
                <div className="co-bio-section-kicker">04 Bio variant</div>
                <div className="co-bio-section-title">{activeVariant.label}</div>
              </div>
              <button type="button" onClick={onGenerateVariants} className="co-bio-generate-button pressable">
                Generate
              </button>
            </div>

            <div className="co-bio-segmented co-bio-variant-tabs" role="group" aria-label="Bio variants">
              {generatedVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={variant.id === activeVariant.id}
                  onClick={() => setActiveVariantId(variant.id)}
                  className={[
                    "co-bio-chip pressable",
                    variant.id === activeVariant.id ? "co-bio-chip--active" : "",
                  ].join(" ")}
                >
                  {variant.label}
                </button>
              ))}
            </div>

            <div className="co-bio-result-card">
              <div className="co-bio-result-head">
                <span>Bio draft</span>
                <span>{activeVariant.label} direction</span>
              </div>
              <div className="co-bio-result-lines">
                {activeVariant.bioLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
                {activeVariant.proofLine ? <div>{activeVariant.proofLine}</div> : null}
              </div>
              <div className="co-bio-result-link">
                {generatedProfile.linkLabel} / {generatedProfile.linkUrl}
              </div>
            </div>
          </div>

          <div className="co-bio-tool-actions">
            <button type="button" onClick={onCopyBio} className="co-bio-quiet-button pressable">
              Copy bio
            </button>
            <button type="button" onClick={onCopyCta} className="co-bio-quiet-button pressable">
              Copy CTA
            </button>
            <button
              type="button"
              onClick={() => downloadTextFile(profilePackFilename, profilePackText)}
              className="co-bio-download-button pressable"
            >
              Download Bio Pack
            </button>
          </div>

          <div className="co-bio-footer-actions">
            <div>{actionStatus}</div>
            <button
              type="button"
              onClick={() =>
                hasConnectedExportPack ? navigate("/prototype/export") : navigate("/prototype/library")
              }
              className="pressable"
            >
              {hasConnectedExportPack ? "Back to Export" : "Start from Library"}
            </button>
            <button type="button" onClick={onReset} className="co-bio-reset-action pressable">
              Reset draft
            </button>
          </div>
        </div>

        <div className="co-bio-preview-panel co-stage-card min-h-0 min-w-0 rounded-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                Profile Preview
              </div>
              <div className="mt-2 text-lg font-medium tracking-[-0.03em] text-[color:var(--co-text)]">
                Profile Preview
              </div>
            </div>

            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
              {gridSourceLabel}
            </div>
          </div>

          <div className="co-iphone-shell" aria-label="iPhone 17 Pro Max profile preview">
            <div className="co-iphone-island" aria-hidden="true" />
            <div className="co-iphone-screen">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
              <div className="min-w-0 truncate text-[13px] font-medium text-white/92">
                {generatedProfile.handle || "yourhandle"}
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <span className="text-xs">+</span>
                <span className="text-xs">|||</span>
              </div>
            </div>

            <div
              ref={phoneScrollRef}
              className="co-phone-profile-body co-scrollbar"
              onPointerDown={onPhonePointerDown}
              onPointerMove={onPhonePointerMove}
              onPointerUp={endPhoneDrag}
              onPointerCancel={endPhoneDrag}
              onPointerLeave={endPhoneDrag}
            >
              <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[84px_minmax(0,1fr)]">
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
                <div className="text-[13px] font-medium text-white/95">
                  {generatedProfile.displayName || "Your Name / Brand"}
                </div>
                <div className="text-[12px] text-white/50">
                  {generatedProfile.category || "Creator / Studio / Category"}
                </div>

                <div className="max-w-[32ch] space-y-1 text-[13px] leading-6 text-white/82">
                  {activeVariant.bioLines.slice(0, 2).map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>

                <div className="break-words text-[12px] text-[#8ab4ff]">
                  {generatedProfile.linkLabel} / {generatedProfile.linkUrl}
                </div>
              </div>

              <div className="mt-5 flex gap-4 overflow-x-auto pb-1">
                {activeVariant.highlights.map((item, index) => (
                  <div key={item} className="flex min-w-[62px] flex-col items-center gap-2">
                    <div className="h-[58px] w-[58px] overflow-hidden rounded-full border border-white/12 bg-[#191c21]">
                      <img
                        src={profileGrid[(index + 1) % profileGrid.length] ?? STARTER_GRID[(index + 1) % STARTER_GRID.length]}
                        alt={item}
                        className="h-full w-full object-cover opacity-90"
                      />
                    </div>
                    <div className="max-w-[64px] truncate text-[11px] text-white/58">{item}</div>
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
                  <div key={`${src}-${index}`} className="co-bio-phone-post overflow-hidden bg-white/5">
                    <img
                      src={src}
                      alt={`Grid post ${index + 1}`}
                      className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>

          <div className="co-bio-preview-note text-[12px] leading-6 text-[color:var(--co-muted)]">
            {profilePreviewNote}
          </div>

          <div className="co-bio-grid-control rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--co-muted)]">
                    Profile grid
                  </div>

                  <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2.5 py-1 text-[10px] text-[color:var(--co-muted)]">
                    {gridSourceLabel}
                  </div>
                </div>

                <p className="mt-1 max-w-[42ch] text-[12px] leading-5 text-[color:var(--co-text)]/68 sm:whitespace-nowrap">
                  {profileGridNote}
                </p>
              </div>

              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
                <button
                  type="button"
                  onClick={() => gridInputRef.current?.click()}
                  className={[
                    "flex-1 rounded-full border px-3 py-1.5 text-[12px] hover:opacity-90 pressable sm:flex-none",
                    "border-[color:var(--co-border)]",
                    usingExportPack
                      ? "bg-transparent text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)]"
                      : "bg-[color:var(--co-surface)] text-[color:var(--co-text)]",
                  ].join(" ")}
                >
                  Upload grid
                </button>

                {usingUploadedGrid ? (
                  <button
                    type="button"
                    onClick={clearUploadedGrid}
                    className="flex-1 rounded-full border border-[color:var(--co-border)] bg-transparent px-3 py-1.5 text-[12px] text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] pressable sm:flex-none"
                  >
                    Clear
                  </button>
                ) : !hasConnectedExportPack ? (
                  <button
                    type="button"
                    onClick={() => navigate("/prototype/library")}
                    className="flex-1 rounded-full border border-[color:var(--co-border)] bg-transparent px-3 py-1.5 text-[12px] text-[color:var(--co-muted)] hover:bg-[color:var(--co-surface)] pressable sm:flex-none"
                  >
                    Start from Library
                  </button>
                ) : null}
              </div>
            </div>

            <input
              ref={gridInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={onGridSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
