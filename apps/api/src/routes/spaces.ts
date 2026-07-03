import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { spaces } from "@alumni/db";
import { requireStaffAuth, requireAdminAuth } from "../auth/middleware.js";

export async function spacesRoutes(app: FastifyInstance) {
  app.get("/spaces", { preHandler: requireStaffAuth }, async () => {
    return app.db.select().from(spaces);
  });

  app.post<{ Body: { name: string; description?: string; capacity?: number } }>(
    "/spaces",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { name, description, capacity } = request.body;
      if (!name) return reply.code(400).send({ error: "name is required" });
      const [space] = await app.db.insert(spaces).values({ name, description, capacity }).returning();
      return reply.code(201).send(space);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: Partial<{ name: string; description: string; capacity: number; active: boolean }>;
  }>("/spaces/:id", { preHandler: requireAdminAuth }, async (request, reply) => {
    const [space] = await app.db
      .update(spaces)
      .set(request.body)
      .where(eq(spaces.id, request.params.id))
      .returning();
    if (!space) return reply.code(404).send({ error: "Space not found" });
    return space;
  });
}
