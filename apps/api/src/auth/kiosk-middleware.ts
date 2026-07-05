import type { FastifyReply, FastifyRequest } from "fastify";
import {
  verifyKioskDeviceToken,
  verifyKioskStaffToken,
  type KioskDeviceTokenPayload,
  type KioskStaffTokenPayload,
} from "./kiosk-jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    kiosk?: KioskDeviceTokenPayload;
    kioskStaff?: KioskStaffTokenPayload;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/** Attaches request.kiosk for any request from a registered kiosk device — self-scan mode. */
export async function requireKioskAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request);
  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }
  try {
    request.kiosk = await verifyKioskDeviceToken(token);
  } catch {
    return reply.code(401).send({ error: "Invalid or expired kiosk device token" });
  }
}

/** Stricter — for comps/overrides/manual lookup/guest starter packs. Requires the short-lived staff-mode token issued after a correct PIN entry (see routes/scan-station.ts's /pin-unlock). */
export async function requireKioskStaffAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request);
  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }
  try {
    request.kioskStaff = await verifyKioskStaffToken(token);
  } catch {
    return reply.code(401).send({ error: "Invalid or expired staff-mode token — re-enter PIN" });
  }
}
