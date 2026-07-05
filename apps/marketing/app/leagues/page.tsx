import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { fetchLeagues } from "@/lib/api";

export const metadata = { title: "Leagues — The Alumni Center" };

export default async function LeaguesPage() {
  const leagues = await fetchLeagues();

  return (
    <main>
      <SiteHeader />
      <section className="px-6 py-20 text-center sm:px-10">
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">REAL SEASONS, REAL STANDINGS</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Leagues</h1>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-24 sm:px-10">
        {leagues.length === 0 ? (
          <p className="text-center text-neutral-400">No leagues are running right now — check back soon.</p>
        ) : (
          <div className="space-y-3">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="flex items-center justify-between rounded-xl border border-neutral-200 px-6 py-5 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <p className="text-[15px] font-semibold">{league.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">{league.sportName ?? "General"}</p>
                </div>
                <span className="text-sm text-neutral-400">Standings →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
