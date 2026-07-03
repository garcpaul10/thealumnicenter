import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { sports } from "@alumni/db";
import { requireStaffAuth, requireAdminAuth } from "../auth/middleware.js";

export async function sportsRoutes(app: FastifyInstance) {
  app.get("/sports", { preHandler: requireStaffAuth }, async () => {
    return app.db.select().from(sports);
  });

  app.post<{ Body: { name: string; slug: string; icon?: string } }>(
    "/sports",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { name, slug, icon } = request.body;
      if (!name || !slug) return reply.code(400).send({ error: "name and slug are required" });
      const [sport] = await app.db.insert(sports).values({ name, slug, icon }).returning();
      return reply.code(201).send(sport);
    },
  );

  app.patch<{ Params: { id: string }; Body: Partial<{ name: string; icon: string; active: boolean }> }>(
    "/sports/:id",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const [sport] = await app.db
        .update(sports)
        .set(request.body)
        .where(eq(sports.id, request.params.id))
        .returning();
      if (!sport) return reply.code(404).send({ error: "Sport not found" });
      return sport;
    },
  );
}
