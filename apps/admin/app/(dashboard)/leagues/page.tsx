import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import type { Offering } from "../../../lib/types";

export default async function LeaguesPage() {
  const offerings = await apiFetch<Offering[]>("/offerings?type=league");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Leagues</h1>
      <p className="mb-6 text-slate-600">
        Create the league itself under{" "}
        <Link href="/offerings" className="text-brand hover:underline">
          Offerings
        </Link>{" "}
        (type = league), then manage its teams, games, and standings here.
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Token price</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offerings.map((offering) => (
              <tr key={offering.id}>
                <td className="px-4 py-3 font-medium">{offering.name}</td>
                <td className="px-4 py-3">{offering.tokenPrice}</td>
                <td className="px-4 py-3 text-slate-500">{offering.capacity ?? "Uncapped"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/leagues/${offering.id}`} className="text-brand hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {offerings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No leagues yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
