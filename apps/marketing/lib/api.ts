function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.");
  return url;
}

export interface OpenNowBlock {
  id: string;
  mode: string;
  startsAt: string;
  endsAt: string;
  spaceName: string;
  sportName: string | null;
}

export interface PublicStats {
  activeMembers: number;
  tokensInPlay: number;
  leaguesRunning: number;
}

export interface PublicSport {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface PublicOffering {
  id: string;
  type: string;
  name: string;
  description: string | null;
  tokenPrice: number;
  durationMinutes: number | null;
  capacity: number | null;
  sportName: string | null;
  sportSlug: string | null;
}

export interface PublicLeague {
  id: string;
  name: string;
  description: string | null;
  tokenPrice: number;
  sportName: string | null;
  sportSlug: string | null;
}

export interface PublicStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface PublicTokenPackage {
  id: string;
  name: string;
  priceCents: number;
  tokensGranted: number;
  bonusTokens: number;
}

/**
 * All calls here hit the fully unauthenticated /public/* namespace
 * (apps/api/src/routes/public.ts) — no secrets, no participant identity.
 * Catalog-ish reads (sports/offerings/leagues/token-packages) use a short
 * revalidate window since this content changes rarely; live/real-time
 * reads (open-now, stats) stay no-store.
 */
export async function fetchOpenNow(): Promise<OpenNowBlock[]> {
  const res = await fetch(`${apiUrl()}/public/open-now`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchStats(): Promise<PublicStats | null> {
  const res = await fetch(`${apiUrl()}/public/stats`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSports(): Promise<PublicSport[]> {
  const res = await fetch(`${apiUrl()}/public/sports`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchOfferings(params: { sportSlug?: string; type?: string } = {}): Promise<PublicOffering[]> {
  const query = new URLSearchParams();
  if (params.sportSlug) query.set("sportSlug", params.sportSlug);
  if (params.type) query.set("type", params.type);
  const res = await fetch(`${apiUrl()}/public/offerings?${query.toString()}`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchLeagues(): Promise<PublicLeague[]> {
  const res = await fetch(`${apiUrl()}/public/leagues`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchLeagueStandings(offeringId: string): Promise<PublicStanding[]> {
  const res = await fetch(`${apiUrl()}/public/leagues/${offeringId}/standings`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTokenPackages(): Promise<PublicTokenPackage[]> {
  const res = await fetch(`${apiUrl()}/public/token-packages`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}
