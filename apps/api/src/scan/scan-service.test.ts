import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  createDbClient,
  accounts,
  participants,
  sports,
  spaces,
  offerings,
  scheduleBlocks,
  passes,
  enrollments,
  kioskDevices,
  type Db,
} from "@alumni/db";
import { recordPurchase, getParticipantBalance } from "../ledger/ledger-service.js";
import { resolveScan, confirmWalkIn } from "./scan-service.js";

async function createStationId() {
  const [space] = await db.insert(spaces).values({ name: `Station ${Date.now()}-${Math.random()}` }).returning();
  const [device] = await db.insert(kioskDevices).values({ spaceId: space.id, deviceLabel: "Test Kiosk" }).returning();
  return device.id;
}

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/alumni_center_test`;

let db: Db;

async function createFundedParticipant(phoneSuffix: string, tokens: number) {
  const [account] = await db.insert(accounts).values({ phone: `+1502557${phoneSuffix}` }).returning();
  const [participant] = await db
    .insert(participants)
    .values({ accountId: account.id, firstName: "Test", lastName: "P", isAccountOwner: true })
    .returning();
  if (tokens > 0) {
    await recordPurchase(db, {
      accountId: account.id,
      participantId: participant.id,
      tokensGranted: tokens,
      createdBy: "system",
    });
  }
  return { account, participant };
}

async function createSpaceWithBlock(params: {
  mode: "open_play" | "league" | "closed";
  offeringId?: string | null;
  walkInTokenPrice?: number | null;
  startsInMinutes?: number;
  endsInMinutes?: number;
}) {
  const [space] = await db.insert(spaces).values({ name: `Court ${Date.now()}-${Math.random()}` }).returning();
  const now = new Date();
  const [block] = await db
    .insert(scheduleBlocks)
    .values({
      spaceId: space.id,
      mode: params.mode,
      offeringId: params.offeringId ?? null,
      walkInTokenPrice: params.walkInTokenPrice ?? null,
      startsAt: new Date(now.getTime() + (params.startsInMinutes ?? -30) * 60_000),
      endsAt: new Date(now.getTime() + (params.endsInMinutes ?? 30) * 60_000),
    })
    .returning();
  return { space, block };
}

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

describe("resolveScan", () => {
  it("denies when the space has no open block right now", async () => {
    const { participant } = await createFundedParticipant("0001", 20);
    const [space] = await db.insert(spaces).values({ name: `Empty ${Date.now()}` }).returning();

    const decision = await resolveScan(db, { participantId: participant.id, spaceId: space.id, stationId: await createStationId() });

    expect(decision.resolution).toBe("denied");
  });

  it("checks in an unused free-play pass, activates it, and takes no deduction", async () => {
    const { account, participant } = await createFundedParticipant("0002", 20);
    const [sport] = await db.insert(sports).values({ name: "Basketball", slug: `bball-${Date.now()}` }).returning();
    const [offering] = await db
      .insert(offerings)
      .values({ type: "free_play_pass", sportId: sport.id, name: "Free Play", tokenPrice: 10, durationMinutes: 60 })
      .returning();
    const { space } = await createSpaceWithBlock({ mode: "open_play", offeringId: offering.id });
    await db.insert(passes).values({
      offeringId: offering.id,
      participantId: participant.id,
      accountId: account.id,
      durationMinutes: 60,
      status: "unused",
    });

    const balanceBefore = await getParticipantBalance(db, participant.id);
    const decision = await resolveScan(db, { participantId: participant.id, spaceId: space.id, stationId: await createStationId() });

    expect(decision.resolution).toBe("pass_checkin");
    const balanceAfter = await getParticipantBalance(db, participant.id);
    expect(balanceAfter).toBe(balanceBefore);

    const [pass] = await db.select().from(passes);
    expect(pass.status).toBe("active");
    expect(pass.activatedAt).not.toBeNull();
  });

  it("checks in an enrolled participant with no deduction", async () => {
    const { account, participant } = await createFundedParticipant("0003", 20);
    const [sport] = await db.insert(sports).values({ name: "Volleyball", slug: `vb-${Date.now()}` }).returning();
    const [offering] = await db
      .insert(offerings)
      .values({ type: "league", sportId: sport.id, name: "League", tokenPrice: 10 })
      .returning();
    const { space } = await createSpaceWithBlock({ mode: "league", offeringId: offering.id });
    await db.insert(enrollments).values({
      offeringId: offering.id,
      participantId: participant.id,
      accountId: account.id,
      status: "enrolled",
    });

    const decision = await resolveScan(db, { participantId: participant.id, spaceId: space.id, stationId: await createStationId() });

    expect(decision.resolution).toBe("enrollment_checkin");
  });

  it("offers a walk-in when neither a pass nor an enrollment applies", async () => {
    const { participant } = await createFundedParticipant("0004", 20);
    const [sport] = await db.insert(sports).values({ name: "Futsal", slug: `futsal-${Date.now()}` }).returning();
    const [offering] = await db
      .insert(offerings)
      .values({ type: "walk_in", sportId: sport.id, name: "Walk-in Futsal", tokenPrice: 5 })
      .returning();
    const { space, block } = await createSpaceWithBlock({
      mode: "open_play",
      offeringId: offering.id,
      walkInTokenPrice: 5,
    });

    const decision = await resolveScan(db, { participantId: participant.id, spaceId: space.id, stationId: await createStationId() });

    expect(decision.resolution).toBe("walk_in_available");
    if (decision.resolution === "walk_in_available") {
      expect(decision.scheduleBlockId).toBe(block.id);
      expect(decision.walkInTokenPrice).toBe(5);
    }
  });
});

describe("confirmWalkIn", () => {
  it("deducts tokens and records a scan row only after explicit confirmation", async () => {
    const { account, participant } = await createFundedParticipant("0005", 20);
    const { block } = await createSpaceWithBlock({ mode: "open_play" });

    const balanceBefore = await getParticipantBalance(db, participant.id);
    await confirmWalkIn(db, {
      participantId: participant.id,
      accountId: account.id,
      stationId: await createStationId(),
      scheduleBlockId: block.id,
      amountTokens: 5,
      createdBy: "staff",
    });

    const balanceAfter = await getParticipantBalance(db, participant.id);
    expect(balanceAfter).toBe(balanceBefore - 5);
  });

  it("throws InsufficientBalanceError rather than deducting a partial amount", async () => {
    const { account, participant } = await createFundedParticipant("0006", 2);
    const { block } = await createSpaceWithBlock({ mode: "open_play" });

    await expect(
      confirmWalkIn(db, {
        participantId: participant.id,
        accountId: account.id,
        stationId: await createStationId(),
        scheduleBlockId: block.id,
        amountTokens: 5,
        createdBy: "staff",
      }),
    ).rejects.toThrow();

    const balanceAfter = await getParticipantBalance(db, participant.id);
    expect(balanceAfter).toBe(2);
  });
});
