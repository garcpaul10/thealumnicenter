import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyStaffToken, type StaffTokenPayload } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    staff?: StaffTokenPayload;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/** Attaches request.staff if a valid staff JWT is present; sends 401 otherwise. Use as a route preHandler. */
export async function requireStaffAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request);
  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }
  try {
    request.staff = await verifyStaffToken(token);
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
}

/** Stricter than requireStaffAuth — for admin-only actions (staff user management, partner/settlement config). */
export async function requireAdminAuth(request: FastifyRequest, reply: FastifyReply) {
  await requireStaffAuth(request, reply);
  if (reply.sent) return;
  if (request.staff?.role !== "admin") {
    return reply.code(403).send({ error: "Admin role required" });
  }
}
