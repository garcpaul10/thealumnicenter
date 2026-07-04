# The Alumni Center

A multi-sport athletic facility platform: token-based wallets, digital membership cards, facility scheduling, league management, and vendor/coach settlement. See [`DESIGN.md`](DESIGN.md) for the full product spec and [`CLAUDE.md`](CLAUDE.md) for architecture decisions and conventions — read `CLAUDE.md` first if you're working on this codebase.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL 16 running locally, with the `btree_gist` extension available (bundled with standard Postgres installs)

## 1. Install dependencies

```sh
pnpm install
```

## 2. Set up the database

Create a local Postgres user/database however you normally do. On macOS with Homebrew:

```sh
brew install postgresql@16
brew services start postgresql@16
createdb alumni_center_dev
createdb alumni_center_test   # used by `pnpm test`, kept separate from dev data
```

## 3. Configure environment variables

```sh
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` and `TEST_DATABASE_URL` to match your local Postgres setup, e.g.:

```
DATABASE_URL=postgres://$(whoami)@localhost:5432/alumni_center_dev
TEST_DATABASE_URL=postgres://$(whoami)@localhost:5432/alumni_center_test
```

`.env.example` documents every environment variable currently read by the code, with a comment on what it's for. As new features land, new vars will appear there too — check it any time `pnpm dev`/`pnpm test` complains about a missing var.

`apps/web` needs real Stripe (test mode) and Clerk keys to actually sign in or take a payment — get them from [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) and your Clerk dashboard (enable **Phone number** sign-in under User & Authentication), then fill in `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` in `.env`. `QR_SIGNING_SECRET` and `STAFF_JWT_SECRET` are just random secrets — generate with `openssl rand -hex 32`, no account needed.

For the Stripe webhook locally, run the [Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:4000/webhooks/stripe` and copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.

## 4. Run migrations and seed data

```sh
pnpm db:migrate
pnpm db:seed
```

This creates the schema (31 tables) plus enough fake data to use the app immediately: a sport (Basketball), a space (Court 1), a schedule block, a token package, a seeded admin login (`+15025550001` / `changeme123`, override with `SEED_ADMIN_PASSWORD`), and a test account (`+15025550100`) with two participants — one funded with 55 tokens through the real ledger write path.

Migrate the test database the same way before running tests:

```sh
DATABASE_URL=$TEST_DATABASE_URL pnpm db:migrate
```

## 5. Run the apps

```sh
pnpm dev:api     # starts the Fastify API on http://localhost:4000
pnpm dev:admin   # starts the staff dashboard on http://localhost:3011
pnpm dev:web     # starts the member PWA on http://localhost:3012
```

Run these at once in separate terminals. `apps/admin` uses the seeded admin credentials above; `apps/web` needs a real Clerk phone sign-in (Clerk's test mode supports fake phone numbers/OTP codes — see their docs) since Clerk manages the OTP flow, not us. `scan-station` and `marketing` don't exist yet — they'll get their own `pnpm dev:*` scripts as they're built in later phases.

**Note:** `apps/admin` and `apps/web`'s `next build` both run with `--webpack` (set in each `package.json`), not the newer Turbopack default — this sidesteps a Turbopack-specific crash. If `next build` ever behaves strangely again in a *local* environment, check the Node version first (some non-LTS versions have caused framework-internal build failures here that a real Vercel deploy did not reproduce) — see `CLAUDE.md` §4.

## 6. Run tests

```sh
pnpm test
```

The ledger, enrollment, league, split-payment, and rewards tests (`apps/api/src/ledger/`, `apps/api/src/enrollments/`, `apps/api/src/league/`, `apps/api/src/split-payments/`) run against a real Postgres database (`TEST_DATABASE_URL`), not mocks, because their correctness depends on real transactional and row-locking behavior.

## Repo layout

```
/apps
  /marketing     → public website + landing page (Next.js, SSG) → Vercel
  /web           → member PWA (Next.js 16 / React 19, Clerk phone auth) → Vercel
  /admin         → staff dashboard (Next.js 16 / React 19) → Vercel
  /scan-station  → kiosk/staff scan app (Next.js) → Vercel
  /api           → backend (Fastify) → Railway
/packages
  /shared        → TypeScript types, token/points math, standings, validation
  /db            → Drizzle schema + migrations
/brand           → logo and brand assets
/docs            → DEPLOYMENT.md (fresh Railway/Vercel/Stripe/Twilio setup), HANDOFF.md (ownership transfer checklist)
```

## Deploying / handing off this project

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — standing up this system on brand-new Railway and Vercel accounts, from zero.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — transferring ownership to a new party (accounts, credentials, order of operations).
