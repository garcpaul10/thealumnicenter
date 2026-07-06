# Deployment

Exact steps to stand up The Alumni Center on brand-new Railway and Vercel accounts. Updated in the same commit as any change to what's deployed or how.

> **Status:** Live. `apps/api` + Postgres are deployed on Railway (project `the-alumni-center`), auto-deploying from `main`. `apps/admin`, `apps/web`, `apps/scan-station`, and `apps/marketing` are all deployed on Vercel (`play-on1/the-alumni-center-admin`, `play-on1/the-alumni-center-web`, `play-on1/the-alumni-center-scan-station`, `play-on1/the-alumni-center-marketing`) via manual `vercel deploy --prod` — none is wired to auto-deploy on push yet (see the Vercel section below). No custom domain is attached to any of the five yet — all are on their platform's generated subdomain (account-specific, not hardcoded anywhere — see `docs/HANDOFF.md`). All five build-order phases in `CLAUDE.md` §6 are now built; a Stripe Connect section is added once Phase 6 lands. Member auth is Clerk, not Twilio directly (see `CLAUDE.md` §4) — there is no separate Twilio section because of that.

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
   | `WEB_APP_ORIGIN` | the live `apps/web` Vercel URL | `railway variable set 'WEB_APP_ORIGIN=https://the-alumni-center-web.vercel.app' --service api` |
   | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | from [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) | Test-mode keys for now — swap to live-mode keys (and rotate the webhook secret below) when this goes to real production |
   | `STRIPE_WEBHOOK_SECRET` | signing secret from the webhook endpoint below | See "Stripe" section below for how this endpoint was created |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | from the Clerk dashboard | Same Clerk instance used by `apps/web` — see the Clerk note under "Vercel — apps/web" below |
   | `QR_SIGNING_SECRET` | random 32-byte hex | `railway variable set "QR_SIGNING_SECRET=$(openssl rand -hex 32)" --service api` |
   | `KIOSK_JWT_SECRET` | random 32-byte hex | `railway variable set "KIOSK_JWT_SECRET=$(openssl rand -hex 32)" --service api` — deliberately a different secret from `STAFF_JWT_SECRET` (see `CLAUDE.md` §4) |
   | `SCAN_STATION_APP_ORIGIN` | the live `apps/scan-station` Vercel URL | `railway variable set 'SCAN_STATION_APP_ORIGIN=https://the-alumni-center-scan-station.vercel.app' --service api` |
   | `MARKETING_APP_ORIGIN` | the live `apps/marketing` Vercel URL | `railway variable set 'MARKETING_APP_ORIGIN=https://the-alumni-center-marketing.vercel.app' --service api` |
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

### apps/web (member PWA)

Same pattern as `apps/admin`, run from `apps/web/`:

1. `vercel link --yes --project the-alumni-center-web`
2. Env vars (all via `vercel env add <NAME> production`):
   | Var | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the live Railway API URL |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | same Clerk instance as the API (see Clerk note below) |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | test-mode publishable key — safe client-side, not a secret |
3. `vercel deploy --prod`

**Clerk dashboard setting required, not just an env var:** the Clerk instance must have **phone number** enabled as a sign-in identifier with **password authentication turned off** (User & Authentication → Email, Phone, Username in the Clerk dashboard). Without this, `<SignIn />` renders a phone+password form instead of pure phone-OTP — this was misconfigured once during Phase 3 development and had to be fixed in the dashboard, since it's not something `apps/web`'s code controls.

Same not-yet-connected-to-GitHub note as `apps/admin` applies here — deploys are manual `vercel deploy --prod` for now.

### apps/scan-station (kiosk scan app)

Same pattern as `apps/admin`/`apps/web`, run from `apps/scan-station/`:

1. `vercel link --yes --project the-alumni-center-scan-station`
2. Env vars (via `vercel env add <NAME> production`):
   | Var | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the live Railway API URL |
3. `vercel deploy --prod`

Unlike `apps/admin`/`apps/web`, this app has no login-time secrets to set — it authenticates with a kiosk device token issued at device-registration time (see the one-time setup flow at `/register`, documented in `README.md` and `CLAUDE.md` §10), not a build-time env var. After deploying, set `SCAN_STATION_APP_ORIGIN` on Railway's `api` service to this app's live URL (see the Railway env var table above) so CORS allows it.

Same not-yet-connected-to-GitHub note as `apps/admin`/`apps/web` applies here — deploys are manual `vercel deploy --prod` for now.

### apps/marketing (public site)

