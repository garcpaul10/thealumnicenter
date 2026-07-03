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
| Calendar library (admin, Phase 2) | **Not yet decided** — DESIGN.md open question #21 (FullCalendar vs. custom dnd-kit grid) deferred to Phase 2 start | Not needed until the admin dashboard scheduling UI is built |

---

## 5. Assumptions made resolving DESIGN.md §5 open questions (flagging per kickoff instructions)

None of Phase 1's code required resolving a product-level open question — Phase 1 is pure ledger/schema, and the schema in DESIGN.md §6 was already fully specified. Product open questions (team formation, refund policy, capacity/waitlists, points earn rate, etc.) are deferred to the phases that actually need them (Phase 2+) and will be flagged here + asked about when reached, per the kickoff prompt's working style.

One implementation-level default was chosen without being asked (not a product decision, just a fallback for an unspecified sub-detail):
- **Points earn rate default:** 1 point per token redeemed (`pointsEarnedForRedemption()` in `packages/shared/src/token-math.ts` defaults `ratePointsPerToken` to `1`), matching DESIGN.md's own example under open question #22 ("1 pt/token redeemed"). This is a parameter, not a hardcoded constant — callable with a different rate once question #22 is actually answered.

---

## 6. Repo structure & build order

```
/apps
  /marketing     → public website + landing page (Next.js, SSG) → Vercel        [Phase 5]
  /web           → member PWA (Next.js) → Vercel                                 [Phase 3]
  /admin         → staff dashboard (Next.js) → Vercel                            [Phase 2]
  /scan-station  → kiosk/staff scan app (Next.js) → Vercel                       [Phase 4]
  /api           → backend (Fastify) → Railway                                   [Phase 1 — built]
/packages
  /shared        → TypeScript types, token/points math, validation              [Phase 1 — built]
  /db            → Drizzle schema + migrations                                  [Phase 1 — built]
/brand           → logo and brand assets
/docs            → DEPLOYMENT.md, HANDOFF.md
CLAUDE.md
README.md
.env.example
```

Build order (confirm with the user before starting each new phase):
1. **Ledger + API foundation** — done. Schema (31 tables), ledger service, tests, seed script.
2. **Admin dashboard** — sport/space/schedule management + drag-and-drop calendar, offering management, league management, token package management, staff/vendor management, comps/refunds.
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

## 8. Testing & local dev

- `apps/api` tests run against a real Postgres database (`TEST_DATABASE_URL`), not mocks — the ledger's correctness depends on real transactional/locking behavior that mocks can't verify.
- `beforeEach` truncates all tables in the test DB. This is a test-harness concern only; it does not violate the "ledger rows are never updated/deleted" production invariant.
- See `README.md` for full local setup.

---

## 9. Changelog

| Date | Change |
|---|---|
| 2026-07-03 | Phase 1 complete: monorepo skeleton, `CLAUDE.md`/`README.md`/`.env.example` bootstrapped, full 31-table schema migrated (Drizzle), token ledger service with single-write-path invariant + advisory-lock concurrency safety, 9 passing ledger tests against a real Postgres DB, seed script (sport/space/schedule block/token package/staff user/test account with 2 participants, funded via the real ledger path) |
| 2026-07-03 | Pushed to GitHub (`garcpaul10/thealumnicenter`). Deployed `apps/api` + Postgres to Railway (project `the-alumni-center`), fully via CLI — no dashboard clicks, config lives in `railway.json`. Fixed a real production bug caught before shipping: `apps/api`'s plain-`tsc` build produced a `dist/server.js` that couldn't import `@alumni/db`/`@alumni/shared` at runtime (those packages ship raw TS source, no dist of their own) — switched to `tsup` bundling those two workspace packages in (`apps/api/tsup.config.ts`). Migrations run successfully against the live Railway Postgres (31 tables confirmed). Vercel intentionally deferred until Phase 2 produces an actual frontend app to deploy. |
