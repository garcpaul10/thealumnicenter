"use client";

import { useEffect, useState } from "react";
import { fetchOpenNow, type OpenNowBlock } from "@/lib/api";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** ESPN-style "live scoreboard" strip — real schedule_blocks data rendered as scannable tiles, not a fake marketing carousel. The one deliberately dark, high-energy band on an otherwise calm/light page. */
export function LiveScoreboard() {
  const [blocks, setBlocks] = useState<OpenNowBlock[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await fetchOpenNow();
      if (!cancelled) {
        setBlocks(data);
        setNow(new Date());
      }
    }
    load();
    const interval = setInterval(load, 45_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (blocks.length === 0) return null;

  return (
    <section className="bg-night px-6 py-8 text-white sm:px-10">
      <div className="mb-4 flex items-center gap-2">
        <span className="animate-pulse-dot h-2 w-2 rounded-full bg-live" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-[0.2em] text-live">LIVE AT THE CENTER</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {blocks.map((block) => {
          const started = now ? new Date(block.startsAt) <= now : true;
          return (
            <div key={block.id} className="rounded-lg bg-panel p-4">
              <p className="mb-1.5 text-[11px] tracking-wide text-slate-400">{block.spaceName.toUpperCase()}</p>
              <p className="text-sm font-semibold">{block.sportName ?? block.mode.replace("_", " ")}</p>
              <p className={`mt-1.5 text-[11px] ${started ? "text-slate-400" : "text-live"}`}>
                {started ? `until ${formatTime(block.endsAt)}` : `starts ${formatTime(block.startsAt)}`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
