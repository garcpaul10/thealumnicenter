import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { kioskDevices } from "@alumni/db";
import { requireAdminAuth } from "../auth/middleware.js";
import { signKioskDeviceToken } from "../auth/kiosk-jwt.js";

/**
 * Staff-facing device management — mirrors staff-users.ts's admin-only CRUD
 * pattern. Staff-mode unlock on a kiosk is via the staff member's own
 * `kioskPin` (staff_users.kiosk_pin_hash, set via PATCH /staff-users/:id),
 * not a device-level PIN — that way staff-mode actions are attributable to
 * a specific staff user, not just "someone with this tablet's PIN".
 *
 * Issuing a fresh device token here is how a lost/stolen tablet gets
 * revoked in practice: delete the row, but note the old JWT still verifies
 * on its own (nothing here checks the device row per-request) — pair
 * deletion with rotating KIOSK_JWT_SECRET if a device is actually
 * compromised, not just deregistered.
 */
export async function kioskDevicesRoutes(app: FastifyInstance) {
  app.get("/kiosk-devices", { preHandler: requireAdminAuth }, async () => {
    return app.db.select().from(kioskDevices);
  });

  app.post<{ Body: { spaceId: string; deviceLabel: string } }>(
    "/kiosk-devices",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { spaceId, deviceLabel } = request.body ?? {};
      if (!spaceId || !deviceLabel) {
        return reply.code(400).send({ error: "spaceId and deviceLabel are required" });
      }
      const [device] = await app.db.insert(kioskDevices).values({ spaceId, deviceLabel }).returning();

      const deviceToken = await signKioskDeviceToken({ deviceId: device.id, spaceId: device.spaceId });
      return reply.code(201).send({ device, deviceToken });
    },
  );

  app.patch<{ Params: { id: string }; Body: Partial<{ spaceId: string; deviceLabel: string }> }>(
    "/kiosk-devices/:id",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const { spaceId, deviceLabel } = request.body ?? {};
      const updates: Record<string, unknown> = {};
      if (spaceId) updates.spaceId = spaceId;
      if (deviceLabel) updates.deviceLabel = deviceLabel;
      if (Object.keys(updates).length === 0) {
        return reply.code(400).send({ error: "No fields to update" });
      }
      const [device] = await app.db
        .update(kioskDevices)
        .set(updates)
        .where(eq(kioskDevices.id, request.params.id))
        .returning();
      if (!device) return reply.code(404).send({ error: "Device not found" });
      return device;
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/kiosk-devices/:id",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      await app.db.delete(kioskDevices).where(eq(kioskDevices.id, request.params.id));
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { id: string } }>(
    "/kiosk-devices/:id/rotate-token",
    { preHandler: requireAdminAuth },
    async (request, reply) => {
      const [device] = await app.db.select().from(kioskDevices).where(eq(kioskDevices.id, request.params.id));
      if (!device) return reply.code(404).send({ error: "Device not found" });
      const deviceToken = await signKioskDeviceToken({ deviceId: device.id, spaceId: device.spaceId });
      return { deviceToken };
    },
  );
}
