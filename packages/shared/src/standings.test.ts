import { describe, expect, it } from "vitest";
import { aggregateStandings, rankStandings, type GameResult } from "./standings.js";

describe("aggregateStandings", () => {
  it("tallies wins/losses/ties and points for/against per team", () => {
    const results: GameResult[] = [
      { teamId: "a", opponentTeamId: "b", pointsFor: 20, pointsAgainst: 10 }, // a wins
      { teamId: "b", opponentTeamId: "a", pointsFor: 10, pointsAgainst: 20 }, // b loses
      { teamId: "a", opponentTeamId: "b", pointsFor: 15, pointsAgainst: 15 }, // a ties
      { teamId: "b", opponentTeamId: "a", pointsFor: 15, pointsAgainst: 15 }, // b ties
    ];
    const standings = aggregateStandings(["a", "b"], results);
    const a = standings.find((s) => s.teamId === "a")!;
    const b = standings.find((s) => s.teamId === "b")!;

    expect(a).toMatchObject({ wins: 1, losses: 0, ties: 1, pointsFor: 35, pointsAgainst: 25 });
    expect(b).toMatchObject({ wins: 0, losses: 1, ties: 1, pointsFor: 25, pointsAgainst: 35 });
  });

  it("includes teams with zero games played", () => {
    const standings = aggregateStandings(["a", "b", "c"], []);
    expect(standings).toHaveLength(3);
    expect(standings.every((s) => s.wins === 0 && s.losses === 0)).toBe(true);
  });

  it("ignores results for teams outside the given team list", () => {
    const standings = aggregateStandings(["a"], [
      { teamId: "a", opponentTeamId: "z", pointsFor: 10, pointsAgainst: 5 },
      { teamId: "z", opponentTeamId: "a", pointsFor: 5, pointsAgainst: 10 },
    ]);
    expect(standings).toHaveLength(1);
    expect(standings[0].wins).toBe(1);
  });
});

describe("rankStandings", () => {
  it("basketball: ranks by win % then point differential", () => {
    const ranked = rankStandings("basketball", [
      { teamId: "low-diff", wins: 5, losses: 5, ties: 0, pointsFor: 100, pointsAgainst: 100 },
      { teamId: "high-diff", wins: 5, losses: 5, ties: 0, pointsFor: 150, pointsAgainst: 100 },
      { teamId: "best-record", wins: 8, losses: 2, ties: 0, pointsFor: 100, pointsAgainst: 100 },
    ]);
    expect(ranked.map((s) => s.teamId)).toEqual(["best-record", "high-diff", "low-diff"]);
  });

  it("volleyball: tiebreaks by point ratio, not raw differential", () => {
    // Same win/loss record and same differential (+20), but different ratios.
    const ranked = rankStandings("volleyball", [
      { teamId: "low-ratio", wins: 5, losses: 2, ties: 0, pointsFor: 220, pointsAgainst: 200 },
      { teamId: "high-ratio", wins: 5, losses: 2, ties: 0, pointsFor: 40, pointsAgainst: 20 },
    ]);
    expect(ranked[0].teamId).toBe("high-ratio");
  });

  it("futsal: ranks by league points (win=3, tie=1), not just win count", () => {
    const ranked = rankStandings("futsal", [
      { teamId: "many-ties", wins: 3, losses: 0, ties: 4, pointsFor: 10, pointsAgainst: 5 }, // 3*3+4=13
      { teamId: "more-wins", wins: 4, losses: 3, ties: 0, pointsFor: 10, pointsAgainst: 5 }, // 4*3+0=12
    ]);
    expect(ranked[0].teamId).toBe("many-ties");
  });

  it("falls back to the default win%/differential formula for an unknown sport", () => {
    const ranked = rankStandings("dodgeball", [
      { teamId: "worse", wins: 1, losses: 4, ties: 0, pointsFor: 10, pointsAgainst: 20 },
      { teamId: "better", wins: 4, losses: 1, ties: 0, pointsFor: 20, pointsAgainst: 10 },
    ]);
    expect(ranked[0].teamId).toBe("better");
  });
});
