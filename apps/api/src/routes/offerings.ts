import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { offerings } from "@alumni/db";
import { requireStaffAuth, requireAdminAuth } from "../auth/middleware.js";

type OfferingType = "walk_in" | "free_play_pass" | "league" | "camp" | "reservation" | "lesson" | "clinic";

interface OfferingBody {
  type: OfferingType;
  sportId?: string;
  name: string;
  description?: string;
  tokenPrice: number;
  capacity?: number;
  coachPartnerId?: string;
  durationMinutes?: number;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
}

export async function offeringsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { type?: OfferingType } }>(
    "/offerings",
    { preHandler: requireStaffAuth },
    async (request) => {
      const { type } = request.query;
      const query = app.db.select().from(offerings);
      return type ? query.where(eq(offerings.type, type)) : query;
    },
  );

  app.get<{ Params: { id: string } }>("/offerings/:id", { preHandler: requireStaffAuth }, async (request, reply) => {
    const [offering] = await app.db.select().from(offerings).where(eq(offerings.id, request.params.id));
    if (!offering) return reply.code(404).send({ error: "Offering not found" });
    return offering;
  });

  app.post<{ Body: OfferingBody }>("/offerings", { preHandler: requireAdminAuth }, async (request, reply) => {
    const body = request.body;
    if (!body.name || !body.type || body.tokenPrice === undefined) {
      return reply.code(400).send({ error: "type, name, and tokenPrice are required" });
    }
    const [offering] = await app.db
      .insert(offerings)
      .values({
        ...body,
        registrationOpensAt: body.registrationOpensAt ? new Date(body.registrationOpensAt) : undefined,
        registrationClosesAt: body.registrationClosesAt ? new Date(body.registrationClosesAt) : undefined,
      })
      .returning();
    return reply.code(201).send(offering);
  });

  app.patch<{ Params: { id: string }; Body: Partial<OfferingBody & { active: boolean }> }>(
    "/offerings/:id",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { registrationOpensAt, registrationClosesAt, ...rest } = request.body;
      const [offering] = await app.db
        .update(offerings)
        .set({
          ...rest,
          ...(registrationOpensAt ? { registrationOpensAt: new Date(registrationOpensAt) } : {}),
          ...(registrationClosesAt ? { registrationClosesAt: new Date(registrationClosesAt) } : {}),
        })
        .where(eq(offerings.id, request.params.id))
        .returning();
      if (!offering) return reply.code(404).send({ error: "Offering not found" });
      return offering;
    },
  );
}
