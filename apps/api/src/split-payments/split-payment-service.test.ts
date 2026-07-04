import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql, eq } from "drizzle-orm";
import {
  createDbClient,
  accounts,
  participants,
  sports,
  spaces,
  scheduleBlocks,
  offerings,
  reservations,
  type Db,
} from "@alumni/db";
import { recordPurchase, getParticipantBalance } from "../ledger/ledger-service.js";
import { splitRequests } from "@alumni/db";
import {
  createSplitRequest,
  acceptSplitShare,
  declineSplitShare,
  expireStaleSplitRequests,
  SplitShareAlreadyResolvedError,
  SplitRequestExpiredError,
} from "./split-payment-service.js";

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
    await recordPurchase(db, { accountId: account.id, participantId: participant.id, tokensGranted: tokens, createdBy: "system" });
  }
  return { account, participant };
}

async function createReservation() {
  const [sport] = await db.insert(sports).values({ name: "Pickleball", slug: `pb-${Date.now()}-${Math.random()}` }).returning();
  const [space] = await db.insert(spaces).values({ name: "Court X" }).returning();
  const [offering] = await db.insert(offerings).values({ type: "reservation", sportId: sport.id, name: "Court booking", tokenPrice: 20 }).returning();
  const [block] = await db
    .insert(scheduleBlocks)
    .values({ spaceId: space.id, sportId: sport.id, mode: "reservable", offeringId: offering.id, startsAt: new Date(), endsAt: new Date(Date.now() + 3600_000) })
    .returning();
  const { account, participant } = await createFundedParticipant("0001", 0);
  const [reservation] = await db
    .insert(reservations)
    .values({
      scheduleBlockId: block.id,
      participantId: participant.id,
      accountId: account.id,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      status: "pending_split",
    })
    .returning();
  return { reservation, initiator: participant };
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

describe("split payments", () => {
  it("confirms the reservation once all shares are paid", async () => {
    const { reservation, initiator } = await createReservation();
    const { participant: friend } = await createFundedParticipant("0002", 20);

    // Fund the initiator's own share too
    await recordPurchase(db, { accountId: reservation.accountId, participantId: initiator.id, tokensGranted: 10, createdBy: "system" });

    const { shares } = await createSplitRequest(db, {
      initiatorParticipantId: initiator.id,
      referenceType: "reservation",
      referenceId: reservation.id,
      totalTokens: 20,
      splitMethod: "equal",
      shares: [
        { participantId: initiator.id, amountTokens: 10 },
        { participantId: friend.id, amountTokens: 10 },
      ],
    });

    const initiatorShare = shares.find((s: any) => s.participantId === initiator.id)!;
    const friendShare = shares.find((s: any) => s.participantId === friend.id)!;

    const first = await acceptSplitShare(db, { shareId: initiatorShare.id, accountId: reservation.accountId });
    expect(first.requestCompleted).toBe(false);

    const [stillPending] = await db.select().from(reservations).where(eq(reservations.id, reservation.id));
    expect(stillPending.status).toBe("pending_split");

    const friendAccountId = (await db.select().from(participants).where(eq(participants.id, friend.id)))[0].accountId;
    const second = await acceptSplitShare(db, { shareId: friendShare.id, accountId: friendAccountId });
    expect(second.requestCompleted).toBe(true);

    const [booked] = await db.select().from(reservations).where(eq(reservations.id, reservation.id));
    expect(booked.status).toBe("booked");

    expect(await getParticipantBalance(db, initiator.id)).toBe(0);
    expect(await getParticipantBalance(db, friend.id)).toBe(10);
  });

  it("rejects paying the same share twice", async () => {
    const { reservation, initiator } = await createReservation();
    await recordPurchase(db, { accountId: reservation.accountId, participantId: initiator.id, tokensGranted: 20, createdBy: "system" });

    const { shares } = await createSplitRequest(db, {
      initiatorParticipantId: initiator.id,
      referenceType: "reservation",
      referenceId: reservation.id,
      totalTokens: 20,
      splitMethod: "equal",
      shares: [{ participantId: initiator.id, amountTokens: 20 }],
    });

    await acceptSplitShare(db, { shareId: shares[0].id, accountId: reservation.accountId });
    await expect(acceptSplitShare(db, { shareId: shares[0].id, accountId: reservation.accountId })).rejects.toThrow(
      SplitShareAlreadyResolvedError,
    );
  });

  it("rejects shares that don't sum to totalTokens", async () => {
    const { reservation, initiator } = await createReservation();
    await expect(
      createSplitRequest(db, {
        initiatorParticipantId: initiator.id,
        referenceType: "reservation",
        referenceId: reservation.id,
        totalTokens: 20,
        splitMethod: "custom",
        shares: [{ participantId: initiator.id, amountTokens: 15 }],
      }),
    ).rejects.toThrow(/must sum to total_tokens/);
  });

  it("cancels the whole request when a share is declined", async () => {
    const { reservation, initiator } = await createReservation();
    const { participant: friend } = await createFundedParticipant("0003", 20);

    const { shares } = await createSplitRequest(db, {
      initiatorParticipantId: initiator.id,
      referenceType: "reservation",
      referenceId: reservation.id,
      totalTokens: 20,
      splitMethod: "equal",
      shares: [
        { participantId: initiator.id, amountTokens: 10 },
        { participantId: friend.id, amountTokens: 10 },
      ],
    });

    const friendShare = shares.find((s: any) => s.participantId === friend.id)!;
    await declineSplitShare(db, friendShare.id);

    const initiatorShare = shares.find((s: any) => s.participantId === initiator.id)!;
    await expect(
      acceptSplitShare(db, { shareId: initiatorShare.id, accountId: reservation.accountId }),
    ).rejects.toThrow(SplitRequestExpiredError);
  });

  it("refunds paid shares and releases the reservation on expiry", async () => {
    const { reservation, initiator } = await createReservation();
    await recordPurchase(db, { accountId: reservation.accountId, participantId: initiator.id, tokensGranted: 20, createdBy: "system" });

    const { request, shares } = await createSplitRequest(db, {
      initiatorParticipantId: initiator.id,
      referenceType: "reservation",
      referenceId: reservation.id,
      totalTokens: 20,
      splitMethod: "custom",
      shares: [
        { participantId: initiator.id, amountTokens: 10 },
        { participantId: initiator.id, amountTokens: 10 },
      ],
      expiresInMinutes: 15,
    });

    const initiatorShare = shares[0];
    await acceptSplitShare(db, { shareId: initiatorShare.id, accountId: reservation.accountId });
    expect(await getParticipantBalance(db, initiator.id)).toBe(10);

    // Simulate time passing: the request expires before the second share is ever paid.
    await db.update(splitRequests).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(splitRequests.id, request.id));

    await expireStaleSplitRequests(db);

    expect(await getParticipantBalance(db, initiator.id)).toBe(20); // refunded
    const [expired] = await db.select().from(reservations).where(eq(reservations.id, reservation.id));
    expect(expired.status).toBe("expired_unfilled");
  });
});
