"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function createStaffUserAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "staff");
  await apiFetch("/staff-users", { method: "POST", body: { name, phone, password, role } });
  revalidatePath("/staff");
}
