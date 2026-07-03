import Link from "next/link";
import { requireSessionToken } from "../../lib/session";
import { apiFetch } from "../../lib/api";
import type { StaffUser } from "../../lib/types";
import { logoutAction } from "./actions";

// Every page under this layout reads the session cookie and calls the API
// with a per-request bearer token — there's nothing here that's valid to
// prerender statically at build time.
export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/sports", label: "Sports" },
  { href: "/spaces", label: "Spaces" },
  { href: "/offerings", label: "Offerings" },
  { href: "/leagues", label: "Leagues" },
  { href: "/token-packages", label: "Token Packages" },
  { href: "/partners", label: "Vendors & Coaches" },
  { href: "/members", label: "Member Lookup" },
  { href: "/staff", label: "Staff Users" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSessionToken();
  const me = await apiFetch<StaffUser>("/auth/me");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="font-bold text-brand">The Alumni Center</p>
          <p className="text-xs text-slate-500">Staff dashboard</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 p-3">
          <p className="px-3 text-sm font-medium text-slate-700">{me.name}</p>
          <p className="px-3 text-xs text-slate-500">{me.role}</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
