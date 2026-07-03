import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import type { Account } from "../../../lib/types";

export default async function MembersSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim();
  const results = q ? await apiFetch<Account[]>(`/members/search?q=${encodeURIComponent(q)}`) : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Member Lookup</h1>

      <form className="mb-6 flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by phone or name"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          Search
        </button>
      </form>

      {q && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3 font-medium">{account.phone}</td>
                  <td className="px-4 py-3 text-slate-500">{account.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{account.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/members/${account.id}`} className="text-brand hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No accounts found for &ldquo;{q}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
