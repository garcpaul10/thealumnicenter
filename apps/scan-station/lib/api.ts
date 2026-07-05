import { getDeviceToken, getStaffToken } from "./device";

function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.");
  return url;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

/** Client-side fetch using the kiosk device (or staff-elevated) bearer token — see lib/device.ts for why this is client-side, unlike apps/admin/apps/web. */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; bearer?: string } = {},
): Promise<T> {
  const token = options.bearer ?? getDeviceToken();
  const response = await fetch(`${apiUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function staffBearer(): string {
  const staff = getStaffToken();
  if (!staff) throw new Error("Staff mode is locked — enter the PIN first");
  return staff.token;
}
