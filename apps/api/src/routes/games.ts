import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { games, gameScores } from "@alumni/db";
import { requireStaffAuth } from "../auth/middleware.js";
import { recalculateStandings } from "../league/standings-service.js";

export async function gamesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { offeringId?: string } }>("/games", { preHandler: requireStaffAuth }, async (request) => {
    const { offeringId } = request.query;
    const query = app.db.select().from(games);
    return offeringId ? query.where(eq(games.offeringId, offeringId)) : query;
  });

  app.post<{
    Body: {
      offeringId: string;
      scheduleBlockId?: string;
      homeTeamId: string;
      awayTeamId: string;
      scheduledAt: string;
    };
  }>("/games", { preHandler: requireStaffAuth }, async (request, reply) => {
    const { offeringId, scheduleBlockId, homeTeamId, awayTeamId, scheduledAt } = request.body;
    if (!offeringId || !homeTeamId || !awayTeamId || !scheduledAt) {
      return reply.code(400).send({ error: "offeringId, homeTeamId, awayTeamId, and scheduledAt are required" });
    }
    if (homeTeamId === awayTeamId) {
      return reply.code(400).send({ error: "homeTeamId and awayTeamId must differ" });
    }
    const [game] = await app.db
      .insert(games)
      .values({ offeringId, scheduleBlockId, homeTeamId, awayTeamId, scheduledAt: new Date(scheduledAt) })
      .returning();
    return reply.code(201).send(game);
  });

  app.patch<{ Params: { id: string }; Body: Partial<{ status: "scheduled" | "in_progress" | "final" | "postponed" | "cancelled" }> }>(
    "/games/:id",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const [game] = await app.db
        .update(games)
        .set(request.body)
        .where(eq(games.id, request.params.id))
        .returning();
      if (!game) return reply.code(404).send({ error: "Game not found" });
      return game;
    },
  );

  // Score entry is staff-only in v1 (DESIGN.md open question #2, resolved).
  // Finalizing a score recalculates standings for the whole league — the
  // only path that ever writes to `standings`.
  app.post<{ Params: { id: string }; Body: { homeScore: number; awayScore: number; final?: boolean } }>(
    "/games/:id/score",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { id } = request.params;
      const { homeScore, awayScore, final = false } = request.body;
      if (homeScore === undefined || awayScore === undefined) {
        return reply.code(400).send({ error: "homeScore and awayScore are required" });
      }

      const [game] = await app.db.select().from(games).where(eq(games.id, id));
      if (!game) return reply.code(404).send({ error: "Game not found" });

      const [score] = await app.db
        .insert(gameScores)
        .values({ gameId: id, homeScore, awayScore, enteredBy: "staff_user", final })
        .returning();

      if (final) {
        await app.db.update(games).set({ status: "final" }).where(eq(games.id, id));
        await recalculateStandings(app.db, game.offeringId);
      }

      return reply.code(201).send(score);
    },
  );
}
