import { apiFetch } from "../../../lib/api";
import type { MeResponse, RewardItem } from "../../../lib/types";
import { redeemRewardAction } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  merch: "Merch",
  token_grant: "Tokens",
  free_play_pass: "Free Play Pass",
  discount: "Discount",
  experience: "Experience",
  card_cosmetic: "Card Cosmetic",
};

export default async function RewardsPage() {
  const [me, rewardItems] = await Promise.all([
    apiFetch<MeResponse>("/me"),
    apiFetch<RewardItem[]>("/reward-items"),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Rewards</h1>
      <p className="mb-6 text-sm text-slate-500">
        Points are earned every time you spend tokens — {me.participants.map((p) => `${p.firstName}: ${p.pointsBalance}`).join(" · ")}
      </p>

      <div className="space-y-3">
        {rewardItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs uppercase text-slate-400">{TYPE_LABELS[item.rewardType]}</p>
              </div>
              <p className="font-semibold text-brand">{item.pointsCost} pts</p>
            </div>
            {item.description && <p className="mb-3 text-sm text-slate-500">{item.description}</p>}
            {item.inventoryCount !== null && (
              <p className="mb-2 text-xs text-slate-400">{item.inventoryCount} left</p>
            )}
            <form action={redeemRewardAction} className="flex items-center gap-2">
              <input type="hidden" name="rewardItemId" value={item.id} />
              <select name="participantId" className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {me.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} ({p.pointsBalance} pts)
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                Redeem
              </button>
            </form>
          </div>
        ))}
        {rewardItems.length === 0 && <p className="text-sm text-slate-400">No rewards available yet.</p>}
      </div>
    </div>
  );
}
