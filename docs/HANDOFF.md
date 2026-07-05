# Handoff checklist

What changes hands when this project transfers to a new owner, what credentials must rotate, and the order to do it in to avoid downtime. Updated in the same commit that adds a new external dependency (a new SaaS account, a new credential type) to the system.

> **Status:** GitHub, a live Railway project (API + Postgres), three Vercel projects (`apps/admin`, `apps/web`, `apps/scan-station`), a Clerk instance, and a Stripe (test mode) account currently exist as "things to hand off." This checklist grows as later phases add Stripe Connect and web push — each gets its own numbered section below when it's actually wired into the system, not before.

## What exists today

| System | What it is | Transfer method |
|---|---|---|
| GitHub repository (`garcpaul10/thealumnicenter`) | Source of truth for all code | Org transfer (preferred — preserves issues/PRs/history) or fork + push to a new remote |
| Railway project `the-alumni-center` (API + Postgres) | Hosts `apps/api` (live at a `*.up.railway.app` domain, generated per-environment — not portable, the new owner gets a new one) and the production database, currently seeded only with fake/test data | [Railway project transfer](https://docs.railway.app/reference/project-transfers) to the new owner's account, or export/import the Postgres data into a database the new owner provisions. Either way, the API's public URL changes — anything that hardcodes it (nothing does; both Vercel projects' `NEXT_PUBLIC_API_URL` and the Stripe webhook endpoint's `url` all need updating) must be updated. |
| Vercel project `play-on1/the-alumni-center-admin` | Hosts `apps/admin` (live at a `*.vercel.app` domain, generated per-project — not portable) | [Vercel project transfer](https://vercel.com/docs/accounts/team-members-and-roles/transfer-a-project) to the new owner's team, or the new owner runs `vercel link` fresh against their own account per `docs/DEPLOYMENT.md` and the old project is deleted. Not yet connected to GitHub for auto-deploy (see `docs/DEPLOYMENT.md`) — that's one less thing to reconfigure on transfer, for now. |
| Vercel project `play-on1/the-alumni-center-web` | Hosts `apps/web` (member PWA), same transfer method and caveats as the admin project above | Same as above |
| Vercel project `play-on1/the-alumni-center-scan-station` | Hosts `apps/scan-station` (kiosk scan app), same transfer method and caveats as the admin project above. Has no login secrets of its own — kiosk devices re-register (`POST /kiosk-devices`) against whatever API the new owner ends up with, which also naturally invalidates every old device's token if `KIOSK_JWT_SECRET` is rotated (see below) | Same as above |
| Clerk instance (phone-OTP member auth) | Backs `apps/web`'s sign-in/sign-up and `apps/api`'s member-auth token verification | Clerk supports transferring an application to another account/organization from its dashboard — do this rather than recreating the instance, since recreating changes every member's Clerk user ID and would orphan `accounts.clerk_user_id` links |
| Stripe account (test mode) | Token package checkout + the `checkout.session.completed` webhook feeding the ledger | Stripe doesn't support account transfer between unrelated owners — the new owner creates their own account, and its keys + a freshly created webhook endpoint replace the old ones everywhere they're set (Railway `api`, both Vercel projects' publishable key) |

## Credentials to rotate on handoff

Rotate **all** of these the moment a handoff happens, even if the prior owner is trusted — credentials that existed before the transfer should be treated as compromised the instant they're no longer exclusively controlled by the new owner.

| Credential | Where it's used | Rotation notes |
|---|---|---|
| `DATABASE_URL` | `apps/api` | If the Postgres instance itself transfers with the Railway project, the connection string/password should still be rotated post-transfer (Railway plugin settings → regenerate credentials) |
| `STAFF_JWT_SECRET`, `QR_SIGNING_SECRET`, `KIOSK_JWT_SECRET` | `apps/api` | Random secrets, no external account — just regenerate (`openssl rand -hex 32`) and reset on Railway. Rotating `KIOSK_JWT_SECRET` invalidates every already-registered kiosk device's token, forcing them to re-register (see `/kiosk-devices` in `CLAUDE.md` §10) — expected and correct on handoff, not a bug |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `apps/api` (secret + webhook secret), `apps/web` (publishable key) | New Stripe account → new keys entirely; also delete the old webhook endpoint and create a new one pointed at whatever API domain the new owner ends up with |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/api` (secret key, for token verification), `apps/web` (both) | If transferring the Clerk *application* itself (recommended, see table above), these keys stay the same — only rotate if creating a brand-new Clerk instance instead |

*(This table grows as Twilio auth tokens and web push VAPID keys are introduced in later phases — each gets a row here in the same commit it's added to `.env.example`.)*

## Suggested order of operations

1. **Before transfer:** audit `.env.example` against every deployed environment's actual env vars to make sure nothing account-specific has leaked into code (see `CLAUDE.md` §1 rule 9 — transfer-blocker audit).
2. **GitHub:** transfer the org/repo, or have the new owner fork and the old owner archive their copy.
3. **Railway:** transfer the project. Regenerate the Postgres credentials immediately after transfer completes.
4. **Vercel:** transfer the project (or re-link fresh — see table above).
5. **Re-run `docs/DEPLOYMENT.md` end to end** from the new owner's accounts to confirm nothing was missed — this is the real test that handoff worked, not just "the transfer button was clicked."

## Not yet applicable (added when their phase lands)

- Vercel project transfer for `apps/marketing` (Phase 5, once deployed)
- Domain registrar / DNS transfer (once a domain is chosen)
- Stripe Connect platform transfer (Phase 6 — vendor/coach payouts)
- Twilio account transfer (only if Twilio ends up used for SMS notification fallback in Phase 6 — member auth itself is Clerk, not Twilio)
