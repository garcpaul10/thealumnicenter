import { apiFetch } from "../../../lib/api";
import type { Offering, Sport } from "../../../lib/types";
import { createOfferingAction, setOfferingActiveAction } from "./actions";

const OFFERING_TYPES = ["walk_in", "free_play_pass", "league", "camp", "reservation", "lesson", "clinic"];

export default async function OfferingsPage() {
  const [offerings, sports] = await Promise.all([
    apiFetch<Offering[]>("/offerings"),
    apiFetch<Sport[]>("/sports"),
  ]);
  const sportName = (id: string | null) => sports.find((s) => s.id === id)?.name ?? "—";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Offerings</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Sport</th>
              <th className="px-4 py-3">Tokens</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offerings.map((offering) => (
              <tr key={offering.id}>
                <td className="px-4 py-3 font-medium">{offering.name}</td>
                <td className="px-4 py-3 text-slate-500">{offering.type}</td>
                <td className="px-4 py-3 text-slate-500">{sportName(offering.sportId)}</td>
                <td className="px-4 py-3">{offering.tokenPrice}</td>
                <td className="px-4 py-3 text-slate-500">{offering.capacity ?? "Uncapped"}</td>
                <td className="px-4 py-3">
                  <span className={offering.active ? "text-green-700" : "text-slate-400"}>
                    {offering.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={setOfferingActiveAction}>
                    <input type="hidden" name="id" value={offering.id} />
                    <input type="hidden" name="active" value={String(offering.active)} />
                    <button type="submit" className="text-brand hover:underline">
                      {offering.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {offerings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No offerings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add an offering</h2>
        <form action={createOfferingAction} className="space-y-3">
          <select name="type" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {OFFERING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select name="sportId" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">No sport / multi-sport</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="name" placeholder="Name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="description" placeholder="Description (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="tokenPrice" type="number" min={0} placeholder="Token price" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="capacity" type="number" min={0} placeholder="Capacity (optional, blank = uncapped)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="durationMinutes" type="number" min={0} placeholder="Duration in minutes (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Add offering
          </button>
        </form>
      </div>
    </div>
  );
}
