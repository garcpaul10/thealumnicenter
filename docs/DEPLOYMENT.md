# Deployment

Exact steps to stand up The Alumni Center on brand-new Railway and Vercel accounts. Updated in the same commit as any change to what's deployed or how.

> **Status:** Phase 1 only. Nothing is deployed yet — this doc currently covers standing up `apps/api` + Postgres on Railway, the only thing that exists. Sections for Vercel (frontend apps), Stripe, Stripe Connect, Twilio, and DNS are added as those phases land — see `CLAUDE.md` §6 for the build order.

## Railway — API + database

1. Create a new Railway project.
2. Add a PostgreSQL plugin/service to the project. Railway provisions `DATABASE_URL` automatically for services in the same project — no manual connection string needed once the API service references it.
3. Add a service pointing at this repo, root directory `apps/api`.
   - Build command: `pnpm install && pnpm --filter @alumni/db build 2>/dev/null; pnpm --filter @alumni/api build`
   - Start command: `pnpm --filter @alumni/api start`
   - Enable "private networking" so the API can reach the Postgres plugin without a public DB endpoint.
4. Set environment variables on the API service (cross-reference [`.env.example`](../.env.example) for the full, current list — this list is only the ones needed for Phase 1):
   | Var | Where it comes from |
   |---|---|
   | `DATABASE_URL` | Auto-provided by Railway's Postgres plugin reference (`${{Postgres.DATABASE_URL}}`) |
   | `PORT` | Railway sets this automatically; the app reads `process.env.PORT` |
   | `NODE_ENV` | Set to `production` |
5. Run migrations against the Railway database once the service is deployed:
   ```sh
   railway run --service <api-service-name> pnpm db:migrate
   ```
6. Optionally seed a demo environment (do **not** run `db:seed` against a real production database with real member data):
   ```sh
   railway run --service <api-service-name> pnpm db:seed
   ```

## Vercel — frontend apps

Not yet applicable — `apps/marketing`, `apps/web`, `apps/admin`, `apps/scan-station` don't exist yet (Phases 2–5). When each is built, this section gets one subsection per app: Vercel project creation, root directory, build command, and the `NEXT_PUBLIC_API_URL` env var pointing at the Railway API's public URL.

## Stripe

Not yet applicable (Phase 3 — token purchases; Phase 6 — Connect payouts). When wired up, this section documents: API key setup, webhook endpoint registration (exact path, e.g. `POST /webhooks/stripe`), which events are subscribed to, and Stripe Connect platform configuration for vendor/coach payouts.

## Twilio (phone OTP)

Not yet applicable (Phase 3). When wired up: Twilio Verify Service creation, the exact console steps, and rate-limit configuration notes.

## Domains / DNS

Not yet applicable. Planned subdomain scheme per `DESIGN.md` §2: `app.` (member PWA), `admin.` (staff dashboard), `scan.` (scan-station). Marketing site on the apex domain. Filled in once a domain is chosen and Vercel projects exist to point it at.

## Local development

See [`README.md`](../README.md) — local dev uses a plain local Postgres instance, no Railway account needed.
