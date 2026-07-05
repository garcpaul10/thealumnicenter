import Link from "next/link";

export function SiteFooter() {
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#";

  return (
    <footer className="border-t border-neutral-100">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-16 text-center sm:px-10">
        <p className="text-2xl font-semibold tracking-tight">Ready to play?</p>
        <a
          href={webAppUrl}
          className="rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-105"
        >
          Become a member
        </a>
      </div>
      <div className="border-t border-neutral-100 px-6 py-8 text-center text-xs text-neutral-400 sm:px-10">
        <Link href="/about" className="hover:text-neutral-600">
          Locations
        </Link>
        {" · "}
        <Link href="/about" className="hover:text-neutral-600">
          About
        </Link>
        {" · "}
        <Link href="/about" className="hover:text-neutral-600">
          Contact
        </Link>
      </div>
    </footer>
  );
}
