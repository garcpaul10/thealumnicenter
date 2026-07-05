import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { BlobBackground } from "../components/BlobBackground";
import { fetchSports } from "@/lib/api";

export const metadata = { title: "Sports — The Alumni Center" };

export default async function SportsPage() {
  const sports = await fetchSports();

  return (
    <main>
      <SiteHeader />
      <section className="relative overflow-hidden px-6 py-20 text-center sm:px-10">
        <BlobBackground variant="light" />
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">EVERY SPORT</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">One membership. Every court.</h1>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 sm:px-10">
        {sports.length === 0 ? (
          <p className="text-center text-neutral-400">No sports are configured yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {sports.map((sport) => (
              <Link
                key={sport.id}
                href={`/sports/${sport.slug}`}
                className="group relative h-40 overflow-hidden rounded-2xl shadow-lg shadow-neutral-900/5"
              >
                <Image
                  src={`https://picsum.photos/seed/alumni-sport-${sport.slug}/500/400`}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(min-width: 640px) 33vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-3 left-4 text-base font-semibold text-white">{sport.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
