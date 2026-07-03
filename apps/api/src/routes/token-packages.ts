import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { tokenPackages } from "@alumni/db";
import { requireStaffAuth, requireAdminAuth } from "../auth/middleware.js";

export async function tokenPackagesRoutes(app: FastifyInstance) {
  app.get("/token-packages", { preHandler: requireStaffAuth }, async () => {
    return app.db.select().from(tokenPackages);
  });

  app.post<{
    Body: { name: string; priceCents: number; tokensGranted: number; bonusTokens?: number; sortOrder?: number };
  }>("/token-packages", { preHandler: requireAdminAuth }, async (request, reply) => {
    const { name, priceCents, tokensGranted, bonusTokens, sortOrder } = request.body;
    if (!name || priceCents === undefined || tokensGranted === undefined) {
      return reply.code(400).send({ error: "name, priceCents, and tokensGranted are required" });
    }
    const [pkg] = await app.db
      .insert(tokenPackages)
      .values({ name, priceCents, tokensGranted, bonusTokens, sortOrder })
      .returning();
    return reply.code(201).send(pkg);
  });

  app.patch<{
    Params: { id: string };
    Body: Partial<{ name: string; priceCents: number; tokensGranted: number; bonusTokens: number; active: boolean; sortOrder: number }>;
  }>("/token-packages/:id", { preHandler: requireAdminAuth }, async (request, reply) => {
    const [pkg] = await app.db
      .update(tokenPackages)
      .set(request.body)
      .where(eq(tokenPackages.id, request.params.id))
      .returning();
    if (!pkg) return reply.code(404).send({ error: "Token package not found" });
    return pkg;
  });
}
