"use server";

import { redirect } from "next/navigation";
import { setSessionToken } from "../../lib/session";

function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.");
  return url;
}

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${apiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { error: "Invalid phone or password" };
  }

  const { token } = (await response.json()) as { token: string };
  await setSessionToken(token);
  redirect("/");
}
