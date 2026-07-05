"use client";

import { useEffect, useState } from "react";
import { fetchOpenNow, type OpenNowBlock } from "@/lib/api";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** ESPN-style scrolling score ticker — a slim marquee bar of real schedule data, distinct from the fuller LiveScoreboard tiles further down the page. */
export function TopTicker() {
  const [blocks, setBlocks] = useState<OpenNowBlock[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await fetchOpenNow();
      if (!cancelled) setBlocks(data);
    }
    load();
    const interval = setInterval(load, 45_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (blocks.length === 0) return null;

  const items = [...blocks, ...blocks];

  return (
    <div className="glass relative z-10 overflow-hidden border-x-0 border-b-0 border-t-0 py-2.5">
      <div className="animate-marquee flex whitespace-nowrap text-[13px] font-medium text-white">
        {items.map((block, i) => (
          <span key={`${block.id}-${i}`} className="mx-6 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden="true" />
            {block.spaceName}
            {block.sportName ? ` · ${block.sportName}` : ""} · until {formatTime(block.endsAt)}
          </span>
        ))}
      </div>
    </div>
  );
}
