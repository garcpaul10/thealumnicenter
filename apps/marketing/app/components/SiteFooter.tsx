import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-100 px-6 py-8 text-center text-xs text-neutral-400">
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
    </footer>
  );
}
