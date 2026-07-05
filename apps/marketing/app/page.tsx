import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { LiveScoreboard } from "./components/LiveScoreboard";
import { StatsBand } from "./components/StatsBand";
import { TopTicker } from "./components/TopTicker";
import { OfferingCards } from "./components/OfferingCards";
import { ParallaxImage } from "./components/ParallaxImage";
import { BlobBackground } from "./components/BlobBackground";
import { fetchTokenPackages } from "@/lib/api";

export default async function HomePage() {
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#";
  const packages = await fetchTokenPackages();
  const starterPackage = packages[0];

  return (
    <main>
      <section className="relative flex h-[96vh] min-h-[640px] flex-col overflow-hidden">
        <ParallaxImage src="https://picsum.photos/seed/alumnicenter-main-hero/1800/1400" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-night" />
        <BlobBackground />

        <div className="absolute inset-x-0 top-0 z-20">
          <SiteHeader variant="overlay" />
          <TopTicker />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
          <Image
            src="/alumni-center-logo.png"
            alt="The Alumni Center"
            width={320}
            height={320}
            priority
            className="h-32 w-auto drop-shadow-2xl sm:h-44"
          />
          <p className="mb-5 mt-6 text-xs tracking-[0.3em] text-sky-200">VARSITY FOR EVERYONE</p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight drop-shadow-lg sm:text-7xl">
            One card.
            <br />
            Every sport.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-white/85">
            Leagues, open play, camps, and lessons — all in one membership.
          </p>
        </div>

        {/* Overlapping glass panel — bleeds into the section below for the layered, high-end look. */}
        <div className="absolute inset-x-4 -bottom-16 z-10 sm:inset-x-10">
          <div className="glass mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-3xl px-8 py-7 text-center text-white shadow-2xl sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-lg font-semibold">Ready to play today?</p>
              <p className="mt-1 text-sm text-white/75">Grab your card and see what&apos;s open right now.</p>
            </div>
            <div className="flex shrink-0 gap-3">
              <a href={webAppUrl} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark transition-transform hover:scale-105">
                Become a member
              </a>
              <a href="#live" className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105">
                See what&apos;s on
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Fixed clearance for the hero's overlapping glass panel — sized to clear it whether or not LiveScoreboard has content to render. */}
      <div className="h-24" aria-hidden="true" />

      <div id="live">
        <LiveScoreboard />
      </div>
      <StatsBand />

      <section className="px-6 py-16 sm:px-10">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">What you can play</p>
          <Link href="/sports" className="text-sm font-medium text-brand hover:underline">
            See all sports →
          </Link>
        </div>
        <OfferingCards />
      </section>

      <section className="relative overflow-hidden px-6 py-24 sm:px-10">
        <div className="animate-blob-1 pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-night p-10 text-white shadow-2xl shadow-brand/30 sm:p-14">
          <BlobBackground />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-xl font-semibold">The Alumni Card</p>
              <p className="mt-2 max-w-sm text-sm text-sky-100">
                One card for your whole family. Tap in anywhere in the building.
                {starterPackage && (
                  <>
                    {" "}
                    Starting at{" "}
                    <span className="font-semibold text-white">
                      {(starterPackage.priceCents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <a href={webAppUrl} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark transition-transform hover:scale-105">
                Join now
              </a>
              <Link href="/membership" className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
