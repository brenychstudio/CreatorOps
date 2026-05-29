# CreatorOps Auth Provider Decision

## 1. Decision

Decision: Use Supabase Auth as the first authentication provider for CreatorOps SaaS v1.

CreatorOps will use Supabase Auth for the first SaaS implementation, with:

- Google OAuth login.
- Email login, likely magic link or email-based sign-in.
- Supabase Postgres for Week Pack data.
- Supabase Storage or compatible storage for user assets.
- Row Level Security for user-owned data.

Supabase gives CreatorOps a connected MVP path for auth, Postgres data, Row Level Security, and storage. This is better for the first SaaS foundation than splitting auth, database, and storage across separate vendors too early.

## 2. Current Product Context

CreatorOps currently has:

- landing page
- product story
- prototype workspace
- `/app` user cabinet shell
- Week Pack workflow
- Cloudflare deployment
- AI endpoint prepared

CreatorOps does not yet have:

- user accounts
- login
- saved Week Packs
- user-owned database records
- asset storage per user
- billing/subscription connection

## 3. Why Supabase First

Supabase is the recommended first provider because it gives the MVP one coherent foundation:

- Google login support.
- Email login support.
- Postgres database included.
- Storage path available.
- RLS model fits user-owned Week Packs.
- Faster MVP path.
- Fewer vendors at the first SaaS stage.
- Easier connection between `auth.uid()` and user-owned rows.

This is a practical choice, not a permanent lock-in. The priority for CreatorOps v1 is to move from a premium workspace shell to account-owned Week Packs without creating unnecessary vendor complexity.

## 4. Why Not Clerk First

Clerk is a strong auth provider and may offer a polished authentication UX. However, for CreatorOps v1 it would still require a separate database and storage layer. Since the next major step is database-backed Week Packs, Supabase provides a more unified MVP path.

Clerk can be reconsidered later if CreatorOps needs more advanced auth UX, organizations, enterprise SSO, or team management.

## 5. Auth Scope for SaaS v1

Auth scope for the first SaaS version:

- `/sign-in` page
- Sign in with Google
- email magic link or email login
- session persistence
- sign out
- protected `/app` route later
- user profile basics

Out of scope for the first auth implementation:

- teams
- organizations
- roles
- enterprise SSO
- billing-gated route protection
- admin console
- Instagram OAuth

Google login is only identity login. It does not require Gmail API access.

## 6. Public vs Protected Routes

Public routes:

- `/`
- `/story`
- `/prototype/library`
- `/prototype/smart-mix`
- `/prototype/planner`
- `/prototype/captions`
- `/prototype/export`
- `/prototype/bio-builder`

Future protected routes:

- `/app`
- `/app/packs`
- `/app/packs/:packId`
- `/app/settings`
- `/app/billing`

For early implementation, `/app` may remain publicly visible as a shell until auth is wired. Once Supabase Auth is working, `/app` should become account-aware, then protected.

Prototype routes should remain public during the transition so the existing workspace demo does not break while SaaS routes become database-backed.

## 7. Environment Variables

Frontend-safe variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`

Rules:

- Never commit `.env`.
- Never expose the service role key in frontend code.
- The anon key is frontend-safe only with RLS enabled.
- Production secrets should be configured in Cloudflare environment variables.

## 8. Google OAuth Setup Requirements

Later Google OAuth setup will require:

- Supabase project.
- Google Cloud project.
- OAuth consent screen.
- OAuth client ID.
- OAuth client secret.
- Authorized JavaScript origins.
- Authorized redirect URI from Supabase.
- Local development redirect.
- Production domain redirect.

Required scopes:

- `openid`
- `email`
- `profile`

No extra Google scopes are required for v1.

## 9. Database Ownership Model

Every user-owned table must include `user_id` and must be protected with Row Level Security.

Tables affected later:

- `workspaces`
- `week_packs`
- `assets`
- `smart_mixes`
- `planner_slots`
- `captions`
- `exports`
- `bio_packs`
- `usage_events`
- `subscriptions`

Ownership rule:

- Users can only select rows where `user_id = auth.uid()`.
- Users can only insert rows where `user_id = auth.uid()`.
- Users can only update rows where `user_id = auth.uid()`.
- Users can only delete rows where `user_id = auth.uid()`.

No SQL implementation is part of this task.

## 10. Auth Implementation Roadmap

Next tasks after this decision record:

- Task 22B - Supabase Project Setup Checklist
- Task 22C - Sign-in Shell UI
- Task 22D - Supabase Client Setup
- Task 22E - Session Provider / Auth State
- Task 22F - Account-aware `/app` shell
- Task 23 - Database Schema / Week Pack Model

Do not protect `/app` before basic sign-in and sign-out are tested.

## 11. Risks

Risks:

- Misconfigured OAuth redirect URLs.
- Exposing the service role key.
- Forgetting RLS on public tables.
- Auth route loops.
- Breaking public prototype access.
- Mixing mock cabinet state with real user state too early.

Mitigation:

- Keep prototype routes public.
- Add auth behind `/app` only after session flow works.
- Keep service role server-only.
- Verify RLS before user data storage.
- Implement in small tasks.

## 12. Final Recommendation

Recommendation: proceed with Supabase Auth for CreatorOps SaaS v1.

Next task: Task 22B - Supabase Project Setup Checklist.

## Sources

- Supabase Auth Google provider docs: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Row Level Security docs: https://supabase.com/docs/guides/database/postgres/row-level-security
