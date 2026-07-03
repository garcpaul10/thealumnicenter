"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../../lib/api";

export async function createTeamAction(formData: FormData) {
  const offeringId = String(formData.get("offeringId"));
  const name = String(formData.get("name") ?? "");
  await apiFetch("/teams", { method: "POST", body: { offeringId, name } });
  revalidatePath(`/leagues/${offeringId}`);
}

export async function addTeamMemberAction(formData: FormData) {
  const offeringId = String(formData.get("offeringId"));
  const teamId = String(formData.get("teamId"));
  const participantId = String(formData.get("participantId"));
  const role = String(formData.get("role") ?? "player");
  await apiFetch(`/teams/${teamId}/members`, { method: "POST", body: { participantId, role } });
  revalidatePath(`/leagues/${offeringId}`);
}

export async function createGameAction(formData: FormData) {
  const offeringId = String(formData.get("offeringId"));
  const homeTeamId = String(formData.get("homeTeamId"));
  const awayTeamId = String(formData.get("awayTeamId"));
  const scheduledAt = String(formData.get("scheduledAt"));
  await apiFetch("/games", { method: "POST", body: { offeringId, homeTeamId, awayTeamId, scheduledAt } });
  revalidatePath(`/leagues/${offeringId}`);
}

export async function enterScoreAction(formData: FormData) {
  const offeringId = String(formData.get("offeringId"));
  const gameId = String(formData.get("gameId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const final = formData.get("final") === "on";
  await apiFetch(`/games/${gameId}/score`, { method: "POST", body: { homeScore, awayScore, final } });
  revalidatePath(`/leagues/${offeringId}`);
}
