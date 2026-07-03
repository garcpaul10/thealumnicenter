import {
  createDbClient,
  accounts,
  participants,
  sports,
  spaces,
  scheduleBlocks,
  offerings,
  tokenPackages,
  staffUsers,
} from "@alumni/db";
import { recordPurchase } from "./ledger/ledger-service.js";
import { hashPassword } from "./auth/password.js";

/**
 * Seeds enough fake data to actually use the app after a fresh clone:
 * a sport, a space, a schedule block, a token package, one staff user, and
 * a test account with two participants (one funded via the real ledger
 * write path — never a direct insert).
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and set it.");
  }
  const db = createDbClient(databaseUrl);

  console.log("Seeding...");

  const [basketball] = await db
    .insert(sports)
    .values({ name: "Basketball", slug: "basketball", icon: "basketball" })
    .returning();

  const [court1] = await db
    .insert(spaces)
    .values({ name: "Court 1", description: "Main gym, full court", capacity: 30 })
    .returning();

  const [walkIn] = await db
    .insert(offerings)
    .values({
      type: "walk_in",
      sportId: basketball.id,
      name: "Basketball Walk-In",
      description: "Drop-in open gym basketball",
      tokenPrice: 5,
    })
    .returning();

  const now = new Date();
  const blockStart = new Date(now);
  blockStart.setHours(16, 0, 0, 0);
  const blockEnd = new Date(now);
  blockEnd.setHours(19, 0, 0, 0);

  await db.insert(scheduleBlocks).values({
    spaceId: court1.id,
    sportId: basketball.id,
    mode: "open_play",
    offeringId: walkIn.id,
    startsAt: blockStart,
    endsAt: blockEnd,
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
  });

  await db.insert(tokenPackages).values({
    name: "Starter Pack",
    priceCents: 5000,
    tokensGranted: 50,
    bonusTokens: 5,
    sortOrder: 1,
  });

  // Local-dev-only default so a fresh clone can log into the admin
  // dashboard immediately. Override with SEED_ADMIN_PASSWORD for anything
  // beyond a throwaway local environment — never run this seed against a
  // database with real data (see the warning on `pnpm db:seed` in README.md).
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  await db.insert(staffUsers).values({
    name: "Sam Staff",
    phone: "+15025550001",
    role: "admin",
    passwordHash: await hashPassword(seedAdminPassword),
  });

  const [account] = await db
    .insert(accounts)
    .values({ phone: "+15025550100", email: "test.purchaser@example.com" })
    .returning();

  const [owner] = await db
    .insert(participants)
    .values({
      accountId: account.id,
      firstName: "Alex",
      lastName: "Test",
      isAccountOwner: true,
    })
    .returning();

  await db.insert(participants).values({
    accountId: account.id,
    firstName: "Jamie",
    lastName: "Test",
    nickname: "Jamie",
    isAccountOwner: false,
  });

  await recordPurchase(db, {
    accountId: account.id,
    participantId: owner.id,
    tokensGranted: 50,
    bonusTokens: 5,
    note: "Seed data — starter balance",
    createdBy: "system",
  });

  console.log("Seed complete:");
  console.log(`  Sport: ${basketball.name}`);
  console.log(`  Space: ${court1.name}`);
  console.log(`  Test account: ${account.phone} (55 tokens on participant "${owner.firstName}")`);
  console.log(`  Admin login: +15025550001 / ${seedAdminPassword}`);

  await (db as any).$client?.end?.();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
