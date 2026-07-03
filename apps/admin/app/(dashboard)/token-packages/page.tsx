import { apiFetch } from "../../../lib/api";
import type { TokenPackage } from "../../../lib/types";
import { createTokenPackageAction, setTokenPackageActiveAction } from "./actions";

export default async function TokenPackagesPage() {
  const packages = await apiFetch<TokenPackage[]>("/token-packages");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Token Packages</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Tokens</th>
              <th className="px-4 py-3">Bonus</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="px-4 py-3 font-medium">{pkg.name}</td>
                <td className="px-4 py-3">${(pkg.priceCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">{pkg.tokensGranted}</td>
                <td className="px-4 py-3 text-slate-500">{pkg.bonusTokens > 0 ? `+${pkg.bonusTokens}` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={pkg.active ? "text-green-700" : "text-slate-400"}>
                    {pkg.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={setTokenPackageActiveAction}>
                    <input type="hidden" name="id" value={pkg.id} />
                    <input type="hidden" name="active" value={String(pkg.active)} />
                    <button type="submit" className="text-brand hover:underline">
                      {pkg.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No token packages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add a package</h2>
        <form action={createTokenPackageAction} className="space-y-3">
          <input name="name" placeholder="Name (e.g. Varsity Pack)" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="priceDollars" type="number" min={0} step="0.01" placeholder="Price in dollars" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="tokensGranted" type="number" min={1} placeholder="Tokens granted" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="bonusTokens" type="number" min={0} placeholder="Bonus tokens (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Add package
          </button>
        </form>
      </div>
    </div>
  );
}
