import Image from "next/image";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { BlobBackground } from "../components/BlobBackground";
import { fetchSiteImages } from "@/lib/api";
import { resolveImage } from "@/lib/images";

export const metadata = { title: "About & locations — The Alumni Center" };

export default async function AboutPage() {
  const images = await fetchSiteImages();

  return (
    <main>
      <SiteHeader />
      <section className="relative overflow-hidden px-6 py-20 text-center sm:px-10">
        <BlobBackground variant="light" />
        <p className="mb-4 text-xs tracking-[0.3em] text-neutral-400">ABOUT</p>
        <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Varsity for everyone.</h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-neutral-500">
          The Alumni Center is a multi-sport athletic facility built for leagues, open play, camps, and lessons — all on one
          membership card.
        </p>
      </section>

      <section className="relative mx-6 h-56 overflow-hidden rounded-3xl shadow-xl shadow-neutral-900/10 sm:mx-10 sm:h-72">
        <Image src={resolveImage(images, "about", 1400, 700)} alt="" fill className="object-cover" sizes="100vw" />
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16 sm:px-10">
        <div className="rounded-3xl border border-neutral-200 p-8">
          <p className="mb-4 text-xs uppercase tracking-wide text-neutral-400">Location &amp; hours</p>
          <p className="text-[15px] text-neutral-500">
            [ street address — placeholder, no facility address exists yet ]
            <br />
            [ city, state zip ]
          </p>
          <p className="mt-4 text-[15px] text-neutral-500">[ hours of operation — placeholder ]</p>
          <p className="mt-4 text-[15px] text-neutral-500">[ phone number ] &middot; [ contact email ]</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
