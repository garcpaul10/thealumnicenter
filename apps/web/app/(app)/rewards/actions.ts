"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function redeemRewardAction(formData: FormData): Promise<void> {
  const rewardItemId = String(formData.get("rewardItemId"));
  const participantId = String(formData.get("participantId"));

  await apiFetch(`/reward-items/${rewardItemId}/redeem`, { method: "POST", body: { participantId } });
  revalidatePath("/rewards");
  revalidatePath("/card");
}
