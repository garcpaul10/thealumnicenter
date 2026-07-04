import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { offerings, participants, passes, scheduleBlocks } from "@alumni/db";
import { requireMemberAuth } from "../auth/member-middleware.js";
import { recordRedemption } from "../ledger/ledger-service.js";
import { createEnrollment, OfferingNotFoundError } from "../enrollments/enrollment-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";

export async function memberOfferingsRoutes(app: FastifyInstance) {
  app.get("/offerings", { preHandler: requireMemberAuth }, async () => {
    return app.db.select().from(offerings).where(eq(offerings.active, true));
  });

  app.get("/schedule-blocks/open-now", { preHandler: requireMemberAuth }, async () => {
    const now = new Date();
    const blocks = await app.db.select().from(scheduleBlocks).where(eq(scheduleBlocks.mode, "open_play"));
    // v1: literal starts_at/ends_at window check, same simplification noted
    // for schedule-blocks.ts — doesn't expand recurrence_rule occurrences.
    return blocks.filter((b) => b.startsAt <= now && b.endsAt >= now);
  });

  app.post<{ Params: { id: string }; Body: { participantId: string } }>(
    "/offerings/:id/purchase",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const { participantId } = request.body;
      if (!participantId) return reply.code(400).send({ error: "participantId is required" });

      const [participant] = await app.db
        .select()
        .from(participants)
        .where(and(eq(participants.id, participantId), eq(participants.accountId, request.account!.id)));
      if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });

      const [offering] = await app.db.select().from(offerings).where(eq(offerings.id, request.params.id));
      if (!offering || !offering.active) return reply.code(404).send({ error: "Offering not found" });

      const accountId = request.account!.id;

      try {
        if (offering.type === "league" || offering.type === "camp" || offering.type === "lesson" || offering.type === "clinic") {
          const result = await createEnrollment(app.db, {
            offeringId: offering.id,
            participantId,
            accountId,
            createdBy: "member",
          });
          return reply.code(201).send(result);
        }

        if (offering.type === "free_play_pass") {
          const { redemptionRow } = await recordRedemption(app.db, {
            accountId,
            participantId,
            amountTokens: offering.tokenPrice,
            referenceType: "free_play_pass",
            referenceId: offering.id,
            createdBy: "member",
          });
          const [pass] = await app.db
            .insert(passes)
            .values({
              offeringId: offering.id,
              participantId,
              accountId,
              durationMinutes: offering.durationMinutes ?? 60,
              ledgerTxnId: redemptionRow.id,
              status: "unused", // activatedAt/expiresAt set on first scan (Phase 4) — clock starts there, not at purchase
            })
            .returning();
          return reply.code(201).send(pass);
        }

        // walk_in — immediate deduction, no persistent record beyond the
        // ledger row itself; the door scan (Phase 4) is what checks a
        // participant in, this just pays for it.
        const { redemptionRow } = await recordRedemption(app.db, {
          accountId,
          participantId,
          amountTokens: offering.tokenPrice,
          referenceType: "walk_in",
          referenceId: offering.id,
          createdBy: "member",
        });
        return reply.code(201).send(redemptionRow);
      } catch (err) {
        if (err instanceof OfferingNotFoundError) return reply.code(404).send({ error: err.message });
        if (err instanceof InsufficientBalanceError) return reply.code(402).send({ error: err.message });
        throw err;
      }
    },
  );
}
