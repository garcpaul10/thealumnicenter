import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const accountStatusEnum = pgEnum("account_status", ["active", "suspended"]);
export const staffRoleEnum = pgEnum("staff_role", ["admin", "staff"]);
export const partnerTypeEnum = pgEnum("partner_type", ["vendor", "coach"]);
export const partnerStatusEnum = pgEnum("partner_status", ["active", "inactive"]);
export const cardCosmeticTypeEnum = pgEnum("card_cosmetic_type", ["background", "badge", "effect"]);
export const cardCosmeticUnlockMethodEnum = pgEnum("card_cosmetic_unlock_method", [
  "default",
  "reward_item",
  "achievement",
]);

export const ledgerTypeEnum = pgEnum("ledger_type", [
  "purchase",
  "redemption",
  "refund",
  "bonus",
  "adjustment",
  "expiry",
  "transfer",
]);
export const ledgerCreatedByEnum = pgEnum("ledger_created_by", ["member", "staff", "system"]);

export const scheduleModeEnum = pgEnum("schedule_mode", [
  "open_play",
  "reservable",
  "league",
  "camp",
  "closed",
]);

export const offeringTypeEnum = pgEnum("offering_type", [
  "walk_in",
  "free_play_pass",
  "league",
  "camp",
  "reservation",
  "lesson",
  "clinic",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "enrolled",
  "waitlisted",
  "withdrawn",
  "completed",
]);

export const teamMemberRoleEnum = pgEnum("team_member_role", ["captain", "player"]);

export const gameStatusEnum = pgEnum("game_status", [
  "scheduled",
  "in_progress",
  "final",
  "postponed",
  "cancelled",
]);

export const gameScoreEnteredByEnum = pgEnum("game_score_entered_by", ["staff_user", "team_captain"]);

export const passStatusEnum = pgEnum("pass_status", ["unused", "active", "expired"]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending_split",
  "booked",
  "checked_in",
  "cancelled",
  "no_show",
  "expired_unfilled",
]);

export const splitMethodEnum = pgEnum("split_method", ["equal", "custom"]);
export const splitRequestStatusEnum = pgEnum("split_request_status", [
  "pending",
  "completed",
  "expired",
  "cancelled",
]);
export const splitShareStatusEnum = pgEnum("split_share_status", [
  "invited",
  "accepted",
  "declined",
  "paid",
]);

export const scanResolutionEnum = pgEnum("scan_resolution", [
  "pass_checkin",
  "enrollment_checkin",
  "reservation_checkin",
  "walk_in",
  "denied",
  "vendor_order",
]);

export const settlementStatusEnum = pgEnum("settlement_status", ["pending", "paid", "failed"]);

export const pointsTypeEnum = pgEnum("points_type", ["earn", "redeem", "adjustment", "expiry"]);

export const rewardTypeEnum = pgEnum("reward_type", [
  "merch",
  "token_grant",
  "free_play_pass",
  "discount",
  "experience",
  "card_cosmetic",
]);

export const rewardRedemptionStatusEnum = pgEnum("reward_redemption_status", [
  "pending",
  "fulfilled",
  "cancelled",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "free_play_expiring",
  "split_invite",
  "split_reminder",
  "reservation_confirmed",
  "low_balance",
  "other",
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["push", "sms"]);

// ---------------------------------------------------------------------------
// Identity & access
// ---------------------------------------------------------------------------

export const accounts = pgTable("accounts", {
  id: id(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  stripeCustomerId: text("stripe_customer_id"),
  status: accountStatusEnum("status").notNull().default("active"),
  createdAt: createdAt(),
}, (table) => ({
  phoneUnique: uniqueIndex("accounts_phone_unique").on(table.phone),
}));

export const participants = pgTable("participants", {
  id: id(),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  dob: timestamp("dob", { withTimezone: false }),
  photoUrl: text("photo_url"),
  isAccountOwner: boolean("is_account_owner").notNull().default(false),
  alumniCardConfig: jsonb("alumni_card_config").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
}, (table) => ({
  accountIdx: index("participants_account_idx").on(table.accountId),
}));

export const cardCosmetics = pgTable("card_cosmetics", {
  id: id(),
  type: cardCosmeticTypeEnum("type").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  assetRef: text("asset_ref").notNull(),
  unlockMethod: cardCosmeticUnlockMethodEnum("unlock_method").notNull().default("default"),
  rewardItemId: uuid("reward_item_id").references((): any => rewardItems.id),
});

export const staffUsers = pgTable("staff_users", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  role: staffRoleEnum("role").notNull().default("staff"),
  kioskPinHash: text("kiosk_pin_hash"),
  createdAt: createdAt(),
}, (table) => ({
  phoneUnique: uniqueIndex("staff_users_phone_unique").on(table.phone),
}));

export const partners = pgTable("partners", {
  id: id(),
  type: partnerTypeEnum("type").notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 20 }),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  splitPct: numeric("split_pct", { precision: 5, scale: 2 }).notNull(),
  settlementRateCentsPerToken: integer("settlement_rate_cents_per_token"),
  status: partnerStatusEnum("status").notNull().default("active"),
  createdAt: createdAt(),
});

