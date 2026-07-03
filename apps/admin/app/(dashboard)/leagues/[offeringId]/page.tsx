import { apiFetch } from "../../../../lib/api";
import type { Game, Offering, StandingRow, Team } from "../../../../lib/types";
import { addTeamMemberAction, createGameAction, createTeamAction, enterScoreAction } from "./actions";

export default async function LeagueDetailPage({ params }: { params: Promise<{ offeringId: string }> }) {
  const { offeringId } = await params;
  const [offering, teams, games, standings] = await Promise.all([
    apiFetch<Offering>(`/offerings/${offeringId}`).catch(() => null),
    apiFetch<Team[]>(`/teams?offeringId=${offeringId}`),
    apiFetch<Game[]>(`/games?offeringId=${offeringId}`),
    apiFetch<StandingRow[]>(`/offerings/${offeringId}/standings`),
  ]);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{offering?.name ?? "League"}</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Standings</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">W</th>
                <th className="px-4 py-3">L</th>
                <th className="px-4 py-3">T</th>
                <th className="px-4 py-3">PF</th>
                <th className="px-4 py-3">PA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {standings.map((row) => (
                <tr key={row.teamId}>
                  <td className="px-4 py-3 font-medium">{teamName(row.teamId)}</td>
                  <td className="px-4 py-3">{row.wins}</td>
                  <td className="px-4 py-3">{row.losses}</td>
                  <td className="px-4 py-3">{row.ties}</td>
                  <td className="px-4 py-3">{row.pointsFor}</td>
                  <td className="px-4 py-3">{row.pointsAgainst}</td>
                </tr>
              ))}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No finalized games yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Standings are always recomputed from finalized game scores — never hand-edited.
        </p>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Teams</h2>
          <div className="mb-4 space-y-3">
            {teams.map((team) => (
              <div key={team.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 font-medium">{team.name}</p>
                <form action={addTeamMemberAction} className="flex gap-2">
                  <input type="hidden" name="offeringId" value={offeringId} />
                  <input type="hidden" name="teamId" value={team.id} />
                  <input
                    name="participantId"
                    placeholder="Participant ID (from Member Lookup)"
                    required
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                  />
                  <select name="role" className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                    <option value="player">Player</option>
                    <option value="captain">Captain</option>
                  </select>
                  <button type="submit" className="rounded-md bg-brand px-2 py-1 text-xs text-white hover:bg-brand-dark">
                    Add
                  </button>
                </form>
              </div>
            ))}
            {teams.length === 0 && <p className="text-sm text-slate-400">No teams yet.</p>}
          </div>
          <form action={createTeamAction} className="flex gap-2">
            <input type="hidden" name="offeringId" value={offeringId} />
            <input name="name" placeholder="New team name" required className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Add team
            </button>
          </form>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Schedule a game</h2>
          <form action={createGameAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <input type="hidden" name="offeringId" value={offeringId} />
            <select name="homeTeamId" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Home team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select name="awayTeamId" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Away team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input name="scheduledAt" type="datetime-local" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Schedule game
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Games</h2>
        <div className="space-y-3">
          {games.map((game) => (
            <div key={game.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-2 text-sm font-medium">
                {teamName(game.homeTeamId)} vs {teamName(game.awayTeamId)} —{" "}
                <span className="text-slate-500">{new Date(game.scheduledAt).toLocaleString()}</span> —{" "}
                <span className="text-slate-500">{game.status}</span>
              </p>
              {game.status !== "final" && (
                <form action={enterScoreAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="offeringId" value={offeringId} />
                  <input type="hidden" name="gameId" value={game.id} />
                  <input name="homeScore" type="number" min={0} placeholder="Home score" required className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  <input name="awayScore" type="number" min={0} placeholder="Away score" required className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm" />
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" name="final" defaultChecked /> Final (recalculates standings)
                  </label>
                  <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                    Save score
                  </button>
                </form>
              )}
            </div>
          ))}
          {games.length === 0 && <p className="text-sm text-slate-400">No games scheduled yet.</p>}
        </div>
      </section>
    </div>
  );
}
