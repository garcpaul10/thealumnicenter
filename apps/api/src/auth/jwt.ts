import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.js";

export interface StaffTokenPayload {
  staffUserId: string;
  role: "admin" | "staff";
}

export async function signStaffToken(payload: StaffTokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(env.staffJwtSecret);
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.staffUserId)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyStaffToken(token: string): Promise<StaffTokenPayload> {
  const secret = new TextEncoder().encode(env.staffJwtSecret);
  const { payload } = await jwtVerify(token, secret);
  if (typeof payload.sub !== "string" || (payload.role !== "admin" && payload.role !== "staff")) {
    throw new Error("Malformed staff token");
  }
  return { staffUserId: payload.sub, role: payload.role };
}
