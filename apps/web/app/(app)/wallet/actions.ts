"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "../../../lib/api";

export async function startCheckoutAction(formData: FormData) {
  const tokenPackageId = String(formData.get("tokenPackageId"));
  const participantId = String(formData.get("participantId"));

  const { checkoutUrl } = await apiFetch<{ checkoutUrl: string }>(`/token-packages/${tokenPackageId}/checkout`, {
    method: "POST",
    body: { participantId },
  });

  redirect(checkoutUrl);
}
