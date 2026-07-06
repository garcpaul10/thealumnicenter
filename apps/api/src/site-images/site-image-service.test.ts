import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDbClient, staffUsers, type Db } from "@alumni/db";
import { listSiteImages, upsertSiteImage } from "./site-image-service.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/alumni_center_test`;

let db: Db;

beforeAll(async () => {
  db = createDbClient(TEST_DATABASE_URL);
});

beforeEach(async () => {
  await db.execute(sql`truncate table
    reward_redemptions, reward_items, notifications, points_ledger,
    settlements, vendor_order_items, vendor_orders, menu_items, scans,
    split_shares, split_requests, reservations, passes, standings,
    game_scores, games, team_members, teams, enrollments, token_ledger,
    offerings, schedule_blocks, sports, spaces, token_packages, partners,
    kiosk_devices, staff_users, card_cosmetics, participants, accounts
    restart identity cascade`);
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

describe("upsertSiteImage", () => {
  it("creates a new row for a slot that has never been set", async () => {
    const row = await upsertSiteImage(db, { slotKey: "hero", imageUrl: "https://blob.example/hero.jpg" });
    expect(row.slotKey).toBe("hero");
    expect(row.imageUrl).toBe("https://blob.example/hero.jpg");

    const rows = await listSiteImages(db);
    expect(rows).toHaveLength(1);
  });

  it("replaces the existing row for a slot rather than creating a duplicate", async () => {
    await upsertSiteImage(db, { slotKey: "hero", imageUrl: "https://blob.example/first.jpg" });
    const updated = await upsertSiteImage(db, { slotKey: "hero", imageUrl: "https://blob.example/second.jpg" });

    expect(updated.imageUrl).toBe("https://blob.example/second.jpg");
    const rows = await listSiteImages(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].imageUrl).toBe("https://blob.example/second.jpg");
  });

  it("records which staff member last updated a slot", async () => {
    const [staffUser] = await db
      .insert(staffUsers)
      .values({ name: "Sam Staff", phone: "+15025559999", passwordHash: "x", role: "admin" })
      .returning();

    const row = await upsertSiteImage(db, {
      slotKey: "about",
      imageUrl: "https://blob.example/about.jpg",
      updatedBy: staffUser.id,
    });

    expect(row.updatedBy).toBe(staffUser.id);
  });
});
