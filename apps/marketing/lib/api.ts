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

/** All calls here hit the fully unauthenticated /public/* namespace (apps/api/src/routes/public.ts) — no secrets, no participant identity, safe to call directly from client-side JS. */
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
