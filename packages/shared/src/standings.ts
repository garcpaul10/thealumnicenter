/**
 * Standings are always computed from finalized game results, never hand-
 * edited (DESIGN.md §6). This module is pure — no DB access — so it's fully
 * unit-testable; apps/api's league/standings-service.ts reads games +
 * game_scores, calls these functions, and upserts the result into the
 * `standings` table as a read cache.
 */

export interface GameResult {
  teamId: string;
  opponentTeamId: string;
  pointsFor: number;
  pointsAgainst: number;
}

export interface TeamStanding {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export function aggregateStandings(
  teamIds: string[],
  results: GameResult[],
): TeamStanding[] {
  const byTeam = new Map<string, TeamStanding>();
  for (const teamId of teamIds) {
    byTeam.set(teamId, { teamId, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });
  }

  for (const result of results) {
    const standing = byTeam.get(result.teamId);
    if (!standing) continue; // result for a team not in this league — ignore
    standing.pointsFor += result.pointsFor;
    standing.pointsAgainst += result.pointsAgainst;
    if (result.pointsFor > result.pointsAgainst) standing.wins += 1;
    else if (result.pointsFor < result.pointsAgainst) standing.losses += 1;
    else standing.ties += 1;
  }

  return [...byTeam.values()];
}

type StandingsFormula = (standing: TeamStanding) => number[];

/**
 * Sport-specific ranking formulas (DESIGN.md open question #3, resolved as
 * sport-specific for v1). Each returns a sort key: higher tuples rank
 * better, compared element-by-element. Unknown sports fall back to
 * `defaultFormula`.
 */
const winPercent = (s: TeamStanding) => {
  const games = s.wins + s.losses + s.ties;
  return games === 0 ? 0 : s.wins / games;
};

const pointDifferential = (s: TeamStanding) => s.pointsFor - s.pointsAgainst;

const pointRatio = (s: TeamStanding) => (s.pointsAgainst === 0 ? s.pointsFor : s.pointsFor / s.pointsAgainst);

/** Basketball: rank by win %, tiebreak point differential, then points scored. */
const basketballFormula: StandingsFormula = (s) => [winPercent(s), pointDifferential(s), s.pointsFor];

/** Volleyball: matches are decisive (no ties expected) — rank by win %, tiebreak by point *ratio* (sets/points won per lost), which is how most volleyball leagues break ties rather than raw differential. */
const volleyballFormula: StandingsFormula = (s) => [winPercent(s), pointRatio(s), s.pointsFor];

/** Futsal: soccer-style league points (win=3, tie=1, loss=0), tiebreak goal differential then goals scored. */
const futsalFormula: StandingsFormula = (s) => [
  s.wins * 3 + s.ties * 1,
  pointDifferential(s),
  s.pointsFor,
];

/** Pickleball: games are decisive — win %, tiebreak point differential. */
const pickleballFormula: StandingsFormula = (s) => [winPercent(s), pointDifferential(s), s.pointsFor];

const defaultFormula: StandingsFormula = (s) => [winPercent(s), pointDifferential(s), s.pointsFor];

const FORMULAS_BY_SPORT_SLUG: Record<string, StandingsFormula> = {
  basketball: basketballFormula,
  volleyball: volleyballFormula,
  futsal: futsalFormula,
  pickleball: pickleballFormula,
};

/** Returns a new array, best team first, per the sport's ranking formula. */
export function rankStandings(sportSlug: string, standings: TeamStanding[]): TeamStanding[] {
  const formula = FORMULAS_BY_SPORT_SLUG[sportSlug] ?? defaultFormula;
  return [...standings].sort((a, b) => {
    const keyA = formula(a);
    const keyB = formula(b);
    for (let i = 0; i < keyA.length; i++) {
      if (keyB[i] !== keyA[i]) return keyB[i] - keyA[i];
    }
    return 0;
  });
}
