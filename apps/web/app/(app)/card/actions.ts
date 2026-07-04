"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function updateCardConfigAction(formData: FormData) {
  const participantId = String(formData.get("participantId"));
  const backgroundId = String(formData.get("backgroundId") ?? "");
  const badgeId = String(formData.get("badgeId") ?? "");

  const badgeIds = badgeId ? [badgeId] : [];

  await apiFetch(`/me/participants/${participantId}`, {
    method: "PATCH",
    body: { alumniCardConfig: { backgroundId: backgroundId || "default", badgeIds } },
  });
  revalidatePath("/card");
}
