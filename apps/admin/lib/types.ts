export interface StaffUser {
  id: string;
  name: string;
  role: "admin" | "staff";
}

export interface Sport {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  active: boolean;
}

export interface Space {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  active: boolean;
}

export type ScheduleMode = "open_play" | "reservable" | "league" | "camp" | "closed";

export interface ScheduleBlock {
  id: string;
  spaceId: string;
  sportId: string | null;
  mode: ScheduleMode;
  offeringId: string | null;
  startsAt: string;
  endsAt: string;
  recurrenceRule: string | null;
  walkInTokenPrice: number | null;
}

export type OfferingType = "walk_in" | "free_play_pass" | "league" | "camp" | "reservation" | "lesson" | "clinic";

export interface Offering {
  id: string;
  type: OfferingType;
  sportId: string | null;
  name: string;
  description: string | null;
  tokenPrice: number;
  capacity: number | null;
  coachPartnerId: string | null;
  durationMinutes: number | null;
  active: boolean;
}

export interface TokenPackage {
  id: string;
  name: string;
  priceCents: number;
  tokensGranted: number;
  bonusTokens: number;
  active: boolean;
  sortOrder: number;
}

export interface Partner {
  id: string;
  type: "vendor" | "coach";
  displayName: string;
  contactPhone: string | null;
  splitPct: string;
  settlementRateCentsPerToken: number | null;
  status: "active" | "inactive";
}

export interface Team {
  id: string;
  offeringId: string;
  name: string;
  captainParticipantId: string | null;
}

export interface Game {
  id: string;
  offeringId: string;
  scheduleBlockId: string | null;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "final" | "postponed" | "cancelled";
}

export interface StandingRow {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface Account {
  id: string;
  phone: string;
  email: string | null;
  status: "active" | "suspended";
}

export interface Participant {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  isAccountOwner: boolean;
  balance: number;
}

export interface MemberDetail {
  account: Account;
  participants: Participant[];
  totalTokenBalance: number;
}

export interface LedgerEntry {
  id: string;
  participantId: string;
  amount: number;
  type: string;
  beneficiaryPartnerId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
  createdBy: string;
}

export interface Enrollment {
  id: string;
  offeringId: string;
  participantId: string;
  accountId: string;
  status: "enrolled" | "waitlisted" | "withdrawn" | "completed";
  ledgerTxnId: string | null;
}
