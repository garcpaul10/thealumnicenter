import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDbClient, accounts, participants, tokenLedger, pointsLedger, type Db } from "@alumni/db";
import {
  recordPurchase,
  recordRedemption,
  recordRefund,
  recordTransfer,
  recordAdjustment,
  getParticipantBalance,
  getParticipantPointsBalance,
  getAccountTokenRollup,
} from "./ledger-service.js";
import { InsufficientBalanceError, CrossAccountTransferError } from "./errors.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgres://${process.env.USER}@localhost:5432/alumni_center_test`;

let db: Db;

async function createAccountWithParticipant(phoneSuffix: string) {
  const [account] = await db
    .insert(accounts)
    .values({ phone: `+1502555${phoneSuffix}` })
    .returning();
  const [participant] = await db
    .insert(participants)
    .values({
      accountId: account.id,
      firstName: "Test",
      lastName: "Participant",
      isAccountOwner: true,
    })
    .returning();
  return { account, participant };
}

beforeAll(async () => {
  db = createDbClient(TEST_DATABASE_URL);
});

beforeEach(async () => {
  // Ledger rows are append-only in production; truncating between tests is
  // a test-harness concern only, not a violation of that invariant.
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

describe("token ledger", () => {
  it("records a purchase and reflects it in the balance", async () => {
    const { account, participant } = await createAccountWithParticipant("0001");

    await recordPurchase(db, {
      accountId: account.id,
      participantId: participant.id,
      tokensGranted: 100,
      bonusTokens: 20,
      stripePaymentIntentId: "pi_test_123",
      createdBy: "system",
    });

    const balance = await getParticipantBalance(db, participant.id);
    expect(balance).toBe(120);

    const rows = await db.select().from(tokenLedger);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.type).sort()).toEqual(["bonus", "purchase"]);
  });

  it("records a redemption, debits balance, and earns points", async () => {
    const { account, participant } = await createAccountWithParticipant("0002");
    await recordPurchase(db, {
      accountId: account.id,
      participantId: participant.id,
      tokensGranted: 50,
      createdBy: "system",
    });

    await recordRedemption(db, {
      accountId: account.id,
      participantId: participant.id,
      amountTokens: 10,
      referenceType: "walk_in",
      referenceId: crypto.randomUUID(),
      createdBy: "member",
    });

    const balance = await getParticipantBalance(db, participant.id);
    expect(balance).toBe(40);

    const pointsBalance = await getParticipantPointsBalance(db, participant.id);
    expect(pointsBalance).toBe(10); // 1 point per token redeemed, default rate

    const points = await db.select().from(pointsLedger);
    expect(points).toHaveLength(1);
    expect(points[0].type).toBe("earn");
  });

  it("rejects a redemption that would overdraw the balance", async () => {
    const { account, participant } = await createAccountWithParticipant("0003");
    await recordPurchase(db, {
      accountId: account.id,
      participantId: participant.id,
      tokensGranted: 5,
      createdBy: "system",
    });

    await expect(
      recordRedemption(db, {
        accountId: account.id,
        participantId: participant.id,
        amountTokens: 10,
        referenceType: "walk_in",
        referenceId: crypto.randomUUID(),
        createdBy: "member",
      }),
    ).rejects.toThrow(InsufficientBalanceError);

    const balance = await getParticipantBalance(db, participant.id);
    expect(balance).toBe(5); // unchanged — failed redemption left no partial row
  });

  it("records a refund as a new offsetting row, never mutating the original", async () => {
    const { account, participant } = await createAccountWithParticipant("0004");
    await recordPurchase(db, {
      accountId: account.id,
      participantId: participant.id,
      tokensGranted: 20,
      createdBy: "system",
    });
    const { redemptionRow } = await recordRedemption(db, {
      accountId: account.id,
      participantId: participant.id,
      amountTokens: 8,
      referenceType: "reservation",
      referenceId: crypto.randomUUID(),
      createdBy: "member",
    });

    await recordRefund(db, {
      accountId: account.id,
      participantId: participant.id,
      amountTokens: 8,
      referenceType: "reservation",
      referenceId: redemptionRow.referenceId!,
      note: "Cancelled >24h out",
      createdBy: "staff",
    });

    const balance = await getParticipantBalance(db, participant.id);
    expect(balance).toBe(20); // fully restored

    const rows = await db.select().from(tokenLedger);
    expect(rows).toHaveLength(3); // purchase, redemption, refund — all present, none mutated
    const original = rows.find((r) => r.id === redemptionRow.id)!;
    expect(original.amount).toBe(-8); // untouched
  });

  it("transfers between participants of the same account as paired net-zero rows", async () => {
    const { account, participant: owner } = await createAccountWithParticipant("0005");
    const [kid] = await db
      .insert(participants)
      .values({ accountId: account.id, firstName: "Kid", lastName: "Test" })
      .returning();

    await recordPurchase(db, {
      accountId: account.id,
      participantId: owner.id,
      tokensGranted: 30,
      createdBy: "system",
    });

    await recordTransfer(db, {
      accountId: account.id,
      fromParticipantId: owner.id,
      toParticipantId: kid.id,
      amountTokens: 10,
      createdBy: "member",
    });

    expect(await getParticipantBalance(db, owner.id)).toBe(20);
    expect(await getParticipantBalance(db, kid.id)).toBe(10);

    const rollup = await getAccountTokenRollup(db, account.id);
    expect(rollup.total).toBe(30); // net zero across the transfer, family total unchanged
  });

  it("rejects a transfer across different accounts", async () => {
    const { account: accountA, participant: participantA } = await createAccountWithParticipant("0006");
    const { participant: participantB } = await createAccountWithParticipant("0007");

    await recordPurchase(db, {
      accountId: accountA.id,
      participantId: participantA.id,
      tokensGranted: 10,
      createdBy: "system",
    });

    await expect(
      recordTransfer(db, {
        accountId: accountA.id,
        fromParticipantId: participantA.id,
        toParticipantId: participantB.id,
        amountTokens: 5,
        createdBy: "member",
      }),
    ).rejects.toThrow(CrossAccountTransferError);
  });

  it("records a staff adjustment with a required note", async () => {
    const { account, participant } = await createAccountWithParticipant("0008");

    await recordAdjustment(db, {
      accountId: account.id,
      participantId: participant.id,
      amountTokens: 15,
      note: "Goodwill comp for equipment issue",
      createdBy: "staff",
    });

    expect(await getParticipantBalance(db, participant.id)).toBe(15);

    await expect(
      recordAdjustment(db, {
        accountId: account.id,
        participantId: participant.id,
        amountTokens: 5,
        note: "   ",
        createdBy: "staff",
      }),
    ).rejects.toThrow(/note/);
  });

  it("never allows ledger rows to be updated or deleted (schema-level: no update/delete helpers exist)", async () => {
    // This is an architectural invariant, not something to unit-test via SQL
    // (the DB user has UPDATE/DELETE grants like any other table — enforcement
    // is that this service module never exposes an update/delete function).
    const serviceExports = await import("./ledger-service.js");
    const exportNames = Object.keys(serviceExports);
    const mutatingExports = exportNames.filter((name) =>
      /update|delete|remove/i.test(name),
    );
    expect(mutatingExports).toEqual([]);
  });

  it("computes account rollup as the sum of participant balances, not a stored wallet", async () => {
    const { account, participant: owner } = await createAccountWithParticipant("0009");
    const [kid] = await db
      .insert(participants)
      .values({ accountId: account.id, firstName: "Kid2", lastName: "Test" })
      .returning();

    await recordPurchase(db, { accountId: account.id, participantId: owner.id, tokensGranted: 40, createdBy: "system" });
    await recordPurchase(db, { accountId: account.id, participantId: kid.id, tokensGranted: 25, createdBy: "system" });

    const rollup = await getAccountTokenRollup(db, account.id);
    expect(rollup.total).toBe(65);
    expect(rollup.byParticipant[owner.id]).toBe(40);
    expect(rollup.byParticipant[kid.id]).toBe(25);
  });
});
