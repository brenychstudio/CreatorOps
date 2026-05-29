// src/pages/prototype/Captions.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowEmptyState from "../../components/prototype/FlowEmptyState";
import { usePrototypeStore } from "../../store/prototypeStore";

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function slotLabel(dayIndex: number) {
  return dayIndex < DAYS.length ? DAYS[dayIndex] : "Next";
}

function normalizeHashtags(input: string) {
  return input
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => {
      const clean = tag.replace(/^#+/, "");
      return clean ? `#${clean}` : "";
    })
    .filter(Boolean)
    .slice(0, 10);
}

function normalizePostCopy(value: string, postNumber: number) {
  return value.replace(/\bPost #\d+\b/g, `Post #${postNumber}`);
}

export default function Captions() {
  const navigate = useNavigate();
  const pressable = "transition active:translate-y-[1px] active:scale-[0.98]";

  const planner = usePrototypeStore((s) => s.planner);
  const captions = usePrototypeStore((s) => s.captions);
  const ai = usePrototypeStore((s) => s.ai);

  const getAssetById = usePrototypeStore((s) => s.getAssetById);
  const generateCaptions = usePrototypeStore((s) => s.generateCaptions);
  const setGeneratedCaption = usePrototypeStore((s) => s.setGeneratedCaption);
  const setAiPrompt = usePrototypeStore((s) => s.setAiPrompt);

  const [activeDay, setActiveDay] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<"local" | "openai" | "fallback">(
    captions.source ?? "local"
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [editableCaption, setEditableCaption] = useState(captions.variants[0] ?? "");
  const [editableCta, setEditableCta] = useState(captions.cta ?? "");
  const [editableTags, setEditableTags] = useState(captions.hashtags.join(" "));

  const packTiles = useMemo(() => {
    return Array.from({ length: 9 }, (_, dayIndex) => {
      const tileId = planner.find((p) => p.dayIndex === dayIndex && p.slotIndex === 0)?.tileId;
      const asset = tileId ? getAssetById(tileId) : undefined;
      return { dayIndex, tileId, asset };
    });
  }, [planner, getAssetById]);

  const hasWeekPlan = packTiles.some((d) => Boolean(d.tileId));
  const plannedPosts = useMemo(() => packTiles.filter((d) => d.tileId && d.asset), [packTiles]);

  useEffect(() => {
    const firstWithTile = packTiles.find((d) => !!d.tileId)?.dayIndex ?? 0;
    setActiveDay((prev) => {
      if (packTiles.some((d) => d.dayIndex === prev && d.tileId)) return prev;
      return firstWithTile;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packTiles.map((d) => d.tileId).join("|")]);

  const activePostIndex = Math.max(0, plannedPosts.findIndex((d) => d.dayIndex === activeDay));
  const active = packTiles.find((d) => d.dayIndex === activeDay);
  const activePostNumber = activePostIndex + 1;
  const activeSlotLabel = slotLabel(activeDay);
  const anchor = active?.tileId ? `${activeSlotLabel} / Post #${activePostNumber}` : `${activeSlotLabel} / -`;

  const selectPostDay = (dayIndex: number) => {
    setActiveDay(dayIndex);
  };

  useEffect(() => {
    if (!active?.tileId) return;
    generateCaptions(captions.tone, captions.length, active.tileId);
    setGenerationSource("local");
    setGenerationError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.tileId]);

  const primaryCaption = normalizePostCopy(captions.variants[0] ?? "", activePostNumber);
  const supportingCaption = normalizePostCopy(captions.variants[1] ?? "", activePostNumber);
  const ctaByTone: Record<string, string> = {
    Minimal: "Save this for your next content batch.",
    Neutral: "Use this as a reference for the next weekly plan.",
    Emotional: "Keep this close when the week needs direction.",
    Sales: "Turn this into your next repeatable content system.",
  };
  const cta = captions.cta ?? ctaByTone[captions.tone] ?? ctaByTone.Minimal;
  const hashtagKey = captions.hashtags.join("|");
  const hashtagItems = normalizeHashtags(editableTags);

  useEffect(() => {
    setEditableCaption(primaryCaption);
    setEditableCta(cta);
    setEditableTags(captions.hashtags.join(" "));
    setGenerationSource(captions.source ?? "local");
  }, [captions.source, cta, hashtagKey, primaryCaption]);

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 900);
  };

  const persistComposer = (next?: { caption?: string; cta?: string; tags?: string }) => {
    const caption = next?.caption ?? editableCaption;
    const ctaLine = next?.cta ?? editableCta;
    const tagText = next?.tags ?? editableTags;

    setGeneratedCaption(
      {
        id: active?.tileId ?? `post-${activeDay + 1}`,
        caption,
        hashtags: normalizeHashtags(tagText),
        cta: ctaLine,
        alt: supportingCaption,
      },
      generationSource
    );
  };

  const copyCaption = async () => {
    const ok = await safeCopy(editableCaption);
    if (ok) flashCopied("caption");
  };

  const copyHashtags = async () => {
    const ok = await safeCopy(normalizeHashtags(editableTags).join(" "));
    if (ok) flashCopied("hashtags");
  };

  const buildGenerationPayload = () => {
    const activeAsset = active?.asset;
    const visualNotes = [
      activeAsset?.ratio ? `${activeAsset.ratio} visual` : undefined,
      activeAsset?.series ? `${activeAsset.series} source set` : undefined,
      activeAsset?.mood ? `${activeAsset.mood} mood` : undefined,
      activeAsset?.analysis ? `saturation ${activeAsset.analysis.saturation.toFixed(2)}` : undefined,
    ].filter((item): item is string => Boolean(item));

    return {
      mode: "single",
      tone: captions.tone.toLowerCase(),
      length: captions.length.toLowerCase(),
      post: {
        id: active?.tileId ?? `post-${activeDay + 1}`,
        day: activeSlotLabel,
        slot: `Post #${activePostNumber}`,
        captionSeed: ai.prompt,
        visualNotes,
        assetTags: [activeAsset?.series, activeAsset?.ratio, activeAsset?.source].filter(Boolean),
      },
      pack: packTiles
        .filter((d) => d.tileId)
        .slice(0, 9)
        .map((d, index) => ({
          id: d.tileId!,
          day: slotLabel(d.dayIndex),
          slot: `Post #${index + 1}`,
          visualNotes: [d.asset?.ratio, d.asset?.series].filter(Boolean),
          assetTags: [d.asset?.series, d.asset?.ratio, d.asset?.source].filter(Boolean),
        })),
      brandContext: {
        audience: "creators and small brands",
        offer: "turn content chaos into a calm publishing system",
        niche: "creator workflow operations",
        voice: captions.tone.toLowerCase(),
        ctaGoal: "save or use for the next content batch",
      },
    };
  };

  const onGenerateCaptions = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildGenerationPayload()),
      });

      if (!response.ok) throw new Error("Caption endpoint unavailable.");

      const data = (await response.json()) as {
        ok?: boolean;
        source?: "openai" | "fallback";
        results?: Array<{ id: string; caption: string; hashtags: string[]; cta: string; alt: string }>;
      };

      const result = data.results?.[0];
      if (!data.ok || !result || !data.source) throw new Error("Caption endpoint unavailable.");

      setGeneratedCaption(result, data.source);
      setGenerationSource(data.source);
    } finally {
      setIsGenerating(false);
    }
  };

  const onGenerateWithFallback = async () => {
    try {
      await onGenerateCaptions();
    } catch {
      if (active?.tileId) generateCaptions(captions.tone, captions.length, active.tileId);
      setGenerationSource("fallback");
      setGenerationError("Using backup draft.");
    }
  };

  const TonePill = (t: typeof captions.tone) => (
    <button
      key={t}
      type="button"
      onClick={() => {
        if (!active?.tileId) return;
        generateCaptions(t, captions.length, active.tileId);
        setGenerationSource("local");
        setGenerationError(null);
      }}
      className={[
        "rounded-full border px-2.5 py-1 text-[11px] transition sm:px-3",
        captions.tone === t
          ? "border-[color:var(--co-border)] bg-[color:var(--co-surface-active)] text-[color:var(--co-text)]"
          : "border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)] hover:opacity-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
        pressable,
      ].join(" ")}
    >
      {t}
    </button>
  );

  const LengthPill = (l: typeof captions.length) => (
    <button
      key={l}
      type="button"
      onClick={() => {
        if (!active?.tileId) return;
        generateCaptions(captions.tone, l, active.tileId);
        setGenerationSource("local");
        setGenerationError(null);
      }}
      className={[
        "rounded-full border px-2.5 py-1 text-[11px] transition sm:px-3",
        captions.length === l
          ? "border-[color:var(--co-border)] bg-[color:var(--co-surface-active)] text-[color:var(--co-text)]"
          : "border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)] hover:opacity-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
        pressable,
      ].join(" ")}
    >
      {l}
    </button>
  );

  if (!hasWeekPlan) {
    return (
      <FlowEmptyState
        title="No plan yet"
        desc="Create your week plan in Planner first, then generate captions per day."
        primaryLabel="Go to Planner"
        primaryTo="/prototype/planner"
        secondaryLabel="Back to Smart Mix"
        secondaryTo="/prototype/smart-mix"
      />
    );
  }

  return (
    <div className="co-workspace-page co-scene co-captions-page co-captions-composer-page">
      <header className="co-captions-header co-scene-header co-composer-scene-header flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base text-[color:var(--co-text)]">Captions</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">
            Voice layer for the selected publishing rhythm.
          </div>
        </div>

        <div className="ml-auto flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => navigate("/prototype/planner")}
            className={[
              "flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Back to Planner
          </button>
          <button
            type="button"
            onClick={() => navigate("/prototype/export")}
            className={[
              "flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm text-[color:var(--co-bg)] hover:opacity-90 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
              pressable,
            ].join(" ")}
          >
            Continue to Export
          </button>
        </div>
      </header>

      <div className="co-caption-workspace co-caption-editorial-workspace">
        <section className="co-caption-visual-stage co-caption-visual-card">
          <div className="co-caption-visual-header flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-[color:var(--co-text)]">Selected post</div>
              <div className="mt-1 text-xs text-[color:var(--co-muted)]">
                Visual context for this caption.
              </div>
            </div>
            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-muted)]">
              {anchor}
            </div>
          </div>

          <div className="co-caption-selected-frame mt-3">
            {active?.asset ? (
              <>
                <img
                  src={active.asset.thumbUrl}
                  alt={active.asset.id}
                  className="co-caption-selected-image"
                  loading="lazy"
                  decoding="async"
                />
                <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]/82 px-3 py-1 text-xs text-[color:var(--co-text)]/86 backdrop-blur">
                  {anchor}
                </div>
              </>
            ) : null}
          </div>

          <div className="co-caption-week-head">
            <div className="text-sm text-[color:var(--co-text)]">Week rhythm</div>
            <div className="text-xs text-[color:var(--co-muted)]">Tap a post to shape its voice.</div>
          </div>

          <div className="co-caption-week-strip co-scrollbar" aria-label="Week rhythm">
            {plannedPosts.map((post) => {
              const isActive = post.dayIndex === activeDay;
              const postIndex = plannedPosts.findIndex((item) => item.dayIndex === post.dayIndex);
              return (
                <button
                  key={post.dayIndex}
                  type="button"
                  onClick={() => selectPostDay(post.dayIndex)}
                  className={[
                    "co-caption-week-thumb",
                    isActive ? "co-caption-week-thumb--active" : "",
                    pressable,
                  ].join(" ")}
                >
                  <img src={post.asset!.thumbUrl} alt="" loading="lazy" decoding="async" />
                  <span>{slotLabel(post.dayIndex)}</span>
                  <strong>#{postIndex + 1}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="co-caption-composer co-caption-editorial-panel">
          <div className="co-caption-panel-header flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-base text-[color:var(--co-text)]">Caption Composer</div>
              <div className="mt-1 text-sm text-[color:var(--co-muted)]">
                Edit the copy that carries into the Export Pack.
              </div>
            </div>
            <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-[11px] text-[color:var(--co-muted)]">
              Saved
            </div>
          </div>

          <div className="co-caption-settings mt-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2 py-1.5">
                <span className="px-1 text-[11px] text-[color:var(--co-muted)]">Tone</span>
                {(["Minimal", "Neutral", "Emotional", "Sales"] as const).map(TonePill)}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-2 py-1.5">
                <span className="px-1 text-[11px] text-[color:var(--co-muted)]">Length</span>
                {(["Short", "Medium", "Long"] as const).map(LengthPill)}
              </div>
            </div>
          </div>

          <div className="co-caption-draft-sheet">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                  Caption draft
                </div>
                <div className="mt-1 text-xs text-[color:var(--co-muted)]">
                  Edit before export.
                </div>
              </div>
            </div>

            <textarea
              value={editableCaption}
              onChange={(e) => {
                setEditableCaption(e.target.value);
                persistComposer({ caption: e.target.value });
              }}
              className="co-caption-draft-textarea"
              placeholder="Write or generate a caption for this post."
              rows={5}
            />
          </div>

          <div className="co-caption-output-details">
            <div className="co-caption-output-card">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                CTA line
              </div>

              <textarea
                value={editableCta}
                onChange={(e) => {
                  setEditableCta(e.target.value);
                  persistComposer({ cta: e.target.value });
                }}
                className="co-caption-output-text"
                placeholder="Save this for your next content batch."
                rows={2}
              />
            </div>

            <div className="co-caption-output-card">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                Hashtags
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {hashtagItems.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const nextTags = hashtagItems.filter((item) => item !== tag).join(" ");
                      setEditableTags(nextTags);
                      persistComposer({ tags: nextTags });
                    }}
                    className="co-caption-tag"
                    title="Remove tag"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="co-caption-direction-row">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--co-muted)]">
                Refine direction
              </div>
              <div className="mt-1 text-xs leading-5 text-[color:var(--co-muted)]">
                Adjust the hook, message, or CTA before regenerating.
              </div>

              <textarea
                value={ai.prompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={'Add a clearer hook, message, or CTA direction.\nExample: "Make it calmer and more direct."'}
                className="co-caption-direction-input"
                rows={2}
              />
            </div>

            <button
              type="button"
              onClick={onGenerateWithFallback}
              disabled={isGenerating}
              className={[
                "co-caption-generate-button",
                isGenerating ? "cursor-wait opacity-75" : "",
                pressable,
              ].join(" ")}
            >
              {isGenerating ? "Generating..." : "Regenerate caption"}
            </button>

            {generationError ? (
              <div className="co-caption-direction-error">
                {generationError}
              </div>
            ) : null}
          </div>

          <div className="co-caption-composer-footer">
            <p className="min-w-0 text-xs leading-5 text-[color:var(--co-muted)]">
              Carries into Export Pack.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyCaption}
                className={[
                  "flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2.5 text-sm text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
              >
                {copiedKey === "caption" ? "Copied" : "Copy caption"}
              </button>
              <button
                type="button"
                onClick={copyHashtags}
                className={[
                  "flex-1 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-4 py-2.5 text-sm text-[color:var(--co-text)] hover:opacity-90 sm:flex-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
              >
                {copiedKey === "hashtags" ? "Copied" : "Copy tags"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/prototype/export")}
                className={[
                  "flex-1 rounded-full bg-[color:var(--co-text)] px-4 py-2.5 text-sm text-[color:var(--co-bg)] hover:opacity-90 sm:flex-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
              >
                Continue to Export
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
