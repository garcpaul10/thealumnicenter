DO $$ BEGIN
 CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_cosmetic_type" AS ENUM('background', 'badge', 'effect');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_cosmetic_unlock_method" AS ENUM('default', 'reward_item', 'achievement');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."enrollment_status" AS ENUM('enrolled', 'waitlisted', 'withdrawn', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."game_score_entered_by" AS ENUM('staff_user', 'team_captain');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."game_status" AS ENUM('scheduled', 'in_progress', 'final', 'postponed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_created_by" AS ENUM('member', 'staff', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_type" AS ENUM('purchase', 'redemption', 'refund', 'bonus', 'adjustment', 'expiry', 'transfer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_channel" AS ENUM('push', 'sms');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('free_play_expiring', 'split_invite', 'split_reminder', 'reservation_confirmed', 'low_balance', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."offering_type" AS ENUM('walk_in', 'free_play_pass', 'league', 'camp', 'reservation', 'lesson', 'clinic');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."partner_status" AS ENUM('active', 'inactive');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."partner_type" AS ENUM('vendor', 'coach');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pass_status" AS ENUM('unused', 'active', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."points_type" AS ENUM('earn', 'redeem', 'adjustment', 'expiry');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reservation_status" AS ENUM('pending_split', 'booked', 'checked_in', 'cancelled', 'no_show', 'expired_unfilled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reward_redemption_status" AS ENUM('pending', 'fulfilled', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."reward_type" AS ENUM('merch', 'token_grant', 'free_play_pass', 'discount', 'experience', 'card_cosmetic');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."scan_resolution" AS ENUM('pass_checkin', 'enrollment_checkin', 'reservation_checkin', 'walk_in', 'denied', 'vendor_order');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."schedule_mode" AS ENUM('open_play', 'reservable', 'league', 'camp', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'paid', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."split_method" AS ENUM('equal', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."split_request_status" AS ENUM('pending', 'completed', 'expired', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."split_share_status" AS ENUM('invited', 'accepted', 'declined', 'paid');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staff_role" AS ENUM('admin', 'staff');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."team_member_role" AS ENUM('captain', 'player');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(320),
	"stripe_customer_id" text,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_cosmetics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "card_cosmetic_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"asset_ref" text NOT NULL,
	"unlock_method" "card_cosmetic_unlock_method" DEFAULT 'default' NOT NULL,
	"reward_item_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'enrolled' NOT NULL,
	"ledger_txn_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"entered_by" "game_score_entered_by" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"final" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"schedule_block_id" uuid,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "game_status" DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kiosk_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"device_label" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"staff_mode_pin_hash" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid,
	"name" varchar(200) NOT NULL,
	"token_price" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"participant_id" uuid,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "offering_type" NOT NULL,
	"sport_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"token_price" integer NOT NULL,
	"capacity" integer,
	"coach_partner_id" uuid,
	"duration_minutes" integer,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"nickname" varchar(100),
	"dob" timestamp,
	"photo_url" text,
	"is_account_owner" boolean DEFAULT false NOT NULL,
	"alumni_card_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "partner_type" NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"contact_phone" varchar(20),
	"stripe_connect_account_id" text,
	"split_pct" numeric(5, 2) NOT NULL,
	"settlement_rate_cents_per_token" integer,
	"status" "partner_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"duration_minutes" integer NOT NULL,
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"ledger_txn_id" uuid,
	"status" "pass_status" DEFAULT 'unused' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" "points_type" NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_block_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'pending_split' NOT NULL,
	"ledger_txn_id" uuid,
	"split_request_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reward_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"image_url" text,
	"points_cost" integer NOT NULL,
	"reward_type" "reward_type" NOT NULL,
	"token_grant_amount" integer,
	"inventory_count" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reward_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"reward_item_id" uuid NOT NULL,
	"points_ledger_txn_id" uuid NOT NULL,
	"status" "reward_redemption_status" DEFAULT 'pending' NOT NULL,
	"fulfilled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"station_id" uuid NOT NULL,
	"resolved_as" "scan_resolution" NOT NULL,
	"resolution_reference_id" uuid,
	"denial_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"sport_id" uuid,
	"mode" "schedule_mode" NOT NULL,
	"offering_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"recurrence_rule" text,
	"walk_in_token_price" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"tokens_redeemed" integer NOT NULL,
	"settlement_rate_cents_per_token" integer NOT NULL,
	"gross_cents" integer NOT NULL,
	"split_pct" numeric(5, 2) NOT NULL,
	"space_fees_cents" integer DEFAULT 0 NOT NULL,
	"net_payout_cents" integer NOT NULL,
	"stripe_transfer_id" text,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"capacity" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "split_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiator_participant_id" uuid NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid NOT NULL,
	"total_tokens" integer NOT NULL,
	"split_method" "split_method" DEFAULT 'equal' NOT NULL,
	"status" "split_request_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "split_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_request_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"amount_tokens" integer NOT NULL,
	"status" "split_share_status" DEFAULT 'invited' NOT NULL,
	"ledger_txn_id" uuid,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"icon" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"role" "staff_role" DEFAULT 'staff' NOT NULL,
	"kiosk_pin_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"ties" integer DEFAULT 0 NOT NULL,
	"points_for" integer DEFAULT 0 NOT NULL,
	"points_against" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"team_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"role" "team_member_role" DEFAULT 'player' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"captain_participant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" "ledger_type" NOT NULL,
	"beneficiary_partner_id" uuid,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"stripe_payment_intent_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" "ledger_created_by" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"price_cents" integer NOT NULL,
	"tokens_granted" integer NOT NULL,
	"bonus_tokens" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	"tokens_each" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid,
	"participant_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"total_tokens" integer NOT NULL,
	"ledger_txn_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_cosmetics" ADD CONSTRAINT "card_cosmetics_reward_item_id_reward_items_id_fk" FOREIGN KEY ("reward_item_id") REFERENCES "public"."reward_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_ledger_txn_id_token_ledger_id_fk" FOREIGN KEY ("ledger_txn_id") REFERENCES "public"."token_ledger"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_schedule_block_id_schedule_blocks_id_fk" FOREIGN KEY ("schedule_block_id") REFERENCES "public"."schedule_blocks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kiosk_devices" ADD CONSTRAINT "kiosk_devices_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offerings" ADD CONSTRAINT "offerings_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offerings" ADD CONSTRAINT "offerings_coach_partner_id_partners_id_fk" FOREIGN KEY ("coach_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participants" ADD CONSTRAINT "participants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "passes" ADD CONSTRAINT "passes_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "passes" ADD CONSTRAINT "passes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "passes" ADD CONSTRAINT "passes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "passes" ADD CONSTRAINT "passes_ledger_txn_id_token_ledger_id_fk" FOREIGN KEY ("ledger_txn_id") REFERENCES "public"."token_ledger"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_schedule_block_id_schedule_blocks_id_fk" FOREIGN KEY ("schedule_block_id") REFERENCES "public"."schedule_blocks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_ledger_txn_id_token_ledger_id_fk" FOREIGN KEY ("ledger_txn_id") REFERENCES "public"."token_ledger"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_item_id_reward_items_id_fk" FOREIGN KEY ("reward_item_id") REFERENCES "public"."reward_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_points_ledger_txn_id_points_ledger_id_fk" FOREIGN KEY ("points_ledger_txn_id") REFERENCES "public"."points_ledger"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_fulfilled_by_staff_users_id_fk" FOREIGN KEY ("fulfilled_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scans" ADD CONSTRAINT "scans_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "split_requests" ADD CONSTRAINT "split_requests_initiator_participant_id_participants_id_fk" FOREIGN KEY ("initiator_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_split_request_id_split_requests_id_fk" FOREIGN KEY ("split_request_id") REFERENCES "public"."split_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "split_shares" ADD CONSTRAINT "split_shares_ledger_txn_id_token_ledger_id_fk" FOREIGN KEY ("ledger_txn_id") REFERENCES "public"."token_ledger"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standings" ADD CONSTRAINT "standings_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_participant_id_participants_id_fk" FOREIGN KEY ("captain_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_beneficiary_partner_id_partners_id_fk" FOREIGN KEY ("beneficiary_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_order_items" ADD CONSTRAINT "vendor_order_items_order_id_vendor_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_order_items" ADD CONSTRAINT "vendor_order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_ledger_txn_id_token_ledger_id_fk" FOREIGN KEY ("ledger_txn_id") REFERENCES "public"."token_ledger"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_phone_unique" ON "accounts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participants_account_idx" ON "participants" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "points_ledger_participant_idx" ON "points_ledger" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_block_time_idx" ON "reservations" USING btree ("schedule_block_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scans_participant_idx" ON "scans" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schedule_blocks_space_time_idx" ON "schedule_blocks" USING btree ("space_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sports_slug_unique" ON "sports" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_users_phone_unique" ON "staff_users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "standings_offering_team_unique" ON "standings" USING btree ("offering_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_pk" ON "team_members" USING btree ("team_id","participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_ledger_participant_idx" ON "token_ledger" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_ledger_account_idx" ON "token_ledger" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "token_ledger_reference_idx" ON "token_ledger" USING btree ("reference_type","reference_id");