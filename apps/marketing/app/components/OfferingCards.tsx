import Image from "next/image";
import Link from "next/link";

const OFFERINGS = [
  { title: "Adult leagues", copy: "8-week seasons. Real standings.", href: "/leagues", seed: "alumni-league" },
  { title: "Camps & lessons", copy: "Coached, for every age.", href: "/sports", seed: "alumni-camp" },
  { title: "Open play", copy: "Walk in, scan your card, play.", href: "/sports", seed: "alumni-openplay" },
  { title: "Book a court", copy: "Reserve a space, split the cost.", href: "/sports", seed: "alumni-court" },
];

/**
 * Card-style offering grid with real (stock-placeholder, see CLAUDE.md
 * §5/§11) photography instead of flat color blocks, glassmorphic text
 * overlay, and a hover zoom for a more "high-end app" feel.
 */
export function OfferingCards() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {OFFERINGS.map((offering) => (
        <Link
          key={offering.title}
          href={offering.href}
          className="group relative h-56 overflow-hidden rounded-3xl shadow-xl shadow-neutral-900/5"
        >
          <Image
            src={`https://picsum.photos/seed/${offering.seed}/800/600`}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(min-width: 640px) 50vw, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="glass absolute inset-x-3 bottom-3 rounded-2xl p-4 text-white">
            <p className="text-[15px] font-semibold">{offering.title}</p>
            <p className="mt-1 text-sm text-white/80">{offering.copy}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
