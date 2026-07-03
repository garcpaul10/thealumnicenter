import { redirect } from "next/navigation";
import { getSessionToken, clearSessionToken } from "./session";

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

/**
 * Server-side-only fetch to the backend API. All admin pages/actions call
 * the API from the Next.js server (Server Components / Server Actions),
 * never from client-side JS — the browser only ever talks to this Next.js
 * app, never directly to apps/api. Keeps the staff JWT in an httpOnly
 * cookie the client can't read.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getSessionToken();
  if (!token) redirect("/login");

  const response = await fetch(`${apiUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 401) {
    await clearSessionToken();
    redirect("/login");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
