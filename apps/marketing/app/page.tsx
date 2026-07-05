import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { LiveScoreboard } from "./components/LiveScoreboard";
import { OfferingCards } from "./components/OfferingCards";

export default function HomePage() {
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#";

  return (
    <main>
      <SiteHeader />

      <section className="px-6 pb-20 pt-24 text-center sm:pt-32">
        <p className="mb-5 text-xs tracking-[0.3em] text-neutral-400">VARSITY FOR EVERYONE</p>
        <h1 className="mx-auto max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          One card.
          <br />
          Every sport.
        </h1>
        <p className="mx-auto mt-6 max-w-sm text-lg text-neutral-500">
          Leagues, open play, camps, and lessons — all in one membership.
        </p>
        <div className="mt-9 flex items-center justify-center gap-6 text-[15px] font-medium">
          <a href={webAppUrl} className="border-b-2 border-brand pb-0.5 text-brand">
            Become a member →
          </a>
          <a href="#live" className="text-neutral-600">
            See what&apos;s on →
          </a>
        </div>
      </section>

      <div className="flex h-[280px] items-center justify-center bg-gradient-to-br from-brand via-brand-dark to-night text-white sm:h-[420px]">
        <span className="px-6 text-center text-xs tracking-wide text-sky-200/70">
          [ full-bleed action photo — real courts, real members — pending a facility photo shoot ]
        </span>
      </div>

      <div id="live">
        <LiveScoreboard />
      </div>

      <section className="px-6 py-16 sm:px-10">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-neutral-400">What you can play</p>
        <OfferingCards />
      </section>

      <section className="mx-6 mb-16 rounded-2xl bg-brand p-10 text-center text-white sm:mx-10">
        <p className="text-xl font-semibold">The Alumni Card</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-sky-100">
          One card for your whole family. Tap in anywhere in the building.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
