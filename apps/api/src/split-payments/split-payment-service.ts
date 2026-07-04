import { eq, and } from "drizzle-orm";
import { splitRequests, splitShares, reservations, participants, type Db } from "@alumni/db";
import { assertSplitSharesEqualTotal } from "@alumni/shared";
import { recordRedemption, recordRefund } from "../ledger/ledger-service.js";

export interface CreateSplitRequestInput {
  initiatorParticipantId: string;
  referenceType: "reservation" | "walk_in" | "free_play_pass";
  referenceId: string;
  totalTokens: number;
  splitMethod: "equal" | "custom";
  shares: Array<{ participantId: string; amountTokens: number }>;
  expiresInMinutes?: number;
}

/** Creates a split request + its shares. Does not charge anyone yet — each invitee pays their own share via acceptShare(). */
export async function createSplitRequest(db: Db, input: CreateSplitRequestInput) {
  assertSplitSharesEqualTotal(input.shares, input.totalTokens);

  const expiresAt = new Date(Date.now() + (input.expiresInMinutes ?? 15) * 60_000);

  return db.transaction(async (tx: any) => {
    const [request] = await tx
      .insert(splitRequests)
      .values({
        initiatorParticipantId: input.initiatorParticipantId,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        totalTokens: input.totalTokens,
        splitMethod: input.splitMethod,
        status: "pending",
        expiresAt,
      })
      .returning();

    const shares = await tx
      .insert(splitShares)
      .values(
        input.shares.map((s) => ({
          splitRequestId: request.id,
          participantId: s.participantId,
          amountTokens: s.amountTokens,
          status: "invited" as const,
        })),
      )
      .returning();

    if (input.referenceType === "reservation") {
      await tx.update(reservations).set({ splitRequestId: request.id }).where(eq(reservations.id, input.referenceId));
    }

    return { request, shares };
  });
}

export class SplitShareAlreadyResolvedError extends Error {
  constructor() {
    super("This split share has already been paid or declined");
    this.name = "SplitShareAlreadyResolvedError";
  }
}

export class SplitRequestExpiredError extends Error {
  constructor() {
    super("This split request has expired");
    this.name = "SplitRequestExpiredError";
  }
}

/** A participant pays their own share. If this completes the request (all shares paid), the underlying reservation confirms. */
export async function acceptSplitShare(
  db: Db,
  params: { shareId: string; accountId: string },
): Promise<{ share: typeof splitShares.$inferSelect; requestCompleted: boolean }> {
  const [share] = await db.select().from(splitShares).where(eq(splitShares.id, params.shareId));
  if (!share) throw new Error("Split share not found");
  if (share.status !== "invited") throw new SplitShareAlreadyResolvedError();

  const [request] = await db.select().from(splitRequests).where(eq(splitRequests.id, share.splitRequestId));
  if (!request) throw new Error("Split request not found");
  if (request.status !== "pending" || request.expiresAt < new Date()) {
    throw new SplitRequestExpiredError();
  }

  const { redemptionRow } = await recordRedemption(db, {
    accountId: params.accountId,
    participantId: share.participantId,
    amountTokens: share.amountTokens,
    referenceType: "split_share",
    referenceId: share.id,
    createdBy: "member",
  });

  const [updatedShare] = await db
    .update(splitShares)
    .set({ status: "paid", ledgerTxnId: redemptionRow.id, respondedAt: new Date() })
    .where(eq(splitShares.id, share.id))
    .returning();

  const allShares = await db.select().from(splitShares).where(eq(splitShares.splitRequestId, request.id));
  const allPaid = allShares.every((s) => (s.id === share.id ? true : s.status === "paid"));

  if (allPaid) {
    await db.update(splitRequests).set({ status: "completed" }).where(eq(splitRequests.id, request.id));
    if (request.referenceType === "reservation") {
      await db.update(reservations).set({ status: "booked" }).where(eq(reservations.id, request.referenceId));
    }
  }

  return { share: updatedShare, requestCompleted: allPaid };
}

export async function declineSplitShare(db: Db, shareId: string) {
  const [share] = await db.select().from(splitShares).where(eq(splitShares.id, shareId));
  if (!share) throw new Error("Split share not found");
  if (share.status !== "invited") throw new SplitShareAlreadyResolvedError();

  const [updated] = await db
    .update(splitShares)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(splitShares.id, shareId))
    .returning();

  await db.update(splitRequests).set({ status: "cancelled" }).where(eq(splitRequests.id, share.splitRequestId));

  return updated;
}

/** Releases expired, incomplete split requests — refunds any shares that were already paid. Call periodically (no background-job infra yet; Phase 6). */
export async function expireStaleSplitRequests(db: Db, now: Date = new Date()) {
  const stale = await db
    .select()
    .from(splitRequests)
    .where(and(eq(splitRequests.status, "pending")));

  for (const request of stale) {
    if (request.expiresAt >= now) continue;

    const shares = await db.select().from(splitShares).where(eq(splitShares.splitRequestId, request.id));
    for (const share of shares) {
      if (share.status === "paid" && share.ledgerTxnId) {
        const [participant] = await db.select().from(participants).where(eq(participants.id, share.participantId));
        if (!participant) continue;
        await recordRefund(db, {
          accountId: participant.accountId,
          participantId: share.participantId,
          amountTokens: share.amountTokens,
          referenceType: "split_share_expiry",
          referenceId: share.id,
          note: "Split request expired before all shares were paid",
          createdBy: "system",
        });
      }
    }

    await db.update(splitRequests).set({ status: "expired" }).where(eq(splitRequests.id, request.id));
    if (request.referenceType === "reservation") {
      await db.update(reservations).set({ status: "expired_unfilled" }).where(eq(reservations.id, request.referenceId));
    }
  }
}
