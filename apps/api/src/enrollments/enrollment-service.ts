import { and, eq } from "drizzle-orm";
import { enrollments, offerings, type Db } from "@alumni/db";
import { recordRedemption } from "../ledger/ledger-service.js";
import type { BeneficiaryRef, LedgerCreatedBy } from "@alumni/shared";

export class OfferingNotFoundError extends Error {
  constructor(offeringId: string) {
    super(`Offering ${offeringId} not found`);
    this.name = "OfferingNotFoundError";
  }
}

/**
 * Enrollment capacity + waitlist (DESIGN.md open question #6, resolved:
 * enforced with waitlist). A participant is only charged tokens once an
 * actual spot opens — waitlisted enrollments carry no ledger row until
 * promoted.
 */
export async function createEnrollment(
  db: Db,
  params: {
    offeringId: string;
    participantId: string;
    accountId: string;
    beneficiary?: BeneficiaryRef;
    createdBy: LedgerCreatedBy;
  },
) {
  const [offering] = await db.select().from(offerings).where(eq(offerings.id, params.offeringId));
  if (!offering) throw new OfferingNotFoundError(params.offeringId);

  const enrolledCount = (
    await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.offeringId, params.offeringId), eq(enrollments.status, "enrolled")))
  ).length;

  const hasRoom = offering.capacity === null || enrolledCount < offering.capacity;

  if (!hasRoom) {
    const [enrollment] = await db
      .insert(enrollments)
      .values({
        offeringId: params.offeringId,
        participantId: params.participantId,
        accountId: params.accountId,
        status: "waitlisted",
      })
      .returning();
    return { enrollment, charged: false };
  }

  // recordRedemption opens its own transaction; nest it in this one (via
  // savepoint) so the charge and the enrollment row commit or roll back
  // together — never a charge with no enrollment, or vice versa.
  return db.transaction(async (tx) => {
    const { redemptionRow } = await recordRedemption(tx, {
      accountId: params.accountId,
      participantId: params.participantId,
      amountTokens: offering.tokenPrice,
      beneficiary: params.beneficiary,
      referenceType: "enrollment",
      referenceId: params.offeringId,
      createdBy: params.createdBy,
    });

    const [enrollment] = await tx
      .insert(enrollments)
      .values({
        offeringId: params.offeringId,
        participantId: params.participantId,
        accountId: params.accountId,
        status: "enrolled",
        ledgerTxnId: redemptionRow.id,
      })
      .returning();

    return { enrollment, charged: true };
  });
}

/** Staff promotes a waitlisted enrollment once a spot opens — charges tokens now, not at original signup. */
export async function promoteFromWaitlist(
  db: Db,
  params: { enrollmentId: string; beneficiary?: BeneficiaryRef; createdBy: LedgerCreatedBy },
) {
  const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, params.enrollmentId));
  if (!enrollment) throw new Error(`Enrollment ${params.enrollmentId} not found`);
  if (enrollment.status !== "waitlisted") {
    throw new Error(`Enrollment ${params.enrollmentId} is not waitlisted (status: ${enrollment.status})`);
  }

  const [offering] = await db.select().from(offerings).where(eq(offerings.id, enrollment.offeringId));
  if (!offering) throw new OfferingNotFoundError(enrollment.offeringId);

  const { redemptionRow } = await recordRedemption(db, {
    accountId: enrollment.accountId,
    participantId: enrollment.participantId,
    amountTokens: offering.tokenPrice,
    beneficiary: params.beneficiary,
    referenceType: "enrollment",
    referenceId: offering.id,
    createdBy: params.createdBy,
  });

  const [updated] = await db
    .update(enrollments)
    .set({ status: "enrolled", ledgerTxnId: redemptionRow.id })
    .where(eq(enrollments.id, params.enrollmentId))
    .returning();

  return updated;
}
