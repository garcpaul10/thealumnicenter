import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { teams, teamMembers, standings, offerings, sports } from "@alumni/db";
import { rankStandings } from "@alumni/shared";
import { requireStaffAuth } from "../auth/middleware.js";

export async function teamsRoutes(app: FastifyInstance) {
  // Team creation is staff-driven in the admin dashboard today. Product
  // decision is captain self-serve (create + invite by phone) once the
  // member PWA has phone-OTP participant auth (Phase 3) — this endpoint's
  // shape (optional captainParticipantId) is ready for that; only the
  // caller changes, not the schema. See CLAUDE.md.
  app.get<{ Querystring: { offeringId?: string } }>("/teams", { preHandler: requireStaffAuth }, async (request) => {
    const { offeringId } = request.query;
    const query = app.db.select().from(teams);
    return offeringId ? query.where(eq(teams.offeringId, offeringId)) : query;
  });

  app.post<{ Body: { offeringId: string; name: string; captainParticipantId?: string } }>(
    "/teams",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { offeringId, name, captainParticipantId } = request.body;
      if (!offeringId || !name) return reply.code(400).send({ error: "offeringId and name are required" });
      const [team] = await app.db
        .insert(teams)
        .values({ offeringId, name, captainParticipantId })
        .returning();
      if (captainParticipantId) {
        await app.db
          .insert(teamMembers)
          .values({ teamId: team.id, participantId: captainParticipantId, role: "captain" });
      }
      return reply.code(201).send(team);
    },
  );

  app.get<{ Params: { id: string } }>("/teams/:id/members", { preHandler: requireStaffAuth }, async (request) => {
    return app.db.select().from(teamMembers).where(eq(teamMembers.teamId, request.params.id));
  });

  app.post<{ Params: { id: string }; Body: { participantId: string; role?: "captain" | "player" } }>(
    "/teams/:id/members",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { participantId, role } = request.body;
      if (!participantId) return reply.code(400).send({ error: "participantId is required" });
      const [member] = await app.db
        .insert(teamMembers)
        .values({ teamId: request.params.id, participantId, role: role ?? "player" })
        .returning();
      return reply.code(201).send(member);
    },
  );

  app.delete<{ Params: { id: string; participantId: string } }>(
    "/teams/:id/members/:participantId",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      await app.db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, request.params.id),
            eq(teamMembers.participantId, request.params.participantId),
          ),
        );
      return reply.code(204).send();
    },
  );

  app.get<{ Params: { offeringId: string } }>(
    "/offerings/:offeringId/standings",
    { preHandler: requireStaffAuth },
    async (request, reply) => {
      const { offeringId } = request.params;
      const [offering] = await app.db.select().from(offerings).where(eq(offerings.id, offeringId));
      if (!offering) return reply.code(404).send({ error: "Offering not found" });

      const sportSlug = offering.sportId
        ? (await app.db.select().from(sports).where(eq(sports.id, offering.sportId)))[0]?.slug ?? "unknown"
        : "unknown";

      const rows = await app.db.select().from(standings).where(eq(standings.offeringId, offeringId));
      return rankStandings(
        sportSlug,
        rows.map((r) => ({
          teamId: r.teamId,
          wins: r.wins,
          losses: r.losses,
          ties: r.ties,
          pointsFor: r.pointsFor,
          pointsAgainst: r.pointsAgainst,
        })),
      );
    },
  );
}
