import type { FastifyInstance } from "fastify";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { scheduleBlocks, sports, spaces, offerings, accounts, tokenLedger, teams, standings, tokenPackages } from "@alumni/db";
import { rankStandings } from "@alumni/shared";

type OfferingType = "walk_in" | "free_play_pass" | "league" | "camp" | "reservation" | "lesson" | "clinic";

/**
 * Unauthenticated, public-facing data for apps/marketing — deliberately a
 * separate namespace from the staff (`/schedule-blocks`) and member
 * (`/member/schedule-blocks/open-now`) routes, which both require auth.
 * Nothing here exposes anything beyond what a visitor could already see by
 * walking into the building — no participant/account identities, no
 * financial detail beyond an aggregate token count.
 */
export async function publicRoutes(app: FastifyInstance) {
  app.get("/public/open-now", async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 4 * 60 * 60_000);
    const rows = await app.db
      .select({
        id: scheduleBlocks.id,
        mode: scheduleBlocks.mode,
        startsAt: scheduleBlocks.startsAt,
        endsAt: scheduleBlocks.endsAt,
        spaceName: spaces.name,
        sportName: sports.name,
      })
      .from(scheduleBlocks)
      .leftJoin(spaces, eq(spaces.id, scheduleBlocks.spaceId))
      .leftJoin(sports, eq(sports.id, scheduleBlocks.sportId))
      .where(and(lte(scheduleBlocks.startsAt, soon), gte(scheduleBlocks.endsAt, now)))
      .orderBy(scheduleBlocks.startsAt);
    return rows;
  });

  app.get("/public/stats", async () => {
    const [{ activeMembers }] = await app.db
      .select({ activeMembers: sql<string>`count(*)` })
      .from(accounts)
      .where(eq(accounts.status, "active"));

    const [{ tokensInPlay }] = await app.db
      .select({ tokensInPlay: sql<string>`coalesce(sum(${tokenLedger.amount}), 0)` })
      .from(tokenLedger);

    const [{ leaguesRunning }] = await app.db
      .select({ leaguesRunning: sql<string>`count(*)` })
      .from(offerings)
      .where(and(eq(offerings.type, "league"), eq(offerings.active, true)));

    return {
      activeMembers: Number(activeMembers),
      tokensInPlay: Number(tokensInPlay),
      leaguesRunning: Number(leaguesRunning),
    };
  });

  app.get("/public/sports", async () => {
    return app.db.select({ id: sports.id, name: sports.name, slug: sports.slug, icon: sports.icon }).from(sports).where(eq(sports.active, true));
  });

  app.get<{ Querystring: { sportSlug?: string; type?: OfferingType } }>("/public/offerings", async (request) => {
    const { sportSlug, type } = request.query;
    const conditions = [eq(offerings.active, true)];
    if (type) conditions.push(eq(offerings.type, type));
    if (sportSlug) conditions.push(eq(sports.slug, sportSlug));

    return app.db
      .select({
        id: offerings.id,
        type: offerings.type,
        name: offerings.name,
        description: offerings.description,
        tokenPrice: offerings.tokenPrice,
        durationMinutes: offerings.durationMinutes,
        capacity: offerings.capacity,
        sportName: sports.name,
        sportSlug: sports.slug,
      })
      .from(offerings)
      .leftJoin(sports, eq(sports.id, offerings.sportId))
      .where(and(...conditions));
  });

  app.get("/public/leagues", async () => {
    return app.db
      .select({
        id: offerings.id,
        name: offerings.name,
        description: offerings.description,
        tokenPrice: offerings.tokenPrice,
        sportName: sports.name,
        sportSlug: sports.slug,
      })
      .from(offerings)
      .leftJoin(sports, eq(sports.id, offerings.sportId))
      .where(and(eq(offerings.type, "league"), eq(offerings.active, true)));
  });

  app.get<{ Params: { offeringId: string } }>("/public/leagues/:offeringId/standings", async (request, reply) => {
    const { offeringId } = request.params;
    const [offering] = await app.db.select().from(offerings).where(eq(offerings.id, offeringId));
    if (!offering || offering.type !== "league") return reply.code(404).send({ error: "League not found" });

    const sportSlug = offering.sportId
      ? ((await app.db.select().from(sports).where(eq(sports.id, offering.sportId)))[0]?.slug ?? "unknown")
      : "unknown";

    const rows = await app.db.select().from(standings).where(eq(standings.offeringId, offeringId));
    const teamRows = await app.db.select().from(teams).where(eq(teams.offeringId, offeringId));
    const nameByTeamId = new Map(teamRows.map((t) => [t.id, t.name]));

    const ranked = rankStandings(
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

    // Only team name + record — never captainParticipantId or any other participant-linked field.
    return ranked.map((row) => ({ ...row, teamName: nameByTeamId.get(row.teamId) ?? "Unknown team" }));
  });

  app.get("/public/token-packages", async () => {
    return app.db
      .select({
        id: tokenPackages.id,
        name: tokenPackages.name,
        priceCents: tokenPackages.priceCents,
        tokensGranted: tokenPackages.tokensGranted,
        bonusTokens: tokenPackages.bonusTokens,
      })
      .from(tokenPackages)
      .where(eq(tokenPackages.active, true))
      .orderBy(tokenPackages.sortOrder);
  });
}
