import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { fetchSports } from "@/lib/api";

export const metadata = { title: "Sports — The Alumni Center" };

export default async function SportsPage() {
  const sports = await fetchSports();

  return (
    <main>
      <SiteHeader />
      <section className="px-6 py-20 text-center sm:px-10">
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">EVERY SPORT</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">One membership. Every court.</h1>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24 sm:px-10">
        {sports.length === 0 ? (
          <p className="text-center text-neutral-400">No sports are configured yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {sports.map((sport) => (
              <Link
                key={sport.id}
                href={`/sports/${sport.slug}`}
                className="rounded-2xl border border-neutral-200 p-6 text-center transition-transform hover:-translate-y-1"
              >
                <p className="text-base font-semibold">{sport.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
