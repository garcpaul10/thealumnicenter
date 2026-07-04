import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/wallet", label: "Wallet" },
  { href: "/card", label: "Card" },
  { href: "/browse", label: "Browse" },
  { href: "/rewards", label: "Rewards" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-16">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <span className="font-bold text-brand">The Alumni Center</span>
        <UserButton />
      </header>
      <main className="flex-1 p-4">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-200 bg-white">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 py-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
