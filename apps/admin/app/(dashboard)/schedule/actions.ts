"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../lib/api";
import type { ScheduleMode } from "../../../lib/types";

export interface ActionResult {
  error?: string;
}

export async function createBlockAction(params: {
  spaceId: string;
  sportId?: string;
  mode: ScheduleMode;
  startsAt: string;
  endsAt: string;
}): Promise<ActionResult> {
  try {
    await apiFetch("/schedule-blocks", { method: "POST", body: params });
  } catch (err) {
    if (err instanceof ApiError) return { error: (err.body as { error?: string })?.error ?? "Could not create block" };
    throw err;
  }
  revalidatePath("/schedule");
  return {};
}

export async function moveBlockAction(params: {
  id: string;
  spaceId: string;
  startsAt: string;
  endsAt: string;
}): Promise<ActionResult> {
  try {
    await apiFetch(`/schedule-blocks/${params.id}`, {
      method: "PATCH",
      body: { spaceId: params.spaceId, startsAt: params.startsAt, endsAt: params.endsAt },
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: (err.body as { error?: string })?.error ?? "Could not move block" };
    throw err;
  }
  revalidatePath("/schedule");
  return {};
}

export async function updateBlockAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const startsAt = String(formData.get("startsAt"));
  const endsAt = String(formData.get("endsAt"));
  const recurrenceRule = String(formData.get("recurrenceRule") ?? "") || null;
  await apiFetch(`/schedule-blocks/${id}`, {
    method: "PATCH",
    body: { startsAt, endsAt, recurrenceRule },
  });
  revalidatePath("/schedule");
}

export async function deleteBlockAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await apiFetch(`/schedule-blocks/${id}`, { method: "DELETE" });
  revalidatePath("/schedule");
}
