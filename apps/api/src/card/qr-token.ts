import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.js";

/**
 * The Alumni Card's QR encodes a short-lived signed token, never a raw
 * participant ID — DESIGN.md CS3 "Rotating QR tokens": prevents screenshot
 * sharing. 30s expiry means the card UI must re-fetch/re-render the QR
 * periodically while displayed (Phase 4 scan-station verifies these).
 */
const QR_TOKEN_TTL_SECONDS = 30;

export async function signQrToken(participantId: string): Promise<{ token: string; expiresAt: number }> {
  const secret = new TextEncoder().encode(env.qrSigningSecret);
  const expiresAt = Math.floor(Date.now() / 1000) + QR_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(participantId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
  return { token, expiresAt };
}

export async function verifyQrToken(token: string): Promise<{ participantId: string }> {
  const secret = new TextEncoder().encode(env.qrSigningSecret);
  const { payload } = await jwtVerify(token, secret);
  if (typeof payload.sub !== "string") throw new Error("Malformed QR token");
  return { participantId: payload.sub };
}
