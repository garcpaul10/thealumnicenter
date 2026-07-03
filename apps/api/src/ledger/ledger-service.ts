import { eq, sql, and } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { tokenLedger, pointsLedger, participants, type Db } from "@alumni/db";
import { pointsEarnedForRedemption, type BeneficiaryRef, type LedgerCreatedBy } from "@alumni/shared";
import { InsufficientBalanceError, CrossAccountTransferError } from "./errors.js";

/**
 * THE single write path for token_ledger and points_ledger.
 *
 * Nothing outside this file may `insert into token_ledger` or
 * `points_ledger` — every feature (purchases, redemptions, refunds,
 * transfers, settlement, rewards) must go through the methods here. This is
 * a code-organization invariant (see CLAUDE.md), not a DB-level one:
 * enforced by review + the fact that these are the only exported functions
 * that construct ledger rows.
 *
 * Ledger rows are append-only. Nothing here ever UPDATEs or DELETEs a
 * token_ledger/points_ledger row — corrections are new offsetting rows
 * (type "refund" or "adjustment").
 */

// biome-ignore lint: drizzle's transaction type is awkward to name generically
type Tx = any;

async function lockParticipant(tx: Tx, participantId: string): Promise<void> {
  // Serializes concurrent ledger writes for the same participant within this
  // transaction so balance checks (SUM of prior rows) can't race with a
  // concurrent write for the same participant. Released automatically at
  // transaction end.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${participantId}))`);
}

export async function getParticipantBalance(db: Db | Tx, participantId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${tokenLedger.amount}), 0)` })
    .from(tokenLedger)
    .where(eq(tokenLedger.participantId, participantId));
  return Number(rows[0]?.total ?? 0);
}

export async function getParticipantPointsBalance(db: Db | Tx, participantId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${pointsLedger.amount}), 0)` })
    .from(pointsLedger)
    .where(eq(pointsLedger.participantId, participantId));
  return Number(rows[0]?.total ?? 0);
}

export async function getAccountTokenRollup(
  db: Db | Tx,
  accountId: string,
): Promise<{ total: number; byParticipant: Record<string, number> }> {
  const rows = await db
    .select({
      participantId: tokenLedger.participantId,
      total: sql<string>`coalesce(sum(${tokenLedger.amount}), 0)`,
    })
    .from(tokenLedger)
    .where(eq(tokenLedger.accountId, accountId))
    .groupBy(tokenLedger.participantId);

  const byParticipant: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const amount = Number(row.total);
    byParticipant[row.participantId] = amount;
    total += amount;
  }
  return { total, byParticipant };
}

function beneficiaryPartnerId(beneficiary: BeneficiaryRef | undefined): string | null {
  if (!beneficiary || beneficiary.kind === "house") return null;
  return beneficiary.partnerId;
}

export interface RecordPurchaseInput {
  accountId: string;
  participantId: string;
  tokensGranted: number;
  bonusTokens?: number;
  stripePaymentIntentId?: string;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdBy: LedgerCreatedBy;
}

/** Records a token purchase (and its bonus tokens, if any, as a separate ledger row). Call only after Stripe payment settlement — never on client-side confirmation. */
export async function recordPurchase(db: Db, input: RecordPurchaseInput) {
  const { tokensGranted, bonusTokens = 0 } = input;
  if (tokensGranted <= 0) throw new Error("tokensGranted must be positive");

  return db.transaction(async (tx: Tx) => {
    await lockParticipant(tx, input.participantId);

    const [purchaseRow] = await tx
      .insert(tokenLedger)
      .values({
        accountId: input.accountId,
        participantId: input.participantId,
        amount: tokensGranted,
        type: "purchase",
        referenceType: input.referenceType ?? "token_package_purchase",
        referenceId: input.referenceId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        note: input.note ?? null,
        createdBy: input.createdBy,
      })
      .returning();

    let bonusRow = null;
    if (bonusTokens > 0) {
      [bonusRow] = await tx
        .insert(tokenLedger)
        .values({
          accountId: input.accountId,
          participantId: input.participantId,
          amount: bonusTokens,
          type: "bonus",
          referenceType: input.referenceType ?? "token_package_purchase",
          referenceId: input.referenceId ?? null,
          stripePaymentIntentId: input.stripePaymentIntentId ?? null,
          note: "Bonus tokens from package purchase",
          createdBy: input.createdBy,
        })
        .returning();
    }

    return { purchaseRow, bonusRow };
  });
}

export interface RecordRedemptionInput {
  accountId: string;
  participantId: string;
  amountTokens: number; // positive; will be recorded as a debit
  beneficiary?: BeneficiaryRef;
  referenceType: string;
  referenceId: string;
  note?: string;
  createdBy: LedgerCreatedBy;
  pointsRatePerToken?: number;
}

