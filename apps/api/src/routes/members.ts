import type { FastifyInstance } from "fastify";
import { desc, eq, ilike, or } from "drizzle-orm";
import { accounts, participants, tokenLedger } from "@alumni/db";
import { requireStaffAuth } from "../auth/middleware.js";
import { recordAdjustment, recordRefund, getAccountTokenRollup } from "../ledger/ledger-service.js";
import { InsufficientBalanceError } from "../ledger/errors.js";

export async function membersRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string } }>("/members/search", { preHandler: requireStaffAuth }, async (request, reply) => {
    const q = request.query.q?.trim();
    if (!q) return reply.code(400).send({ error: "q is required" });

    const matchedAccounts = await app.db
      .select()
      .from(accounts)
      .where(ilike(accounts.phone, `%${q}%`));

    const matchedByParticipantName = await app.db
      .select({ account: accounts })
      .from(participants)
      .innerJoin(accounts, eq(participants.accountId, accounts.id))
      .where(or(ilike(participants.firstName, `%${q}%`), ilike(participants.lastName, `%${q}%`)));

    const byId = new Map(matchedAccounts.map((a) => [a.id, a]));
    for (const row of matchedByParticipantName) byId.set(row.account.id, row.account);

    return [...byId.values()];
  });

  app.get<{ Params: { accountId: string } }>(
    "/members/:accountId",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { accountId } = request.params;
      const [account] = await app.db.select().from(accounts).where(eq(accounts.id, accountId));
      if (!account) return reply.code(404).send({ error: "Account not found" });

      const accountParticipants = await app.db
        .select()
        .from(participants)
        .where(eq(participants.accountId, accountId));

      const rollup = await getAccountTokenRollup(app.db, accountId);

      return {
        account,
        participants: accountParticipants.map((p) => ({
          ...p,
          balance: rollup.byParticipant[p.id] ?? 0,
        })),
        totalTokenBalance: rollup.total,
      };
    },
  );

  app.get<{ Params: { participantId: string } }>(
    "/participants/:participantId/ledger",
    { preHandler: requireStaffAuth },
    async (request) => {
      return app.db
        .select()
        .from(tokenLedger)
        .where(eq(tokenLedger.participantId, request.params.participantId))
        .orderBy(desc(tokenLedger.createdAt));
    },
  );

  app.post<{ Params: { participantId: string }; Body: { accountId: string; amountTokens: number; note: string } }>(
    "/participants/:participantId/comp",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { accountId, amountTokens, note } = request.body;
      if (!accountId || !amountTokens || !note) {
        return reply.code(400).send({ error: "accountId, amountTokens, and note are required" });
      }
      try {
        const { adjustmentRow } = await recordAdjustment(app.db, {
          accountId,
          participantId: request.params.participantId,
          amountTokens,
          note,
          createdBy: "staff",
        });
        return reply.code(201).send(adjustmentRow);
      } catch (err) {
        if (err instanceof InsufficientBalanceError) return reply.code(402).send({ error: err.message });
        return reply.code(400).send({ error: (err as Error).message });
      }
    },
  );

  app.post<{
    Params: { participantId: string };
    Body: { accountId: string; amountTokens: number; referenceType: string; referenceId: string; note?: string };
  }>("/participants/:participantId/refund", { preHandler: requireStaffAuth }, async (request, reply) => {
    const { accountId, amountTokens, referenceType, referenceId, note } = request.body;
    if (!accountId || !amountTokens || !referenceType || !referenceId) {
      return reply.code(400).send({ error: "accountId, amountTokens, referenceType, and referenceId are required" });
    }
    const { refundRow } = await recordRefund(app.db, {
      accountId,
      participantId: request.params.participantId,
      amountTokens,
      referenceType,
      referenceId,
      note,
      createdBy: "staff",
    });
    return reply.code(201).send(refundRow);
  });
}
