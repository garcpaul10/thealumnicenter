# CLAUDE.md — The Alumni Center

> This is the living operational reference for this repo. **Read this file first, every session.** `DESIGN.md` is the historical brainstorming record that produced these decisions — it's kept for context but this file is what governs day-to-day work. Any change to architecture, conventions, or the standing rules below gets reflected here in the same commit as the change that caused it, never as a follow-up.

---

## 1. Standing rules (permanent — apply to every session, every commit)

These are not one-time setup tasks. Re-read and follow them every session.

1. **`CLAUDE.md` maintained from commit one.** This file. Keep it current with architecture, conventions, ledger invariants — everything a fresh Claude Code session needs without prior chat history.
2. **Transferability is a top priority, on par with correctness.** This system must be handoff-ready — new GitHub org, new Railway account, new Vercel account, zero shared history — at any point, not just at some future "handoff phase."
3. **`README.md`** must let a new developer with nothing but repo access get the full stack running locally, top to bottom. Update it the same commit any setup step changes.
4. **No hardcoded secrets or account-specific values, ever.** No API keys, Stripe IDs, Railway/Vercel project refs, phone numbers, or domain names in code. Everything account-specific comes from env vars. `.env.example` gets a new var in the same commit that introduces the code reading it, with a comment on what it is and where to get it.
5. **Schema is fully reproducible from migrations, never hand-edited.** No manual schema changes via a GUI. Fresh Postgres + `pnpm db:migrate` + `pnpm db:seed` must produce a working dev environment.
6. **`docs/DEPLOYMENT.md`** — exact steps to stand up the whole system on brand-new Railway/Vercel/Stripe/Twilio accounts. If it can't live in code, it lives here.
7. **`docs/HANDOFF.md`** — the transfer checklist: what changes hands, what credentials rotate, and the order to do it in.
8. **Nothing lives only in a dashboard.** Any Railway/Vercel/Stripe/Twilio dashboard config gets written into `docs/DEPLOYMENT.md` the same day it's configured.
9. **Transfer-blocker audit before every milestone** (end of each build-order phase, see §6 below). Check for: hardcoded values, undocumented dashboard config, stale `.env.example`, stale `CLAUDE.md`. Fix before moving on.
10. **Ask before making a product decision not already resolved in `DESIGN.md`.** Make technical implementation decisions independently and document them here (§4).

---

## 2. What this system is

