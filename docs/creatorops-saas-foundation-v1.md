# CreatorOps SaaS Foundation v1

User Cabinet, Auth, Week Pack Data Model, Billing Path, and Security Baseline

## 1. Current Product Status

CreatorOps is currently a premium product workspace demo / pre-SaaS alpha. The product has a polished export-first workflow, but it is not yet an account-based SaaS.

Current product flow:

```txt
Library -> Smart Mix -> Planner -> Captions -> Export -> Profile Handoff
```

What already exists:

```txt
- live landing page
- product story page
- premium workspace prototype
- Week Pack concept
- Smart Mix decision stage
- Planner publishing board
- Caption Composer
- Export ZIP
- Bio Builder / Profile Handoff
- Cloudflare deployment
- Cloudflare-safe AI endpoint prepared
```

What is not production SaaS yet:

```txt
- no user accounts
- no Google login
- no persistent database
- no saved Week Packs
- no user asset storage
- no billing
- no customer dashboard
- no usage limits
- no production AI key connected
- no legal pages for paid launch
```

## 2. SaaS v1 Product Goal

CreatorOps v1 is an export-first creator workflow SaaS.

Core promise:

```md
Turn scattered creator assets into a ready-to-publish Week Pack.
```

SaaS v1 should include:

```txt
- account-based workspace
- Google login / email login
- user cabinet
- saved Week Packs
- asset upload and storage
- Smart Mix
- Planner
- Caption Composer
- Export ZIP
- Profile Handoff / Bio Pack
- Free / Pro usage limits
- Stripe-ready billing architecture
```

Out of scope for v1:

```txt
- Instagram auto-publishing
- publishing queue
- analytics
- team approvals
- advanced agency dashboard
- native mobile app
- full calendar scheduler
```

## 3. User Journey

Primary user path:

```txt
1. User lands on CreatorOps homepage.
2. User opens workspace demo or signs in.
3. User creates a new Week Pack.
4. User uploads or selects visual assets.
5. Smart Mix creates candidate rhythms.
6. User selects the best mix.
7. Planner turns it into a publishing board.
8. Caption Composer creates or refines captions.
9. Export creates ZIP pack.
10. Profile Handoff creates Bio Pack.
11. User returns to Cabinet to manage saved packs.
```

First-time flow:

```txt
Landing -> Open workspace -> Create first Week Pack -> Export ZIP -> Join / Sign in to save
```

The workspace can remain tryable before full registration. Saving Week Packs, returning to history, usage limits, exports tied to a user, and billing must require an account.

## 4. User Cabinet / Dashboard

Main route:

```txt
/app
```

Main sections:

```txt
- Create Week Pack
- Recent Week Packs
- Recent Exports
- Usage
- Plan
- Brand/Profile Settings
- Billing
```

Dashboard card examples:

```txt
Week Pack 01 - Draft saved - 9 assets - captions ready
Week Pack 02 - Exported - ZIP ready
Week Pack 03 - In progress
```

Primary actions:

```txt
Create Week Pack
Continue last pack
Open recent export
Open Profile Handoff
Manage billing
```

Suggested dashboard layout:

```txt
Top shell:
CreatorOps
Workspace
Plan
Usage
Settings

Main:
Create Week Pack
Recent Week Packs
Usage / Credits
Billing status
```

## 5. Future Route Map

Current public/prototype routes:

```txt
/                              Landing
/story                         Product story
/prototype/library             Demo workspace
/prototype/smart-mix
/prototype/planner
/prototype/captions
/prototype/export
/prototype/bio-builder
/prototype/sequence            Redirect to planner
```

Future SaaS routes:

```txt
/sign-in                       Auth entry
/sign-up                       Optional auth entry
/app                           User cabinet
/app/packs                     Week Pack list
/app/packs/new                 Create new Week Pack
/app/packs/:packId             Pack overview
/app/packs/:packId/library
/app/packs/:packId/smart-mix
/app/packs/:packId/planner
/app/packs/:packId/captions
/app/packs/:packId/export
/app/packs/:packId/profile-handoff
/app/settings                  User settings
/app/billing                   Billing
/pricing                       Pricing page
/security                      Security / trust page
```

Migration rule:

```md
Prototype routes should remain available until the database-backed app routes are stable.
```

## 6. Auth Architecture

Requirements:

