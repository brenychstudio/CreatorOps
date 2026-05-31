import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  readClientReviewHandoff,
  type ClientReviewHandoffItem,
  type ClientReviewHandoffPayload,
} from "../../modules/client-review/handoff";

type ReviewState = "idle" | "approved" | "changes";

const fallbackHashtags = ["#creatorops", "#weekpack", "#contentworkflow"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Next 1", "Next 2"];

const fallbackItems: ClientReviewHandoffItem[] = Array.from({ length: 9 }, (_, index) => {
  const order = String(index + 1).padStart(2, "0");

  return {
    id: `sample-${order}`,
    src: `/creatorops/thumbs/4x5/thumb-4x5-${order}.jpg`,
    label: `Post #${index + 1}`,
    day: days[index],
    filename: `week-pack-01-${order}.jpg`,
    caption: "Caption draft included in Export Pack.",
    cta: "Save this for your next content batch.",
    hashtags: fallbackHashtags,
  };
});

const fallbackPayload: ClientReviewHandoffPayload = {
  version: "v1",
  source: "export-week-pack",
  packTitle: "Week Pack 01",
  createdAt: new Date().toISOString(),
  preparedBy: "CreatorOps",
  items: fallbackItems,
};

function normalizeItem(item: ClientReviewHandoffItem, index: number): ClientReviewHandoffItem {
  return {
    ...item,
    label: item.label || `Post #${index + 1}`,
    day: item.day || (index < 7 ? days[index] : `Next ${index - 6}`),
    caption: item.caption || "Caption draft included in Export Pack.",
    cta: item.cta || "Save this for your next content batch.",
    hashtags: item.hashtags?.length ? item.hashtags : fallbackHashtags,
  };
}

function ReviewStatusMessage({ state }: { state: ReviewState }) {
  if (state === "approved") return <span>Approved in this preview.</span>;
  if (state === "changes") return <span>Change request marked in this preview.</span>;
  return <span>Ready for approval.</span>;
}

export default function ClientReview() {
  const payload = useMemo(() => readClientReviewHandoff() ?? fallbackPayload, []);
  const hasHandoff = payload !== fallbackPayload;
  const items = useMemo(() => payload.items.slice(0, 9).map(normalizeItem), [payload.items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const activeItem = items[activeIndex] ?? items[0];
  const activeHashtags = activeItem?.hashtags?.length ? activeItem.hashtags : fallbackHashtags;
  const avatarItem = items.find((item) => Boolean(item.src)) ?? items[0];
  const highlightItems = items.slice(0, 4);

  return (
    <div className="co-client-review-page">
      <main className="co-client-review-shell">
        <header className="co-client-review-topbar">
          <div className="min-w-0">
            <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">CreatorOps Review</div>
            <h1 className="co-client-review-title">Client Review</h1>
            <p className="mt-2 text-sm leading-5 text-[color:var(--co-muted)]">
              {payload.packTitle}. Prepared for approval.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to="/prototype/export"
              className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable"
            >
              Back to Export
            </Link>
            <Link
              to="/prototype/library"
              className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable"
            >
              Open workspace
            </Link>
          </div>
        </header>

        {!hasHandoff ? (
          <section className="co-client-review-note">
            No Week Pack handoff found. Open Export and launch Client Review from there, or view the sample preview.
          </section>
        ) : null}

        <section className="co-client-review-workbench">
          <section className="co-client-review-phone-panel">
            <div className="co-client-review-section-head">
              <div>
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Week Pack Preview</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Client-facing feed</div>
              </div>
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                {items.length} posts
              </div>
            </div>

            <div className="co-iphone-shell co-client-phone-shell" aria-label="Client Review mobile preview">
              <div className="co-iphone-island" aria-hidden="true" />
              <div className="co-iphone-screen">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
                  <div className="min-w-0 truncate text-[13px] font-medium text-white/92">weekpack.review</div>
                  <div className="text-xs text-white/62">Approval</div>
                </div>

                <div className="co-planner-phone-body co-scrollbar">
                  <div className="co-planner-phone-profile">
                    <div className="co-planner-phone-account">
                      <div className="co-planner-phone-avatar">
                        {avatarItem?.src ? (
                          <img src={avatarItem.src} alt="" draggable={false} loading="lazy" decoding="async" />
                        ) : null}
                      </div>
                      <div className="co-planner-phone-stats" aria-label="Feed stats">
                        <div>
                          <strong>{items.length}</strong>
                          <span>posts</span>
                        </div>
                        <div>
                          <strong>Captions</strong>
                          <span>ready</span>
                        </div>
                        <div>
                          <strong>Export</strong>
                          <span>ready</span>
                        </div>
                      </div>
                    </div>

                    <div className="co-planner-phone-actions">
                      <button type="button">Approve</button>
                      <button type="button">Changes</button>
                    </div>

                    <div className="co-planner-phone-bio">
                      <strong>{payload.packTitle}</strong>
                      <span>Prepared for approval.</span>
                      <span>Captions, CTA lines, and export order included.</span>
                      <a href="#client-review-preview" onClick={(event) => event.preventDefault()}>
                        creatorops.review/week-pack
                      </a>
                    </div>

                    <div className="co-planner-phone-highlights" aria-label="Week Pack highlights">
                      {highlightItems.map((item, index) => {
                        const labels = ["Rhythm", "Caption", "CTA", "Export"];

                        return (
                          <div key={`${item.id}-highlight-${index}`} className="co-planner-phone-highlight">
                            <div className="co-planner-phone-highlight-thumb">
                              <img src={item.src} alt="" draggable={false} loading="lazy" decoding="async" />
                            </div>
                            <span>{labels[index]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="co-planner-phone-tabs">
                    <span>Posts</span>
                    <span>Captions</span>
                    <span>Export</span>
                  </div>

                  <div className="co-client-phone-grid">
                    {items.map((item, index) => (
                      <button
                        key={`${item.id}-${index}`}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={[
                          "co-client-phone-tile pressable",
                          activeIndex === index ? "co-client-phone-tile--active" : "",
                        ].join(" ")}
                        aria-label={`Preview ${item.label}`}
                      >
                        <img src={item.src} alt="" draggable={false} loading="lazy" decoding="async" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="co-client-review-side">
            <section className="co-client-review-card">
              <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Review status</div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                <ReviewStatusMessage state={reviewState} />
              </h2>

              <div className="mt-4 grid gap-2 text-sm text-[color:var(--co-muted)]">
                {[
                  [`${items.length} posts`, "Included"],
                  ["Captions included", "Yes"],
                  ["CTA lines included", "Yes"],
                  ["Export pack ready", "Yes"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-[color:var(--co-border-soft)] pb-2 last:border-b-0 last:pb-0">
                    <span>{label}</span>
                    <span className="text-[color:var(--co-text)]">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReviewState("approved")}
                  className="rounded-full bg-[color:var(--co-text)] px-4 py-2 text-sm font-medium text-[color:var(--co-bg)] pressable"
                >
                  Approve Week Pack
                </button>
                <button
                  type="button"
                  onClick={() => setReviewState("changes")}
                  className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-4 py-2 text-sm text-[color:var(--co-text)] hover:bg-[color:var(--co-surface-active)] pressable"
                >
                  Request changes
                </button>
              </div>
            </section>

            <section className="co-client-review-card">
              <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Selected post</div>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.035em]">
                {activeItem?.label} {activeItem?.day ? `- ${activeItem.day}` : ""}
              </h3>
              <p className="mt-3 text-sm leading-5 text-[color:var(--co-muted)]">{activeItem?.caption}</p>
              <p className="mt-3 text-sm text-[color:var(--co-text)]">{activeItem?.cta}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-[color:var(--co-muted)]">
                {activeHashtags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[color:var(--co-border-soft)] px-2.5 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="co-client-review-card co-client-review-details">
              <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Post details</div>
              <div className="co-client-post-list co-scrollbar">
                {items.map((item, index) => {
                  const hashtags = item.hashtags?.length ? item.hashtags : fallbackHashtags;

                  return (
                    <button
                      key={`${item.id}-detail-${index}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={[
                        "co-client-post-row pressable",
                        activeIndex === index ? "co-client-post-row--active" : "",
                      ].join(" ")}
                    >
                      <img src={item.src} alt="" draggable={false} loading="lazy" decoding="async" />
                      <span>
                        <strong>
                          {item.label} {item.day ? `- ${item.day}` : ""}
                        </strong>
                        <em>{item.caption}</em>
                        <small>{item.cta}</small>
                        <small>{hashtags.join(" ")}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