Same pattern as the others, run from `apps/marketing/`:

1. `vercel link --yes --project the-alumni-center-marketing`
2. Env vars (via `vercel env add <NAME> production`):
   | Var | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the live Railway API URL |
   | `NEXT_PUBLIC_WEB_APP_URL` | the live `apps/web` Vercel URL — what the "Become a member" CTA links to |
3. `vercel deploy --prod`

No login-time secrets at all — this app only calls the fully unauthenticated `/public/*` API routes (see `CLAUDE.md` §11). After deploying, set `MARKETING_APP_ORIGIN` on Railway's `api` service to this app's live URL (see the Railway env var table above) so CORS allows it.

**Known gap, not an oversight:** the homepage's offering cards use color-block placeholders in place of real facility photography, which doesn't exist in this environment yet — see `CLAUDE.md` §5/§11 for the flagged follow-up (a real photo shoot or licensed stock).

Same not-yet-connected-to-GitHub note as the other Vercel apps applies here — deploys are manual `vercel deploy --prod` for now.

## Stripe

Test-mode keys from [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys), set as `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` per the tables above.

**Webhook endpoint** — created via the Stripe API directly (not the dashboard), pointing at the live Railway API:
```sh
curl https://api.stripe.com/v1/webhook_endpoints \
  -u "$STRIPE_SECRET_KEY:" \
  -d url="https://<railway-api-domain>/webhooks/stripe" \
  -d "enabled_events[]"="checkout.session.completed"
```
The response's `secret` field is `STRIPE_WEBHOOK_SECRET` on the `api` Railway service — capture it immediately, Stripe won't show it again (re-fetching the endpoint by ID only returns whether a secret exists, not its value; if lost, delete and recreate the endpoint). Only `checkout.session.completed` is subscribed — that's the only event `apps/api/src/routes/webhooks-stripe.ts` handles. If the Railway API's domain ever changes (custom domain, project transfer), the webhook endpoint's `url` must be updated too (`POST /v1/webhook_endpoints/:id` with a new `url`) or purchases will silently stop crediting tokens.

**Stripe Connect** (vendor/coach payouts) is Phase 6, not yet set up.

## Vercel Blob — site photo storage

Real uploaded photos for `apps/marketing` (see `apps/admin`'s "Site Photos" page) live in [Vercel Blob](https://vercel.com/docs/vercel-blob), not the filesystem — Vercel's production filesystem is read-only, and `apps/api` runs on Railway anyway, so it can't rely on any platform's local disk.

1. Create a public Blob store — public because these are photos apps/marketing (no auth) needs to display:
   ```sh
   vercel blob create-store the-alumni-center-photos --access public --yes
   ```
2. **Manual dashboard step, no CLI equivalent exists:** connect the store to a Vercel project (any one of `apps/admin`/`apps/web`/`apps/marketing`/`apps/scan-station` works — Blob access isn't project-scoped, just the *first* environment variable auto-injection is) via that project's **Storage** tab → **Connect Store**. This is what actually mints a `BLOB_READ_WRITE_TOKEN` — `vercel blob create-store`/`get-store` alone don't expose it.
3. Copy that token from the connected project's env vars (`vercel env pull` in that project's directory, or the dashboard) and set it on Railway's `api` service — this is the service that actually performs uploads:
   ```sh
   railway variable set "BLOB_READ_WRITE_TOKEN=<token>" --service api
   ```
4. Add the same value to local `.env` for local dev uploads to work.

`apps/api/src/routes/site-images.ts` is the only code that writes to Blob (mirrors the ledger's single-write-path convention) — staff upload via `apps/admin`'s "Site Photos" page, which forwards the file server-side to this route; `apps/marketing` only ever reads the resulting URLs back via the fully public `GET /public/site-images`, with a Picsum placeholder fallback for any slot nothing's been uploaded to yet.

## Twilio

Not applicable — member auth is Clerk (phone-OTP), not raw Twilio Verify, per the decision in `CLAUDE.md` §4. Twilio may still be used later for SMS notification fallback (Phase 6) if that's not also handled by Clerk/another provider — revisit at that phase.

## Domains / DNS

Not yet applicable. Planned subdomain scheme per `DESIGN.md` §2: `app.` (member PWA), `admin.` (staff dashboard), `scan.` (scan-station). Marketing site on the apex domain. Filled in once a domain is chosen and Vercel projects exist to point it at.

## Local development

See [`README.md`](../README.md) — local dev uses a plain local Postgres instance, no Railway account needed.
