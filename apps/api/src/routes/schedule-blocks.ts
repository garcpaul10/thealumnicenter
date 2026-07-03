import type { FastifyInstance } from "fastify";
import { and, eq, gte, lte, ne, lt, gt } from "drizzle-orm";
import { scheduleBlocks } from "@alumni/db";
import { requireStaffAuth } from "../auth/middleware.js";

type ScheduleMode = "open_play" | "reservable" | "league" | "camp" | "closed";

interface ScheduleBlockBody {
  spaceId: string;
  sportId?: string;
  mode: ScheduleMode;
  offeringId?: string;
  startsAt: string;
  endsAt: string;
  recurrenceRule?: string;
  walkInTokenPrice?: number;
}

/**
 * v1 overlap check: rejects a block whose [startsAt, endsAt) window overlaps
 * another block in the same space. Only compares each block's literal
 * starts_at/ends_at — it does not expand recurrence_rule occurrences, so two
 * *recurring* blocks whose weekly instances would collide are not caught
 * here. Acceptable for v1 (schedule admin UI scope, DESIGN.md open question
 * #9); flagged in CLAUDE.md.
 */
async function hasOverlap(
  app: FastifyInstance,
  spaceId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<boolean> {
  const conditions = [
    eq(scheduleBlocks.spaceId, spaceId),
    lt(scheduleBlocks.startsAt, endsAt),
    gt(scheduleBlocks.endsAt, startsAt),
  ];
  if (excludeId) conditions.push(ne(scheduleBlocks.id, excludeId));
  const overlapping = await app.db
    .select({ id: scheduleBlocks.id })
    .from(scheduleBlocks)
    .where(and(...conditions));
  return overlapping.length > 0;
}

export async function scheduleBlocksRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { spaceId?: string; from?: string; to?: string } }>(
    "/schedule-blocks",
    { preHandler: requireStaffAuth },
    async (request) => {
      const { spaceId, from, to } = request.query;
      const conditions = [];
      if (spaceId) conditions.push(eq(scheduleBlocks.spaceId, spaceId));
      if (from) conditions.push(gte(scheduleBlocks.endsAt, new Date(from)));
      if (to) conditions.push(lte(scheduleBlocks.startsAt, new Date(to)));
      return app.db
        .select()
        .from(scheduleBlocks)
        .where(conditions.length ? and(...conditions) : undefined);
    },
  );

  app.post<{ Body: ScheduleBlockBody }>(
    "/schedule-blocks",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const body = request.body;
      const startsAt = new Date(body.startsAt);
      const endsAt = new Date(body.endsAt);
      if (endsAt <= startsAt) {
        return reply.code(400).send({ error: "endsAt must be after startsAt" });
      }
      if (await hasOverlap(app, body.spaceId, startsAt, endsAt)) {
        return reply.code(409).send({ error: "Overlaps an existing schedule block in this space" });
      }
      const [block] = await app.db
        .insert(scheduleBlocks)
        .values({
          spaceId: body.spaceId,
          sportId: body.sportId,
          mode: body.mode,
          offeringId: body.offeringId,
          startsAt,
          endsAt,
          recurrenceRule: body.recurrenceRule,
          walkInTokenPrice: body.walkInTokenPrice,
        })
        .returning();
      return reply.code(201).send(block);
    },
  );

  app.patch<{ Params: { id: string }; Body: Partial<ScheduleBlockBody> }>(
    "/schedule-blocks/:id",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { id } = request.params;
      const [existing] = await app.db.select().from(scheduleBlocks).where(eq(scheduleBlocks.id, id));
      if (!existing) return reply.code(404).send({ error: "Schedule block not found" });

      const startsAt = request.body.startsAt ? new Date(request.body.startsAt) : existing.startsAt;
      const endsAt = request.body.endsAt ? new Date(request.body.endsAt) : existing.endsAt;
      if (endsAt <= startsAt) {
        return reply.code(400).send({ error: "endsAt must be after startsAt" });
      }
      const spaceId = request.body.spaceId ?? existing.spaceId;
      if (await hasOverlap(app, spaceId, startsAt, endsAt, id)) {
        return reply.code(409).send({ error: "Overlaps an existing schedule block in this space" });
      }

      const [block] = await app.db
        .update(scheduleBlocks)
        .set({ ...request.body, startsAt, endsAt })
        .where(eq(scheduleBlocks.id, id))
        .returning();
      return block;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/schedule-blocks/:id",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      await app.db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, request.params.id));
      return reply.code(204).send();
    },
  );
}
