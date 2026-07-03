import type { TokenLedgerEntry, PointsLedgerEntry } from "./types.js";

/** Balance is always derived from ledger rows — never stored as a mutable counter. */
export function sumLedgerAmounts(entries: Array<{ amount: number }>): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

export function participantTokenBalance(entries: TokenLedgerEntry[]): number {
  return sumLedgerAmounts(entries);
}

export function participantPointsBalance(entries: PointsLedgerEntry[]): number {
  return sumLedgerAmounts(entries);
}

/** Account/family rollup — display-only, never a wallet of its own. */
export function accountTokenRollup(
  entriesByParticipant: Record<string, TokenLedgerEntry[]>,
): { total: number; byParticipant: Record<string, number> } {
  const byParticipant: Record<string, number> = {};
  let total = 0;
  for (const [participantId, entries] of Object.entries(entriesByParticipant)) {
    const balance = participantTokenBalance(entries);
    byParticipant[participantId] = balance;
    total += balance;
  }
  return { total, byParticipant };
}

/** Points earned on token spend at a configured rate. Defaults to 1 point per token redeemed (DESIGN.md open question #22 default). */
export function pointsEarnedForRedemption(
  tokensRedeemed: number,
  ratePointsPerToken = 1,
): number {
  if (tokensRedeemed <= 0) return 0;
  return Math.floor(tokensRedeemed * ratePointsPerToken);
}

/** Settlement payout math: gross tokens redeemed -> net payout cents after rate + split. */
export function computeSettlementPayout(params: {
  tokensRedeemed: number;
  settlementRateCentsPerToken: number;
  splitPct: number; // 0-100, partner's share
  spaceFeesCents?: number;
}): { grossCents: number; netPayoutCents: number } {
  const { tokensRedeemed, settlementRateCentsPerToken, splitPct, spaceFeesCents = 0 } = params;
  const grossCents = Math.round(tokensRedeemed * settlementRateCentsPerToken);
  const partnerShareCents = Math.round(grossCents * (splitPct / 100));
  const netPayoutCents = Math.max(0, partnerShareCents - spaceFeesCents);
  return { grossCents, netPayoutCents };
}
