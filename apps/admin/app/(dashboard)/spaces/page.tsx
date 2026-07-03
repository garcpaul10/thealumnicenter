import { apiFetch } from "../../../lib/api";
import type { Space } from "../../../lib/types";
import { createSpaceAction, setSpaceActiveAction } from "./actions";

export default async function SpacesPage() {
  const spaces = await apiFetch<Space[]>("/spaces");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Spaces</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {spaces.map((space) => (
              <tr key={space.id}>
                <td className="px-4 py-3 font-medium">{space.name}</td>
                <td className="px-4 py-3 text-slate-500">{space.description ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{space.capacity ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={space.active ? "text-green-700" : "text-slate-400"}>
                    {space.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={setSpaceActiveAction}>
                    <input type="hidden" name="id" value={space.id} />
                    <input type="hidden" name="active" value={String(space.active)} />
                    <button type="submit" className="text-brand hover:underline">
                      {space.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {spaces.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No spaces yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add a space</h2>
        <form action={createSpaceAction} className="space-y-3">
          <input name="name" placeholder="Name (e.g. Court 2)" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="description" placeholder="Description (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="capacity" type="number" min={0} placeholder="Capacity (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Add space
          </button>
        </form>
      </div>
    </div>
  );
}
