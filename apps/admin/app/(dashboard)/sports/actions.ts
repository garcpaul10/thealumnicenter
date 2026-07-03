"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function createSportAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const icon = String(formData.get("icon") ?? "") || undefined;
  await apiFetch("/sports", { method: "POST", body: { name, slug, icon } });
  revalidatePath("/sports");
}

export async function setSportActiveAction(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await apiFetch(`/sports/${id}`, { method: "PATCH", body: { active: !active } });
  revalidatePath("/sports");
}
