import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { enrollments } from "@alumni/db";
import { requireStaffAuth } from "../auth/middleware.js";
import { createEnrollment, promoteFromWaitlist, OfferingNotFoundError } from "../enrollments/enrollment-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";

export async function enrollmentsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { offeringId?: string } }>(
    "/enrollments",
    { preHandler: requireStaffAuth },
    async (request) => {
      const { offeringId } = request.query;
      const query = app.db.select().from(enrollments);
      return offeringId ? query.where(eq(enrollments.offeringId, offeringId)) : query;
    },
  );

  app.post<{ Body: { offeringId: string; participantId: string; accountId: string } }>(
    "/enrollments",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { offeringId, participantId, accountId } = request.body;
      if (!offeringId || !participantId || !accountId) {
        return reply.code(400).send({ error: "offeringId, participantId, and accountId are required" });
      }
      try {
        const result = await createEnrollment(app.db, {
          offeringId,
          participantId,
          accountId,
          createdBy: "staff",
        });
        return reply.code(201).send(result);
      } catch (err) {
        if (err instanceof OfferingNotFoundError) return reply.code(404).send({ error: err.message });
        if (err instanceof InsufficientBalanceError) return reply.code(402).send({ error: err.message });
        throw err;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/enrollments/:id/promote",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      try {
        const enrollment = await promoteFromWaitlist(app.db, {
          enrollmentId: request.params.id,
          createdBy: "staff",
        });
        return enrollment;
      } catch (err) {
        if (err instanceof InsufficientBalanceError) return reply.code(402).send({ error: err.message });
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/enrollments/:id/withdraw",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const [enrollment] = await app.db
        .update(enrollments)
        .set({ status: "withdrawn" })
        .where(eq(enrollments.id, request.params.id))
        .returning();
      if (!enrollment) return reply.code(404).send({ error: "Enrollment not found" });
      return enrollment;
    },
  );
}
