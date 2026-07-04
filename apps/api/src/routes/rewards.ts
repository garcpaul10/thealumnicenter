import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { rewardItems, rewardRedemptions, participants } from "@alumni/db";
import { requireMemberAuth } from "../auth/member-middleware.js";
import { redeemReward } from "../ledger/ledger-service.js";
import { InsufficientPointsBalanceError } from "../ledger/errors.js";

export async function rewardsRoutes(app: FastifyInstance) {
  app.get("/reward-items", { preHandler: requireMemberAuth }, async () => {
    return app.db.select().from(rewardItems).where(eq(rewardItems.active, true));
  });

  app.post<{ Params: { id: string }; Body: { participantId: string } }>(
    "/reward-items/:id/redeem",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const { participantId } = request.body;
      if (!participantId) return reply.code(400).send({ error: "participantId is required" });

      const [participant] = await app.db
        .select()
        .from(participants)
        .where(and(eq(participants.id, participantId), eq(participants.accountId, request.account!.id)));
      if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });

      const [rewardItem] = await app.db.select().from(rewardItems).where(eq(rewardItems.id, request.params.id));
      if (!rewardItem || !rewardItem.active) return reply.code(404).send({ error: "Reward item not found" });

      if (rewardItem.inventoryCount !== null && rewardItem.inventoryCount <= 0) {
        return reply.code(409).send({ error: "This reward is out of stock" });
      }

      try {
        const { pointsLedgerRow } = await redeemReward(app.db, {
          participantId,
          pointsCost: rewardItem.pointsCost,
          tokenGrantAmount: rewardItem.rewardType === "token_grant" ? (rewardItem.tokenGrantAmount ?? 0) : undefined,
          accountId: request.account!.id,
          referenceType: "reward_item",
          referenceId: rewardItem.id,
          note: `Redeemed: ${rewardItem.name}`,
        });

        const [redemption] = await app.db
          .insert(rewardRedemptions)
          .values({
            participantId,
            rewardItemId: rewardItem.id,
            pointsLedgerTxnId: pointsLedgerRow.id,
            status: rewardItem.rewardType === "merch" ? "pending" : "fulfilled",
          })
          .returning();

        if (rewardItem.inventoryCount !== null) {
          await app.db
            .update(rewardItems)
            .set({ inventoryCount: rewardItem.inventoryCount - 1 })
            .where(eq(rewardItems.id, rewardItem.id));
        }

        return reply.code(201).send(redemption);
      } catch (err) {
        if (err instanceof InsufficientPointsBalanceError) return reply.code(402).send({ error: err.message });
        throw err;
      }
    },
  );

  app.get<{ Params: { participantId: string } }>(
    "/participants/:participantId/reward-redemptions",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const [participant] = await app.db
        .select()
        .from(participants)
        .where(
          and(eq(participants.id, request.params.participantId), eq(participants.accountId, request.account!.id)),
        );
      if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });

      return app.db
        .select()
        .from(rewardRedemptions)
        .where(eq(rewardRedemptions.participantId, request.params.participantId));
    },
  );
}