A multi-sport athletic facility where members buy **tokens** (Dave & Buster's-style economy) and spend them across walk-ins, leagues, camps, free play, reservations, and lessons. Each participant (not account) carries a **wallet** and a QR-code digital membership card ("The Alumni Card") scanned at activity stations. Full spec: `DESIGN.md`.

**Brand:** The Alumni Center. Primary color `#0F5898`. Logo at [`brand/alumni-center-logo.png`](brand/alumni-center-logo.png). Collegiate/varsity visual direction.

---

## 3. Core architecture decisions (from DESIGN.md §3)

- **Ledger-based tokens.** Every purchase/redemption/refund/bonus/transfer/adjustment is an immutable row in `token_ledger`. Balance is always `SUM(amount)` for a participant — never a stored mutable counter.
- **Single write path.** Only [`apps/api/src/ledger/ledger-service.ts`](apps/api/src/ledger/ledger-service.ts) may insert into `token_ledger` or `points_ledger`. No other code path, migration, or script does this — the seed script calls `recordPurchase()` rather than inserting directly, and that's the pattern every future feature must follow.
- **Ledger rows are never updated or deleted.** Corrections are new offsetting rows (`refund`, `adjustment`). The ledger service exposes no update/delete functions by design (this is asserted in `ledger-service.test.ts`).
- **Per-participant wallets** (D&B Power Card model), not one pooled account wallet. Account view = display-only rollup across participants. Transfers between participants of the *same* account are free, instant, and produce paired net-zero rows.
- **All credit logic lives on the backend (Railway/`apps/api`).** Frontends are thin clients — they never compute or mutate balances.
- **Rotating QR tokens** (not yet implemented — Phase 3/4). QR encodes a short-lived signed token, never a raw member ID.
- **Concurrency safety:** ledger writes for a given participant are serialized within a transaction via `pg_advisory_xact_lock(hashtext(participant_id))`, so balance checks can't race with a concurrent write to the same participant.
- **No overlapping reservations per space**, enforced at the DB level via a Postgres `EXCLUDE USING gist` constraint (requires `btree_gist`) on `reservations` — not application code. See `packages/db/migrations/0001_reservation_no_overlap.sql`.
- **Every redemption has a beneficiary** (`house` / `vendor:{id}` / `coach:{id}`) via `token_ledger.beneficiary_partner_id` — this one column powers concessions, vendors, and coach payouts.
- **Loyalty points are a separate currency**, earned on token *spend* (not purchase), own append-only `points_ledger` mirroring the token ledger's invariants and single-write-path rule.
- **Sports are data, not code** — admin-managed via the `sports` table, no deploy needed to add one.
- **Offerings are the universal purchasable unit** (walk-in, free_play_pass, league, camp, reservation, lesson, clinic) — one shape for everything with a token cost.

---

## 4. Technical decisions made during build (not in DESIGN.md — decided here)

| Decision | Choice | Reasoning |
|---|---|---|
| Package manager | pnpm workspaces | Fast, disk-efficient, standard for TS monorepos |
| ORM | **Drizzle** (not Prisma) | Need raw-SQL-level control for the `EXCLUDE` constraint on `reservations` and advisory-lock ledger transactions; Drizzle's SQL-first model fits better than Prisma's abstraction layer for this kind of invariant-heavy schema |
| Backend framework | **Fastify** (not NestJS) | Lighter weight, less ceremony for a service that's mostly "ledger + REST," faster cold starts on Railway |
| Frontend framework | **Next.js everywhere** (resolves DESIGN.md open question #13) | Uniformity — one framework to reason about across marketing/web/admin/scan-station; scan-station's kiosk constraints don't need Vite's extra speed badly enough to justify a second toolchain |
| DB driver | `postgres` (postgres.js) via `drizzle-orm/postgres-js` | Simple, well-supported by Drizzle, works identically against Railway Postgres and local Homebrew Postgres |
| Test runner | Vitest | Fast, native ESM/TS support, no extra config needed for workspace `@alumni/*` packages |
| Local Postgres (dev) | Homebrew `postgresql@16`, no Docker | Docker wasn't available in the dev environment; `README.md` documents both paths |
| Calendar library (admin, Phase 2) | **Custom grid with `@dnd-kit/core`** (resolves DESIGN.md open question #21) | User chose this explicitly over FullCalendar's resource-timeline plugin (~$480/yr) to avoid a recurring vendor cost pre-revenue. See `apps/admin/app/(dashboard)/schedule/ScheduleGrid.tsx`. |
| Staff dashboard auth | Phone + password login → HS256 JWT (`jose`), stored in an httpOnly cookie set by a Next.js Server Action | Not specified in DESIGN.md (that schema's `kiosk_pin_hash` is for scan-station kiosk unlock, Phase 4, not dashboard login). Added `staff_users.password_hash` column (migration `0002_fat_vermin.sql`). Password hashing via Node's built-in `scrypt` (`apps/api/src/auth/password.ts`) — no extra dependency, adequate for staff-only login volume. |
| Admin↔API request pattern | **All API calls happen server-side** (Server Components / Server Actions in `apps/admin`), never from client-side JS | The browser only ever talks to the Next.js app; the staff JWT lives in an httpOnly cookie the client can't read. `apps/api` still has CORS configured (`ADMIN_APP_ORIGIN`) as defense-in-depth, not because it's relied on. |
| Standings formula | **Sport-specific** (resolves DESIGN.md open question #3) | User chose sport-specific over one generic formula. Basketball/pickleball: win% then point differential. Volleyball: win% then point *ratio* (not differential — matches how volleyball leagues actually break ties). Futsal: soccer-style league points (win=3/tie=1/loss=0) then goal differential. Unknown future sports fall back to the generic win%/differential formula. See `packages/shared/src/standings.ts`. |
| Team formation | **Captain self-serve** (resolves DESIGN.md open question #1) | Backend (`teams`/`team_members` endpoints) supports an optional `captainParticipantId` at creation and is ready for this now; the actual captain-facing "create team, invite by phone" UI belongs in the member PWA (Phase 3, needs phone-OTP participant auth that doesn't exist yet). Phase 2's admin dashboard has a staff-facing team/roster management view as an operational necessity in the meantime. |
| Score entry | **Staff only** (resolves DESIGN.md open question #2) | No dispute/correction workflow needed for v1. `POST /games/:id/score` requires staff auth; finalizing a score recalculates standings — see `apps/api/src/league/standings-service.ts`. |
| Enrollment capacity | **Enforced with waitlist** (resolves DESIGN.md open question #6) | `offerings.capacity` checked at enrollment time; over capacity → `status=waitlisted`, no token charge until staff promotes via `POST /enrollments/:id/promote`. See `apps/api/src/enrollments/enrollment-service.ts`. |
| Frontend stack (`apps/admin`) | Next.js 16 + React 19 + Tailwind CSS 3 | Started on Next 14.2.x/React 18 per the earlier framework decision. **`next build` currently fails — see the KNOWN ISSUE below before touching this.** Bumping to Next 16/React 19 and building with `--webpack` instead of Turbopack fixed several *other* real problems along the way (an async-`cookies()`/`params` migration, a Turbopack-specific crash) and is worth keeping regardless of the remaining issue. |

> ⚠️ **KNOWN ISSUE — `apps/admin`'s `next build` fails, unresolved.** `pnpm --filter @alumni/admin build` (equivalently `next build --webpack`) fails while statically exporting Next's own auto-generated `/_global-error` fallback page: `TypeError: Cannot read properties of null (reading 'useContext')` inside Next's *internal* `OuterLayoutRouter` component (confirmed via `--no-mangling` unminified output — this is Next's own vendored-React bundling for that one synthetic route, not application code). This blocks `next start` (the manifest it needs, `prerender-manifest.json`, is never written) — `next dev` is unaffected and was extensively verified working (login, all CRUD pages, full league flow with live standings recalculation, member lookup/comp, schedule drag-and-drop) via live browser testing.
>
> **What was tried and did not fix it:** Next 14.2.5, 14.2.35, and 16.2.10; webpack and Turbopack; React 18.3.1 and 19; pnpm default/`public-hoist-pattern`/`node-linker=hoisted` linking; a custom minimal `global-error.tsx` (from Next's own docs example) and no custom one at all; `output: "standalone"`; `--no-mangling`; `dynamic = "force-dynamic"` on/off at the root layout. The failure is 100% reproducible with a from-scratch minimal `app/layout.tsx` (no custom error/not-found files at all), so it is not caused by anything in this app's own components.
>
> **Leading theory, unverified:** this sandbox runs Node `v26.3.1` — a very new, non-LTS version outside Next's tested CI matrix (Next declares `engines.node: ">=20.9.0"` with no tested upper bound). Railway and Vercel's build infrastructure use controlled, standard Node versions and have not been confirmed to hit this. **First thing to check in a future session:** does `pnpm build` succeed on Railway/Vercel, or on a machine with Node 20/22 LTS? If yes, this was a sandbox-only artifact and this note can be deleted. If it still fails on a standard Node version, the Node-version theory is wrong and this needs real upstream investigation (or a GitHub issue filed against Next.js with the minimal repro above).
>
> **Until this is resolved:** `apps/admin` cannot be deployed to Vercel (or run via `next start` anywhere) — only `pnpm dev:admin` works. This does not affect `apps/api`, which builds and deploys to Railway successfully.

---

## 5. Assumptions made resolving DESIGN.md §5 open questions (flagging per kickoff instructions)

Phase 1 required no product-level open-question resolution (pure ledger/schema). Phase 2 required resolving four — all asked of the user before implementing, answers recorded in §4 above and DESIGN.md's own numbering: #1 (team formation → captain self-serve), #2 (score entry → staff only), #3 (standings formula → sport-specific), #6 (capacity/waitlists → enforced with waitlist). Remaining open questions (refund/cancellation policy #5, playoffs/brackets #4, free play pass tiers #7-8, most of the loyalty/rewards-store questions, split-payment questions, notification provider #31) are deferred to the phases that actually need them.

One implementation-level default was chosen without being asked (not a product decision, just a fallback for an unspecified sub-detail):
- **Points earn rate default:** 1 point per token redeemed (`pointsEarnedForRedemption()` in `packages/shared/src/token-math.ts` defaults `ratePointsPerToken` to `1`), matching DESIGN.md's own example under open question #22 ("1 pt/token redeemed"). This is a parameter, not a hardcoded constant — callable with a different rate once question #22 is actually answered.
- **Schedule block overlap check is v1-simplified:** `apps/api/src/routes/schedule-blocks.ts` rejects overlaps by comparing each block's literal `starts_at`/`ends_at`, but does not expand `recurrence_rule` (RRULE) occurrences — two *recurring* weekly blocks whose instances would collide aren't caught. Acceptable for v1 (DESIGN.md open question #9, schedule admin UI scope); flagged here for whoever builds recurrence expansion later.

---

## 6. Repo structure & build order

```
/apps
  /marketing     → public website + landing page (Next.js, SSG) → Vercel        [Phase 5]
  /web           → member PWA (Next.js) → Vercel                                 [Phase 3]
  /admin         → staff dashboard (Next.js 16 / React 19) → Vercel              [Phase 2 — built]
  /scan-station  → kiosk/staff scan app (Next.js) → Vercel                       [Phase 4]
  /api           → backend (Fastify) → Railway                                   [Phase 1 — built]
/packages
  /shared        → TypeScript types, token/points math, standings, validation   [Phase 1/2 — built]
  /db            → Drizzle schema + migrations                                  [Phase 1/2 — built]
/brand           → logo and brand assets
/docs            → DEPLOYMENT.md, HANDOFF.md
CLAUDE.md
README.md
.env.example
```

Build order (confirm with the user before starting each new phase):
1. **Ledger + API foundation** — done. Schema (31 tables), ledger service, tests, seed script.
2. **Admin dashboard** — done. Sport/space/offering/token-package/staff/vendor management, drag-and-drop schedule calendar, full league management (teams/games/scores/standings), member lookup + comps/refunds, staff phone+password auth.
3. **Member PWA** — phone OTP auth, token purchase (Stripe), The Alumni Card, browse/purchase offerings, split payments, "what's open now", PWA installability.
4. **Scan-station app** — kiosk + staff PIN modes, three-way scan resolution, vendor POS mode, device-to-space binding.
5. **Marketing site** — can be built in parallel with any other phase.
6. **Vendor/coach settlement + notifications** — Stripe Connect, settlement job, web push + SMS.

---

## 7. Ledger service — how to use it

Import from `apps/api/src/ledger/ledger-service.ts`. Every function runs inside its own DB transaction and takes a `Db` (from `@alumni/db`) as the first argument.

- `recordPurchase(db, { accountId, participantId, tokensGranted, bonusTokens?, stripePaymentIntentId?, ... })` — call only after Stripe webhook settlement, never client-side confirmation (not yet wired to Stripe — Phase 3).
- `recordRedemption(db, { accountId, participantId, amountTokens, beneficiary?, referenceType, referenceId, ... })` — checks balance, throws `InsufficientBalanceError` if insufficient, auto-earns points.
- `recordRefund(db, { ..., amountTokens, referenceType, referenceId, note, ... })` — new offsetting credit row, never mutates the original.
- `recordTransfer(db, { accountId, fromParticipantId, toParticipantId, amountTokens, ... })` — same-account only, throws `CrossAccountTransferError` otherwise.
- `recordAdjustment(db, { ..., amountTokens (signed), note (required), ... })` — staff corrections.
- `getParticipantBalance`, `getParticipantPointsBalance`, `getAccountTokenRollup` — read helpers, always derived from `SUM()`.

**Do not** import `tokenLedger`/`pointsLedger` from `@alumni/db` anywhere else to `.insert()` into them. If a new feature needs to move tokens, add a function to `ledger-service.ts` or call an existing one.

---

## 8. Admin API surface + auth (Phase 2)

All routes except `/health` and `POST /auth/login` require `Authorization: Bearer <staff JWT>` (`requireStaffAuth`); mutating catalog/staff/partner routes additionally require `role=admin` (`requireAdminAuth`). See `apps/api/src/auth/middleware.ts`.

- `POST /auth/login`, `GET /auth/me`
- `GET/POST/PATCH /sports`, `/spaces`, `/token-packages`, `/partners`, `/staff-users` (admin-only), `/offerings` (+ `GET /offerings/:id`)
- `GET/POST/PATCH/DELETE /schedule-blocks` — `?spaceId=&from=&to=` filters; rejects overlaps (see §5 simplification note)
- `GET/POST /teams`, `/teams/:id/members`, `DELETE /teams/:id/members/:participantId`
- `GET/POST/PATCH /games`, `POST /games/:id/score` (staff-only, finalizing recalculates standings)
- `GET /offerings/:offeringId/standings` — always recomputed, never hand-edited
- `GET/POST /enrollments`, `POST /enrollments/:id/promote` (waitlist → enrolled, charges now), `POST /enrollments/:id/withdraw`
- `GET /members/search?q=`, `GET /members/:accountId`, `GET /participants/:participantId/ledger`
- `POST /participants/:participantId/comp` (ledger adjustment), `POST /participants/:participantId/refund` (ledger refund)

`apps/admin` never calls these from client-side JS — every call is server-side (Server Component fetch or Server Action) using the staff JWT from an httpOnly cookie (`apps/admin/lib/session.ts`, `apps/admin/lib/api.ts`).

---

## 9. Testing & local dev

- `apps/api` tests run against a real Postgres database (`TEST_DATABASE_URL`), not mocks — the ledger's correctness depends on real transactional/locking behavior that mocks can't verify.
- `beforeEach` truncates all tables in the test DB. This is a test-harness concern only; it does not violate the "ledger rows are never updated/deleted" production invariant.
- `apps/api`'s `vitest.config.ts` sets `fileParallelism: false` — all test files share one physical test DB and isolate via truncate; running files in parallel races those truncates (caused real, confusing failures during Phase 2 until this was set — see changelog).
- See `README.md` for full local setup, including running `apps/admin` alongside `apps/api`.

---

## 10. Changelog

| Date | Change |
|---|---|
| 2026-07-03 | Phase 1 complete: monorepo skeleton, `CLAUDE.md`/`README.md`/`.env.example` bootstrapped, full 31-table schema migrated (Drizzle), token ledger service with single-write-path invariant + advisory-lock concurrency safety, 9 passing ledger tests against a real Postgres DB, seed script (sport/space/schedule block/token package/staff user/test account with 2 participants, funded via the real ledger path) |
| 2026-07-03 | Pushed to GitHub (`garcpaul10/thealumnicenter`). Deployed `apps/api` + Postgres to Railway (project `the-alumni-center`), fully via CLI — no dashboard clicks, config lives in `railway.json`. Fixed a real production bug caught before shipping: `apps/api`'s plain-`tsc` build produced a `dist/server.js` that couldn't import `@alumni/db`/`@alumni/shared` at runtime (those packages ship raw TS source, no dist of their own) — switched to `tsup` bundling those two workspace packages in (`apps/api/tsup.config.ts`). Migrations run successfully against the live Railway Postgres (31 tables confirmed). Vercel intentionally deferred until Phase 2 produces an actual frontend app to deploy. |
| 2026-07-03 | **Phase 2 mostly complete: admin dashboard — one known build issue open, see below.** Resolved 4 product open questions with the user (team formation, score entry, standings formula, capacity/waitlist — see §4/§5). Backend: staff phone+password auth (JWT), full CRUD for sports/spaces/schedule-blocks/offerings/token-packages/partners/staff-users, league management (teams/games/scores/sport-specific standings, recalculated on finalize), enrollments with capacity+waitlist, member lookup + comps/refunds via the existing ledger service, 15 new tests (18 total in apps/api, 33 across the workspace). Added `staff_users.password_hash` (migration `0002_fat_vermin.sql`). Fixed a real transaction-atomicity gap caught before merging: `createEnrollment` was calling `recordRedemption` and inserting the enrollment row as two separate DB calls — wrapped both in one outer transaction (ledger service functions now accept a transaction, not just a top-level `Db`, to support nesting). Frontend: `apps/admin` (Next.js 16.2.10 + React 19 + Tailwind), login, full nav, all management pages, and a custom drag-and-drop schedule calendar (`@dnd-kit/core`, courts×time grid) — every feature verified end-to-end in a real browser via `next dev` (login, sports CRUD, full league flow including live standings recalculation, member lookup + comp, schedule block create/move/edit/delete). **`next build` for apps/admin does not currently succeed** — see the KNOWN ISSUE callout in §4. Not swept under the rug: this was found during the Phase 2 pre-milestone build check, extensively troubleshot (Next 14→16, webpack/Turbopack, React 18/19, multiple pnpm linking modes), and left honestly documented rather than papered over with an unverified "fixed" claim. |
