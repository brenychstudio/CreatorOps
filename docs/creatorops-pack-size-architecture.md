# CreatorOps Pack Size Architecture

9-post Week Pack and 18-post Extended Pack planning model

## 1. Decision

CreatorOps will support two planning modes:

- Week Pack: 9 posts
- Extended Pack: 18 posts, organized as Week 1 + Week 2

The 18-post mode is not a separate product. It is an extended planning mode inside CreatorOps.

Core principle:

```txt
18 posts = two calm 9-post boards
```

This should not become one huge overloaded 18-image grid across the whole product. Editing should stay focused, readable, and close to the current premium workflow.

Task 22B - Supabase Project Setup Checklist remains important but postponed while the current product/value exploration is being finalized. CreatorOps should return to Supabase/Auth before the real account-based SaaS layer begins.

## 2. Why This Matters

The 9-post Week Pack is fast, clear, and export-ready. It is the simple CreatorOps promise: turn scattered assets into one calm publishing pack.

The 18-post Extended Pack adds a more professional planning layer for creators and operators who need more runway:

- SMM managers
- freelancers
- small creative studios
- creators with weekly content planning
- brands that plan campaigns in advance
- client approval workflows

The strongest value appears in review and planning contexts. An 18-post Extended Pack lets a creator or client review Week 1 and Week 2 before publishing, without forcing every screen to handle 18 items at once.

## 3. Naming Model

User-facing names:

```txt
Week Pack
Extended Pack
```

Secondary labels:

```txt
9 posts
18 posts - Week 1 + Week 2
```

Recommended UI:

```txt
Planning mode

Week Pack
9 posts

Extended Pack
18 posts - Week 1 + Week 2
```

Avoid user-facing technical labels:

```txt
9-grid
18-grid
packSize=18
```

Internal naming can be:

```ts
type PackSize = 9 | 18;
type PackMode = "week-pack" | "extended-pack";
```

## 4. Monetization Logic

The 18-post mode is a planned value layer, not a billing implementation task.

### Free / Basic

```txt
Week Pack
9 posts
Basic export
Caption drafts
Profile Handoff
```

### Creator Pro

```txt
Extended Pack
18 posts
Week 1 + Week 2 planning
Client Review Preview
Media Converter handoff
More AI captions later
Saved history later
```

### Studio Later

```txt
multiple brands
client approvals
review links
comments
version history
team workflows
```

In the prototype, Extended Pack can be available for testing. In the SaaS product, Extended Pack can become a Pro feature. Do not hard-code billing or entitlement logic in the prototype implementation.

## 5. Core UX Principle

Do not double the complexity just because the post count doubles.

For 18 posts:

```txt
Always group by Week 1 and Week 2.
Show all 18 only when it helps review/export.
Keep editing focused on one week or one post at a time.
```

Avoid:

```txt
18 thumbnails + 18 captions + 18 controls on one screen
```

The interface should preserve the CreatorOps feeling: calm, editorial, visual-first, and export-focused.

## 6. Data Model Direction

Recommended internal model:

```ts
type PackSize = 9 | 18;

type PackMode = "week-pack" | "extended-pack";

type PackSlot = {
  slotIndex: number;       // 0-8 or 0-17
  postNumber: number;      // 1-9 or 1-18
  weekIndex: 1 | 2;
  weekSlotIndex: number;   // 0-8 inside the week
  dayLabel: string;
  assetId: string;
};
```

Slot mapping:

### 9-post Week Pack

```txt
slots 0-8
weekIndex: 1
postNumber: 1-9
```

### 18-post Extended Pack

```txt
slots 0-8   -> Week 1 / posts 01-09
slots 9-17  -> Week 2 / posts 10-18
```

Suggested day labels:

```txt
Week 1:
Mon Tue Wed Thu Fri Sat Sun Next 1 Next 2

Week 2:
Mon Tue Wed Thu Fri Sat Sun Next 1 Next 2
```

Recommendation:

```txt
Use Week 1 / Week 2 section headings.
Inside each week use Mon / Tue / Wed / Thu / Fri / Sat / Sun / Next 1 / Next 2.
```

## 7. Source Asset Requirements

### Week Pack

```txt
Target: 9 selected assets
Minimum usable: 9
```

### Extended Pack

```txt
Target: 18 selected assets
Minimum usable: 18
```

Important rule:

```txt
Do not fill Extended Pack by duplicating the same 9 demo images unless clearly marked as fallback.
```

