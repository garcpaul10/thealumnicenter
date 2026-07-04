export interface Participant {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  isAccountOwner: boolean;
  photoUrl: string | null;
  alumniCardConfig: Record<string, unknown>;
  tokenBalance: number;
  pointsBalance: number;
}

export interface MeResponse {
  account: { id: string; phone: string; email: string | null };
  participants: Participant[];
  totalTokenBalance: number;
}

export interface TokenPackage {
  id: string;
  name: string;
  priceCents: number;
  tokensGranted: number;
  bonusTokens: number;
  active: boolean;
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
  durationMinutes: number | null;
  active: boolean;
}

export interface CardCosmetic {
  id: string;
  type: "background" | "badge" | "effect";
  name: string;
  assetRef: string;
  unlockMethod: "default" | "reward_item" | "achievement";
}

export interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  rewardType: "merch" | "token_grant" | "free_play_pass" | "discount" | "experience" | "card_cosmetic";
  tokenGrantAmount: number | null;
  inventoryCount: number | null;
  active: boolean;
}

export interface ScheduleBlock {
  id: string;
  spaceId: string;
  sportId: string | null;
  mode: string;
  startsAt: string;
  endsAt: string;
}
