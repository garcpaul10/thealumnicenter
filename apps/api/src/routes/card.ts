import type { FastifyInstance } from "fastify";
import { eq, and, inArray } from "drizzle-orm";
import { participants, cardCosmetics, rewardRedemptions, rewardItems } from "@alumni/db";
import { requireMemberAuth } from "../auth/member-middleware.js";
import { signQrToken } from "../card/qr-token.js";

async function assertOwnedParticipant(app: FastifyInstance, accountId: string, participantId: string) {
  const [participant] = await app.db
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.accountId, accountId)));
  return participant ?? null;
}

export async function cardRoutes(app: FastifyInstance) {
  // Rotating signed QR token — never the raw participant ID (DESIGN.md CS3).
  // Card UI re-fetches this periodically while displayed (30s TTL).
  app.get<{ Params: { id: string } }>(
    "/participants/:id/qr-token",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const participant = await assertOwnedParticipant(app, request.account!.id, request.params.id);
      if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });
      return signQrToken(participant.id);
    },
  );

  // Cosmetics unlocked for a participant: defaults + anything they've
  // redeemed from the rewards store (reward_type = card_cosmetic).
  app.get<{ Params: { id: string } }>(
    "/participants/:id/unlocked-cosmetics",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const participant = await assertOwnedParticipant(app, request.account!.id, request.params.id);
      if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });

      const defaults = await app.db
        .select()
        .from(cardCosmetics)
        .where(eq(cardCosmetics.unlockMethod, "default"));

      const redemptions = await app.db
        .select({ rewardItemId: rewardRedemptions.rewardItemId })
        .from(rewardRedemptions)
        .where(eq(rewardRedemptions.participantId, participant.id));
      const redeemedRewardItemIds = redemptions.map((r) => r.rewardItemId);

      const unlockedViaRewards = redeemedRewardItemIds.length
        ? await app.db
            .select()
            .from(cardCosmetics)
            .where(inArray(cardCosmetics.rewardItemId, redeemedRewardItemIds))
        : [];

      const byId = new Map([...defaults, ...unlockedViaRewards].map((c) => [c.id, c]));
      return [...byId.values()];
    },
  );
}
