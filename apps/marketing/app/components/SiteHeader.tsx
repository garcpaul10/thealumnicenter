import Image from "next/image";
import Link from "next/link";

/** Shared across every page — the real nav now goes somewhere (see CLAUDE.md's "main site, not a landing page" note). */
export function SiteHeader() {
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#";

  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/">
        <Image src="/alumni-center-logo.png" alt="The Alumni Center" width={140} height={140} priority className="h-11 w-auto" />
      </Link>
      <nav className="hidden gap-8 text-sm text-neutral-600 sm:flex">
        <Link href="/sports" className="hover:text-neutral-900">
          Sports
        </Link>
        <Link href="/leagues" className="hover:text-neutral-900">
          Leagues
        </Link>
        <Link href="/membership" className="hover:text-neutral-900">
          Membership
        </Link>
        <Link href="/about" className="hover:text-neutral-900">
          About &amp; locations
        </Link>
      </nav>
      <a href={webAppUrl} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105">
        Join
      </a>
    </header>
  );
}
