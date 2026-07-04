import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { accounts, participants } from "@alumni/db";
import { requireMemberAuth } from "../auth/member-middleware.js";
import { getAccountTokenRollup, getParticipantPointsBalance } from "../ledger/ledger-service.js";

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: requireMemberAuth }, async (request) => {
    const account = request.account!;
    const accountParticipants = await app.db
      .select()
      .from(participants)
      .where(eq(participants.accountId, account.id));

    const rollup = await getAccountTokenRollup(app.db, account.id);

    const withBalances = await Promise.all(
      accountParticipants.map(async (p) => ({
        ...p,
        tokenBalance: rollup.byParticipant[p.id] ?? 0,
        pointsBalance: await getParticipantPointsBalance(app.db, p.id),
      })),
    );

    return {
      account,
      participants: withBalances,
      totalTokenBalance: rollup.total,
    };
  });

  app.post<{ Body: { firstName: string; lastName: string; nickname?: string; dob?: string } }>(
    "/me/participants",
    { preHandler: requireMemberAuth },
    async (request, reply) => {
      const account = request.account!;
      const { firstName, lastName, nickname, dob } = request.body;
      if (!firstName || !lastName) {
        return reply.code(400).send({ error: "firstName and lastName are required" });
      }
      const [participant] = await app.db
        .insert(participants)
        .values({
          accountId: account.id,
          firstName,
          lastName,
          nickname,
          dob: dob ? new Date(dob) : undefined,
          isAccountOwner: false,
        })
        .returning();
      return reply.code(201).send(participant);
    },
  );

  app.patch<{
    Params: { id: string };
    Body: Partial<{ nickname: string; photoUrl: string; alumniCardConfig: Record<string, unknown> }>;
  }>("/me/participants/:id", { preHandler: requireMemberAuth }, async (request, reply) => {
    const account = request.account!;
    const [participant] = await app.db
      .update(participants)
      .set(request.body)
      .where(and(eq(participants.id, request.params.id), eq(participants.accountId, account.id)))
      .returning();
    if (!participant) return reply.code(404).send({ error: "Participant not found on this account" });
    return participant;
  });
}
