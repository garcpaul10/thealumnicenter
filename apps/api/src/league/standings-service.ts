import { eq, and } from "drizzle-orm";
import { games, gameScores, teams, standings, offerings, sports, type Db } from "@alumni/db";
import { aggregateStandings, rankStandings, type GameResult } from "@alumni/shared";

/**
 * Recomputes standings for a league offering from its finalized game
 * scores and upserts the `standings` table. This is the only place that
 * writes to `standings` — never hand-edited (DESIGN.md §6), called whenever
 * a game_scores row is finalized.
 */
export async function recalculateStandings(db: Db, offeringId: string): Promise<void> {
  const [offering] = await db.select().from(offerings).where(eq(offerings.id, offeringId));
  if (!offering) throw new Error(`Offering ${offeringId} not found`);

  const sportSlug = offering.sportId
    ? (await db.select().from(sports).where(eq(sports.id, offering.sportId)))[0]?.slug ?? "unknown"
    : "unknown";

  const leagueTeams = await db.select().from(teams).where(eq(teams.offeringId, offeringId));
  const teamIds = leagueTeams.map((t) => t.id);

  const finalizedGames = await db
    .select({
      homeTeamId: games.homeTeamId,
      awayTeamId: games.awayTeamId,
      homeScore: gameScores.homeScore,
      awayScore: gameScores.awayScore,
    })
    .from(gameScores)
    .innerJoin(games, eq(gameScores.gameId, games.id))
    .where(and(eq(games.offeringId, offeringId), eq(gameScores.final, true)));

  const results: GameResult[] = finalizedGames.flatMap((g) => [
    { teamId: g.homeTeamId, opponentTeamId: g.awayTeamId, pointsFor: g.homeScore, pointsAgainst: g.awayScore },
    { teamId: g.awayTeamId, opponentTeamId: g.homeTeamId, pointsFor: g.awayScore, pointsAgainst: g.homeScore },
  ]);

  const aggregated = aggregateStandings(teamIds, results);
  const ranked = rankStandings(sportSlug, aggregated);

  await db.transaction(async (tx) => {
    await tx.delete(standings).where(eq(standings.offeringId, offeringId));
    if (ranked.length === 0) return;
    await tx.insert(standings).values(
      ranked.map((s) => ({
        offeringId,
        teamId: s.teamId,
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        pointsFor: s.pointsFor,
        pointsAgainst: s.pointsAgainst,
      })),
    );
  });
}
