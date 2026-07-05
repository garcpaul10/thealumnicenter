import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { fetchTokenPackages } from "@/lib/api";

export const metadata = { title: "Membership — The Alumni Center" };

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function MembershipPage() {
  const packages = await fetchTokenPackages();
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#";

  return (
    <main>
      <SiteHeader />
      <section className="px-6 py-20 text-center sm:px-10">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="rounded-2xl border border-neutral-200 p-6 text-center">
                <p className="text-sm font-medium text-neutral-500">{pkg.name}</p>
                <p className="mt-3 text-3xl font-semibold">{formatPrice(pkg.priceCents)}</p>
                <p className="mt-2 text-sm text-neutral-500">
                  {pkg.tokensGranted} tokens
                  {pkg.bonusTokens > 0 ? ` + ${pkg.bonusTokens} bonus` : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 text-center">
          <a href={webAppUrl} className="rounded-md bg-brand px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105">
            Become a member
          </a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
