import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDbClient, accounts, participants, type Db } from "@alumni/db";
import { recordRedemption, recordPurchase, getParticipantBalance, getParticipantPointsBalance, redeemReward } from "./ledger-service.js";
import { InsufficientPointsBalanceError } from "./errors.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/alumni_center_test`;

let db: Db;

async function createParticipantWithPoints(phoneSuffix: string, tokensToRedeem: number) {
  const [account] = await db.insert(accounts).values({ phone: `+1502558${phoneSuffix}` }).returning();
  const [participant] = await db
    .insert(participants)
    .values({ accountId: account.id, firstName: "Test", lastName: "P", isAccountOwner: true })
    .returning();
  await recordPurchase(db, { accountId: account.id, participantId: participant.id, tokensGranted: 100, createdBy: "system" });
  if (tokensToRedeem > 0) {
    await recordRedemption(db, {
      accountId: account.id,
      participantId: participant.id,
      amountTokens: tokensToRedeem,
      referenceType: "walk_in",
      referenceId: crypto.randomUUID(),
      createdBy: "member",
    });
  }
  return { account, participant };
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

describe("redeemReward", () => {
  it("debits points only for a non-token reward (e.g. card_cosmetic)", async () => {
    const { participant } = await createParticipantWithPoints("0001", 30); // earns 30 points at 1/token
    expect(await getParticipantPointsBalance(db, participant.id)).toBe(30);

    const { pointsLedgerRow, tokenLedgerRow } = await redeemReward(db, {
      participantId: participant.id,
      pointsCost: 20,
      referenceType: "reward_item",
      referenceId: crypto.randomUUID(),
    });

    expect(pointsLedgerRow.amount).toBe(-20);
    expect(tokenLedgerRow).toBeNull();
    expect(await getParticipantPointsBalance(db, participant.id)).toBe(10);
  });

  it("credits tokens atomically with the points debit for a token_grant reward", async () => {
    const { account, participant } = await createParticipantWithPoints("0002", 50);
    const balanceBefore = await getParticipantBalance(db, participant.id);

    await redeemReward(db, {
      participantId: participant.id,
      pointsCost: 40,
      tokenGrantAmount: 15,
      accountId: account.id,
      referenceType: "reward_item",
      referenceId: crypto.randomUUID(),
    });

    expect(await getParticipantPointsBalance(db, participant.id)).toBe(10);
    expect(await getParticipantBalance(db, participant.id)).toBe(balanceBefore + 15);
  });

  it("rejects redemption when points balance is insufficient, crediting nothing", async () => {
    const { account, participant } = await createParticipantWithPoints("0003", 10); // only 10 points earned
    const tokenBalanceBefore = await getParticipantBalance(db, participant.id);

    await expect(
      redeemReward(db, {
        participantId: participant.id,
        pointsCost: 500,
        tokenGrantAmount: 100,
        accountId: account.id,
        referenceType: "reward_item",
        referenceId: crypto.randomUUID(),
      }),
    ).rejects.toThrow(InsufficientPointsBalanceError);

    expect(await getParticipantPointsBalance(db, participant.id)).toBe(10); // unchanged
    expect(await getParticipantBalance(db, participant.id)).toBe(tokenBalanceBefore); // no token credit leaked through
  });
});
