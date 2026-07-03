import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  createDbClient,
  accounts,
  participants,
  sports,
  offerings,
  type Db,
} from "@alumni/db";
import { recordPurchase } from "../ledger/ledger-service.js";
import { createEnrollment, promoteFromWaitlist } from "./enrollment-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/alumni_center_test`;

let db: Db;

async function createFundedParticipant(phoneSuffix: string, tokens: number) {
  const [account] = await db.insert(accounts).values({ phone: `+1502556${phoneSuffix}` }).returning();
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

async function createCappedOffering(capacity: number | null, tokenPrice = 10) {
  const [sport] = await db.insert(sports).values({ name: "Basketball", slug: `bball-${Date.now()}-${Math.random()}` }).returning();
  const [offering] = await db
    .insert(offerings)
    .values({ type: "league", sportId: sport.id, name: "Test League", tokenPrice, capacity })
    .returning();
  return offering;
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

describe("createEnrollment", () => {
  it("enrolls and charges tokens when there is room", async () => {
    const offering = await createCappedOffering(2, 10);
    const { account, participant } = await createFundedParticipant("0001", 50);

    const { enrollment, charged } = await createEnrollment(db, {
      offeringId: offering.id,
      participantId: participant.id,
      accountId: account.id,
      createdBy: "staff",
    });

    expect(charged).toBe(true);
    expect(enrollment.status).toBe("enrolled");
    expect(enrollment.ledgerTxnId).not.toBeNull();
  });

  it("waitlists without charging once capacity is full", async () => {
    const offering = await createCappedOffering(1, 10);
    const p1 = await createFundedParticipant("0002", 50);
    const p2 = await createFundedParticipant("0003", 50);

    await createEnrollment(db, {
      offeringId: offering.id,
      participantId: p1.participant.id,
      accountId: p1.account.id,
      createdBy: "staff",
    });

    const { enrollment, charged } = await createEnrollment(db, {
      offeringId: offering.id,
      participantId: p2.participant.id,
      accountId: p2.account.id,
      createdBy: "staff",
    });

    expect(charged).toBe(false);
    expect(enrollment.status).toBe("waitlisted");
    expect(enrollment.ledgerTxnId).toBeNull();
  });

  it("never enrolls (or charges) beyond capacity even if the charge would succeed", async () => {
    const offering = await createCappedOffering(0, 10);
    const { account, participant } = await createFundedParticipant("0004", 50);

    const { enrollment, charged } = await createEnrollment(db, {
      offeringId: offering.id,
      participantId: participant.id,
      accountId: account.id,
      createdBy: "staff",
    });

    expect(charged).toBe(false);
    expect(enrollment.status).toBe("waitlisted");
  });

  it("has no capacity limit when offering.capacity is null", async () => {
    const offering = await createCappedOffering(null, 10);
    const { account, participant } = await createFundedParticipant("0005", 50);

    const { enrollment } = await createEnrollment(db, {
      offeringId: offering.id,
      participantId: participant.id,
      accountId: account.id,
      createdBy: "staff",
    });

    expect(enrollment.status).toBe("enrolled");
  });

  it("rolls back the enrollment row if the charge fails (insufficient balance)", async () => {
    const offering = await createCappedOffering(5, 100);
    const { account, participant } = await createFundedParticipant("0006", 10); // not enough for a 100-token offering

    await expect(
      createEnrollment(db, {
        offeringId: offering.id,
        participantId: participant.id,
        accountId: account.id,
        createdBy: "staff",
      }),
    ).rejects.toThrow(InsufficientBalanceError);

    const rows = await db.query.enrollments.findMany();
    expect(rows).toHaveLength(0); // no partial enrollment row left behind
  });
});

describe("promoteFromWaitlist", () => {
  it("charges tokens and flips status to enrolled", async () => {
    const offering = await createCappedOffering(1, 10);
    const p1 = await createFundedParticipant("0007", 50);
    const p2 = await createFundedParticipant("0008", 50);

    await createEnrollment(db, {
      offeringId: offering.id,
      participantId: p1.participant.id,
      accountId: p1.account.id,
      createdBy: "staff",
    });
    const { enrollment: waitlisted } = await createEnrollment(db, {
      offeringId: offering.id,
      participantId: p2.participant.id,
      accountId: p2.account.id,
      createdBy: "staff",
    });
    expect(waitlisted.status).toBe("waitlisted");

    const promoted = await promoteFromWaitlist(db, {
      enrollmentId: waitlisted.id,
      createdBy: "staff",
    });

    expect(promoted.status).toBe("enrolled");
    expect(promoted.ledgerTxnId).not.toBeNull();
  });

  it("rejects promoting an enrollment that isn't waitlisted", async () => {
    const offering = await createCappedOffering(5, 10);
    const { account, participant } = await createFundedParticipant("0009", 50);
    const { enrollment } = await createEnrollment(db, {
      offeringId: offering.id,
      participantId: participant.id,
      accountId: account.id,
      createdBy: "staff",
    });

    await expect(promoteFromWaitlist(db, { enrollmentId: enrollment.id, createdBy: "staff" })).rejects.toThrow(
      /not waitlisted/,
    );
  });
});
