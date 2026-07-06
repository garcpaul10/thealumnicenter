import Image from "next/image";
import Link from "next/link";
import { fetchSiteImages } from "@/lib/api";
import { resolveImage } from "@/lib/images";

const OFFERINGS = [
  { title: "Adult leagues", copy: "8-week seasons. Real standings.", href: "/leagues", slotKey: "offering:leagues" },
  { title: "Camps & lessons", copy: "Coached, for every age.", href: "/sports", slotKey: "offering:camps" },
  { title: "Open play", copy: "Walk in, scan your card, play.", href: "/sports", slotKey: "offering:openplay" },
  { title: "Book a court", copy: "Reserve a space, split the cost.", href: "/sports", slotKey: "offering:court" },
];

/**
 * Card-style offering grid — real photos where staff has uploaded one
 * (apps/admin's "Site Photos" page), a Picsum placeholder otherwise (see
 * CLAUDE.md §5/§11), glassmorphic text overlay, hover zoom.
 */
export async function OfferingCards() {
  const images = await fetchSiteImages();

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {OFFERINGS.map((offering) => (
        <Link
          key={offering.title}
          href={offering.href}
          className="group relative h-56 overflow-hidden rounded-3xl shadow-xl shadow-neutral-900/5"
        >
          <Image
            src={resolveImage(images, offering.slotKey, 800, 600)}
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
