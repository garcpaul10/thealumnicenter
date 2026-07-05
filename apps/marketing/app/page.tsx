import Image from "next/image";
import { OpenNowTicker } from "./components/OpenNowTicker";
import { StatsRow } from "./components/StatsRow";
import { OfferingCards } from "./components/OfferingCards";

export default function HomePage() {
  return (
    <main>
      <header className="flex items-center justify-between px-6 py-4">
        <Image src="/alumni-center-logo.png" alt="The Alumni Center" width={140} height={140} priority className="h-12 w-auto" />
        <nav className="hidden gap-6 text-sm text-slate-300 sm:flex">
          <span>Sports</span>
          <span>Memberships</span>
          <span>Leagues</span>
          <span>Events</span>
        </nav>
        <a
          href={process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#"}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium transition-transform hover:scale-105"
        >
          Join
        </a>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-sky-900 via-panel to-night px-6 py-20 text-center">
        <div className="animate-bob absolute right-8 top-8 text-2xl text-sky-300" aria-hidden="true">
          ★
        </div>
        <p className="text-xs tracking-[0.3em] text-sky-300">EST. YOUR TOWN &middot; VARSITY FOR EVERYONE</p>
        <h1 className="mx-auto mt-4 max-w-xl text-4xl font-semibold leading-tight">
          Show up. Scan in.
          <br />
          Play like it&apos;s game night.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-slate-300">
          Leagues, open play, camps and lessons — buy tokens once, spend them anywhere in the building.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a
            href={process.env.NEXT_PUBLIC_WEB_APP_URL ?? "#"}
            className="rounded-md bg-brand px-5 py-3 text-sm font-medium transition-transform hover:scale-105"
          >
            Become a member
          </a>
          <a
            href="#open-now"
            className="rounded-md border border-sky-300 px-5 py-3 text-sm font-medium transition-transform hover:scale-105"
          >
            See what&apos;s open now
          </a>
        </div>
      </section>

      <div id="open-now">
        <OpenNowTicker />
      </div>

      <section className="px-6 py-10">
        <p className="mb-4 text-xs uppercase tracking-wider text-slate-400">What you can play</p>
        <OfferingCards />
      </section>

      <StatsRow />

      <section className="mx-6 mb-10 flex items-center justify-between gap-4 rounded-xl bg-brand p-5">
        <div>
          <p className="font-medium">The Alumni Card</p>
          <p className="mt-1 text-sm text-sky-100">
            One digital membership card for your whole family. Tap in anywhere in the building.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-slate-500">
        Locations &middot; About &middot; Careers &middot; Contact
      </footer>
    </main>
  );
}
