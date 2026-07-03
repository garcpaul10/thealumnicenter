# Athletic Facility Credit Ecosystem — Living Design Doc

> **Status:** Brainstorming
> **Last updated:** 2026-07-02
> **Purpose:** Single source of truth for product + technical decisions. This file is intended to live in the repo root (or `/docs`) and be referenced by Claude Code via `CLAUDE.md` during builds.

---

## 1. Concept

A multi-sport athletic facility where members buy **tokens** (Dave & Buster's model) and spend them across all offerings — walk-in sessions, leagues, camps, and more. Members carry a **digital membership card** with a QR code, scanned at each activity station to deduct tokens (walk-ins) or check in (pre-paid enrollments).

**Core sports at launch:** basketball, volleyball, futsal, pickleball — but sports are *data, not code*: admins can create new sports through the dashboard without a deployment.

**Why tokens:** One wallet across all sports and offering types removes purchase friction, enables bonus-tier packages (breakage margin), and allows demand-based pricing without visible "price changes."

---

## 2. Brand

- **Name:** The Alumni Center
- **Logo:** Script "The Alumni" + varsity block "CENTER" with star accent (512×512 PNG on file — commit to a `/brand` or `/packages/shared/assets` folder in the repo)
- **Primary color:** `#0F5898` (collegiate blue, sampled from logo)
- **Visual direction:** Collegiate/varsity athletics — block lettering, star motif. Design system should extend this across all surfaces: varsity feel for the marketing site, clean athletic-department styling in the PWA.
- **Naming opportunities (TBD, marketing decision):** Token package tiers could lean into the varsity theme (e.g., "Varsity Pack," "All-American Pack"). Not blocking.
- **Domain:** TBD — subdomain scheme (`app.`, `admin.`, `scan.`) already decided.

---

## 3. Decisions Made ✅

### Infrastructure
| Layer | Choice | Notes |
|---|---|---|
| Repository | GitHub monorepo | Auto-deploy on push; PR preview deploys via Vercel |
| Frontends | Vercel | Member PWA, admin dashboard, scan-station app |
| Backend + DB | Railway | API service + managed PostgreSQL, private networking |
| Payments | Stripe | Credits posted to ledger only on webhook settlement |
| Member app format | PWA (required) | Installable, offline-capable QR display, service worker + manifest |
| Public presence | Separate marketing site | Landing page, pricing, activities, SEO-optimized SSG; own app in monorepo |
| Terminology | **Tokens** | Single term used everywhere in code, UI, and marketing (was "credits") |
| Catalog model | Sports + Offerings | Sports are admin-created data; offerings (walk-in/league/camp/etc.) are the purchasable unit |
| Reservations | Mixed model, in v1 | Schedule blocks have a mode: `open_play` / `reservable` / `league` / `camp`. Reservable blocks = slot booking, tokens deducted at booking, scan = check-in |
| Auth | Phone OTP | Twilio Verify (or similar) from Railway API; phone number = account identifier; long-lived sessions after verify; rate-limit OTP requests day one |
| Account model | Purchaser/participant split | Account (parent, phone-verified) → participant profiles (self, kids). Enrollments, passes, QR cards belong to participants. Kids as sub-profiles = clean COPPA posture. This IS the family accounts feature. |
| Wallet model | **Per-participant balances** | Every token belongs to a participant (D&B Power Card model). Account view shows all balances + family total (display-only rollup). Free instant transfers between participants in the same account (paired ledger rows, net zero). Purchases allocate to a chosen participant (default: purchaser). Kiosk spends debit the scanned participant; parent-initiated enrollments can debit any of their participants' balances. |
| Scan flow | Staff + kiosk hybrid | One scan-station app, two modes: kiosk default (self-scan, explicit tap-to-confirm deductions, photo displayed for spot-checks) + PIN-unlocked staff mode (comps, manual lookup, overrides, guest starter-pack sales) |
| Schedule authoring | Drag-and-drop resource calendar | Admin dashboard: courts × time grid; drag activity blocks (mode + sport) onto court/time slots; stretch/move/edit; recurring weekly patterns via RRULE; overlap conflicts rejected. Calendar is a visual editor over `schedule_blocks` — one source of truth consumed by admin calendar, kiosks, and member PWA "what's open now" |
| Kiosk↔space binding | Device registration | Each kiosk tablet assigned to a space at setup (staff PIN screen); auto-displays that court's current + upcoming blocks and walk-in pricing; refreshes via 30–60s polling in v1 (SSE push later) |
| Loyalty points | Separate currency from tokens | Points earned on token **spend** (not purchase) at a set rate (e.g., 1 pt/token redeemed) — rewards facility usage, not just top-ups. Points have no cash value and can't be bought directly (keeps them outside stored-value law scope). Own append-only ledger, mirrors token_ledger pattern. Redeemed in a separate Rewards Store catalog; never touches the token ledger. |
| Membership card | **The Alumni Card** — customizable digital card | Branded name for the participant's QR card. Rendered as an SVG/canvas component in the PWA (not a static image) — customizable background/theme/badge + name/photo, with the QR code fixed in a constant position/size for reliable scanning regardless of theme. Customization options (backgrounds, badges, effects) can be Rewards Store items — ties card customization into the points loop. Apple/Google Wallet pass offered as a simplified companion (template-limited: logo + background color only, not full custom art); PWA card is the primary experience. |
| Split payments | Multi-participant ledger fan-out | Any token-costing thing (reservation, walk-in, free play) can be split across N participants: one `split_requests` row + one `split_shares` row per participant, each producing its own `token_ledger` debit from that participant's wallet, all tagged to the same `reference_id`. Initiator invites others by phone; equal or custom split amounts. Reservation confirms only once 100% of shares are accepted/paid; unpaid slot releases after a countdown (initiator can optionally cover the gap). |
| League scope | **Full league management (v1)** | Not the lean registration-only version — leagues need teams, scheduled games, score entry, and computed standings. Reflects existing league operations. |

### Architecture principles
- **Ledger-based credits.** Every purchase/redemption/refund/bonus is an immutable transaction row. Balance is derived, never stored as a mutable counter. Prevents race conditions; provides audit trail.
- **All credit logic lives on the backend (Railway).** Frontends are thin clients; they never compute or mutate balances.
- **Rotating QR tokens.** QR encodes a short-lived signed token — never raw member ID or balance. Signing secret lives only in Railway env. Prevents screenshot sharing.
- **Photo-on-scan.** Scan station displays member name + photo for staff verification (anti-fraud layer).

### Domain model — the offerings catalog
- **Sports are data, not code.** `sports` table managed via admin dashboard (basketball, volleyball, futsal, pickleball at launch; extensible without deploys).
- **Offering = the universal purchasable unit.** Anything with a token cost is an offering referencing a sport:
  - **Walk-in session** — drop-in open gym; tokens deducted live at scan
  - **Free play pass** — tokens buy a time window (e.g., 2 hrs) with unlimited access to any activity currently scheduled as open/drop-in; clock starts at first scan, not purchase
  - **League registration** — tokens upfront at registration → roster spot + session schedule
  - **Camp enrollment** — tokens upfront → multi-day attendance tracking
  - **Reservation** — court/time-slot booking on `reservable` schedule blocks; tokens deducted at booking; arrival scan = check-in (cancellation window policy TBD → refund question #12)
  - Extensible: clinics, lessons, parties, tournaments fit the same shape
- **Facility schedule is a first-class concept.** Courts/spaces have scheduled states through the day (e.g., Court 1: open basketball 4–7pm → league volleyball 7–10pm). Free play and walk-ins are only valid for spaces currently in an open/drop-in state; the schedule is the source of truth the scan station validates against.
- **Payment vs. check-in distinction:** Walk-ins deduct tokens at the door. Leagues/camps deduct tokens once at registration; free play deducts once at purchase. Door scans for pre-paid offerings are *attendance check-ins* (free no-show data for capacity planning).
- **Every redemption has a beneficiary.** Ledger redemptions are tagged `house`, `vendor:{id}`, or `coach:{id}`. This single column powers concessions, third-party vendors, and coach/trainer payouts.
- **Concessions & vendors:** Concession stand = another scan point (scan → ring up token-priced items → deduct). Facility-owned = house beneficiary, no split. Third-party vendors get: vendor account, vendor-mode POS screen in the scan-station app, and settlement per the split model below.
- **Coaches & trainers:** A lesson/clinic is an offering with a coach as beneficiary. Members book with tokens; redemption tags the coach; split applies at settlement. Coach space-rental fees can be netted against payouts in one statement.
- **Settlement engine:** Scheduled Railway job aggregates redemptions per beneficiary per period → applies token-to-dollar settlement rate → applies split % → payout via **Stripe Connect** (connected accounts for vendors/coaches; automated payouts + 1099 handling).
- **Generic scan station — three-way resolution:** scan QR → (1) active free play pass? → check in, no deduction; (2) enrolled in the league/camp here now? → check in; (3) neither → offer walk-in deduction or free play purchase on the spot.


```
/apps
  /marketing     → public website + landing page (Next.js, static/SSG) → Vercel → yourfacility.com
  /web           → member PWA (Next.js) → Vercel → app.yourfacility.com
  /admin         → staff dashboard (Next.js) → Vercel
  /scan-station  → tablet scanning app → Vercel (kiosk-mode browser)
  /api           → backend (Node) → Railway
/packages
  /shared        → TS types, credit math, token validation
  /db            → schema + migrations (Prisma or Drizzle)
```

### Build order
1. Data model + ledger API (with tests) — rock solid before any UI
2. Admin dashboard — staff sell packages, comp credits, view activity
3. Member PWA — buy credits (Stripe), view balance, display QR, Wallet passes
4. Scan-station app — locked-down tablet web app
5. Marketing website — landing page, pricing/packages, activities, join CTA → app signup (can be built in parallel any time; no API dependency for v1)
6. Later: tournaments/brackets, coach/vendor self-service portals (reservations, family accounts, and full league management with standings/scores now in v1 scope)

---

## 4. Economics Layer (Dave & Buster's model)

- **Bonus-tier packages:** e.g., $50 → 55 credits, $100 → 120 credits. Drives larger purchases; unspent credits = breakage margin.
- **Dynamic activity pricing:** Activities cost different credits by day/time (peak vs. off-peak) without members perceiving "price increases."
- **Membership subscriptions:** Monthly auto-reload with bonus credits; smooths revenue.
- **Free play pass pricing:** Price time windows to beat 2–3 individual walk-ins (that's the value story). Expiry UX: push notification at T-15 min with one-tap "extend for X tokens" upsell; ~10 min grace period at expiry.
- **Vendor/coach platform economics:** Fixed token-to-dollar **settlement rate** (e.g., token = $0.80 to third parties) + **split %** per beneficiary (e.g., vendor keeps 75%, coach keeps 70%). The spread between member purchase price and settlement rate + the split = platform revenue. ⚠️ Bonus-package tokens complicate the effective rate — model with real numbers before signing vendors.
- **Credit expiry:** Policy TBD — ⚠️ stored-value/gift-card laws may apply (verify Kentucky regulations with a lawyer before setting expiry). **Add to lawyer list:** stored value redeemable at third parties may touch money-transmission rules — confirm the "facility as merchant of record, vendors paid revenue share" structure.

---

## 5. Open Questions ❓

| # | Question | Options / Leaning |
|---|---|---|
| 1 | Team formation | Captains register teams and invite players, or staff builds teams/assigns free agents? Affects the `teams`/`team_members` flow and whether a "create team" UI is needed in the PWA. |
| 2 | Score entry permission | Who can enter a game score — staff only (more control, more staff workload) or team captains (self-serve, needs a dispute/correction path)? |
| 3 | Standings formula | Sport-specific (basketball ≠ volleyball ≠ pickleball scoring/ranking logic) or one generic win/loss/point-differential formula for v1? |
| 4 | Playoffs/brackets | In scope for v1 alongside standings, or standings-only with brackets as a fast-follow? |
| 5 | Refund/cancellation policy | Token refund rules for league/camp withdrawals AND reservation cancellation window (e.g., full refund ≥24h out) |
| 6 | Capacity + waitlists | Leagues and camps need caps; waitlist behavior when full? |
| 7 | Free play pass tiers | What time windows to sell (1hr / 2hr / all-day)? Peak vs. off-peak pass pricing? |
| 8 | Free play capacity | Do open-play spaces have head-count caps that free play must respect (fire code / quality of play)? |
| 9 | Schedule admin UI scope | Recurring weekly templates vs. one-off entries |
| 10 | Token expiry policy | Legal review needed (KY stored-value law) |
| 11 | Guest walk-ins | Can a true non-account guest pay at the door? Leaning: staff sells starter pack via staff mode → creates account on the spot (conversion funnel) |
| 12 | Apple/Google Wallet passes | Early (auto-updating balance) — confirm scope for v1 |
| 13 | Frontend framework uniformity | Next.js everywhere (leaning) vs. Vite for scan station |
| 14 | ORM | Prisma vs. Drizzle |
| 15 | Backend framework | Fastify vs. NestJS |
| 16 | Settlement rate + splits | Token dollar value at settlement; split % for vendors vs. coaches; same or negotiated per party? |
| 17 | Settlement cadence | Weekly vs. monthly payouts; minimum payout threshold? |
| 18 | Vendor menu control | Do vendors set their own token prices via a vendor portal, or does admin approve/manage all pricing? |
| 19 | Coach self-service scope | Can coaches create/manage their own offerings + view availability, or staff-managed in v1? (Leaning: staff-managed v1, coach portal v2) |
| 20 | Cash/card at concessions | Do vendors also accept regular payment alongside tokens, or tokens-only inside the facility? |
| 21 | Calendar library | FullCalendar resource-timeline (paid, ~$480/yr, faster to ship) vs. custom grid with dnd-kit (free, more build time) — decide at admin-app build time |
| 22 | Points earn rate | 1 point per token redeemed, or weighted (e.g., leagues/camps earn more than walk-ins to reward commitment)? |
| 23 | Points → tokens exchange rate | If rewards store sells token grants, what rate avoids undercutting real token purchases? |
| 24 | Points expiry | Do points expire (e.g., rolling 12 months of inactivity) or last forever? |
| 25 | Rewards store scope for v1 | Just points→tokens (simplest, no fulfillment/inventory needed) or physical merch too (adds inventory + fulfillment workflow)? |
| 26 | Alumni Card cosmetics for v1 | Ship with a small default set (a few backgrounds/badges free to everyone) and add unlockables post-launch, or build the full unlock system in v1? |
| 27 | Card photo requirement | Required for anti-fraud (matches spot-check use case) or optional with avatar fallback? |
| 28 | Split request expiry window | How long do invitees have to accept before the slot releases (5 min? 30 min? until block start)? |
| 29 | Split invite scope | Can you invite anyone by phone number, or only people already linked (family/friends) in the system? Privacy/spam consideration. |
| 30 | Uneven split UI | How much control does the initiator get over custom amounts vs. defaulting to equal split? |
| 31 | Notification provider | Web push service (e.g., via a service like OneSignal, or raw Web Push API) + SMS fallback provider (likely same Twilio account as OTP) — confirm before build |

**Answered → moved to Decisions:** reservations (mixed model, v1), auth (phone OTP), non-member purchases (purchaser/participant split), family accounts (absorbed into account model), scan flow (staff + kiosk hybrid), wallet model (per-participant), schedule authoring (drag-drop calendar), real-time updates (polling v1, SSE later), **league scope (full management — teams, games, scores, standings)**.

---

## 6. Data Model (v1 Schema)

> The first thing Claude Code builds. Written as tables + key columns + invariants; exact SQL/ORM syntax decided at build time.

### Identity & access

**`accounts`** — the purchaser; owns the wallet
- `id`, `phone` (unique, E.164 — the login identifier), `email` (optional), `stripe_customer_id`, `created_at`, `status` (active/suspended)

**`participants`** — who actually plays; QR cards belong here
- `id`, `account_id` FK, `first_name`, `last_name`, `nickname` (nullable, shown on card), `dob` (age-gating for leagues/camps), `photo_url`, `is_account_owner` (bool), `created_at`
- **`alumni_card_config`** (jsonb): active background/theme id, active badge ids, photo vs. avatar toggle — rendered client-side into the card component
- Every account gets one participant auto-created for the owner; kids added as additional rows

**`card_cosmetics`** — unlockable card customization options
- `id`, `type` (background / badge / effect), `name`, `asset_ref`, `unlock_method` (default / reward_item / achievement), `reward_item_id` (nullable FK, if unlocked via Rewards Store)

**`staff_users`** — admin dashboard + staff-mode PIN
- `id`, `name`, `phone`, `role` (admin/staff), `kiosk_pin_hash`

**`kiosk_devices`** — binds a tablet to a space
- `id`, `space_id` FK, `device_label`, `registered_at`, `last_seen_at`, `staff_mode_pin_hash`

**`partners`** — unified vendors + coaches (they're the same shape: a beneficiary with a split and a Stripe Connect account)
- `id`, `type` (vendor/coach), `display_name`, `contact_phone`, `stripe_connect_account_id`, `split_pct`, `settlement_rate_cents_per_token` (nullable → falls back to global default), `status`

### The wallet

**`token_ledger`** — append-only; THE source of truth
- `id`, `account_id` FK, `participant_id` FK (**required — the wallet key**), `amount` (signed integer: + credit, − debit), `type` (purchase / redemption / refund / bonus / adjustment / expiry / **transfer**), `beneficiary_partner_id` (nullable FK → null = house), `reference_type` + `reference_id` (polymorphic: order, enrollment, pass, reservation, package purchase, transfer pair), `stripe_payment_intent_id` (nullable), `note`, `created_at`, `created_by` (member/staff/system)
- **Invariants:** rows are never updated or deleted — corrections are new offsetting rows. A participant's balance = `SUM(amount)` for that participant (cached materialized balance for reads, always reconcilable). Family/account balance = sum across the account's participants — display-only, never stored as its own wallet. Transfers are paired rows (debit participant A, credit participant B) that net to zero within an account; free and instant intra-account. All writes go through a single service-layer function; no other code path may insert.

**`token_packages`** — what members buy
- `id`, `name`, `price_cents`, `tokens_granted`, `bonus_tokens`, `active`, `sort_order`

### Catalog & schedule

**`sports`** — admin-created data
- `id`, `name`, `slug`, `icon`, `active`

**`spaces`** — physical courts/areas
- `id`, `name` ("Court 1"), `description`, `capacity` (nullable head-count), `active`

**`schedule_blocks`** — the facility schedule; source of truth for every scan
- `id`, `space_id` FK, `sport_id` FK (nullable — multi-sport open block), `mode` (open_play / reservable / league / camp / closed), `offering_id` (nullable FK — set for league/camp blocks), `starts_at`, `ends_at`, `recurrence_rule` (nullable RRULE for weekly templates), `walk_in_token_price` (nullable override for peak pricing)

**`offerings`** — the universal purchasable unit
- `id`, `type` (walk_in / free_play_pass / league / camp / reservation / lesson / clinic), `sport_id` FK (nullable), `name`, `description`, `token_price`, `capacity` (nullable), `coach_partner_id` (nullable FK — set for lessons/clinics), `duration_minutes` (for passes/lessons), `registration_opens_at` / `closes_at` (nullable), `active`
- Walk-in "offerings" define default pricing per sport; schedule blocks can override

### Purchases of offerings

**`enrollments`** — leagues, camps, lessons, clinics
- `id`, `offering_id` FK, `participant_id` FK, `account_id` FK, `status` (enrolled / waitlisted / withdrawn / completed), `ledger_txn_id` FK (the debit), `created_at`

### League management

**`teams`** — grouping within a league offering
- `id`, `offering_id` FK (the league), `name`, `captain_participant_id` FK (nullable), `created_at`

**`team_members`**
- `team_id` FK, `participant_id` FK, `role` (captain / player), `joined_at`
- Links back to `enrollments` implicitly — a participant must be enrolled in the league offering to join a team

**`games`** — scheduled matchups within a league
- `id`, `offering_id` FK (the league), `schedule_block_id` FK (nullable — links to facility calendar for the matchup's court/time), `home_team_id` FK, `away_team_id` FK, `scheduled_at`, `status` (scheduled / in_progress / final / postponed / cancelled)

**`game_scores`**
- `id`, `game_id` FK, `home_score`, `away_score`, `entered_by` (staff_user or team captain — see open question), `entered_at`, `final` (bool)

**`standings`** — computed, not authoritative (derivable from `games`/`game_scores`; cached for read performance)
- `id`, `offering_id` FK, `team_id` FK, `wins`, `losses`, `ties`, `points_for`, `points_against`, `updated_at`
- Recalculated by a service function whenever a `game_scores` row is finalized — never hand-edited

**`passes`** — free play
- `id`, `offering_id` FK, `participant_id` FK, `account_id` FK, `duration_minutes`, `activated_at` (nullable — null until first scan), `expires_at` (nullable, computed at activation), `ledger_txn_id` FK, `status` (unused / active / expired)

**`reservations`** — booked slots on reservable blocks
- `id`, `schedule_block_id` FK, `participant_id` FK (the initiator/holder), `account_id` FK, `starts_at`, `ends_at`, `status` (pending_split / booked / checked_in / cancelled / no_show / expired_unfilled), `ledger_txn_id` FK (nullable — null while split payment pending), `split_request_id` FK (nullable)
- **Invariant:** no overlapping reservations per space; enforced with a DB exclusion constraint, not application code

### Split payments

**`split_requests`** — group cost-sharing on any token-costing thing
- `id`, `initiator_participant_id` FK, `reference_type` (reservation / walk_in / free_play_pass), `reference_id`, `total_tokens`, `split_method` (equal / custom), `status` (pending / completed / expired / cancelled), `expires_at` (countdown before slot releases), `created_at`

**`split_shares`**
- `id`, `split_request_id` FK, `participant_id` FK, `amount_tokens`, `status` (invited / accepted / declined / paid), `ledger_txn_id` FK (nullable, set once paid), `responded_at`
- **Invariant:** `SUM(amount_tokens)` across shares for a request must equal `total_tokens`. Reference (e.g., the reservation) only confirms once every share reaches `paid`.

### The door & the counter

**`scans`** — every QR scan, successful or denied
- `id`, `participant_id` FK, `station_id`, `resolved_as` (pass_checkin / enrollment_checkin / reservation_checkin / walk_in / denied / vendor_order), `resolution_reference_id` (nullable), `denial_reason` (nullable), `created_at`
- This is the attendance + no-show + occupancy dataset

**`vendor_orders`** + **`vendor_order_items`** — concessions/vendor POS
- Order: `id`, `partner_id` FK (or null = house concessions), `participant_id` FK, `account_id` FK, `total_tokens`, `ledger_txn_id` FK, `created_at`
- Items: `order_id` FK, `menu_item_id` FK, `qty`, `tokens_each`

**`menu_items`** — what vendors/concessions sell
- `id`, `partner_id` FK (null = house), `name`, `token_price`, `active`

### Settlement

**`settlements`** — periodic payout runs per partner
- `id`, `partner_id` FK, `period_start`, `period_end`, `tokens_redeemed`, `settlement_rate_cents_per_token`, `gross_cents`, `split_pct`, `space_fees_cents` (netted rental charges), `net_payout_cents`, `stripe_transfer_id` (nullable), `status` (pending / paid / failed), `created_at`
- Generated by a scheduled Railway job; every line derivable from the ledger (auditable)

### Loyalty

**`points_ledger`** — append-only, mirrors `token_ledger`
- `id`, `participant_id` FK, `amount` (signed integer), `type` (earn / redeem / adjustment / expiry), `reference_type` + `reference_id` (polymorphic: the `token_ledger` redemption row that earned it, or the `reward_redemptions` row that spent it), `created_at`
- **Invariant:** same single-write-path rule as `token_ledger`. Balance = `SUM(amount)` per participant.
- Earned automatically: on any `token_ledger` redemption row insert, a service call inserts a paired `points_ledger` earn row at the configured rate.

**`reward_items`** — the rewards store catalog
- `id`, `name`, `description`, `image_url`, `points_cost`, `reward_type` (merch / token_grant / free_play_pass / discount / experience / **card_cosmetic**), `token_grant_amount` (nullable — for "points → tokens" items), `inventory_count` (nullable, for physical merch), `active`

**`reward_redemptions`**
- `id`, `participant_id` FK, `reward_item_id` FK, `points_ledger_txn_id` FK (the debit), `status` (pending / fulfilled / cancelled), `fulfilled_by` (nullable staff_user), `created_at`

### Notifications

**`notifications`** — outbound alerts (referenced by free play expiry warnings and split-invite prompts; needed a home)
- `id`, `account_id` FK, `participant_id` FK (nullable — who it's about), `type` (free_play_expiring / split_invite / split_reminder / reservation_confirmed / low_balance / other), `channel` (push / sms), `reference_type` + `reference_id` (polymorphic), `sent_at`, `read_at` (nullable), `payload` (jsonb — message content)
- Delivery: web push (via PWA service worker) as primary channel since it's free and members already have the app open; SMS as fallback for time-critical alerts (split invites, pass expiry) since not everyone keeps push permissions on. Channel choice per notification type, not per user, in v1.

### Relationships at a glance

```
accounts 1─* participants 1─* (enrollments | passes | reservations | scans)
accounts 1─* token_ledger *─1 partners (beneficiary, nullable=house)
sports 1─* offerings 1─* enrollments
spaces 1─* schedule_blocks *─1 offerings (league/camp blocks)
partners 1─* (menu_items | vendor_orders | settlements)
vendor_orders 1─* vendor_order_items *─1 menu_items
```

### Questions the model surfaced (answers assumed, flag if wrong)
- **Reservations belong to a participant** (not just the account) — the parent books, the kid plays, the kid's card checks in. ✔ assumed yes
- **Waitlist lives on `enrollments.status`** rather than a separate table — simpler for v1. ✔ assumed yes
- ~~One wallet per account~~ → **RESOLVED: per-participant wallets** with account rollup + free intra-account transfers (see Wallet model decision)
- **Spend-source rule:** kiosk/walk-in/vendor spends debit the *scanned participant's* balance; parent-initiated purchases (enrollments, passes, reservations made in the PWA) may debit any participant balance in the account the parent chooses. ✔ assumed yes

---

## 7. Technical Notes

- **Stripe webhooks** hit the Railway API's stable public URL; ledger credit happens on settlement, never on client-side confirmation.
- **Stripe Connect** for vendor/coach payouts — connected accounts, automated transfer on settlement cadence, 1099 tax handling.
- **Background jobs on Railway:** credit expiry sweeps, auto-reload billing, nightly ledger reconciliation (cron/worker services off same codebase).
- **CORS/auth:** Frontends and API on different domains → configure CORS; httpOnly cookie sessions or short-lived JWTs.
- **OTP delivery:** Twilio Verify (or similar) — ~1¢/SMS; rate-limit OTP endpoint from day one (abuse target); long-lived sessions post-verification.
- **Domains:** `app.`, `admin.`, `scan.` subdomains on the facility domain.
- **Estimated infra cost at launch:** ~$5–20/mo Railway + Vercel free tier.

---

## 8. Transferability Standing Rules

> **This is a standing instruction, not a one-time task.** Every build session — from the first commit onward — operates under these rules. They apply continuously, not just at a "transfer" milestone. Goal: this entire system can be handed to a new owner (new GitHub org, new Railway account, new Vercel account, new Claude Code session, zero shared history with the original builder) at any time with no reverse-engineering required.

1. **`CLAUDE.md` maintained from the first commit.** Lives at repo root. Documents architecture decisions, conventions, the ledger invariants, and anything a fresh Claude Code session would need to work in this codebase without this chat history. Updated in the same PR as any change that affects it — never left to go stale.
   - **Bootstrapping requirement:** `DESIGN.md` (this document) is the brainstorming record; `CLAUDE.md` is the file every future Claude Code session actually reads. The very first commit must create `CLAUDE.md` and seed it with this entire Transferability Standing Rules section (§8) plus the core architecture decisions from §3 and §6. This makes the rule self-enforcing — no session can "forget" it, because it loads automatically every session from commit one, not just when someone remembers to mention it.

2. **`README.md` with fresh-clone setup steps.** A new developer with nothing but repo access can get the full stack running locally by following it top to bottom — no tribal knowledge, no "ask the previous owner." Covers prerequisites, install, env setup, running migrations + seed, starting all four apps.

3. **No hardcoded secrets or account-specific values, anywhere.** No API keys, Stripe IDs, Railway/Vercel project references, phone numbers, or domain names in code. Everything account-specific comes from environment variables. `.env.example` is maintained alongside every `.env` change — if a new env var is added, `.env.example` gets it in the same commit, with a comment describing what it is and where to get it.

4. **Database schema fully reproducible from migration files.** No manual schema edits via a GUI, ever. A fresh Postgres instance + `migrate` + `seed` must produce a working dev environment. Seed script creates enough fake data (a sport, a space, a schedule block, a test account) to actually use the app immediately after setup.

5. **`docs/DEPLOYMENT.md`** — standing up the entire system on brand-new Railway and Vercel accounts, start to finish: creating the projects, environment variables required (cross-referenced with `.env.example`), Stripe webhook registration (exact endpoints), Stripe Connect setup, domain/DNS configuration for all subdomains, and any dashboard-only setup steps (e.g., Twilio Verify configuration) written out explicitly since they can't live in code.

6. **`docs/HANDOFF.md`** — the actual transfer checklist. What to change hands (GitHub org transfer vs. fork, Railway project transfer, Vercel project transfer, domain registrar/DNS transfer, Stripe account or Connect platform transfer, Twilio/SMS provider), what credentials rotate on handoff (all of them), and the order to do it in to avoid downtime.

7. **Nothing lives only in a dashboard without being documented.** Any configuration made by clicking around in Railway, Vercel, Stripe, or Twilio's dashboards — a cron schedule, a webhook, a redirect rule, a domain setting — gets written down in `docs/DEPLOYMENT.md` the same day it's configured. If it's not written down, it doesn't count as done.

8. **Transfer-blocker audit before each milestone.** "Milestone" = the end of each phase in the build order (§1): (1) ledger + API, (2) admin dashboard, (3) member PWA, (4) scan-station app, (5) marketing site, and any major feature phase after (vendors/settlement, loyalty, split payments). Before marking a milestone complete, explicitly check for: hardcoded values that snuck in, undocumented dashboard configuration, an out-of-date `.env.example`, an out-of-date `CLAUDE.md`. Fix before moving on — not deferred to "later."

---

## 9. Changelog

| Date | Change |
|---|---|
| 2026-07-02 | Initial doc: concept, stack (GitHub/Vercel/Railway), ledger architecture, QR token design, build order, economics model, open questions |
| 2026-07-02 | Confirmed PWA requirement for member app; added separate marketing website (landing page) as `/apps/marketing`; updated build order |
| 2026-07-02 | Defined offerings catalog: sports as admin-managed data (basketball, volleyball, futsal, pickleball at launch); offerings (walk-in/league/camp) as universal purchasable unit; payment-vs-check-in distinction; standardized on "tokens" terminology; added open questions 11–14 |
| 2026-07-02 | Added free play pass offering (token-purchased time window, roam any open activity); facility schedule promoted to first-class concept; scan station three-way resolution; clock starts at first scan; extend-pass upsell UX; open questions 15–17 |
| 2026-07-02 | Three decisions locked: mixed reservations in v1 (schedule block modes), phone OTP auth, purchaser/participant account split (absorbs family accounts into v1). Open questions renumbered; guest walk-ins split out as new question |
| 2026-07-02 | Scan flow decided: staff + kiosk hybrid — one app, kiosk mode default with tap-to-confirm deductions, PIN-unlocked staff mode for comps/overrides/guest starter packs |
| 2026-07-02 | Brand established: The Alumni Center; logo on file; primary color #0F5898 (sampled); collegiate/varsity visual direction; new Brand section added |
| 2026-07-02 | Platform expansion: tokens spendable at concessions/vendors; every ledger redemption tagged with beneficiary (house/vendor/coach); coaches' lessons as offerings with coach beneficiary; settlement engine (rate + split % → Stripe Connect payouts); rental netting for coaches; money-transmission added to lawyer list; open questions 14–18 |
| 2026-07-02 | Data Model section added: 16 tables across identity (accounts/participants/staff/partners), wallet (append-only ledger + packages), catalog (sports/spaces/schedule_blocks/offerings), purchases (enrollments/passes/reservations), door (scans/vendor_orders/menu_items), settlement. Key invariants: ledger append-only via single write path; reservation overlap blocked at DB level. Three assumptions flagged — one wallet per account needs confirmation |
| 2026-07-02 | Wallet model resolved: **per-participant balances** (D&B Power Card model) instead of pooled account wallet. Account view = rollup of all participant balances. Transfer added as ledger type (paired net-zero rows, free intra-account). Purchases allocate to a chosen participant; kiosk spends debit the scanned participant; parents can fund enrollments from any of their participants' balances |
| 2026-07-02 | Schedule authoring confirmed as drag-and-drop resource calendar (courts × time grid) in admin dashboard — visual editor over `schedule_blocks`. Kiosks bind to a space at setup and auto-display that court's schedule via polling (v1) / SSE (later). Added `kiosk_devices` table. Real-time question resolved; calendar library choice (FullCalendar vs. custom) added as open question 18 |
| 2026-07-02 | Loyalty points system added: separate currency from tokens, earned on token spend (not purchase), own append-only `points_ledger` mirroring the token ledger pattern. Rewards store (`reward_items` + `reward_redemptions`) lets participants redeem points for merch, token grants, passes, discounts, experiences. Points have no cash value / can't be bought — keeps them outside stored-value law scope. Open questions 19–22 |
| 2026-07-02 | Membership card branded **The Alumni Card**. Rendered as SVG/canvas PWA component (not static image) with customizable background/badge/photo and a fixed-position QR overlay for reliable scanning. Customization tied into loyalty as unlockable `card_cosmetics`, purchasable via Rewards Store (`card_cosmetic` reward type added). Apple/Google Wallet pass positioned as simplified companion, not primary experience (template limitations). Added `alumni_card_config` field + `card_cosmetics` table. Open questions 23–24 |
| 2026-07-02 | Split payments added: any token-costing thing (reservation/walk-in/free play) can be cost-shared across N participants via `split_requests` + `split_shares`, each producing its own per-participant ledger debit tagged to the same reference. Reservations gain `pending_split`/`expired_unfilled` states; confirm only once all shares paid, with countdown-based release. Open questions 25–27 |
| 2026-07-02 | Added **Transferability Standing Rules** section (§8) — a continuous, milestone-checked build constraint: CLAUDE.md maintained from commit one; README with fresh-clone setup; zero hardcoded secrets/account-specific values + maintained .env.example; schema reproducible from migrations + seed; docs/DEPLOYMENT.md for fresh Railway/Vercel/Stripe/Twilio setup; docs/HANDOFF.md transfer checklist; nothing dashboard-only without documentation; transfer-blocker audit before each milestone. To be folded into the Claude Code kickoff prompt as a standing instruction |
| 2026-07-02 | Clarified §8 rule 1: first commit must create `CLAUDE.md` and seed it with the full Transferability section + core architecture decisions (self-enforcing from day one, distinct from this brainstorming doc). Clarified rule 8: defined "milestone" as end of each build-order phase |
| 2026-07-02 | **Full conversation audit.** Fixed misplaced sentence in `participants`/`card_cosmetics` tables; removed duplicate `---`. Closed a real gap: added `notifications` table (was referenced by free-play-expiry and split-invite features but had no schema home); added open question 28 (notification provider). Re-surfaced unanswered question 29: lean v1 league scope was proposed but never explicitly confirmed. |
| 2026-07-02 | **League scope resolved: full management, not lean.** Facility already runs leagues — v1 needs teams, scheduled games, score entry, and computed standings, not just registration/roster/check-in. Added `teams`, `team_members`, `games`, `game_scores`, `standings` tables. Open questions renumbered (31 total); added 4 new league questions (team formation method, score entry permission, standings formula, playoffs/brackets scope). Build order updated — brackets/tournaments deferred, standings/scores now v1. |