```txt
- Google login
- email login
- secure sessions
- user-owned data
- protected app routes
- billing identity connection
```

Provider options:

```txt
Option A - Supabase Auth
Option B - Clerk
Option C - Firebase Auth
Option D - custom Auth.js-style setup
```

Recommended first option:

```md
Recommended first option: Supabase Auth + Postgres + Storage.
```

Alternative:

```md
Alternative: Clerk for authentication + Supabase/Neon/Postgres for data + Cloudflare R2 for storage.
```

Decision criteria:

```txt
- implementation speed
- Google OAuth support
- session handling
- database integration
- pricing
- developer experience
- future scalability
```

Important note:

```md
Google login means Sign in with Google / OAuth identity. It does not require Gmail API access.
```

No implementation should happen in this task.

## 7. Week Pack Data Model

The Week Pack is the main product object. It connects uploaded visual assets, Smart Mix candidates, final planner slots, captions, export metadata, profile handoff output, and usage events.

### users

```txt
id
email
name
avatar_url
created_at
updated_at
plan
```

Purpose:

```txt
Stores account identity, display profile, and current plan tier.
```

### workspaces / brands

```txt
id
user_id
name
handle
category
audience
offer
voice_preset
created_at
updated_at
```

Purpose:

```txt
Stores brand/profile context used by captions and Profile Handoff.
```

### week_packs

```txt
id
user_id
workspace_id
title
status
selected_mix_id
created_at
updated_at
exported_at
```

Statuses:

```txt
draft
assets_added
mix_selected
board_ready
captions_ready
export_ready
exported
```

Purpose:

```txt
Main product object.
```

### assets

```txt
id
week_pack_id
user_id
storage_path
preview_url
filename
width
height
mime_type
file_size
series
tags
created_at
```

Purpose:

```txt
Uploaded or selected visual assets.
```

### smart_mixes

```txt
id
week_pack_id
score
status
candidate_order
selected
created_at
updated_at
```

Purpose:

```txt
Stores candidate 3x3 mixes and selected mix.
```

### smart_mix_items

```txt
id
smart_mix_id
asset_id
position
locked
tune_flag
created_at
```

Purpose:

```txt
Stores the order and metadata for each candidate grid.
```

### planner_slots

```txt
id
week_pack_id
asset_id
slot_index
day_label
created_at
updated_at
```

Slot labels:

```txt
Mon
Tue
Wed
Thu
Fri
Sat
Sun
Next 1
Next 2
```

Purpose:

```txt
Final publishing board order.
```

### captions

```txt
id
week_pack_id
asset_id
slot_index
caption_text
cta_text
hashtags
tone
length
source
created_at
updated_at
```

Source values:

```txt
manual
fallback
openai
```

Purpose:

```txt
Caption, CTA, and hashtag data for export.
```

### exports

```txt
id
week_pack_id
zip_url
manifest_url
status
created_at
```

Statuses:

```txt
pending
ready
failed
downloaded
```

Purpose:

```txt
Stores generated export package metadata.
```

### bio_packs

```txt
id
week_pack_id
workspace_id
bio_text
cta_text
profile_preview_state
download_url
created_at
updated_at
```

Purpose:

```txt
Profile Handoff output.
```

### usage_events

```txt
id
user_id
event_type
count
metadata
created_at
```

Event types:

```txt
ai_caption_generation
export_zip
asset_upload
bio_pack_download
```

Purpose:

```txt
Tracks usage for Free / Pro limits.
```

### subscriptions

```txt
id
user_id
stripe_customer_id
stripe_subscription_id
plan
status
current_period_end
created_at
updated_at
```

Purpose:

```txt
Billing and plan state.
```

## 8. Storage Architecture

Storage options:

```txt
Supabase Storage
Cloudflare R2
S3-compatible storage
```

Recommended MVP if using Supabase:

```txt
Supabase Storage
```

Recommended if staying Cloudflare-heavy:

```txt
Cloudflare R2
```

Storage rules:

```txt
- user uploads private by default
- image-only uploads for v1
- signed upload URLs
- signed preview URLs or scoped access
- file size limits by plan
- MIME validation
- max asset count per Week Pack by plan
```

Initial limits:

```txt
Free: 12 images per pack, 3 packs/month
Pro: 30 images per pack, unlimited packs
Studio: 60 images per pack, multiple brands
```

