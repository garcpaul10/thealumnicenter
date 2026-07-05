import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createDbClient, accounts, participants, partners, menuItems, type Db } from "@alumni/db";
import { recordPurchase, getParticipantBalance } from "../ledger/ledger-service.js";
import { createVendorOrder, MenuItemNotFoundError } from "./vendor-order-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/alumni_center_test`;

let db: Db;

async function createFundedParticipant(phoneSuffix: string, tokens: number) {
  const [account] = await db.insert(accounts).values({ phone: `+1502558${phoneSuffix}` }).returning();
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

describe("createVendorOrder", () => {
  it("debits the house beneficiary for a facility-owned concession stand", async () => {
    const { account, participant } = await createFundedParticipant("0001", 30);
    const [item] = await db.insert(menuItems).values({ partnerId: null, name: "Water", tokenPrice: 3 }).returning();

    const balanceBefore = await getParticipantBalance(db, participant.id);
    const order = await createVendorOrder(db, {
      partnerId: null,
      participantId: participant.id,
      accountId: account.id,
      items: [{ menuItemId: item.id, qty: 2 }],
      createdBy: "staff",
    });

    expect(order.totalTokens).toBe(6);
    const balanceAfter = await getParticipantBalance(db, participant.id);
    expect(balanceAfter).toBe(balanceBefore - 6);
  });

  it("attributes tokens to a third-party vendor's beneficiary partner id", async () => {
    const { account, participant } = await createFundedParticipant("0002", 30);
    const [partner] = await db
      .insert(partners)
      .values({ type: "vendor", displayName: "Snack Bar", splitPct: "70.00" })
      .returning();
    const [item] = await db.insert(menuItems).values({ partnerId: partner.id, name: "Pretzel", tokenPrice: 4 }).returning();

    const order = await createVendorOrder(db, {
      partnerId: partner.id,
      participantId: participant.id,
      accountId: account.id,
      items: [{ menuItemId: item.id, qty: 1 }],
      createdBy: "staff",
    });

    expect(order.partnerId).toBe(partner.id);
    expect(order.totalTokens).toBe(4);
  });

  it("throws MenuItemNotFoundError for an unknown or inactive item without charging anything", async () => {
    const { account, participant } = await createFundedParticipant("0003", 30);
    const balanceBefore = await getParticipantBalance(db, participant.id);

    await expect(
      createVendorOrder(db, {
        partnerId: null,
        participantId: participant.id,
        accountId: account.id,
        items: [{ menuItemId: "00000000-0000-0000-0000-000000000000", qty: 1 }],
        createdBy: "staff",
      }),
    ).rejects.toThrow(MenuItemNotFoundError);

    expect(await getParticipantBalance(db, participant.id)).toBe(balanceBefore);
  });

  it("throws InsufficientBalanceError rather than charging a partial order", async () => {
    const { account, participant } = await createFundedParticipant("0004", 2);
    const [item] = await db.insert(menuItems).values({ partnerId: null, name: "Nachos", tokenPrice: 5 }).returning();

    await expect(
      createVendorOrder(db, {
        partnerId: null,
        participantId: participant.id,
        accountId: account.id,
        items: [{ menuItemId: item.id, qty: 1 }],
        createdBy: "staff",
      }),
    ).rejects.toThrow(InsufficientBalanceError);
  });
});
