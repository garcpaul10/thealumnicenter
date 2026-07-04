ALTER TABLE "accounts" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_clerk_user_id_unique" ON "accounts" USING btree ("clerk_user_id");