## 9. AI Usage Architecture

Even if the live OpenAI key is postponed, the production architecture should be designed now.

Principles:

```txt
- AI runs server-side only
- API key never reaches frontend
- each generation creates a usage_event
- fallback draft works if AI is unavailable
- Free plan has monthly generation limits
```

Initial monthly limits:

```txt
Free: 20 caption generations
Creator Pro: 200 caption generations
Studio: 800 caption generations
```

AI endpoint route:

```txt
/api/generate-captions
```

Future required checks:

```txt
- authenticated user
- active plan
- usage limit not exceeded
- input validation
- rate limiting
```

## 10. Pricing Draft

First pricing model:

```txt
Free Beta - $0
Creator Pro - planned $12/month
Studio - planned $29/month
```

### Free Beta

```txt
3 Week Packs/month
12 assets per pack
20 caption generations/month
ZIP export
Profile Handoff
limited saved history
```

### Creator Pro

```txt
unlimited Week Packs
30 assets per pack
200 caption generations/month
saved pack history
larger uploads
Bio Pack exports
```

### Studio

```txt
multiple brand profiles
60 assets per pack
800 caption generations/month
brand presets
client-ready exports
larger storage
priority workflow features
```

Important note:

```md
Pricing should stay marked as planned until Stripe billing is live.
```

## 11. Billing Architecture

Stripe path for paid launch:

```txt
Stripe Checkout
Stripe Customer Portal
Stripe Webhooks
Plan limit syncing
Subscription status checks
```

Webhook events:

```txt
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

Billing routes:

```txt
/app/billing
/api/stripe/create-checkout-session
/api/stripe/webhook
/api/stripe/customer-portal
```

No implementation should happen now.

## 12. Security Baseline

Security baseline:

```txt
- server-side secrets only
- no API keys in frontend
- auth-required app routes
- user ownership checks
- row-level security if using Supabase
- private file storage
- signed upload URLs
- signed or scoped preview URLs
- input validation
- file type validation
- file size limits
- AI endpoint rate limiting
- Stripe webhook signature verification
- no sensitive logs
- backup / recovery plan
```

Legal pages required before paid launch:

```txt
Terms of Service
Privacy Policy
Cookie Policy if needed
Refund Policy
Data deletion request path
```

## 13. Migration Plan From Prototype to SaaS

Current:

```txt
/prototype/* uses local/demo state.
```

Future:

```txt
/app/packs/:packId/* uses database-backed state.
```

Migration principle:

```md
Do not rewrite the prototype immediately. Create SaaS app routes beside the prototype, reuse UI components carefully, and migrate state gradually from local demo store to database-backed hooks.
```

Phases:

```txt
Phase 1 - User Cabinet Shell with mock saved packs
Phase 2 - Auth provider setup
Phase 3 - Database schema
Phase 4 - Week Pack create/read/update
Phase 5 - Asset upload/storage
Phase 6 - Data-backed Library / Smart Mix / Planner
Phase 7 - Saved Captions and Export state
Phase 8 - AI usage limits
Phase 9 - Billing limits
Phase 10 - Prototype-to-app route cleanup
```

## 14. Implementation Roadmap

Next development tasks:

```txt
Task 21 - User Cabinet Shell
Task 22 - Auth Provider Decision + Setup
Task 23 - Database Schema / Week Pack Model
Task 24 - Asset Upload + Storage
Task 25 - Save Week Pack State
Task 26 - Data-backed Smart Mix / Planner
Task 27 - AI Usage Limits
Task 28 - Stripe Billing Architecture
Task 29 - Landing / Auth / Pricing Connection
Task 30 - Security QA
```

Each task should have its own scope later.

## 15. Open Decisions

Unresolved decisions:

```txt
Auth provider: Supabase vs Clerk
Storage: Supabase Storage vs Cloudflare R2
Database: Supabase Postgres vs Neon/Postgres
Billing launch timing
Free plan limits
Whether workspace demo remains available without login
Whether saving requires account immediately or after first export
```

## 16. Recommended Immediate Next Task

Recommended next implementation task: Task 21 - User Cabinet Shell.

Reason:

```md
The cabinet can be built first with mock saved packs, without introducing auth or database immediately. This creates the SaaS navigation structure while keeping the current prototype stable.
```
