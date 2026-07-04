import type { FastifyReply, FastifyRequest } from "fastify";
import { createClerkClient, verifyToken, type ClerkClient } from "@clerk/backend";
import { env } from "../env.js";
import { getOrCreateAccountForClerkUser } from "../accounts/account-service.js";

// Lazy — see the comment in routes/checkout.ts for why (same reasoning
// applies to any third-party client keyed off an env var).
let clerkClient: ClerkClient | undefined;
function getClerkClient(): ClerkClient {
  if (!clerkClient) clerkClient = createClerkClient({ secretKey: env.clerkSecretKey });
  return clerkClient;
}

declare module "fastify" {
  interface FastifyRequest {
    account?: { id: string; phone: string };
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/** Verifies a Clerk session token and attaches request.account (lazily created/linked — see account-service.ts). */
export async function requireMemberAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request);
  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }

  let clerkUserId: string;
  try {
    const verified = await verifyToken(token, { secretKey: env.clerkSecretKey });
    clerkUserId = verified.sub;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }

  try {
    request.account = await getOrCreateAccountForClerkUser(request.server.db, getClerkClient(), clerkUserId);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: "Could not resolve member account" });
  }
}
