"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function createOfferingAction(formData: FormData) {
  const type = String(formData.get("type"));
  const sportId = String(formData.get("sportId") ?? "") || undefined;
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "") || undefined;
  const tokenPrice = Number(formData.get("tokenPrice"));
  const capacityRaw = String(formData.get("capacity") ?? "");
  const capacity = capacityRaw ? Number(capacityRaw) : undefined;
  const durationRaw = String(formData.get("durationMinutes") ?? "");
  const durationMinutes = durationRaw ? Number(durationRaw) : undefined;

  await apiFetch("/offerings", {
    method: "POST",
    body: { type, sportId, name, description, tokenPrice, capacity, durationMinutes },
  });
  revalidatePath("/offerings");
}

export async function setOfferingActiveAction(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await apiFetch(`/offerings/${id}`, { method: "PATCH", body: { active: !active } });
  revalidatePath("/offerings");
}
