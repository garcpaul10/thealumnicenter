import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql, eq } from "drizzle-orm";
import { createDbClient, sports, offerings, teams, games, gameScores, standings, type Db } from "@alumni/db";
import { recalculateStandings } from "./standings-service.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5432/alumni_center_test`;

let db: Db;

beforeAll(async () => {
  db = createDbClient(TEST_DATABASE_URL);
});

beforeEach(async () => {
  await db.execute(sql`truncate table
    reward_redemptions, reward_items, notifications, points_ledger,
    settlements, vendor_order_items, vendor_orders, menu_items, scans,
    split_shares, split_requests, reservations, passes, standings,
    game_scores, games, team_members, teams, enrollments, token_ledger,
    offerings, schedule_blocks, sports, spaces, token_packages, partners,
    kiosk_devices, staff_users, card_cosmetics, participants, accounts
    restart identity cascade`);
});

afterAll(async () => {
  await (db as any).$client?.end?.();
});

async function setupLeague(sportSlug: string) {
  const [sport] = await db.insert(sports).values({ name: sportSlug, slug: sportSlug }).returning();
  const [offering] = await db
    .insert(offerings)
    .values({ type: "league", sportId: sport.id, name: "Test League", tokenPrice: 10 })
    .returning();
  const [teamA] = await db.insert(teams).values({ offeringId: offering.id, name: "Team A" }).returning();
  const [teamB] = await db.insert(teams).values({ offeringId: offering.id, name: "Team B" }).returning();
  return { offering, teamA, teamB };
}

describe("recalculateStandings", () => {
  it("computes standings from finalized game scores only", async () => {
    const { offering, teamA, teamB } = await setupLeague("basketball");
    const [game1] = await db
      .insert(games)
      .values({ offeringId: offering.id, homeTeamId: teamA.id, awayTeamId: teamB.id, scheduledAt: new Date() })
      .returning();
    const [game2] = await db
      .insert(games)
      .values({ offeringId: offering.id, homeTeamId: teamB.id, awayTeamId: teamA.id, scheduledAt: new Date() })
      .returning();

    // game1 finalized: A beats B 50-40
    await db.insert(gameScores).values({ gameId: game1.id, homeScore: 50, awayScore: 40, enteredBy: "staff_user", final: true });
    // game2 NOT finalized: should be ignored
    await db.insert(gameScores).values({ gameId: game2.id, homeScore: 30, awayScore: 60, enteredBy: "staff_user", final: false });

    await recalculateStandings(db, offering.id);

    const rows = await db.select().from(standings).where(eq(standings.offeringId, offering.id));
    const a = rows.find((r) => r.teamId === teamA.id)!;
    const b = rows.find((r) => r.teamId === teamB.id)!;

    expect(a).toMatchObject({ wins: 1, losses: 0, pointsFor: 50, pointsAgainst: 40 });
    expect(b).toMatchObject({ wins: 0, losses: 1, pointsFor: 40, pointsAgainst: 50 });
  });

  it("is idempotent and re-derivable — never hand-edited, always recomputed from games", async () => {
    const { offering, teamA, teamB } = await setupLeague("futsal");
    const [game] = await db
      .insert(games)
      .values({ offeringId: offering.id, homeTeamId: teamA.id, awayTeamId: teamB.id, scheduledAt: new Date() })
      .returning();
    await db.insert(gameScores).values({ gameId: game.id, homeScore: 3, awayScore: 1, enteredBy: "staff_user", final: true });

    await recalculateStandings(db, offering.id);
    await recalculateStandings(db, offering.id); // run twice — should not double-count

    const rows = await db.select().from(standings).where(eq(standings.offeringId, offering.id));
    expect(rows).toHaveLength(2); // one row per team, not duplicated
    const a = rows.find((r) => r.teamId === teamA.id)!;
    expect(a.wins).toBe(1);
  });
});
