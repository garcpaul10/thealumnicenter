import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { BlobBackground } from "../components/BlobBackground";
import { fetchTokenPackages } from "@/lib/api";

export const metadata = { title: "Membership — The Alumni Center" };

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function MembershipPage() {
  const packages = await fetchTokenPackages();
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#";
  const featuredId = packages[Math.floor(packages.length / 2)]?.id;

  return (
    <main>
      <SiteHeader />
      <section className="relative overflow-hidden px-6 py-20 text-center sm:px-10">
        <BlobBackground variant="light" />
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">HOW IT WORKS</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">One wallet. Every activity.</h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-neutral-500">
          Buy tokens once, spend them on leagues, open play, camps, lessons, and reservations — no separate sign-up for each.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 sm:px-10">
        {packages.length === 0 ? (
          <p className="text-center text-neutral-400">Token packages aren&apos;t configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {packages.map((pkg) => {
              const featured = pkg.id === featuredId;
              return (
                <div
                  key={pkg.id}
                  className={`rounded-3xl p-7 text-center transition-transform hover:-translate-y-1 ${
                    featured ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-xl shadow-brand/30" : "border border-neutral-200"
                  }`}
                >
                  {featured && (
                    <p className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide">MOST POPULAR</p>
                  )}
                  <p className={`text-sm font-medium ${featured ? "text-sky-100" : "text-neutral-500"}`}>{pkg.name}</p>
                  <p className="mt-3 text-3xl font-semibold">{formatPrice(pkg.priceCents)}</p>
                  <p className={`mt-2 text-sm ${featured ? "text-sky-100" : "text-neutral-500"}`}>
                    {pkg.tokensGranted} tokens
                    {pkg.bonusTokens > 0 ? ` + ${pkg.bonusTokens} bonus` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-14 text-center">
          <a
            href={webAppUrl}
            className="rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:scale-105"
          >
            Become a member
          </a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
