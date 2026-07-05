import type { FastifyInstance } from "fastify";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { scheduleBlocks, sports, spaces, offerings, accounts, tokenLedger } from "@alumni/db";

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
}
