import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { fetchSports, fetchOfferings } from "@/lib/api";

export async function generateStaticParams() {
  const sports = await fetchSports();
  return sports.map((sport) => ({ slug: sport.slug }));
}

export default async function SportDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [sports, offerings] = await Promise.all([fetchSports(), fetchOfferings({ sportSlug: slug })]);
  const sport = sports.find((s) => s.slug === slug);
  if (!sport) notFound();

  return (
    <main>
      <SiteHeader />

      <section className="relative mx-6 h-56 overflow-hidden rounded-3xl shadow-xl shadow-neutral-900/10 sm:mx-10 sm:h-72">
        <Image src={`https://picsum.photos/seed/alumni-sport-${sport.slug}/1400/700`} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-6 bottom-6 sm:inset-x-10">
          <p className="mb-2 text-xs tracking-[0.3em] text-sky-200">SPORT</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{sport.name}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
        {offerings.length === 0 ? (
          <p className="text-center text-neutral-400">Nothing scheduled for {sport.name} yet — check back soon.</p>
        ) : (
          <div className="space-y-3">
            {offerings.map((offering) => (
              <div
                key={offering.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 px-6 py-5 transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="text-[15px] font-semibold">{offering.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">{offering.description ?? offering.type.replace("_", " ")}</p>
                </div>
                <p className="whitespace-nowrap pl-4 text-sm font-medium text-brand">{offering.tokenPrice} tokens</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/sports" className="text-sm font-medium text-brand hover:underline">
            ← All sports
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
