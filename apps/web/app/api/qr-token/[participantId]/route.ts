import { NextResponse } from "next/server";
import { apiFetch } from "../../../../lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ participantId: string }> }) {
  const { participantId } = await params;
  const data = await apiFetch<{ token: string; expiresAt: number }>(`/participants/${participantId}/qr-token`);
  return NextResponse.json(data);
}
