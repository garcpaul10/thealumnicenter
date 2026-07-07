import Link from "next/link";
import type { ScheduleBlock, Space, Sport } from "../../../lib/types";
import { MODE_STYLES, MODE_LABELS } from "./scheduleStyles";

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Read-only 7-day overview — a week is too coarse for the slot-level drag-and-drop editor, so each day here just links into the Day view (ScheduleGrid) for actual editing. */
export function WeekView({
  weekStart,
  spaces,
  blocks,
  sports,
}: {
  weekStart: string;
  spaces: Space[];
  blocks: ScheduleBlock[];
  sports: Sport[];
}) {
  const spaceName = (id: string) => spaces.find((s) => s.id === id)?.name ?? "Unknown space";
  const sportName = (id: string | null) => sports.find((s) => s.id === id)?.name ?? "Multi-sport";
  const start = new Date(`${weekStart}T00:00:00`);
  const today = toDateParam(new Date());

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    const dateParam = toDateParam(d);
    const dayBlocks = blocks
      .filter((b) => toDateParam(new Date(b.startsAt)) === dateParam)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return { date: d, dateParam, blocks: dayBlocks };
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map(({ date, dateParam, blocks: dayBlocks }) => (
        <div key={dateParam} className="rounded-lg border border-slate-200 bg-white">
          <Link
            href={`/schedule?view=day&date=${dateParam}`}
            className={`block border-b border-slate-200 px-2 py-2 text-center text-xs font-semibold hover:bg-slate-50 ${
              dateParam === today ? "bg-brand/10 text-brand" : "text-slate-700"
            }`}
          >
            {date.toLocaleDateString([], { weekday: "short" })}
            <div className="text-[11px] font-normal text-slate-400">
              {date.toLocaleDateString([], { month: "short", day: "numeric" })}
            </div>
          </Link>
          <div className="space-y-1.5 p-2">
            {dayBlocks.length === 0 && <p className="text-center text-[11px] text-slate-300">—</p>}
            {dayBlocks.map((block) => (
              <div key={block.id} className={`rounded-md border px-1.5 py-1 text-[10px] leading-tight ${MODE_STYLES[block.mode]}`}>
                <div className="font-semibold">{MODE_LABELS[block.mode]}</div>
                <div className="truncate">{spaceName(block.spaceId)}</div>
                <div className="truncate">{sportName(block.sportId)}</div>
                <div>{formatTime(new Date(block.startsAt))}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
