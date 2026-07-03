"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function createSpaceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "") || undefined;
  const capacityRaw = String(formData.get("capacity") ?? "");
  const capacity = capacityRaw ? Number(capacityRaw) : undefined;
  await apiFetch("/spaces", { method: "POST", body: { name, description, capacity } });
  revalidatePath("/spaces");
}

export async function setSpaceActiveAction(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await apiFetch(`/spaces/${id}`, { method: "PATCH", body: { active: !active } });
  revalidatePath("/spaces");
}
