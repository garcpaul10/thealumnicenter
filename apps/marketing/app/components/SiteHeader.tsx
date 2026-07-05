import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/sports", label: "Sports" },
  { href: "/leagues", label: "Leagues" },
  { href: "/membership", label: "Membership" },
  { href: "/about", label: "About" },
];

/**
 * `variant="overlay"` sits absolutely on top of a dark hero image (white
 * text, glass pill nav) — `variant="light"` (default) is the normal
 * in-flow header for every other page. Logo is intentionally large (h-16+)
 * per explicit feedback that it was too small to actually read before.
 */
export function SiteHeader({ variant = "light" }: { variant?: "light" | "overlay" }) {
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#";
  const overlay = variant === "overlay";

  return (
    <header className={`${overlay ? "absolute inset-x-0 top-0 z-20" : "relative"} flex items-center justify-between px-6 py-6 sm:px-10`}>
      <Link href="/" className="shrink-0">
        <Image
          src="/alumni-center-logo.png"
          alt="The Alumni Center"
          width={220}
          height={220}
          priority
          className={`w-auto ${overlay ? "h-20 drop-shadow-lg sm:h-24" : "h-16 sm:h-20"}`}
        />
      </Link>
      <nav
        className={`hidden shrink-0 gap-1 whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium sm:flex ${
          overlay ? "glass text-white" : "text-neutral-600"
        }`}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 transition-colors ${overlay ? "hover:bg-white/20" : "hover:bg-neutral-100 hover:text-neutral-900"}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <a
        href={webAppUrl}
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-105"
      >
        Join
      </a>
    </header>
  );
}
