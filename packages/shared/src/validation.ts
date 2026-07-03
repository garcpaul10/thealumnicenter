/** Guards shared by API request validation and client-side pre-checks. Never the source of truth for balances — the ledger always is. */

export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function isValidTokenDebit(amount: number): boolean {
  return isPositiveInteger(amount);
}

/** E.164 phone number, e.g. +15025551234 */
export function isE164Phone(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

export function assertSplitSharesEqualTotal(
  shares: Array<{ amountTokens: number }>,
  totalTokens: number,
): void {
  const sum = shares.reduce((acc, s) => acc + s.amountTokens, 0);
  if (sum !== totalTokens) {
    throw new Error(
      `split_shares must sum to total_tokens: got ${sum}, expected ${totalTokens}`,
    );
  }
}
