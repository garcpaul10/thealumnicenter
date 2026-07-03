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

`.env.example` documents every environment variable currently read by the code, with a comment on what it's for. As new features land (Stripe, Twilio, web push), new vars will appear there too — check it any time `pnpm dev`/`pnpm test` complains about a missing var.

## 4. Run migrations and seed data

```sh
pnpm db:migrate
pnpm db:seed
```

This creates the schema (31 tables) plus enough fake data to use the app immediately: a sport (Basketball), a space (Court 1), a schedule block, a token package, a staff user, and a test account (`+15025550100`) with two participants — one funded with 55 tokens through the real ledger write path.

Migrate the test database the same way before running tests:

```sh
DATABASE_URL=$TEST_DATABASE_URL pnpm db:migrate
```

## 5. Run the apps

Currently only the backend exists (Phase 1). Frontend apps (`web`, `admin`, `scan-station`, `marketing`) will get their own `pnpm dev:*` scripts as they're built in later phases.

```sh
pnpm dev:api   # starts the Fastify API on http://localhost:4000
```

## 6. Run tests

```sh
pnpm test
```

The ledger tests (`apps/api/src/ledger/ledger-service.test.ts`) run against a real Postgres database (`TEST_DATABASE_URL`), not mocks, because the ledger's correctness depends on real transactional and row-locking behavior.

## Repo layout

```
/apps
  /marketing     → public website + landing page (Next.js, SSG) → Vercel
  /web           → member PWA (Next.js) → Vercel
  /admin         → staff dashboard (Next.js) → Vercel
  /scan-station  → kiosk/staff scan app (Next.js) → Vercel
  /api           → backend (Fastify) → Railway
/packages
  /shared        → TypeScript types, token/points math, validation
  /db            → Drizzle schema + migrations
/brand           → logo and brand assets
/docs            → DEPLOYMENT.md (fresh Railway/Vercel/Stripe/Twilio setup), HANDOFF.md (ownership transfer checklist)
```

## Deploying / handing off this project

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — standing up this system on brand-new Railway and Vercel accounts, from zero.
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — transferring ownership to a new party (accounts, credentials, order of operations).
