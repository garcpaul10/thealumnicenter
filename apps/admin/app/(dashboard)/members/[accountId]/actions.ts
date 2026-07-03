"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../../lib/api";

export async function compAction(formData: FormData) {
  const accountId = String(formData.get("accountId"));
  const participantId = String(formData.get("participantId"));
  const amountTokens = Number(formData.get("amountTokens"));
  const note = String(formData.get("note") ?? "");
  await apiFetch(`/participants/${participantId}/comp`, {
    method: "POST",
    body: { accountId, amountTokens, note },
  });
  revalidatePath(`/members/${accountId}`);
}

export async function refundAction(formData: FormData) {
  const accountId = String(formData.get("accountId"));
  const participantId = String(formData.get("participantId"));
  const amountTokens = Number(formData.get("amountTokens"));
  const referenceType = String(formData.get("referenceType") ?? "manual");
  const referenceId = String(formData.get("referenceId") ?? crypto.randomUUID());
  const note = String(formData.get("note") ?? "") || undefined;
  await apiFetch(`/participants/${participantId}/refund`, {
    method: "POST",
    body: { accountId, amountTokens, referenceType, referenceId, note },
  });
  revalidatePath(`/members/${accountId}`);
}
