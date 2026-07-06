"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionToken, clearSessionToken } from "../../../lib/session";

function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.");
  return url;
}

/**
 * File uploads can't go through lib/api.ts's apiFetch — that helper always
 * JSON.stringifies the body, which would corrupt binary image data. This
 * forwards the raw FormData (with its file) to apps/api, same bearer-token
 * pattern as every other admin Server Action.
 */
export async function uploadSiteImageAction(formData: FormData) {
  const slotKey = String(formData.get("slotKey") ?? "");
  const file = formData.get("file");
  if (!slotKey || !(file instanceof File) || file.size === 0) {
    throw new Error("A slot key and an image file are required");
  }

  const token = await getSessionToken();
  if (!token) redirect("/login");

  const forward = new FormData();
  forward.set("file", file, file.name);

  const response = await fetch(`${apiUrl()}/site-images/${slotKey}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: forward,
  });

  if (response.status === 401) {
    await clearSessionToken();
    redirect("/login");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Upload failed");
  }

  revalidatePath("/site-photos");
}
