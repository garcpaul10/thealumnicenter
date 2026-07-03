import Link from "next/link";
import { apiFetch, ApiError } from "../../../../lib/api";
import type { LedgerEntry, MemberDetail } from "../../../../lib/types";
import { compAction, refundAction } from "./actions";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ participant?: string }>;
}) {
  const { accountId } = await params;
  const { participant } = await searchParams;

  let detail: MemberDetail;
  try {
    detail = await apiFetch<MemberDetail>(`/members/${accountId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return <p className="text-slate-600">Account not found.</p>;
    }
    throw err;
  }

  const selectedParticipantId = participant ?? detail.participants[0]?.id;
  const ledger = selectedParticipantId
    ? await apiFetch<LedgerEntry[]>(`/participants/${selectedParticipantId}/ledger`)
    : [];

  return (
    <div>
      <p className="mb-1 text-sm">
        <Link href="/members" className="text-brand hover:underline">
          ← Back to search
        </Link>
      </p>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{detail.account.phone}</h1>
      <p className="mb-6 text-slate-500">
        {detail.account.email ?? "No email"} · Family total: {detail.totalTokenBalance} tokens
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {detail.participants.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {p.firstName} {p.lastName} {p.isAccountOwner && <span className="text-xs text-slate-400">(owner)</span>}
                </p>
                <p className="text-sm text-slate-500">{p.balance} tokens</p>
              </div>
              <Link href={`/members/${detail.account.id}?participant=${p.id}`} className="text-sm text-brand hover:underline">
                View ledger
              </Link>
            </div>

            <details className="mb-2">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Comp tokens</summary>
              <form action={compAction} className="mt-2 space-y-2">
                <input type="hidden" name="accountId" value={detail.account.id} />
                <input type="hidden" name="participantId" value={p.id} />
                <input name="amountTokens" type="number" placeholder="Amount (+/-)" required className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
                <input name="note" placeholder="Reason (required)" required className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
                <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                  Apply comp
                </button>
              </form>
            </details>

            <details>
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Refund</summary>
              <form action={refundAction} className="mt-2 space-y-2">
                <input type="hidden" name="accountId" value={detail.account.id} />
                <input type="hidden" name="participantId" value={p.id} />
                <input name="amountTokens" type="number" min={1} placeholder="Amount" required className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
                <input name="referenceType" placeholder="Reference type (e.g. reservation)" defaultValue="manual" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
                <input name="note" placeholder="Note (optional)" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
                <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                  Issue refund
                </button>
              </form>
            </details>
          </div>
        ))}
      </div>

      {selectedParticipantId && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Ledger — {detail.participants.find((p) => p.id === selectedParticipantId)?.firstName}
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className={`px-4 py-3 font-medium ${row.amount >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {row.amount >= 0 ? "+" : ""}
                      {row.amount}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.note ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{row.createdBy}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No ledger activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
