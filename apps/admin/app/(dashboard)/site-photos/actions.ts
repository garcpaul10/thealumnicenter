"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionToken, clearSessionToken } from "../../../lib/session";

function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.");
  return url;
}

export interface UploadSiteImageState {
  error: string | null;
}

/**
 * File uploads can't go through lib/api.ts's apiFetch — that helper always
 * JSON.stringifies the body, which would corrupt binary image data. This
 * forwards the raw FormData (with its file) to apps/api, same bearer-token
 * pattern as every other admin Server Action.
 *
 * Returns a state object (for useActionState) rather than throwing on
 * failure — a thrown Server Action error surfaces as Next.js's generic
 * "Application error" overlay, not a message the user can act on. A real
 * upload failure (oversized file, wrong type) should read like a normal
 * form validation error, not a crash.
 */
export async function uploadSiteImageAction(
  _prevState: UploadSiteImageState,
  formData: FormData,
): Promise<UploadSiteImageState> {
  const slotKey = String(formData.get("slotKey") ?? "");
  const file = formData.get("file");
  if (!slotKey || !(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file first" };
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
    return { error: (body as { error?: string }).error ?? "Upload failed — try again" };
  }

  revalidatePath("/site-photos");
  return { error: null };
}
