import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { partners } from "@alumni/db";
import { requireStaffAuth, requireAdminAuth } from "../auth/middleware.js";

export async function partnersRoutes(app: FastifyInstance) {
  app.get("/partners", { preHandler: requireStaffAuth }, async () => {
    return app.db.select().from(partners);
  });

  app.post<{
    Body: {
      type: "vendor" | "coach";
      displayName: string;
      contactPhone?: string;
      splitPct: number;
      settlementRateCentsPerToken?: number;
    };
  }>("/partners", { preHandler: requireAdminAuth }, async (request, reply) => {
    const { type, displayName, contactPhone, splitPct, settlementRateCentsPerToken } = request.body;
    if (!type || !displayName || splitPct === undefined) {
      return reply.code(400).send({ error: "type, displayName, and splitPct are required" });
    }
    const [partner] = await app.db
      .insert(partners)
      .values({
        type,
        displayName,
        contactPhone,
        splitPct: splitPct.toString(),
        settlementRateCentsPerToken,
      })
      .returning();
    return reply.code(201).send(partner);
  });

  app.patch<{
    Params: { id: string };
    Body: Partial<{
      displayName: string;
      contactPhone: string;
      splitPct: number;
      settlementRateCentsPerToken: number;
      status: "active" | "inactive";
    }>;
  }>("/partners/:id", { preHandler: requireAdminAuth }, async (request, reply) => {
    const { splitPct, ...rest } = request.body;
    const [partner] = await app.db
      .update(partners)
      .set({ ...rest, ...(splitPct !== undefined ? { splitPct: splitPct.toString() } : {}) })
      .where(eq(partners.id, request.params.id))
      .returning();
    if (!partner) return reply.code(404).send({ error: "Partner not found" });
    return partner;
  });
}
