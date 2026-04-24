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

export default function Captions() {
  const navigate = useNavigate();

  // tactile press (same as other pages)
  const pressable = "transition active:translate-y-[1px] active:scale-[0.98]";

  const planner = usePrototypeStore((s) => s.planner);
  const captions = usePrototypeStore((s) => s.captions);
  const ai = usePrototypeStore((s) => s.ai);

  const getAssetById = usePrototypeStore((s) => s.getAssetById);
  const generateCaptions = usePrototypeStore((s) => s.generateCaptions);
  const setAiPrompt = usePrototypeStore((s) => s.setAiPrompt);
  const generateDraftFromPrompt = usePrototypeStore((s) => s.generateDraftFromPrompt);

  const [activeDay, setActiveDay] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 900);
  };

  const weekTiles = useMemo(() => {
    return DAYS.map((_, dayIndex) => {
      const tileId = planner.find((p) => p.dayIndex === dayIndex && p.slotIndex === 0)?.tileId;
      const asset = tileId ? getAssetById(tileId) : undefined;
      return { dayIndex, tileId, asset };
    });
  }, [planner, getAssetById]);

  const hasWeekPlan = weekTiles.some((d) => Boolean(d.tileId));

  // Choose a sensible default active day (first day that has a tile)
  useEffect(() => {
    const firstWithTile = weekTiles.find((d) => !!d.tileId)?.dayIndex ?? 0;
    setActiveDay((prev) => {
      if (weekTiles[prev]?.tileId) return prev;
      return firstWithTile;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekTiles.map((d) => d.tileId).join("|")]);

  const active = weekTiles[activeDay];

  // UI-only: show minimal number instead of p-xx
  const anchor = active?.tileId ? `${DAYS[activeDay]} / #${activeDay + 1}` : `${DAYS[activeDay]} / -`;

  // Ensure there is content on first visit and on day switch
  useEffect(() => {
    if (!active?.tileId) return;
    generateCaptions(captions.tone, captions.length, active.tileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.tileId]);

  const regenerate = () => {
    if (!active?.tileId) return;
    generateCaptions(captions.tone, captions.length, active.tileId);
  };

  const copyCaption = async () => {
    const v = captions.variants[0] ?? "";
    const ok = await safeCopy(v);
    if (ok) flashCopied("caption");
  };

  const copyAlt = async () => {
    const v = captions.variants[1] ?? "";
    const ok = await safeCopy(v);
    if (ok) flashCopied("alt");
  };

  const copyHashtags = async () => {
    const ok = await safeCopy(captions.hashtags.join(" "));
    if (ok) flashCopied("hashtags");
  };

  const copyDraft = async () => {
    const ok = await safeCopy(ai.draft);
    if (ok) flashCopied("draft");
  };

  const onGenerateDraft = async () => {
    if (drafting) return;
    setDrafting(true);
    try {
      await Promise.resolve(generateDraftFromPrompt(ai.prompt, active?.tileId));
    } finally {
      setDrafting(false);
    }
  };

  const TonePill = (t: typeof captions.tone) => (
    <button
      key={t}
      type="button"
      onClick={() => active?.tileId && generateCaptions(t, captions.length, active.tileId)}
      className={[
        "rounded-full border px-3 py-1.5 text-xs transition",
        captions.tone === t
          ? "border-[color:var(--co-border)] bg-[color:var(--co-text)] text-[color:var(--co-bg)]"
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
      onClick={() => active?.tileId && generateCaptions(captions.tone, l, active.tileId)}
      className={[
        "rounded-full border px-3 py-1.5 text-xs transition",
        captions.length === l
          ? "border-[color:var(--co-border)] bg-[color:var(--co-text)] text-[color:var(--co-bg)]"
          : "border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)] hover:opacity-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
        pressable,
      ].join(" ")}
    >
      {l}
    </button>
  );


  // Flow guard: Captions require a planned week (at least one tile)
  if (!hasWeekPlan) {
    return (
      <FlowEmptyState
        title="No plan yet"
        desc="Create your week plan in Planner first, then generate captions per day."
        primaryLabel="Go to Planner"
        primaryTo="/prototype/planner"
        secondaryLabel="Back to Sequence"
        secondaryTo="/prototype/sequence"
      />
    );
  }

  return (
    <div className="min-w-0 space-y-5 text-[color:var(--co-text)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg text-[color:var(--co-text)]">Captions</div>
          <div className="mt-1 text-sm text-[color:var(--co-muted)]">AI-ready variants in your tone. Anchor: {anchor}</div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
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
            Continue
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-2 py-2 sm:rounded-full">
          {(["Minimal", "Neutral", "Emotional", "Sales"] as const).map(TonePill)}
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-2 py-2 sm:rounded-full">
          {(["Short", "Medium", "Long"] as const).map(LengthPill)}
        </div>
      </div>

      {/* Layout */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: week context (vertical, large tiles) */}
        <div className="min-w-0 lg:col-span-5">
          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--co-muted)]">Week context</div>
              <div className="text-[11px] text-[color:var(--co-muted)]">Scroll by day</div>
            </div>

            <div className="mt-3 h-[min(72vh,820px)] space-y-3 overflow-y-auto pr-1 [scrollbar-gutter:stable] snap-y snap-mandatory">
              {weekTiles.map((d) => {
                const isActive = d.dayIndex === activeDay;
                const hasTile = !!d.tileId && !!d.asset;

                return (
                  <button
                    key={d.dayIndex}
                    type="button"
                    onClick={() => hasTile && setActiveDay(d.dayIndex)}
                    className={[
                      "w-full text-left snap-start",
                      !hasTile ? "cursor-default" : "cursor-pointer",
                      pressable,
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "relative overflow-hidden rounded-3xl border bg-[color:var(--co-surface)]",
                        "border-[color:var(--co-border)]",
                        isActive ? "ring-2 ring-[color:var(--co-text)]/10" : "",
                      ].join(" ")}
                    >
                      <div className="aspect-[4/5]">
                        {hasTile ? (
                          <img
                            src={d.asset!.thumbUrl}
                            alt={d.asset!.id}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-[color:var(--co-muted)]">
                            Drop a tile in Planner
                          </div>
                        )}
                      </div>

                      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
                        <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]/85 px-2.5 py-1 text-[11px] text-[color:var(--co-text)]/80 shadow-sm backdrop-blur">
                          {DAYS[d.dayIndex]}
                        </div>

                        {/* UI-only: minimal numbering instead of p-xx */}
                        {d.tileId ? (
                          <div className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)]/85 px-2.5 py-1 text-[11px] text-[color:var(--co-muted)] shadow-sm backdrop-blur">
                            #{d.dayIndex + 1}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-[11px] text-[color:var(--co-muted)]">
              Tip: click a day to switch context. Captions regenerate per tile.
            </div>
          </div>
        </div>

        {/* Right: caption + tags + AI request */}
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--co-muted)]">Generation</div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] text-[color:var(--co-muted)]">
                  {captions.tone} · {captions.length}
                </div>
                <button
                  type="button"
                  onClick={regenerate}
                  className={[
                    "rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    pressable,
                  ].join(" ")}
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-[color:var(--co-muted)]">Primary</div>
                  <div className="mt-1 text-sm text-[color:var(--co-text)]/85">{captions.variants[0] ?? "—"}</div>
                </div>
                <button
                  type="button"
                  onClick={copyCaption}
                  className={[
                    "shrink-0 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    pressable,
                  ].join(" ")}
                >
                  {copiedKey === "caption" ? "Copied" : "Copy"}
                </button>
              </div>

              {captions.variants[1] ? (
                <div className="mt-3 rounded-xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-[color:var(--co-muted)]">Alt</div>
                      <div className="mt-1 text-sm text-[color:var(--co-text)]/75">{captions.variants[1]}</div>
                    </div>
                    <button
                      type="button"
                      onClick={copyAlt}
                      className={[
                        "shrink-0 rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                        pressable,
                      ].join(" ")}
                    >
                      {copiedKey === "alt" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {captions.hashtags.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-2 py-1 text-xs text-[color:var(--co-muted)]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copyHashtags}
                  className={[
                    "rounded-full border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] px-3 py-1.5 text-xs text-[color:var(--co-text)] hover:opacity-90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    pressable,
                  ].join(" ")}
                >
                  {copiedKey === "hashtags" ? "Copied" : "Copy tags"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--co-muted)]">AI request</div>
              <button
                type="button"
                onClick={onGenerateDraft}
                disabled={drafting}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  drafting
                    ? "cursor-wait border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-muted)] opacity-70"
                    : "border-[color:var(--co-border)] bg-[color:var(--co-surface)] text-[color:var(--co-text)] hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                  pressable,
                ].join(" ")}
              >
                {drafting ? "Generating…" : "Generate"}
              </button>
            </div>

            <textarea
              value={ai.prompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder='Describe what you want to say (hook, message, CTA). Example: "Write a calm caption about a clear decision."'
              className="mt-3 h-28 w-full resize-none rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-3 text-sm text-[color:var(--co-text)]/85 outline-none placeholder:text-[color:var(--co-muted)]/60 focus:border-[color:var(--co-border)]"
            />

            <div className="mt-3 rounded-2xl border border-[color:var(--co-border)] bg-[color:var(--co-surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] text-[color:var(--co-muted)]">Draft</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--co-text)]/80">
                    {ai.draft ||
                      "Generate a draft from your prompt. (Placeholder — later we'll replace this with OpenAI responses.)"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyDraft}
                  disabled={!ai.draft}
                  className={[
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs",
                    ai.draft
                      ? "border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] text-[color:var(--co-text)] hover:opacity-90"
                      : "cursor-not-allowed border-[color:var(--co-border)] bg-[color:var(--co-surface-2)] text-[color:var(--co-muted)] opacity-60",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--co-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--co-bg)]",
                    pressable,
                  ].join(" ")}
                >
                  {copiedKey === "draft" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
