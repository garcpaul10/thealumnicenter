"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function createTokenPackageAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const priceCents = Math.round(Number(formData.get("priceDollars")) * 100);
  const tokensGranted = Number(formData.get("tokensGranted"));
  const bonusTokens = Number(formData.get("bonusTokens") ?? 0);
  await apiFetch("/token-packages", { method: "POST", body: { name, priceCents, tokensGranted, bonusTokens } });
  revalidatePath("/token-packages");
}

export async function setTokenPackageActiveAction(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await apiFetch(`/token-packages/${id}`, { method: "PATCH", body: { active: !active } });
  revalidatePath("/token-packages");
}
