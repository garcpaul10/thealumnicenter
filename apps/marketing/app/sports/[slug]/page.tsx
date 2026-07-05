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
      <section className="px-6 py-20 text-center sm:px-10">
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">SPORT</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">{sport.name}</h1>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 sm:px-10">
        {offerings.length === 0 ? (
          <p className="text-center text-neutral-400">Nothing scheduled for {sport.name} yet — check back soon.</p>
        ) : (
          <div className="space-y-3">
            {offerings.map((offering) => (
              <div key={offering.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-6 py-5">
                <div>
                  <p className="text-[15px] font-semibold">{offering.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">{offering.description ?? offering.type.replace("_", " ")}</p>
                </div>
                <p className="whitespace-nowrap pl-4 text-sm font-medium text-brand">{offering.tokenPrice} tokens</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
