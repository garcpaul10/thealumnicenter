import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { menuItems } from "@alumni/db";
import { requireAdminAuth } from "../auth/middleware.js";
import { requireKioskAuth } from "../auth/kiosk-middleware.js";
import { listMenuItems } from "../vendor-orders/vendor-order-service.js";

/** Menu item catalog (concessions/vendor POS items) — admin manages, kiosk vendor-POS mode reads. */
export async function menuItemsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { partnerId?: string } }>(
    "/menu-items",
    { preHandler: requireAdminAuth },
    async (request) => listMenuItems(app.db, request.query.partnerId),
  );

  // Read-only, kiosk-authenticated route the vendor-POS screen actually calls.
  app.get<{ Querystring: { partnerId?: string } }>(
    "/scan-station/menu-items",
    { preHandler: requireKioskAuth },
    async (request) => listMenuItems(app.db, request.query.partnerId),
  );

  app.post<{ Body: { partnerId: string | null; name: string; tokenPrice: number } }>(
    "/menu-items",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { partnerId, name, tokenPrice } = request.body ?? {};
      if (!name || !tokenPrice) return reply.code(400).send({ error: "name and tokenPrice are required" });
      const [menuItem] = await app.db
        .insert(menuItems)
        .values({ partnerId: partnerId ?? null, name, tokenPrice })
        .returning();
      return reply.code(201).send(menuItem);
    },
  );

  app.patch<{ Params: { id: string }; Body: Partial<{ name: string; tokenPrice: number; active: boolean }> }>(
    "/menu-items/:id",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const [menuItem] = await app.db
        .update(menuItems)
        .set(request.body)
        .where(eq(menuItems.id, request.params.id))
        .returning();
      if (!menuItem) return reply.code(404).send({ error: "Menu item not found" });
      return menuItem;
    },
  );
}
