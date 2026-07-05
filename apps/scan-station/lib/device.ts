/**
 * Kiosk device identity lives in the browser's localStorage, not an
 * httpOnly cookie set server-side — unlike apps/admin/apps/web, this app
 * has no per-user session to protect from client-side JS: the "user" here
 * is a single physically-secured tablet bolted to a court, doing a live
 * camera-decode loop that has to call the API directly from the client.
 * Deregistering a device (kiosk-devices.ts) doesn't revoke an
 * already-issued token by itself — see that route's comment.
 */

const DEVICE_TOKEN_KEY = "alumni_kiosk_device_token";
const DEVICE_SPACE_KEY = "alumni_kiosk_space_name";
const STAFF_TOKEN_KEY = "alumni_kiosk_staff_token";
const STAFF_NAME_KEY = "alumni_kiosk_staff_name";
const STAFF_TOKEN_EXPIRES_KEY = "alumni_kiosk_staff_token_expires";

export function getDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function setDeviceToken(token: string, spaceName: string): void {
  window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
  window.localStorage.setItem(DEVICE_SPACE_KEY, spaceName);
}

export function getDeviceSpaceName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_SPACE_KEY);
}

export function clearDeviceToken(): void {
  window.localStorage.removeItem(DEVICE_TOKEN_KEY);
  window.localStorage.removeItem(DEVICE_SPACE_KEY);
}

// Staff-mode elevation — sessionStorage (cleared when the browser tab
// closes) and a client-side expiry check backing the token's own 15m
// server-side expiry, so the UI drops back to kiosk mode without waiting
// for an API call to fail first.
export function getStaffToken(): { token: string; name: string } | null {
  if (typeof window === "undefined") return null;
  const token = window.sessionStorage.getItem(STAFF_TOKEN_KEY);
  const name = window.sessionStorage.getItem(STAFF_NAME_KEY);
  const expiresAt = Number(window.sessionStorage.getItem(STAFF_TOKEN_EXPIRES_KEY) ?? 0);
  if (!token || !name || Date.now() > expiresAt) return null;
  return { token, name };
}

export function setStaffToken(token: string, name: string): void {
  window.sessionStorage.setItem(STAFF_TOKEN_KEY, token);
  window.sessionStorage.setItem(STAFF_NAME_KEY, name);
  window.sessionStorage.setItem(STAFF_TOKEN_EXPIRES_KEY, String(Date.now() + 14 * 60_000));
}

export function clearStaffToken(): void {
  window.sessionStorage.removeItem(STAFF_TOKEN_KEY);
  window.sessionStorage.removeItem(STAFF_NAME_KEY);
  window.sessionStorage.removeItem(STAFF_TOKEN_EXPIRES_KEY);
}
