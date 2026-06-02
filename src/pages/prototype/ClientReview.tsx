import { type PointerEvent, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  readClientReviewHandoff,
  type ClientReviewHandoffItem,
  type ClientReviewHandoffPayload,
} from "../../modules/client-review/handoff";

type ReviewState = "idle" | "approved" | "changes";
type PhonePreviewMode = "instagram" | "tiktok";
type ExtendedReviewView = "week-1" | "week-2" | "all";

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
  packMode: "week-pack",
  postCount: 9,
  packTitle: "Week Pack 01",
  createdAt: new Date().toISOString(),
  preparedBy: "CreatorOps",
  items: fallbackItems,
};

function normalizeItem(item: ClientReviewHandoffItem, index: number, isExtended: boolean): ClientReviewHandoffItem {
  const weekIndex: 1 | 2 = item.weekIndex ?? (isExtended && index >= 9 ? 2 : 1);
  const weekSlotIndex = index % 9;

  return {
    ...item,
    label: item.label || `Post #${index + 1}`,
    weekIndex,
    day: item.day || days[weekSlotIndex] || `Post ${weekSlotIndex + 1}`,
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
  const phoneDragRef = useRef({
    pointerId: -1,
    startY: 0,
    scrollTop: 0,
    dragging: false,
  });
  const payload = useMemo(() => readClientReviewHandoff() ?? fallbackPayload, []);
  const hasHandoff = payload !== fallbackPayload;
  const isExtendedReview = payload.packMode === "extended-pack" || payload.items.length > 9 || payload.postCount === 18;
  const items = useMemo(
    () => payload.items.slice(0, isExtendedReview ? 18 : 9).map((item, index) => normalizeItem(item, index, isExtendedReview)),
    [isExtendedReview, payload.items]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [phonePreviewMode, setPhonePreviewMode] = useState<PhonePreviewMode>("instagram");
  const [extendedView, setExtendedView] = useState<ExtendedReviewView>("week-1");
  const activeItem = items[activeIndex] ?? items[0];
  const activeHashtags = activeItem?.hashtags?.length ? activeItem.hashtags : fallbackHashtags;
  const avatarItem = items.find((item) => Boolean(item.src)) ?? items[0];
  const highlightItems = items.slice(0, 4);
  const week1Items = items.slice(0, 9);
  const week2Items = items.slice(9, 18);
  const extendedVisibleItems =
    extendedView === "week-1" ? week1Items : extendedView === "week-2" ? week2Items : items;
  const extendedVisibleOffset = extendedView === "week-2" ? 9 : 0;
  const previewItems = isExtendedReview ? extendedVisibleItems : items;
  const previewOffset = isExtendedReview && extendedView === "week-2" ? extendedVisibleOffset : 0;
  const previewAvatarItem = previewItems.find((item) => Boolean(item.src)) ?? avatarItem;
  const previewHighlightItems = (isExtendedReview ? previewItems : highlightItems).slice(0, 4);
  const previewPostCountLabel = isExtendedReview ? (extendedView === "all" ? "18 posts" : "9 posts") : `${items.length} posts`;
  const reviewHandle = isExtendedReview ? "extended.review" : "weekpack.review";
  const reviewLinkPath = isExtendedReview ? "creatorops.review/extended-pack" : "creatorops.review/week-pack";
  const tiktokReviewTitle = isExtendedReview ? "Extended Pack" : "Week Pack";
  const tiktokReviewMarker = isExtendedReview ? "01" : "1";
  const approveLabel = isExtendedReview ? "Approve Extended Pack" : "Approve Week Pack";

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

  const renderTikTokReviewTile = (item: ClientReviewHandoffItem, index: number, offset = 0) => {
    const playCounts = ["8.2K", "12K", "6.4K", "9.8K", "7.1K", "10K", "5.6K", "11K", "4.9K"];
    const actualIndex = offset + index;

    return (
      <button
        key={`${item.id}-tiktok-${actualIndex}`}
        type="button"
        onClick={() => setActiveIndex(actualIndex)}
        className={[
          "co-planner-tiktok-profile-tile co-client-tiktok-profile-tile pressable",
          activeIndex === actualIndex ? "co-client-tiktok-profile-tile--active" : "",
        ].join(" ")}
        aria-label={`Preview ${item.label}`}
      >
        <img
          className="co-planner-tiktok-profile-tile-media"
          src={item.src}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
        />
        <span className="co-planner-tiktok-profile-plays">
          <span aria-hidden="true" />
          {playCounts[actualIndex % playCounts.length]}
        </span>
      </button>
    );
  };

  const renderClientPostRow = (item: ClientReviewHandoffItem, index: number) => {
    const hashtags = item.hashtags?.length ? item.hashtags : fallbackHashtags;

    return (
      <button
        key={`${item.id}-detail-${index}`}
        type="button"
        onClick={() => setActiveIndex(index)}
        className={["co-client-post-row pressable", activeIndex === index ? "co-client-post-row--active" : ""].join(" ")}
      >
        <img src={item.src} alt="" draggable={false} loading="lazy" decoding="async" />
        <span>
          <strong>
            {item.weekIndex ? `Week ${item.weekIndex} / ` : ""}
            {item.label} {item.day ? `- ${item.day}` : ""}
          </strong>
          <em>{item.caption}</em>
          <small>{item.cta}</small>
          <small>{hashtags.join(" ")}</small>
        </span>
      </button>
    );
  };

  return (
    <div className="co-client-review-page">
      <main className="co-client-review-shell">
        <header className="co-client-review-topbar">
          <div className="min-w-0">
            <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">CreatorOps Review</div>
            <h1 className="co-client-review-title">Client Review</h1>
            <p className="mt-2 text-sm leading-5 text-[color:var(--co-muted)]">
              {isExtendedReview
                ? `${payload.packTitle} / 18 posts - Week 1 + Week 2 / Prepared for approval.`
                : `${payload.packTitle}. Prepared for approval.`}
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
            No Export handoff found. Open Export and launch Client Review from there, or view the sample preview.
          </section>
        ) : null}

        <section className="co-client-review-workbench">
          {isExtendedReview ? (
            <section className="co-client-review-phone-panel co-client-review-extended-panel">
              <div className="co-client-review-section-head co-client-extended-section-head">
                <div>
                  <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Extended Pack Preview</div>
                  <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Client-facing feed</div>
                  <div className="co-planner-preview-mode-toggle" role="group" aria-label="Client preview mode">
                    <button
                      type="button"
                      className={phonePreviewMode === "instagram" ? "is-active" : ""}
                      onClick={() => setPhonePreviewMode("instagram")}
                    >
                      Instagram
                    </button>
                    <button
                      type="button"
                      className={phonePreviewMode === "tiktok" ? "is-active" : ""}
                      onClick={() => setPhonePreviewMode("tiktok")}
                    >
                      TikTok
                    </button>
                  </div>
                  <div className="co-client-extended-view-tabs" role="tablist" aria-label="Extended Client Review view">
                    {[
                      { id: "week-1" as const, label: "Week 1" },
                      { id: "week-2" as const, label: "Week 2" },
                      { id: "all" as const, label: "All 18" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={extendedView === item.id}
                        className={extendedView === item.id ? "is-active" : ""}
                        onClick={() => {
                          setExtendedView(item.id);
                          if (item.id === "week-1") setActiveIndex(0);
                          if (item.id === "week-2") setActiveIndex(9);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                  {previewPostCountLabel}
                </div>
              </div>

              <div
                className="co-iphone-shell co-planner-phone-shell co-client-phone-shell co-client-extended-phone-shell"
                aria-label="Extended Client Review mobile preview"
              >
                <div className="co-iphone-island" aria-hidden="true" />
                <div className="co-iphone-screen">
                  {phonePreviewMode === "instagram" ? (
                    <>
                      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
                        <div className="min-w-0 truncate text-[13px] font-medium text-white/92">{reviewHandle}</div>
                        <div className="text-xs text-white/62">Approval</div>
                      </div>

                      <div
                        className="co-planner-phone-body"
                        onPointerDown={onPhonePointerDown}
                        onPointerMove={onPhonePointerMove}
                        onPointerUp={endPhoneDrag}
                        onPointerCancel={endPhoneDrag}
                        onPointerLeave={endPhoneDrag}
                      >
                        <div className="co-planner-phone-profile">
                          <div className="co-planner-phone-account">
                            <div className="co-planner-phone-avatar">
                              {previewAvatarItem?.src ? (
                                <img src={previewAvatarItem.src} alt="" draggable={false} loading="lazy" decoding="async" />
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
                            <span>Week 1 + Week 2 ready for approval.</span>
                            <span>Captions, CTA lines, and export order included.</span>
                            <a href="#client-review-preview" onClick={(event) => event.preventDefault()}>
                              {reviewLinkPath}
                            </a>
                          </div>

                          <div className="co-planner-phone-highlights" aria-label="Extended Pack highlights">
                            {previewHighlightItems.map((item, index) => {
                              const labels = ["Week 1", "Mood", "Flow", "Week 2"];

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

                        <div className="co-planner-phone-grid co-client-phone-grid">
                          {previewItems.map((item, index) => {
                            const actualIndex = previewOffset + index;

                            return (
                              <button
                                key={`${item.id}-${actualIndex}`}
                                type="button"
                                onClick={() => setActiveIndex(actualIndex)}
                                className={[
                                  "co-planner-phone-tile co-client-phone-tile pressable",
                                  activeIndex === actualIndex ? "co-client-phone-tile--active" : "",
                                ].join(" ")}
                                aria-label={`Preview ${item.label}`}
                              >
                                <img src={item.src} alt="" draggable={false} loading="lazy" decoding="async" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="co-planner-tiktok-body">
                      <div
                        className="co-planner-tiktok-scroll"
                        onPointerDown={onPhonePointerDown}
                        onPointerMove={onPhonePointerMove}
                        onPointerUp={endPhoneDrag}
                        onPointerCancel={endPhoneDrag}
                        onPointerLeave={endPhoneDrag}
                      >
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
                            {previewAvatarItem?.src ? (
                              <img src={previewAvatarItem.src} alt="" draggable={false} loading="lazy" decoding="async" />
                            ) : null}
                            <span aria-hidden="true">+</span>
                          </div>
                          <div className="co-planner-tiktok-name-row">
                            <strong>{tiktokReviewTitle}</strong>
                            <span>{tiktokReviewMarker}</span>
                            <button type="button" aria-label="Review profile preview" />
                          </div>
                          <div className="co-planner-tiktok-handle">@{reviewHandle}</div>
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
                          <p>{payload.packTitle}. Captions, CTA lines, and export order included.</p>
                          <div className="co-planner-tiktok-studio">
                            <span aria-hidden="true" />
                            Client Review
                          </div>
                          <a href="#client-review-preview" onClick={(event) => event.preventDefault()}>
                            {reviewLinkPath}
                          </a>
                        </div>

                        <div className="co-planner-tiktok-profile-tabs">
                          <span className="is-active" aria-label="Videos" />
                          <span aria-label="Shop" />
                          <span aria-label="Private" />
                          <span aria-label="Saved" />
                          <span aria-label="Liked" />
                        </div>

                        <div className="co-planner-tiktok-profile-grid">
                          {previewItems.map((item, index) => renderTikTokReviewTile(item, index, previewOffset))}
                        </div>
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
            </section>
          ) : (
          <section className="co-client-review-phone-panel">
            <div className="co-client-review-section-head">
              <div>
                <div className="co-layer-label text-[10px] text-[color:var(--co-muted)]">Week Pack Preview</div>
                <div className="mt-1 text-sm font-medium text-[color:var(--co-text)]">Client-facing feed</div>
                <div className="co-planner-preview-mode-toggle" role="group" aria-label="Client preview mode">
                  <button
                    type="button"
                    className={phonePreviewMode === "instagram" ? "is-active" : ""}
                    onClick={() => setPhonePreviewMode("instagram")}
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    className={phonePreviewMode === "tiktok" ? "is-active" : ""}
                    onClick={() => setPhonePreviewMode("tiktok")}
                  >
                    TikTok
                  </button>
                </div>
              </div>
              <div className="rounded-full border border-[color:var(--co-border-soft)] bg-[color:var(--co-surface)] px-3 py-1 text-[11px] text-[color:var(--co-muted)]">
                {items.length} posts
              </div>
            </div>

            <div className="co-iphone-shell co-planner-phone-shell co-client-phone-shell" aria-label="Client Review mobile preview">
              <div className="co-iphone-island" aria-hidden="true" />
              <div className="co-iphone-screen">
                {phonePreviewMode === "instagram" ? (
                  <>
                    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 sm:px-5">
                      <div className="min-w-0 truncate text-[13px] font-medium text-white/92">weekpack.review</div>
                      <div className="text-xs text-white/62">Approval</div>
                    </div>

                    <div
                      className="co-planner-phone-body"
                      onPointerDown={onPhonePointerDown}
                      onPointerMove={onPhonePointerMove}
                      onPointerUp={endPhoneDrag}
                      onPointerCancel={endPhoneDrag}
                      onPointerLeave={endPhoneDrag}
                    >
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

                      <div className="co-planner-phone-grid co-client-phone-grid">
                        {items.map((item, index) => (
                          <button
                            key={`${item.id}-${index}`}
                            type="button"
                            onClick={() => setActiveIndex(index)}
                            className={[
                              "co-planner-phone-tile co-client-phone-tile pressable",
                              activeIndex === index ? "co-client-phone-tile--active" : "",
                            ].join(" ")}
                            aria-label={`Preview ${item.label}`}
                          >
                            <img src={item.src} alt="" draggable={false} loading="lazy" decoding="async" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="co-planner-tiktok-body">
                    <div
                      className="co-planner-tiktok-scroll"
                      onPointerDown={onPhonePointerDown}
                      onPointerMove={onPhonePointerMove}
                      onPointerUp={endPhoneDrag}
                      onPointerCancel={endPhoneDrag}
                      onPointerLeave={endPhoneDrag}
                    >
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
                          {avatarItem?.src ? (
                            <img src={avatarItem.src} alt="" draggable={false} loading="lazy" decoding="async" />
                          ) : null}
                          <span aria-hidden="true">+</span>
                        </div>
                        <div className="co-planner-tiktok-name-row">
                          <strong>Week Pack</strong>
                          <span>1</span>
                          <button type="button" aria-label="Review profile preview" />
                        </div>
                        <div className="co-planner-tiktok-handle">@weekpack.review</div>
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
                        <p>{payload.packTitle}. Captions, CTA lines, and export order included.</p>
                        <div className="co-planner-tiktok-studio">
                          <span aria-hidden="true" />
                          Client Review
                        </div>
                        <a href="#client-review-preview" onClick={(event) => event.preventDefault()}>
                          creatorops.review/week-pack
                        </a>
                      </div>

                      <div className="co-planner-tiktok-profile-tabs">
                        <span className="is-active" aria-label="Videos" />
                        <span aria-label="Shop" />
                        <span aria-label="Private" />
                        <span aria-label="Saved" />
                        <span aria-label="Liked" />
                      </div>

                      <div className="co-planner-tiktok-profile-grid">
                        {items.map((item, index) => renderTikTokReviewTile(item, index))}
                      </div>
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
          </section>
          )}

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
                  {approveLabel}
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
                {activeItem?.weekIndex && isExtendedReview ? `Week ${activeItem.weekIndex} / ` : ""}
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
                {isExtendedReview ? (
                  <>
                    <div className="co-client-post-week-label">Week 1</div>
                    {week1Items.map((item, index) => renderClientPostRow(item, index))}
                    <div className="co-client-post-week-label">Week 2</div>
                    {week2Items.map((item, index) => renderClientPostRow(item, index + 9))}
                  </>
                ) : (
                  items.map((item, index) => renderClientPostRow(item, index))
                )}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
