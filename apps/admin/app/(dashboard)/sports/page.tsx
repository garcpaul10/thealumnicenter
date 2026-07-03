import { apiFetch } from "../../../lib/api";
import type { Sport } from "../../../lib/types";
import { createSportAction, setSportActiveAction } from "./actions";

export default async function SportsPage() {
  const sports = await apiFetch<Sport[]>("/sports");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Sports</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sports.map((sport) => (
              <tr key={sport.id}>
                <td className="px-4 py-3 font-medium">{sport.name}</td>
                <td className="px-4 py-3 text-slate-500">{sport.slug}</td>
                <td className="px-4 py-3">
                  <span className={sport.active ? "text-green-700" : "text-slate-400"}>
                    {sport.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={setSportActiveAction}>
                    <input type="hidden" name="id" value={sport.id} />
                    <input type="hidden" name="active" value={String(sport.active)} />
                    <button type="submit" className="text-brand hover:underline">
                      {sport.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {sports.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No sports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add a sport</h2>
        <form action={createSportAction} className="space-y-3">
          <input
            name="name"
            placeholder="Name (e.g. Pickleball)"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="slug"
            placeholder="Slug (e.g. pickleball)"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="icon"
            placeholder="Icon (optional)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Add sport
          </button>
        </form>
      </div>
    </div>
  );
}
