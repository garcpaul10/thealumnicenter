import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { fetchLeagues, fetchLeagueStandings } from "@/lib/api";

export default async function LeagueStandingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [leagues, standings] = await Promise.all([fetchLeagues(), fetchLeagueStandings(id)]);
  const league = leagues.find((l) => l.id === id);
  if (!league) notFound();

  return (
    <main>
      <SiteHeader />
      <section className="px-6 py-20 text-center sm:px-10">
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">{(league.sportName ?? "LEAGUE").toUpperCase()}</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">{league.name}</h1>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-24 sm:px-10">
        {standings.length === 0 ? (
          <p className="text-center text-neutral-400">No games have been played yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="py-3 font-medium">Team</th>
                <th className="py-3 text-center font-medium">W</th>
                <th className="py-3 text-center font-medium">L</th>
                <th className="py-3 text-center font-medium">T</th>
                <th className="py-3 text-right font-medium">Diff</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <tr key={row.teamId} className="border-b border-neutral-100">
                  <td className="py-3 font-medium">
                    <span className="mr-2 text-neutral-400">{i + 1}</span>
                    {row.teamName}
                  </td>
                  <td className="py-3 text-center">{row.wins}</td>
                  <td className="py-3 text-center">{row.losses}</td>
                  <td className="py-3 text-center">{row.ties}</td>
                  <td className="py-3 text-right">{row.pointsFor - row.pointsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
