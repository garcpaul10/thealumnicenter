import { apiFetch } from "../../../lib/api";
import type { MeResponse, TokenPackage } from "../../../lib/types";
import { startCheckoutAction } from "./actions";

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ purchase?: string }> }) {
  const { purchase } = await searchParams;
  const [me, packages] = await Promise.all([
    apiFetch<MeResponse>("/me"),
    apiFetch<TokenPackage[]>("/token-packages"),
  ]);

  return (
    <div>
      {purchase === "success" && (
        <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Purchase complete! Your balance updates once Stripe confirms the payment (usually instant).
        </p>
      )}
      {purchase === "cancelled" && (
        <p className="mb-4 rounded-md bg-slate-100 p-3 text-sm text-slate-600">Checkout cancelled.</p>
      )}

      <h1 className="mb-1 text-2xl font-bold">Wallet</h1>
      <p className="mb-6 text-3xl font-bold text-brand">{me.totalTokenBalance} tokens</p>

      <div className="mb-8 space-y-3">
        {me.participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <p className="font-medium">
                {p.firstName} {p.lastName} {p.isAccountOwner && <span className="text-xs text-slate-400">(you)</span>}
              </p>
              <p className="text-sm text-slate-500">{p.pointsBalance} points</p>
            </div>
            <p className="text-lg font-semibold">{p.tokenBalance}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Buy tokens</h2>
      <div className="space-y-3">
        {packages.map((pkg) => (
          <form key={pkg.id} action={startCheckoutAction} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <p className="font-medium">{pkg.name}</p>
              <p className="text-sm text-slate-500">
                {pkg.tokensGranted} tokens{pkg.bonusTokens > 0 && ` + ${pkg.bonusTokens} bonus`} — $
                {(pkg.priceCents / 100).toFixed(2)}
              </p>
            </div>
            <input type="hidden" name="tokenPackageId" value={pkg.id} />
            <select name="participantId" className="mr-2 rounded-md border border-slate-300 px-2 py-1 text-sm">
              {me.participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Buy
            </button>
          </form>
        ))}
        {packages.length === 0 && <p className="text-sm text-slate-400">No token packages available yet.</p>}
      </div>
    </div>
  );
}
