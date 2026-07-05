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
      <div className="text-3xl font-semibold text-sky-300">{animated.toLocaleString()}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

/** Real aggregate numbers from the ledger/accounts tables (apps/api's /public/stats) — not placeholder marketing copy. */
export function StatsRow() {
  const [stats, setStats] = useState({ activeMembers: 0, tokensInPlay: 0, leaguesRunning: 0 });

  useEffect(() => {
    fetchStats().then((data) => data && setStats(data));
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-10">
      <Stat value={stats.activeMembers} label="active members" />
      <Stat value={stats.tokensInPlay} label="tokens in play" />
      <Stat value={stats.leaguesRunning} label="leagues running" />
    </div>
  );
}
