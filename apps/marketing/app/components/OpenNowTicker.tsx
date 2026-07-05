"use client";

import { useEffect, useState } from "react";
import { fetchOpenNow, type OpenNowBlock } from "@/lib/api";

/** Live pulse of the actual facility schedule — polls the same way apps/scan-station/apps/web do (30-60s), not a fake marketing carousel. */
export function OpenNowTicker() {
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
    <div className="overflow-hidden whitespace-nowrap bg-brand py-2">
      <div className="animate-marquee inline-flex gap-10 text-xs">
        {items.map((block, i) => (
          <span key={`${block.id}-${i}`}>
            {block.spaceName}
            {block.sportName ? ` · ${block.sportName}` : ""} · until{" "}
            {new Date(block.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </span>
        ))}
      </div>
    </div>
  );
}
