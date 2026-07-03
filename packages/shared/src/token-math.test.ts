import { describe, expect, it } from "vitest";
import {
  participantTokenBalance,
  accountTokenRollup,
  pointsEarnedForRedemption,
  computeSettlementPayout,
} from "./token-math.js";

describe("participantTokenBalance", () => {
  it("sums signed ledger amounts", () => {
    expect(
      participantTokenBalance([
        { id: "1", amount: 50 } as any,
        { id: "2", amount: -10 } as any,
        { id: "3", amount: 5 } as any,
      ]),
    ).toBe(45);
  });

  it("returns 0 for no entries", () => {
    expect(participantTokenBalance([])).toBe(0);
  });
});

describe("accountTokenRollup", () => {
  it("sums balances across participants without creating a stored wallet", () => {
    const rollup = accountTokenRollup({
      p1: [{ amount: 30 } as any],
      p2: [{ amount: 20 } as any, { amount: -5 } as any],
    });
    expect(rollup.total).toBe(45);
    expect(rollup.byParticipant).toEqual({ p1: 30, p2: 15 });
  });
});

describe("pointsEarnedForRedemption", () => {
  it("earns 1 point per token redeemed by default", () => {
    expect(pointsEarnedForRedemption(10)).toBe(10);
  });

  it("supports a weighted rate", () => {
    expect(pointsEarnedForRedemption(10, 1.5)).toBe(15);
  });

  it("earns nothing for a non-positive redemption", () => {
    expect(pointsEarnedForRedemption(0)).toBe(0);
    expect(pointsEarnedForRedemption(-5)).toBe(0);
  });
});

describe("computeSettlementPayout", () => {
  it("computes gross and net payout after rate, split, and space fees", () => {
    const result = computeSettlementPayout({
      tokensRedeemed: 100,
      settlementRateCentsPerToken: 80, // $0.80/token
      splitPct: 75, // vendor keeps 75%
      spaceFeesCents: 500,
    });
    expect(result.grossCents).toBe(8000);
    expect(result.netPayoutCents).toBe(8000 * 0.75 - 500);
  });

  it("never returns a negative payout", () => {
    const result = computeSettlementPayout({
      tokensRedeemed: 10,
      settlementRateCentsPerToken: 80,
      splitPct: 50,
      spaceFeesCents: 100_000,
    });
    expect(result.netPayoutCents).toBe(0);
  });
});
