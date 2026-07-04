import { apiFetch } from "../../../lib/api";
import type { CardCosmetic, MeResponse } from "../../../lib/types";
import { AlumniCard } from "./AlumniCard";
import { updateCardConfigAction } from "./actions";

export default async function CardPage({ searchParams }: { searchParams: Promise<{ participant?: string }> }) {
  const { participant: selectedId } = await searchParams;
  const me = await apiFetch<MeResponse>("/me");
  const participant = me.participants.find((p) => p.id === selectedId) ?? me.participants[0];

  if (!participant) {
    return <p className="text-slate-600">No participants on this account yet.</p>;
  }

  const cosmetics = await apiFetch<CardCosmetic[]>(`/participants/${participant.id}/unlocked-cosmetics`);
  const backgrounds = cosmetics.filter((c) => c.type === "background");
  const badges = cosmetics.filter((c) => c.type === "badge");

  return (
    <div>
      {me.participants.length > 1 && (
        <div className="mb-4 flex gap-2">
          {me.participants.map((p) => (
            <a
              key={p.id}
              href={`/card?participant=${p.id}`}
              className={`rounded-md px-3 py-1.5 text-sm ${p.id === participant.id ? "bg-brand text-white" : "bg-white text-slate-600"}`}
            >
              {p.firstName}
            </a>
          ))}
        </div>
      )}

      <AlumniCard participant={participant} cosmetics={cosmetics} />

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Customize</h2>
        <form action={updateCardConfigAction} className="space-y-3">
          <input type="hidden" name="participantId" value={participant.id} />
          <label className="block text-xs text-slate-500">
            Background
            <select
              name="backgroundId"
              defaultValue={(participant.alumniCardConfig?.backgroundId as string) ?? "default"}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="default">Alumni Blue (default)</option>
              {backgrounds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-500">
            Badge
            <select name="badgeId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">None</option>
              {badges.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-400">
            Unlock more backgrounds and badges in the Rewards store using your points.
          </p>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
