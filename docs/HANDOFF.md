# Handoff checklist

What changes hands when this project transfers to a new owner, what credentials must rotate, and the order to do it in to avoid downtime. Updated in the same commit that adds a new external dependency (a new SaaS account, a new credential type) to the system.

> **Status:** GitHub, a live Railway project (API + Postgres), and a Vercel project (`apps/admin`) currently exist as "things to hand off." This checklist grows as later phases add Stripe, Stripe Connect, and Twilio — each gets its own numbered section below when it's actually wired into the system, not before.

## What exists today

| System | What it is | Transfer method |
|---|---|---|
| GitHub repository (`garcpaul10/thealumnicenter`) | Source of truth for all code | Org transfer (preferred — preserves issues/PRs/history) or fork + push to a new remote |
| Railway project `the-alumni-center` (API + Postgres) | Hosts `apps/api` (live at a `*.up.railway.app` domain, generated per-environment — not portable, the new owner gets a new one) and the production database, currently seeded only with fake/test data | [Railway project transfer](https://docs.railway.app/reference/project-transfers) to the new owner's account, or export/import the Postgres data into a database the new owner provisions. Either way, the API's public URL changes — anything that hardcodes it (nothing does yet; `NEXT_PUBLIC_API_URL` will when frontends exist) must be updated. |
| Vercel project `play-on1/the-alumni-center-admin` | Hosts `apps/admin` (live at a `*.vercel.app` domain, generated per-project — not portable) | [Vercel project transfer](https://vercel.com/docs/accounts/team-members-and-roles/transfer-a-project) to the new owner's team, or the new owner runs `vercel link` fresh against their own account per `docs/DEPLOYMENT.md` and the old project is deleted. Not yet connected to GitHub for auto-deploy (see `docs/DEPLOYMENT.md`) — that's one less thing to reconfigure on transfer, for now. |

## Credentials to rotate on handoff

Rotate **all** of these the moment a handoff happens, even if the prior owner is trusted — credentials that existed before the transfer should be treated as compromised the instant they're no longer exclusively controlled by the new owner.

| Credential | Where it's used | Rotation notes |
|---|---|---|
| `DATABASE_URL` | `apps/api` | If the Postgres instance itself transfers with the Railway project, the connection string/password should still be rotated post-transfer (Railway plugin settings → regenerate credentials) |

*(This table grows as Stripe secret keys, Twilio auth tokens, QR signing secrets, and web push VAPID keys are introduced in later phases — each gets a row here in the same commit it's added to `.env.example`.)*

## Suggested order of operations

1. **Before transfer:** audit `.env.example` against every deployed environment's actual env vars to make sure nothing account-specific has leaked into code (see `CLAUDE.md` §1 rule 9 — transfer-blocker audit).
2. **GitHub:** transfer the org/repo, or have the new owner fork and the old owner archive their copy.
3. **Railway:** transfer the project. Regenerate the Postgres credentials immediately after transfer completes.
4. **Vercel:** transfer the project (or re-link fresh — see table above).
5. **Re-run `docs/DEPLOYMENT.md` end to end** from the new owner's accounts to confirm nothing was missed — this is the real test that handoff worked, not just "the transfer button was clicked."

## Not yet applicable (added when their phase lands)

- Vercel project transfers for `apps/marketing`/`web`/`scan-station` (Phases 3–5, once those are deployed)
- Domain registrar / DNS transfer (once a domain is chosen)
- Stripe account or Stripe Connect platform transfer (Phase 3 / Phase 6)
- Twilio account transfer (Phase 3)
