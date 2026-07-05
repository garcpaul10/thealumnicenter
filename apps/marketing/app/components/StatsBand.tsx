"use client";

import { useEffect, useRef, useState } from "react";
import { fetchStats } from "@/lib/api";

function useCountUp(target: number, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;
    let startTime: number | null = null;
    let raf: number;
    function step(ts: number) {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / durationMs, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function Stat({ value, label }: { value: number; label: string }) {
  const animated = useCountUp(value);
  return (
    <div className="text-center">
      <div className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{animated.toLocaleString()}</div>
      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
    </div>
  );
}

/** Real, live-fetched aggregate numbers (apps/api's /public/stats) rendered ESPN/Apple-style — big bold count-up figures, not decorative marketing copy. */
export function StatsBand() {
  const [stats, setStats] = useState({ activeMembers: 0, tokensInPlay: 0, leaguesRunning: 0 });

  useEffect(() => {
    fetchStats().then((data) => data && setStats(data));
  }, []);

  return (
    <section className="bg-night px-6 py-16 sm:px-10">
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4">
        <Stat value={stats.activeMembers} label="Members" />
        <Stat value={stats.tokensInPlay} label="Tokens in play" />
        <Stat value={stats.leaguesRunning} label="Leagues" />
      </div>
    </section>
  );
}
