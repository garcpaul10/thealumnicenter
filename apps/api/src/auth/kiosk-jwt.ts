import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.js";

/**
 * Kiosk device tokens use their own secret (KIOSK_JWT_SECRET), separate from
 * STAFF_JWT_SECRET — kiosk tablets are physically exposed hardware in the
 * facility, so isolating their blast radius from the staff dashboard's
 * secret matters if a device is ever compromised or stolen.
 */

export interface KioskDeviceTokenPayload {
  deviceId: string;
  spaceId: string;
}

/** Long-lived — issued once at device registration, stored on the tablet, not rotated per-session. */
export async function signKioskDeviceToken(payload: KioskDeviceTokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(env.kioskJwtSecret);
  return new SignJWT({ spaceId: payload.spaceId, kind: "device" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.deviceId)
    .setIssuedAt()
    .sign(secret);
}

export async function verifyKioskDeviceToken(token: string): Promise<KioskDeviceTokenPayload> {
  const secret = new TextEncoder().encode(env.kioskJwtSecret);
  const { payload } = await jwtVerify(token, secret);
  if (typeof payload.sub !== "string" || typeof payload.spaceId !== "string" || payload.kind !== "device") {
    throw new Error("Malformed kiosk device token");
  }
  return { deviceId: payload.sub, spaceId: payload.spaceId };
}

export interface KioskStaffTokenPayload {
  deviceId: string;
  spaceId: string;
  staffUserId: string;
}

/** Short-lived — issued after a correct staff-mode PIN entry on a registered kiosk; elevates comps/overrides/manual lookup for that session only. */
export async function signKioskStaffToken(payload: KioskStaffTokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(env.kioskJwtSecret);
  return new SignJWT({ spaceId: payload.spaceId, staffUserId: payload.staffUserId, kind: "staff" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.deviceId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyKioskStaffToken(token: string): Promise<KioskStaffTokenPayload> {
  const secret = new TextEncoder().encode(env.kioskJwtSecret);
  const { payload } = await jwtVerify(token, secret);
  if (
    typeof payload.sub !== "string" ||
    typeof payload.spaceId !== "string" ||
    typeof payload.staffUserId !== "string" ||
    payload.kind !== "staff"
  ) {
    throw new Error("Malformed kiosk staff token");
  }
  return { deviceId: payload.sub, spaceId: payload.spaceId, staffUserId: payload.staffUserId };
}