export const spaces = pgTable("spaces", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  active: boolean("active").notNull().default(true),
});

export const kioskDevices = pgTable("kiosk_devices", {
  id: id(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id),
  deviceLabel: varchar("device_label", { length: 100 }).notNull(),
  registeredAt: createdAt(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  staffModePinHash: text("staff_mode_pin_hash"),
});

// ---------------------------------------------------------------------------
// Catalog & schedule
// ---------------------------------------------------------------------------

export const sports = pgTable("sports", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  icon: text("icon"),
  active: boolean("active").notNull().default(true),
}, (table) => ({
  slugUnique: uniqueIndex("sports_slug_unique").on(table.slug),
}));

export const offerings = pgTable("offerings", {
  id: id(),
  type: offeringTypeEnum("type").notNull(),
  sportId: uuid("sport_id").references(() => sports.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  tokenPrice: integer("token_price").notNull(),
  capacity: integer("capacity"),
  coachPartnerId: uuid("coach_partner_id").references(() => partners.id),
  durationMinutes: integer("duration_minutes"),
  registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
  registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: id(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id),
  sportId: uuid("sport_id").references(() => sports.id),
  mode: scheduleModeEnum("mode").notNull(),
  offeringId: uuid("offering_id").references(() => offerings.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  recurrenceRule: text("recurrence_rule"),
  walkInTokenPrice: integer("walk_in_token_price"),
}, (table) => ({
  spaceTimeIdx: index("schedule_blocks_space_time_idx").on(table.spaceId, table.startsAt),
}));

// ---------------------------------------------------------------------------
// The wallet — token_ledger is append-only and THE source of truth.
// Invariant: rows are never updated or deleted; single write path enforced
// in apps/api/src/ledger (see CLAUDE.md).
// ---------------------------------------------------------------------------

export const tokenLedger = pgTable("token_ledger", {
  id: id(),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  amount: integer("amount").notNull(),
  type: ledgerTypeEnum("type").notNull(),
  beneficiaryPartnerId: uuid("beneficiary_partner_id").references(() => partners.id),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  note: text("note"),
  createdAt: createdAt(),
  createdBy: ledgerCreatedByEnum("created_by").notNull(),
}, (table) => ({
  participantIdx: index("token_ledger_participant_idx").on(table.participantId),
  accountIdx: index("token_ledger_account_idx").on(table.accountId),
  referenceIdx: index("token_ledger_reference_idx").on(table.referenceType, table.referenceId),
}));

export const tokenPackages = pgTable("token_packages", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  tokensGranted: integer("tokens_granted").notNull(),
  bonusTokens: integer("bonus_tokens").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Purchases of offerings
// ---------------------------------------------------------------------------

export const enrollments = pgTable("enrollments", {
  id: id(),
  offeringId: uuid("offering_id").notNull().references(() => offerings.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  status: enrollmentStatusEnum("status").notNull().default("enrolled"),
  ledgerTxnId: uuid("ledger_txn_id").references(() => tokenLedger.id),
  createdAt: createdAt(),
});

export const teams = pgTable("teams", {
  id: id(),
  offeringId: uuid("offering_id").notNull().references(() => offerings.id),
  name: varchar("name", { length: 200 }).notNull(),
  captainParticipantId: uuid("captain_participant_id").references(() => participants.id),
  createdAt: createdAt(),
});

export const teamMembers = pgTable("team_members", {
  teamId: uuid("team_id").notNull().references(() => teams.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  role: teamMemberRoleEnum("role").notNull().default("player"),
  joinedAt: createdAt(),
}, (table) => ({
  pk: uniqueIndex("team_members_pk").on(table.teamId, table.participantId),
}));

export const games = pgTable("games", {
  id: id(),
  offeringId: uuid("offering_id").notNull().references(() => offerings.id),
  scheduleBlockId: uuid("schedule_block_id").references(() => scheduleBlocks.id),
  homeTeamId: uuid("home_team_id").notNull().references(() => teams.id),
  awayTeamId: uuid("away_team_id").notNull().references(() => teams.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  status: gameStatusEnum("status").notNull().default("scheduled"),
});

export const gameScores = pgTable("game_scores", {
  id: id(),
  gameId: uuid("game_id").notNull().references(() => games.id),
  homeScore: integer("home_score").notNull(),
  awayScore: integer("away_score").notNull(),
  enteredBy: gameScoreEnteredByEnum("entered_by").notNull(),
  enteredAt: createdAt(),
  final: boolean("final").notNull().default(false),
});

export const standings = pgTable("standings", {
  id: id(),
  offeringId: uuid("offering_id").notNull().references(() => offerings.id),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  ties: integer("ties").notNull().default(0),
  pointsFor: integer("points_for").notNull().default(0),
  pointsAgainst: integer("points_against").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  offeringTeamUnique: uniqueIndex("standings_offering_team_unique").on(table.offeringId, table.teamId),
}));

export const passes = pgTable("passes", {
  id: id(),
  offeringId: uuid("offering_id").notNull().references(() => offerings.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  durationMinutes: integer("duration_minutes").notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ledgerTxnId: uuid("ledger_txn_id").references(() => tokenLedger.id),
  status: passStatusEnum("status").notNull().default("unused"),
});

export const reservations = pgTable("reservations", {
  id: id(),
  scheduleBlockId: uuid("schedule_block_id").notNull().references(() => scheduleBlocks.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: reservationStatusEnum("status").notNull().default("pending_split"),
  ledgerTxnId: uuid("ledger_txn_id").references(() => tokenLedger.id),
  splitRequestId: uuid("split_request_id"),
}, (table) => ({
  spaceTimeIdx: index("reservations_block_time_idx").on(table.scheduleBlockId, table.startsAt),
}));
// NOTE: no-overlapping-reservations-per-space is enforced via a Postgres
// EXCLUDE constraint added in a raw SQL migration (see
// packages/db/migrations/, requires btree_gist) — not expressible in
// Drizzle's table builder, and deliberately not enforced in application code.

// ---------------------------------------------------------------------------
// Split payments
// ---------------------------------------------------------------------------

export const splitRequests = pgTable("split_requests", {
  id: id(),
  initiatorParticipantId: uuid("initiator_participant_id").notNull().references(() => participants.id),
  referenceType: varchar("reference_type", { length: 50 }).notNull(),
  referenceId: uuid("reference_id").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  splitMethod: splitMethodEnum("split_method").notNull().default("equal"),
  status: splitRequestStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const splitShares = pgTable("split_shares", {
  id: id(),
  splitRequestId: uuid("split_request_id").notNull().references(() => splitRequests.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  amountTokens: integer("amount_tokens").notNull(),
  status: splitShareStatusEnum("status").notNull().default("invited"),
  ledgerTxnId: uuid("ledger_txn_id").references(() => tokenLedger.id),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// The door & the counter
// ---------------------------------------------------------------------------

export const scans = pgTable("scans", {
  id: id(),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  stationId: uuid("station_id").notNull(),
  resolvedAs: scanResolutionEnum("resolved_as").notNull(),
  resolutionReferenceId: uuid("resolution_reference_id"),
  denialReason: text("denial_reason"),
  createdAt: createdAt(),
}, (table) => ({
  participantIdx: index("scans_participant_idx").on(table.participantId),
}));

export const menuItems = pgTable("menu_items", {
  id: id(),
  partnerId: uuid("partner_id").references(() => partners.id),
  name: varchar("name", { length: 200 }).notNull(),
  tokenPrice: integer("token_price").notNull(),
  active: boolean("active").notNull().default(true),
});

export const vendorOrders = pgTable("vendor_orders", {
  id: id(),
  partnerId: uuid("partner_id").references(() => partners.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  totalTokens: integer("total_tokens").notNull(),
  ledgerTxnId: uuid("ledger_txn_id").references(() => tokenLedger.id),
  createdAt: createdAt(),
});

export const vendorOrderItems = pgTable("vendor_order_items", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => vendorOrders.id),
  menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id),
  qty: integer("qty").notNull(),
  tokensEach: integer("tokens_each").notNull(),
});

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

export const settlements = pgTable("settlements", {
  id: id(),
  partnerId: uuid("partner_id").notNull().references(() => partners.id),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  tokensRedeemed: integer("tokens_redeemed").notNull(),
  settlementRateCentsPerToken: integer("settlement_rate_cents_per_token").notNull(),
  grossCents: integer("gross_cents").notNull(),
  splitPct: numeric("split_pct", { precision: 5, scale: 2 }).notNull(),
  spaceFeesCents: integer("space_fees_cents").notNull().default(0),
  netPayoutCents: integer("net_payout_cents").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  status: settlementStatusEnum("status").notNull().default("pending"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Loyalty — points_ledger mirrors token_ledger's append-only pattern.
// Invariant: same single-write-path rule; earned automatically on any
// token_ledger redemption insert.
// ---------------------------------------------------------------------------

export const pointsLedger = pgTable("points_ledger", {
  id: id(),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  amount: integer("amount").notNull(),
  type: pointsTypeEnum("type").notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  createdAt: createdAt(),
}, (table) => ({
  participantIdx: index("points_ledger_participant_idx").on(table.participantId),
}));

export const rewardItems = pgTable("reward_items", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  pointsCost: integer("points_cost").notNull(),
  rewardType: rewardTypeEnum("reward_type").notNull(),
  tokenGrantAmount: integer("token_grant_amount"),
  inventoryCount: integer("inventory_count"),
  active: boolean("active").notNull().default(true),
});

export const rewardRedemptions = pgTable("reward_redemptions", {
  id: id(),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  rewardItemId: uuid("reward_item_id").notNull().references(() => rewardItems.id),
  pointsLedgerTxnId: uuid("points_ledger_txn_id").notNull().references(() => pointsLedger.id),
  status: rewardRedemptionStatusEnum("status").notNull().default("pending"),
  fulfilledBy: uuid("fulfilled_by").references(() => staffUsers.id),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: id(),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  participantId: uuid("participant_id").references(() => participants.id),
  type: notificationTypeEnum("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
});
