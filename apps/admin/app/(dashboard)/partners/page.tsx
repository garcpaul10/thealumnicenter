import { apiFetch } from "../../../lib/api";
import type { Partner } from "../../../lib/types";
import { createPartnerAction } from "./actions";

export default async function PartnersPage() {
  const partners = await apiFetch<Partner[]>("/partners");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Vendors & Coaches</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Split %</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {partners.map((partner) => (
              <tr key={partner.id}>
                <td className="px-4 py-3 font-medium">{partner.displayName}</td>
                <td className="px-4 py-3 text-slate-500">{partner.type}</td>
                <td className="px-4 py-3 text-slate-500">{partner.contactPhone ?? "—"}</td>
                <td className="px-4 py-3">{partner.splitPct}%</td>
                <td className="px-4 py-3">
                  <span className={partner.status === "active" ? "text-green-700" : "text-slate-400"}>
                    {partner.status}
                  </span>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No vendors or coaches yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add a vendor or coach</h2>
        <p className="mb-3 text-xs text-slate-500">
          Stripe Connect onboarding isn&apos;t wired up yet (Phase 6) — this creates the partner record only.
        </p>
        <form action={createPartnerAction} className="space-y-3">
          <select name="type" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="vendor">Vendor</option>
            <option value="coach">Coach</option>
          </select>
          <input name="displayName" placeholder="Display name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="contactPhone" placeholder="Contact phone (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="splitPct" type="number" min={0} max={100} step="0.1" placeholder="Split % (partner's share)" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="settlementRateCents" type="number" min={0} placeholder="Settlement rate, cents/token (optional, falls back to global default)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Add partner
          </button>
        </form>
      </div>
    </div>
  );
}
