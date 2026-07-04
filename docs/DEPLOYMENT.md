# Deployment

Exact steps to stand up The Alumni Center on brand-new Railway and Vercel accounts. Updated in the same commit as any change to what's deployed or how.

> **Status:** Live. `apps/api` + Postgres are deployed on Railway (project `the-alumni-center`), auto-deploying from `main`. `apps/admin` is deployed on Vercel (project `play-on1/the-alumni-center-admin`) via manual `vercel deploy --prod` — not yet wired to auto-deploy on push (see the Vercel section below). No custom domain is attached to either yet — both are on their platform's generated subdomain (account-specific, not hardcoded anywhere — see `docs/HANDOFF.md`). Sections for Stripe, Stripe Connect, Twilio, and DNS are added as those phases land — see `CLAUDE.md` §6 for the build order.

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
5. Environment variables set on the `api` service via `railway variable set` — cross-reference `.env.example` for the full current list:
   | Var | Value | How it was set |
   |---|---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | `railway variable set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' --service api` — a live reference to the Postgres plugin, not a copied secret |
   | `NODE_ENV` | `production` | `railway variable set 'NODE_ENV=production' --service api` |
   | `PORT` | *(unset)* | Railway injects this automatically; `apps/api/src/env.ts` falls back to `4000` only for local dev |
   | `STAFF_JWT_SECRET` | random 32-byte hex | `railway variable set "STAFF_JWT_SECRET=$(openssl rand -hex 32)" --service api` |
   | `ADMIN_APP_ORIGIN` | the live `apps/admin` Vercel URL | `railway variable set 'ADMIN_APP_ORIGIN=https://the-alumni-center-admin.vercel.app' --service api` |
   - `railway variable set` doesn't restart the service by default if run with `--skip-deploys`; without that flag it redeploys automatically. Either way, confirm with `railway service list --json` that a new deployment actually ran before assuming a var change took effect.
6. Run migrations against the Railway database from a developer machine. `railway run --service api ...` won't work for this — it injects the `api` service's variables, and `DATABASE_URL` there is the *private* `postgres.railway.internal` host, only reachable from inside Railway's network. Use the Postgres plugin's public proxy URL instead:
   ```sh
   export DATABASE_URL=$(railway variable list --service Postgres --json | python3 -c "import json,sys; print(json.load(sys.stdin)['DATABASE_PUBLIC_URL'])")
   pnpm --filter @alumni/db migrate
   ```
7. Optionally seed a demo environment the same way (do **not** run `db:seed` against a database with real member data):
   ```sh
   pnpm --filter @alumni/api seed
   ```

> ⚠️ **Ongoing maintenance, not just initial setup:** steps 5–7 above are not one-time. Every time a later commit adds a **new migration** (packages/db/migrations/) or a **new required env var** (`.env.example`), it must be applied to Railway too — a migration sitting in the repo but never run against the live database, or an env var documented but never set on the service, will silently break production while every local/test environment looks fine. This exact gap happened once already: Phase 2 added `staff_users.password_hash` (migration `0002`) and `STAFF_JWT_SECRET`, both of which worked locally but were never pushed to Railway, breaking login on the live deploy until caught and fixed manually. Before declaring any deploy-affecting change "done," verify it against the actual live service, not just `pnpm test`.

## Vercel — frontend apps

### apps/admin (staff dashboard)

Steps actually run (via the `vercel` CLI — already authenticated in this environment; otherwise `npm install -g vercel`, `vercel login`):

1. From `apps/admin/`: `vercel link --yes --project the-alumni-center-admin` — creates the Vercel project and links this directory to it. Vercel auto-detects Next.js and the build command from `package.json` (`next build --webpack` — see the note in `CLAUDE.md` §4 on why `--webpack`, not Turbopack).
2. `vercel env add NEXT_PUBLIC_API_URL production` — set to the live Railway API URL (`railway domain --service api` or `railway status` to get the current one). This is the only env var `apps/admin` needs; the staff JWT never touches the browser, so no secret env vars are required client-side.
3. `vercel deploy --prod` — builds and deploys. Live at the project's `*.vercel.app` domain (`vercel ls` or the Vercel dashboard to find it).

**Not yet done — a deliberate gap, not an oversight:** this project isn't connected to the GitHub repo for auto-deploy-on-push (unlike Railway's `api` service). Every deploy so far has been a manual `vercel deploy --prod`. Connecting `vercel git connect` (or via the dashboard) to auto-deploy from `main` is a reasonable next step once the team is ready for that workflow — do it deliberately, not by default, since it changes who can trigger a production deploy (anyone who can push to `main`).

Root directory for the Vercel project is `apps/admin` (set automatically by running `vercel link` from within that directory) — if reconfiguring from the dashboard instead, set "Root Directory" to `apps/admin` explicitly, since this is a pnpm monorepo.

### apps/marketing, apps/web, apps/scan-station

Not yet applicable — these apps don't exist yet (Phases 3–5). Follow the same pattern as `apps/admin` above when each is built: `vercel link` from the app's directory, set its required env vars, deploy.

## Stripe

Not yet applicable (Phase 3 — token purchases; Phase 6 — Connect payouts). When wired up, this section documents: API key setup, webhook endpoint registration (exact path, e.g. `POST /webhooks/stripe`), which events are subscribed to, and Stripe Connect platform configuration for vendor/coach payouts.

## Twilio (phone OTP)

Not yet applicable (Phase 3). When wired up: Twilio Verify Service creation, the exact console steps, and rate-limit configuration notes.

## Domains / DNS

Not yet applicable. Planned subdomain scheme per `DESIGN.md` §2: `app.` (member PWA), `admin.` (staff dashboard), `scan.` (scan-station). Marketing site on the apex domain. Filled in once a domain is chosen and Vercel projects exist to point it at.

## Local development

See [`README.md`](../README.md) — local dev uses a plain local Postgres instance, no Railway account needed.
