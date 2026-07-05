import type { FastifyInstance } from "fastify";
import { requireKioskAuth } from "../auth/kiosk-middleware.js";
import { createVendorOrder, MenuItemNotFoundError } from "../vendor-orders/vendor-order-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";
import { verifyQrToken } from "../card/qr-token.js";

/** Vendor/concession POS mode on the kiosk — "another scan point" per DESIGN.md: scan → ring up items → deduct. */
export async function vendorOrdersRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      qrToken: string;
      accountId: string;
      partnerId: string | null;
      items: { menuItemId: string; qty: number }[];
    };
  }>("/scan-station/vendor-orders", { preHandler: requireKioskAuth }, async (request, reply) => {
    const { qrToken, accountId, partnerId, items } = request.body ?? {};
    if (!qrToken || !accountId || !items?.length) {
      return reply.code(400).send({ error: "qrToken, accountId, and items are required" });
    }

    let participantId: string;
    try {
      ({ participantId } = await verifyQrToken(qrToken));
    } catch {
      return reply.code(400).send({ error: "QR code expired or invalid — ask the member to refresh their card" });
    }

    try {
      const order = await createVendorOrder(app.db, {
        partnerId: partnerId ?? null,
        participantId,
        accountId,
        items,
        createdBy: "staff",
      });
      return reply.code(201).send(order);
    } catch (err) {
      if (err instanceof MenuItemNotFoundError) return reply.code(404).send({ error: err.message });
      if (err instanceof InsufficientBalanceError) return reply.code(402).send({ error: err.message });
      throw err;
    }
  });
}
