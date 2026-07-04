import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { splitRequests, splitShares, participants } from "@alumni/db";
import { requireMemberAuth } from "../auth/member-middleware.js";
import {
  createSplitRequest,
  acceptSplitShare,
  declineSplitShare,
  SplitShareAlreadyResolvedError,
  SplitRequestExpiredError,
} from "../split-payments/split-payment-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";

export async function splitRequestsRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      initiatorParticipantId: string;
      referenceType: "reservation" | "walk_in" | "free_play_pass";
      referenceId: string;
      totalTokens: number;
      splitMethod?: "equal" | "custom";
      shares: Array<{ participantId: string; amountTokens: number }>;
    };
  }>("/split-requests", { preHandler: requireMemberAuth }, async (request, reply) => {
    const { initiatorParticipantId, referenceType, referenceId, totalTokens, splitMethod, shares } = request.body;
    if (!initiatorParticipantId || !referenceType || !referenceId || !totalTokens || !shares?.length) {
      return reply.code(400).send({ error: "initiatorParticipantId, referenceType, referenceId, totalTokens, and shares are required" });
    }

    const [initiator] = await app.db
      .select()
      .from(participants)
      .where(and(eq(participants.id, initiatorParticipantId), eq(participants.accountId, request.account!.id)));
    if (!initiator) return reply.code(404).send({ error: "Initiator participant not found on this account" });

    try {
      const result = await createSplitRequest(app.db, {
        initiatorParticipantId,
        referenceType,
        referenceId,
        totalTokens,
        splitMethod: splitMethod ?? "equal",
        shares,
      });
      return reply.code(201).send(result);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.get<{ Params: { id: string } }>("/split-requests/:id", { preHandler: requireMemberAuth }, async (request, reply) => {
    const [splitRequest] = await app.db.select().from(splitRequests).where(eq(splitRequests.id, request.params.id));
    if (!splitRequest) return reply.code(404).send({ error: "Split request not found" });
    const shares = await app.db.select().from(splitShares).where(eq(splitShares.splitRequestId, splitRequest.id));
    return { ...splitRequest, shares };
  });

  app.post<{ Params: { shareId: string } }>(
    "/split-shares/:shareId/accept",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      try {
        const result = await acceptSplitShare(app.db, { shareId: request.params.shareId, accountId: request.account!.id });
        return result;
      } catch (err) {
        if (err instanceof InsufficientBalanceError) return reply.code(402).send({ error: err.message });
        if (err instanceof SplitShareAlreadyResolvedError || err instanceof SplitRequestExpiredError) {
          return reply.code(409).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { shareId: string } }>(
    "/split-shares/:shareId/decline",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      try {
        return await declineSplitShare(app.db, request.params.shareId);
      } catch (err) {
        if (err instanceof SplitShareAlreadyResolvedError) return reply.code(409).send({ error: err.message });
        throw err;
      }
    },
  );
}
