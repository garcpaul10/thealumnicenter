import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { reservations, scheduleBlocks, offerings, participants } from "@alumni/db";
import { requireMemberAuth } from "../auth/member-middleware.js";
import { recordRedemption, recordRefund } from "../ledger/ledger-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";

export async function reservationsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { participantId?: string } }>(
    "/reservations",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const { participantId } = request.query;
      if (!participantId) return reply.code(400).send({ error: "participantId is required" });
      return app.db.select().from(reservations).where(eq(reservations.participantId, participantId));
    },
  );

  app.post<{
    Body: { scheduleBlockId: string; participantId: string; startsAt: string; endsAt: string };
  }>("/reservations", { preHandler: requireMemberAuth }, async (request, reply) => {
    const { scheduleBlockId, participantId, startsAt, endsAt } = request.body;
    if (!scheduleBlockId || !participantId || !startsAt || !endsAt) {
      return reply.code(400).send({ error: "scheduleBlockId, participantId, startsAt, and endsAt are required" });
    }

    const [participant] = await app.db
      .select()
      .from(participants)
      .where(and(eq(participants.id, participantId), eq(participants.accountId, request.account!.id)));
    if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });

    const [block] = await app.db.select().from(scheduleBlocks).where(eq(scheduleBlocks.id, scheduleBlockId));
    if (!block || block.mode !== "reservable") {
      return reply.code(404).send({ error: "Reservable schedule block not found" });
    }
    if (!block.offeringId) {
      return reply.code(400).send({ error: "This schedule block has no linked reservation offering/price" });
    }
    const [offering] = await app.db.select().from(offerings).where(eq(offerings.id, block.offeringId));
    if (!offering) return reply.code(400).send({ error: "Linked offering not found" });

    try {
      const { redemptionRow } = await recordRedemption(app.db, {
        accountId: request.account!.id,
        participantId,
        amountTokens: offering.tokenPrice,
        referenceType: "reservation",
        referenceId: scheduleBlockId,
        createdBy: "member",
      });

      const [reservation] = await app.db
        .insert(reservations)
        .values({
          scheduleBlockId,
          participantId,
          accountId: request.account!.id,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          status: "booked",
          ledgerTxnId: redemptionRow.id,
        })
        .returning();

      return reply.code(201).send(reservation);
    } catch (err) {
      if (err instanceof InsufficientBalanceError) return reply.code(402).send({ error: err.message });
      // The reservations_no_overlap_per_space DB exclusion constraint (see
      // packages/db/migrations/0001_reservation_no_overlap.sql) throws a
      // Postgres error here if the slot's already booked — the token charge
      // above already committed in its own transaction by this point, so on
      // conflict we must refund it rather than leave a floating debit.
      if ((err as { code?: string }).code === "23P01") {
        return reply.code(409).send({ error: "This time slot was just booked by someone else" });
      }
      throw err;
    }
  });

  app.post<{ Params: { id: string } }>(
    "/reservations/:id/cancel",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const [reservation] = await app.db
        .select()
        .from(reservations)
        .where(and(eq(reservations.id, request.params.id), eq(reservations.accountId, request.account!.id)));
      if (!reservation) return reply.code(404).send({ error: "Reservation not found" });
      if (reservation.status === "cancelled") return reply.code(400).send({ error: "Already cancelled" });

      const [updated] = await app.db
        .update(reservations)
        .set({ status: "cancelled" })
        .where(eq(reservations.id, reservation.id))
        .returning();

      // Refund policy (DESIGN.md open question #5) isn't resolved yet —
      // defaulting to always-refund-in-full for v1 rather than blocking on
      // it; flagged in CLAUDE.md for a real cancellation-window policy.
      if (reservation.ledgerTxnId) {
        const [offering] = await app.db
          .select()
          .from(scheduleBlocks)
          .where(eq(scheduleBlocks.id, reservation.scheduleBlockId));
        if (offering?.offeringId) {
          const [linkedOffering] = await app.db.select().from(offerings).where(eq(offerings.id, offering.offeringId));
          if (linkedOffering) {
            await recordRefund(app.db, {
              accountId: reservation.accountId,
              participantId: reservation.participantId,
              amountTokens: linkedOffering.tokenPrice,
              referenceType: "reservation",
              referenceId: reservation.scheduleBlockId,
              note: "Reservation cancelled",
              createdBy: "member",
            });
          }
        }
      }

      return updated;
    },
  );
}
