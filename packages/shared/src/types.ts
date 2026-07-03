// Domain types shared across apps/api and all frontend apps.
// Mirrors packages/db/src/schema.ts — kept hand-in-sync (no codegen yet).

export type LedgerEntryType =
  | "purchase"
  | "redemption"
  | "refund"
  | "bonus"
  | "adjustment"
  | "expiry"
  | "transfer";

export type LedgerCreatedBy = "member" | "staff" | "system";

export type BeneficiaryRef =
  | { kind: "house" }
  | { kind: "vendor"; partnerId: string }
  | { kind: "coach"; partnerId: string };

export interface TokenLedgerEntry {
  id: string;
  accountId: string;
  participantId: string;
  amount: number; // signed integer: + credit, - debit
  type: LedgerEntryType;
  beneficiaryPartnerId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  stripePaymentIntentId: string | null;
  note: string | null;
  createdAt: string;
  createdBy: LedgerCreatedBy;
}

export type PointsLedgerType = "earn" | "redeem" | "adjustment" | "expiry";

export interface PointsLedgerEntry {
  id: string;
  participantId: string;
  amount: number;
  type: PointsLedgerType;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}
