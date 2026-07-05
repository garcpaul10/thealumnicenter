"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/** Simple scroll-linked parallax — the image drifts slower than the page scrolls, giving the section depth without a JS animation library. */
export function ParallaxImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const offset = rect.top * 0.25;
      el.style.transform = `translateY(${offset}px) scale(1.15)`;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div ref={ref} className="absolute inset-0 will-change-transform">
        <Image src={src} alt={alt} fill priority className="object-cover" sizes="100vw" />
      </div>
    </div>
  );
}