Prototype options:

```txt
Option A: Add more demo assets until there are 18 unique images.
Option B: Extended Pack works only with uploaded assets.
Option C: Use current demo assets but mark Extended Pack as preview-only until more assets exist.
```

Recommended path:

```txt
Add or prepare 18 unique demo assets before enabling full Extended Pack visually.
```

## 8. Library Behavior

Library should get a planning mode selector:

```txt
Planning mode
Week Pack - 9 posts
Extended Pack - 18 posts
```

For 9-post mode:

```txt
9 selected
Add to Smart Mix
```

For 18-post mode:

```txt
18 selected
Build Extended Pack
```

If there are not enough assets:

```txt
Add 18 images to build an Extended Pack.
```

Recommended placement:

```txt
top action area near Add to Smart Mix
or intake status strip
```

Do not hide this as an advanced setting. It changes the core planning object.

## 9. Smart Mix Behavior

Smart Mix needs the most careful design because candidate comparison can become dense very quickly.

### 9-post mode

Current behavior can stay:

```txt
3 candidate cards
each shows 3x3 grid
selected candidate is obvious
```

### 18-post mode

Do not show three huge 18-image candidate cards equally.

Recommended layout:

```txt
Selected candidate:
Week 1 3x3
Week 2 3x3

Alternative candidates:
compact preview
Use this mix
Improve
```

Possible desktop structure:

```txt
Left / main:
Selected Extended Pack candidate
- Week 1 board
- Week 2 board

Right / below:
Alternative rhythms
- Candidate 02 compact
- Candidate 03 compact
```

User-facing labels:

```txt
Selected for Planner
18-post rhythm
Week 1
Week 2
```

Smart Mix should remain visual-first, not a scoring dashboard.

## 10. Planner Behavior

Planner is the natural home for 18-post planning.

### 9-post mode

Current board remains:

```txt
Publishing Board
9 slots
Feed Preview
```

### 18-post mode

Recommended Planner UX:

```txt
Publishing Board
Extended Pack - 18 posts

Tabs:
Week 1
Week 2
All 18
```

Default view:

```txt
Week 1
```

User can switch to:

```txt
Week 2
All 18 Preview
```

Desktop options:

```txt
Option A:
tabs + one 3x3 board at a time + phone preview

Option B:
Week 1 and Week 2 side by side + preview
```

Recommendation:

```txt
Start with tabs to avoid clutter.
```

Caption/export context:

```txt
This order drives Captions and Export.
```

## 11. Captions Behavior

Captions should not show 18 posts at once.

Required structure:

```txt
Week selector:
Week 1 / Week 2

Post selector:
Post #1-#9 or Post #10-#18

Caption Composer:
same current composer
```

For Extended Pack:

```txt
Week 1 - Post #3
Week 2 - Post #14
```

The composer should stay focused on one selected post. Do not duplicate composer controls for all 18.

## 12. Export Behavior

### 9-post export

Current Export:

```txt
Final 3x3
01-09
Download ZIP
```

### 18-post export

Target:

```txt
Final Extended Pack
18 posts

Week 1
01-09

Week 2
10-18

Download ZIP
```

Potential ZIP structures:

```txt
images/01-18/
captions.txt
hashtags.txt
captions.csv
manifest.json
README.txt
```

Or:

```txt
images/week-1/01.jpg ... 09.jpg
images/week-2/10.jpg ... 18.jpg
```

Recommended first implementation:

```txt
Keep flat 01-18 order in ZIP.
Use manifest.json to mark weekIndex.
```

This keeps export consistency while preserving week context for downstream tools.

## 13. Media Converter Handoff Behavior

For 9-post mode:

```txt
Export -> Media Converter handoff sends 9 final images
```

For 18-post mode:

```txt
Export -> Media Converter handoff sends 18 final images
```

Media Converter does not need a new UI mode. It already supports a batch queue.

The handoff notice should say:

```txt
Extended Pack images added to local queue.
18 images ready.
```

No additional conversion UI changes are required initially.

## 14. Client Review Behavior

Client Review is a major value point for Extended Pack.

### 9-post review

Current:

```txt
Final 3x3
post details
approve/request changes
```

### 18-post review

Target:

```txt
Client Review
Extended Pack - 18 posts

Tabs:
Week 1
Week 2
All 18

Review summary:
18 posts
captions included
export pack ready
```

Client can approve:

```txt
Approve Extended Pack
Request changes
```

Later production:

