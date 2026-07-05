import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";

export const metadata = { title: "About & locations — The Alumni Center" };

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <section className="px-6 py-20 text-center sm:px-10">
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">ABOUT</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Varsity for everyone.</h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-neutral-500">
          The Alumni Center is a multi-sport athletic facility built for leagues, open play, camps, and lessons — all on one
          membership card.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-24 sm:px-10">
        <div className="rounded-2xl border border-neutral-200 p-8">
          <p className="mb-4 text-xs uppercase tracking-wide text-neutral-400">Location &amp; hours</p>
          <p className="text-[15px] text-neutral-500">
            [ street address — placeholder, no facility address exists yet ]
            <br />
            [ city, state zip ]
          </p>
          <p className="mt-4 text-[15px] text-neutral-500">
            [ hours of operation — placeholder ]
          </p>
          <p className="mt-4 text-[15px] text-neutral-500">
            [ phone number ] &middot; [ contact email ]
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
