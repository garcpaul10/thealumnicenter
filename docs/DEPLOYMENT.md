# Deployment

Exact steps to stand up The Alumni Center on brand-new Railway and Vercel accounts. Updated in the same commit as any change to what's deployed or how.

> **Status:** Live. `apps/api` + Postgres are deployed on Railway (project `the-alumni-center`), auto-deploying from `main`. No custom domain is attached yet — currently served on Railway's generated `*.up.railway.app` subdomain (get the current one with `railway domain --service api` or `railway status`; not hardcoded anywhere since it's account-specific and changes on handoff — see `docs/HANDOFF.md`). Sections for Vercel (frontend apps), Stripe, Stripe Connect, Twilio, and DNS are added as those phases land — see `CLAUDE.md` §6 for the build order.

## Railway — API + database

These steps are what was actually run to stand up the current environment (via the `railway` CLI — `npm install -g @railway/cli`, `railway login`). Repeat them verbatim on a fresh Railway account for handoff.

1. `railway init --name "the-alumni-center"` — creates the project and links the current directory to it.
2. `railway add --database postgres` — provisions a Postgres plugin. Its connection info is available to other services in the project via Railway variable references (`${{Postgres.DATABASE_URL}}`); it is never copied into `.env` or committed anywhere.
3. `railway add --service api --repo <owner>/<repo> --branch main` — creates a service connected to this GitHub repo. Railway auto-deploys on every push to `main`.
4. **Build/start commands are defined in code, not the dashboard** — see [`railway.json`](../railway.json) at the repo root:
   ```json
   {
     "build": { "builder": "RAILPACK", "buildCommand": "pnpm install --frozen-lockfile && pnpm --filter @alumni/api build" },
     "deploy": { "startCommand": "pnpm --filter @alumni/api start" }
   }
   ```
   Railway's builder (Railpack) can't infer a start command from a pnpm-workspace root on its own (no root `main`/`start` script) — this file is what makes deploys reproducible without a manual dashboard field. `apps/api`'s build (`tsup`, see `apps/api/tsup.config.ts`) bundles the `@alumni/db` and `@alumni/shared` workspace packages into `dist/server.js`, since those packages ship TypeScript source with no build step of their own and a plain `node dist/server.js` can't import `.ts` files directly.
   - **Note for future services:** this root-level `railway.json` only works while `api` is the *only* Railway-deployed service. If a second Railway service is added later (e.g. a settlement cron job in Phase 6), give it its own config file and point the service at it via Railway's "Config-as-code path" setting (the one piece of this that may require a one-time dashboard field — document the exact path here when that happens).
5. Environment variables set on the `api` service via `railway variable set`:
   | Var | Value | How it was set |
   |---|---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | `railway variable set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' --service api` — a live reference to the Postgres plugin, not a copied secret |
   | `NODE_ENV` | `production` | `railway variable set 'NODE_ENV=production' --service api` |
   | `PORT` | *(unset)* | Railway injects this automatically; `apps/api/src/env.ts` falls back to `4000` only for local dev |
6. Run migrations against the Railway database from a developer machine. `railway run --service api ...` won't work for this — it injects the `api` service's variables, and `DATABASE_URL` there is the *private* `postgres.railway.internal` host, only reachable from inside Railway's network. Use the Postgres plugin's public proxy URL instead:
   ```sh
   export DATABASE_URL=$(railway variable list --service Postgres --json | python3 -c "import json,sys; print(json.load(sys.stdin)['DATABASE_PUBLIC_URL'])")
   pnpm --filter @alumni/db migrate
   ```
7. Optionally seed a demo environment the same way (do **not** run `db:seed` against a database with real member data):
   ```sh
   pnpm --filter @alumni/api seed
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