```txt
approve per week
comments per post
version history
```

For the prototype:

```txt
local approval state only
```

## 15. Bio Builder / Profile Handoff Behavior

Bio Builder should not become 18-post heavy.

For Extended Pack:

```txt
Profile preview can show first 9 posts or latest 9 from the 18-post pack.
```

Recommended:

```txt
Use first 9 / Week 1 for profile grid preview by default.
Add small badge: Extended Pack source.
```

Do not show all 18 inside the phone profile grid unless the design supports it clearly.

## 16. User Cabinet Behavior

Cabinet should show pack size in the project history and current pack object.

Examples:

```txt
Week Pack 01
9 posts - Draft saved

Extended Pack 02
18 posts - Week 1 + Week 2 - In progress
```

Usage later:

```txt
Week Packs: 1 / 3
Extended Packs: Pro feature
```

For now, this is documentation only. No cabinet code changes are included in this task.

## 17. Store / State Migration Strategy

The current prototype likely assumes 9 slots in several places. Risks to audit before implementation:

```txt
selected assets count
bestMixId
planner slots
captions anchor
export filenames
client review handoff
media converter handoff
bio builder grid
```

Implementation must avoid hard-coding `9` throughout the flow.

Recommended internal helper:

```ts
const PACK_SLOT_COUNTS = {
  "week-pack": 9,
  "extended-pack": 18,
} as const;
```

Helper functions:

```ts
getPackSlotCount(mode)
getWeekIndexForSlot(slotIndex)
getWeekSlotIndex(slotIndex)
getPostNumber(slotIndex)
splitSlotsByWeek(slots)
```

Introduce helpers before rewriting major UI screens.

## 18. Implementation Phases

Do not implement everything at once.

### Task 32 - Pack Size State + Library Selector

```txt
Add pack mode state
Add Library selector
Keep 9 mode as default
No downstream rewrite yet
```

### Task 33 - Extended Pack Demo Assets / Slot Helpers

```txt
Add 18 unique demo assets or prepare fallback
Add pack slot helper functions
No UI complexity
```

### Task 34 - Smart Mix 18-Post Candidate Layout

```txt
Selected candidate shows Week 1 + Week 2
Alternatives stay compact
No debug metrics
```

### Task 35 - Planner Week 1 / Week 2 Board

```txt
Planner tabs
Week 1 / Week 2
All 18 preview
```

### Task 36 - Captions 18-Post Navigation

```txt
Week selector
Post selector
same composer
```

### Task 37 - Export / Handoffs 18-Post Support

```txt
Export 01-18
Media Converter handoff sends all 18
Client Review supports Week 1 / Week 2
```

### Task 38 - Pricing / Landing Messaging

```txt
Add Extended Pack as Pro-preview value layer
No billing yet
```

## 19. Risks

### UI Overload

Risk:

```txt
18 posts makes every page too dense.
```

Mitigation:

```txt
Use Week 1 / Week 2 tabs.
Show all 18 only in review/export contexts.
```

### Demo Asset Shortage

Risk:

```txt
18 mode looks fake if the same 9 images repeat.
```

Mitigation:

```txt
Add 18 unique demo assets or keep Extended Pack upload-only until assets exist.
```

### Store Complexity

Risk:

```txt
Existing 9-slot assumptions break.
```

Mitigation:

```txt
Introduce helper functions before UI rewrite.
```

### Monetization Confusion

Risk:

```txt
Users think 18 mode is free forever.
```

Mitigation:

```txt
Label as Pro preview in prototype.
```

### Smart Mix Overload

Risk:

```txt
3 candidates x 18 images becomes unreadable.
```

Mitigation:

```txt
Selected expanded, alternatives compact.
```

## 20. Open Decisions

Unresolved questions:

```txt
1. Do we add 18 unique demo assets now?
2. Should Extended Pack be visible in Free Beta or marked Pro preview?
3. Should Export ZIP be flat 01-18 or split into week folders?
4. Should Planner default to Week 1 tab or All 18 view?
5. Should Client Review approve whole Extended Pack or per-week later?
6. Should Bio Builder use Week 1 only or latest 9 posts from Extended Pack?
```

## 21. Recommendation

Recommendation: proceed with 9 vs 18 planning, but implement it in phases. Do not add a simple toggle without adapting Smart Mix, Planner, Captions, Export, and Client Review.

Immediate next task:

```md
Task 32 - Pack Size State + Library Selector
```

Only start implementation after this architecture document is reviewed.
