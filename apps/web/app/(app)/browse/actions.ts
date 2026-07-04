"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function purchaseOfferingAction(formData: FormData): Promise<void> {
  const offeringId = String(formData.get("offeringId"));
  const participantId = String(formData.get("participantId"));

  await apiFetch(`/offerings/${offeringId}/purchase`, { method: "POST", body: { participantId } });
  revalidatePath("/browse");
  revalidatePath("/wallet");
}
