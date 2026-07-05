import { and, eq, gt, lte, or, isNull } from "drizzle-orm";
import { scans, scheduleBlocks, passes, enrollments, participants, offerings, type Db } from "@alumni/db";
import { recordRedemption } from "../ledger/ledger-service.js";
import type { LedgerCreatedBy } from "@alumni/shared";

export class SpaceNotOpenError extends Error {
  constructor(spaceId: string) {
    super(`Space ${spaceId} has no open schedule block right now`);
    this.name = "SpaceNotOpenError";
  }
}

export class ParticipantNotFoundError extends Error {
  constructor(participantId: string) {
    super(`Participant ${participantId} not found`);
    this.name = "ParticipantNotFoundError";
  }
}

async function currentScheduleBlock(db: Db, spaceId: string, now: Date) {
  const [block] = await db
    .select()
    .from(scheduleBlocks)
    .where(and(eq(scheduleBlocks.spaceId, spaceId), lte(scheduleBlocks.startsAt, now), gt(scheduleBlocks.endsAt, now)));
  return block ?? null;
}

export type ScanDecision =
  | { resolution: "pass_checkin"; participant: typeof participants.$inferSelect; passId: string }
  | { resolution: "enrollment_checkin"; participant: typeof participants.$inferSelect; enrollmentId: string }
  | {
      resolution: "walk_in_available";
      participant: typeof participants.$inferSelect;
      scheduleBlockId: string;
      walkInTokenPrice: number | null;
    }
  | { resolution: "denied"; participant: typeof participants.$inferSelect | null; denialReason: string };

/**
 * DESIGN.md's "generic scan station — three-way resolution": scan QR →
 * (1) active free play pass covering this space right now → check in, no
 * deduction; (2) enrolled in the league/camp/lesson scheduled here right now
 * → check in; (3) neither → offer a walk-in deduction (or free-play-pass
 * purchase) on the spot. Check-ins ((1)/(2)) write a `scans` row immediately;
 * walk-ins only write one after `confirmWalkIn` below actually charges
 * tokens — kiosk mode requires an explicit tap-to-confirm before any
 * deduction (DESIGN.md's kiosk↔space binding note).
 */
export async function resolveScan(
  db: Db,
  params: { participantId: string; spaceId: string; stationId: string },
): Promise<ScanDecision> {
  const now = new Date();

  const [participant] = await db.select().from(participants).where(eq(participants.id, params.participantId));
  if (!participant) throw new ParticipantNotFoundError(params.participantId);

  const block = await currentScheduleBlock(db, params.spaceId, now);
  if (!block || block.mode === "closed" || !block.offeringId) {
    const denialReason = !block ? "Space is not currently open" : "This space is closed right now";
    await db.insert(scans).values({
      participantId: params.participantId,
      stationId: params.stationId,
      resolvedAs: "denied",
      denialReason,
    });
    return { resolution: "denied", participant, denialReason };
  }

  const [activePass] = await db
    .select()
    .from(passes)
    .where(
      and(
        eq(passes.participantId, params.participantId),
        eq(passes.offeringId, block.offeringId),
        or(eq(passes.status, "unused"), eq(passes.status, "active")),
        or(isNull(passes.expiresAt), gt(passes.expiresAt, now)),
      ),
    );

  if (activePass) {
    if (activePass.status === "unused") {
      const [offering] = await db.select().from(offerings).where(eq(offerings.id, block.offeringId));
      const durationMinutes = activePass.durationMinutes ?? offering?.durationMinutes ?? 60;
      const expiresAt = new Date(now.getTime() + durationMinutes * 60_000);
      await db
        .update(passes)
        .set({ status: "active", activatedAt: now, expiresAt })
        .where(eq(passes.id, activePass.id));
    }
    await db.insert(scans).values({
      participantId: params.participantId,
      stationId: params.stationId,
      resolvedAs: "pass_checkin",
      resolutionReferenceId: activePass.id,
    });
    return { resolution: "pass_checkin", participant, passId: activePass.id };
  }

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.participantId, params.participantId),
        eq(enrollments.offeringId, block.offeringId),
        eq(enrollments.status, "enrolled"),
      ),
    );

  if (enrollment) {
    await db.insert(scans).values({
      participantId: params.participantId,
      stationId: params.stationId,
      resolvedAs: "enrollment_checkin",
      resolutionReferenceId: enrollment.id,
    });
    return { resolution: "enrollment_checkin", participant, enrollmentId: enrollment.id };
  }

  return {
    resolution: "walk_in_available",
    participant,
    scheduleBlockId: block.id,
    walkInTokenPrice: block.walkInTokenPrice,
  };
}

/** The tap-to-confirm step after a "walk_in_available" resolution — actually deducts tokens. Never runs unconditionally off `resolveScan` itself. */
export async function confirmWalkIn(
  db: Db,
  params: {
    participantId: string;
    accountId: string;
    stationId: string;
    scheduleBlockId: string;
    amountTokens: number;
    createdBy: LedgerCreatedBy;
  },
) {
  const { redemptionRow } = await recordRedemption(db, {
    accountId: params.accountId,
    participantId: params.participantId,
    amountTokens: params.amountTokens,
    referenceType: "walk_in",
    referenceId: params.scheduleBlockId,
    createdBy: params.createdBy,
  });

  await db.insert(scans).values({
    participantId: params.participantId,
    stationId: params.stationId,
    resolvedAs: "walk_in",
    resolutionReferenceId: redemptionRow.id,
  });

  return redemptionRow;
}
