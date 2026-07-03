"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function createPartnerAction(formData: FormData) {
  const type = String(formData.get("type"));
  const displayName = String(formData.get("displayName") ?? "");
  const contactPhone = String(formData.get("contactPhone") ?? "") || undefined;
  const splitPct = Number(formData.get("splitPct"));
  const rateRaw = String(formData.get("settlementRateCents") ?? "");
  const settlementRateCentsPerToken = rateRaw ? Number(rateRaw) : undefined;

  await apiFetch("/partners", {
    method: "POST",
    body: { type, displayName, contactPhone, splitPct, settlementRateCentsPerToken },
  });
  revalidatePath("/partners");
}
