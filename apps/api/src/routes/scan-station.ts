import type { FastifyInstance } from "fastify";
import { and, eq, gte, lte } from "drizzle-orm";
import { staffUsers, scheduleBlocks, participants } from "@alumni/db";
import { requireKioskAuth, requireKioskStaffAuth } from "../auth/kiosk-middleware.js";
import { verifyPassword } from "../auth/password.js";
import { signKioskStaffToken } from "../auth/kiosk-jwt.js";
import { verifyQrToken } from "../card/qr-token.js";
import { resolveScan, confirmWalkIn, ParticipantNotFoundError } from "../scan/scan-service.js";
import { getParticipantBalance } from "../ledger/ledger-service.js";

/**
 * Scan-station app's API surface — kiosk-device-authenticated (Bearer =
 * kiosk device token from kiosk-devices.ts), prefix /scan-station. Staff
 * mode (comps, manual lookup, overrides) additionally requires the
 * short-lived staff token from /pin-unlock (requireKioskStaffAuth).
 */
export async function scanStationRoutes(app: FastifyInstance) {
  app.post<{ Body: { pin: string } }>(
    "/scan-station/pin-unlock",
    { preHandler: requireKioskAuth },
    async (request, reply) => {
      const { pin } = request.body ?? {};
      if (!pin) return reply.code(400).send({ error: "pin is required" });

      const candidates = await app.db.select().from(staffUsers);
      for (const staffUser of candidates) {
        if (!staffUser.kioskPinHash) continue;
        if (await verifyPassword(pin, staffUser.kioskPinHash)) {
          const staffToken = await signKioskStaffToken({
            deviceId: request.kiosk!.deviceId,
            spaceId: request.kiosk!.spaceId,
            staffUserId: staffUser.id,
          });
          return reply.send({ staffToken, staffUser: { id: staffUser.id, name: staffUser.name } });
        }
      }
      return reply.code(401).send({ error: "Invalid PIN" });
    },
  );

  // "What's open now (+ soon)" for this kiosk's bound space — polled every
  // 30-60s per DESIGN.md's kiosk↔space binding note (SSE push deferred).
  app.get("/scan-station/schedule", { preHandler: requireKioskAuth }, async (request) => {
    const now = new Date();
    const soon = new Date(now.getTime() + 4 * 60 * 60_000);
    return app.db
      .select()
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.spaceId, request.kiosk!.spaceId),
          lte(scheduleBlocks.startsAt, soon),
          gte(scheduleBlocks.endsAt, now),
        ),
      );
  });

  app.post<{ Body: { qrToken: string } }>(
    "/scan-station/scan",
    { preHandler: requireKioskAuth },
    async (request, reply) => {
      const { qrToken } = request.body ?? {};
      if (!qrToken) return reply.code(400).send({ error: "qrToken is required" });

      let participantId: string;
      try {
        ({ participantId } = await verifyQrToken(qrToken));
      } catch {
        return reply.code(400).send({ error: "QR code expired or invalid — ask the member to refresh their card" });
      }

      try {
        const decision = await resolveScan(app.db, {
          participantId,
          spaceId: request.kiosk!.spaceId,
          stationId: request.kiosk!.deviceId,
        });
        return decision;
      } catch (err) {
        if (err instanceof ParticipantNotFoundError) return reply.code(404).send({ error: err.message });
        throw err;
      }
    },
  );

  // Tap-to-confirm — the explicit second step for any walk-in deduction
  // (DESIGN.md's kiosk mode is "self-scan, explicit tap-to-confirm
  // deductions", never an automatic charge off the scan itself).
  app.post<{
    Body: { participantId: string; accountId: string; scheduleBlockId: string; amountTokens: number };
  }>("/scan-station/confirm-walk-in", { preHandler: requireKioskAuth }, async (request, reply) => {
    const { participantId, accountId, scheduleBlockId, amountTokens } = request.body ?? {};
    if (!participantId || !accountId || !scheduleBlockId || !amountTokens) {
      return reply.code(400).send({ error: "participantId, accountId, scheduleBlockId, and amountTokens are required" });
    }
    try {
      const redemptionRow = await confirmWalkIn(app.db, {
        participantId,
        accountId,
        scheduleBlockId,
        amountTokens,
        stationId: request.kiosk!.deviceId,
        createdBy: "staff",
      });
      return reply.code(201).send(redemptionRow);
    } catch (err) {
      return reply.code(402).send({ error: (err as Error).message });
    }
  });

  // Staff-mode manual lookup — photo-on-scan anti-fraud verification
  // (DESIGN.md) plus a manual fallback when a member's phone/QR isn't handy.
  app.get<{ Params: { participantId: string } }>(
    "/scan-station/member/:participantId",
    { preHandler: requireKioskStaffAuth },
    async (request, reply) => {
      const [participant] = await app.db
        .select()
        .from(participants)
        .where(eq(participants.id, request.params.participantId));
      if (!participant) return reply.code(404).send({ error: "Participant not found" });
      const balance = await getParticipantBalance(app.db, participant.id);
      return { participant, balance };
    },
  );
}