/** Records a token spend (walk-in, enrollment, pass, reservation, vendor order, lesson). Automatically earns loyalty points at the configured rate — points are earned on spend, not purchase. */
export async function recordRedemption(db: Db, input: RecordRedemptionInput) {
  if (input.amountTokens <= 0) throw new Error("amountTokens must be positive");

  return db.transaction(async (tx: Tx) => {
    await lockParticipant(tx, input.participantId);

    const balance = await getParticipantBalance(tx, input.participantId);
    if (balance < input.amountTokens) {
      throw new InsufficientBalanceError(input.participantId, input.amountTokens, balance);
    }

    const [redemptionRow] = await tx
      .insert(tokenLedger)
      .values({
        accountId: input.accountId,
        participantId: input.participantId,
        amount: -input.amountTokens,
        type: "redemption",
        beneficiaryPartnerId: beneficiaryPartnerId(input.beneficiary),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note ?? null,
        createdBy: input.createdBy,
      })
      .returning();

    const pointsEarned = pointsEarnedForRedemption(input.amountTokens, input.pointsRatePerToken ?? 1);
    let pointsRow = null;
    if (pointsEarned > 0) {
      [pointsRow] = await tx
        .insert(pointsLedger)
        .values({
          participantId: input.participantId,
          amount: pointsEarned,
          type: "earn",
          referenceType: "token_ledger",
          referenceId: redemptionRow.id,
        })
        .returning();
    }

    return { redemptionRow, pointsRow };
  });
}

export interface RecordRefundInput {
  accountId: string;
  participantId: string;
  amountTokens: number; // positive; will be recorded as a credit
  referenceType: string;
  referenceId: string;
  note?: string;
  createdBy: LedgerCreatedBy;
}

/** Records a refund as a new offsetting credit row — never mutates the original redemption/purchase row. */
export async function recordRefund(db: Db, input: RecordRefundInput) {
  if (input.amountTokens <= 0) throw new Error("amountTokens must be positive");

  return db.transaction(async (tx: Tx) => {
    await lockParticipant(tx, input.participantId);

    const [refundRow] = await tx
      .insert(tokenLedger)
      .values({
        accountId: input.accountId,
        participantId: input.participantId,
        amount: input.amountTokens,
        type: "refund",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note ?? null,
        createdBy: input.createdBy,
      })
      .returning();

    return { refundRow };
  });
}

export interface RecordTransferInput {
  accountId: string;
  fromParticipantId: string;
  toParticipantId: string;
  amountTokens: number;
  note?: string;
  createdBy: LedgerCreatedBy;
}

/** Free, instant transfer between two participants of the *same* account. Produces a paired debit/credit that nets to zero — never crosses accounts. */
export async function recordTransfer(db: Db, input: RecordTransferInput) {
  if (input.amountTokens <= 0) throw new Error("amountTokens must be positive");
  if (input.fromParticipantId === input.toParticipantId) {
    throw new Error("Cannot transfer to the same participant");
  }

  return db.transaction(async (tx: Tx) => {
    const [fromParticipant, toParticipant] = await Promise.all([
      tx.select().from(participants).where(eq(participants.id, input.fromParticipantId)).then((r: any[]) => r[0]),
      tx.select().from(participants).where(eq(participants.id, input.toParticipantId)).then((r: any[]) => r[0]),
    ]);

    if (
      !fromParticipant ||
      !toParticipant ||
      fromParticipant.accountId !== input.accountId ||
      toParticipant.accountId !== input.accountId
    ) {
      throw new CrossAccountTransferError();
    }

    // Lock both participants in a stable order to avoid deadlocks between
    // concurrent transfers that touch the same pair in opposite directions.
    const [firstLock, secondLock] = [input.fromParticipantId, input.toParticipantId].sort();
    await lockParticipant(tx, firstLock);
    await lockParticipant(tx, secondLock);

    const balance = await getParticipantBalance(tx, input.fromParticipantId);
    if (balance < input.amountTokens) {
      throw new InsufficientBalanceError(input.fromParticipantId, input.amountTokens, balance);
    }

    const referenceId = crypto.randomUUID();

    const [debitRow] = await tx
      .insert(tokenLedger)
      .values({
        accountId: input.accountId,
        participantId: input.fromParticipantId,
        amount: -input.amountTokens,
        type: "transfer",
        referenceType: "transfer",
        referenceId,
        note: input.note ?? `Transfer to participant ${input.toParticipantId}`,
        createdBy: input.createdBy,
      })
      .returning();

    const [creditRow] = await tx
      .insert(tokenLedger)
      .values({
        accountId: input.accountId,
        participantId: input.toParticipantId,
        amount: input.amountTokens,
        type: "transfer",
        referenceType: "transfer",
        referenceId,
        note: input.note ?? `Transfer from participant ${input.fromParticipantId}`,
        createdBy: input.createdBy,
      })
      .returning();

    return { debitRow, creditRow };
  });
}

export interface RecordAdjustmentInput {
  accountId: string;
  participantId: string;
  amountTokens: number; // signed
  note: string; // required — adjustments must always explain themselves
  createdBy: LedgerCreatedBy;
}

/** Staff correction — the only ledger row type allowed to be an arbitrary signed amount without a purchase/spend behind it. Always requires a note. */
export async function recordAdjustment(db: Db, input: RecordAdjustmentInput) {
  if (input.amountTokens === 0) throw new Error("amountTokens must be non-zero");
  if (!input.note.trim()) throw new Error("Adjustments require a note explaining the correction");

  return db.transaction(async (tx: Tx) => {
    await lockParticipant(tx, input.participantId);

    if (input.amountTokens < 0) {
      const balance = await getParticipantBalance(tx, input.participantId);
      if (balance < -input.amountTokens) {
        throw new InsufficientBalanceError(input.participantId, -input.amountTokens, balance);
      }
    }

    const [adjustmentRow] = await tx
      .insert(tokenLedger)
      .values({
        accountId: input.accountId,
        participantId: input.participantId,
        amount: input.amountTokens,
        type: "adjustment",
        note: input.note,
        createdBy: input.createdBy,
      })
      .returning();

    return { adjustmentRow };
  });
}
