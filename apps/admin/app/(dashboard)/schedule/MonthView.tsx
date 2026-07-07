import Link from "next/link";
import type { ScheduleBlock } from "../../../lib/types";
import { MODE_DOT_STYLES } from "./scheduleStyles";

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Read-only month calendar — each day shows a dot per schedule mode present that day (deduped, not one-per-block) and links into Day view. Too coarse for editing, same reasoning as WeekView. */
export function MonthView({ monthStart, blocks }: { monthStart: string; blocks: ScheduleBlock[] }) {
  const first = new Date(`${monthStart}T00:00:00`);
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = first.getDay();
  const today = toDateParam(new Date());

  const blocksByDate = new Map<string, ScheduleBlock[]>();
  for (const block of blocks) {
    const key = toDateParam(new Date(block.startsAt));
    const existing = blocksByDate.get(key);
    if (existing) existing.push(block);
    else blocksByDate.set(key, [block]);
  }

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold text-slate-500">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="h-20 border-b border-r border-slate-100 last:border-r-0" />;
          const dateParam = toDateParam(date);
          const dayBlocks = blocksByDate.get(dateParam) ?? [];
          const modes = [...new Set(dayBlocks.map((b) => b.mode))];
          return (
            <Link
              key={i}
              href={`/schedule?view=day&date=${dateParam}`}
              className={`h-20 border-b border-r border-slate-100 p-1.5 last:border-r-0 hover:bg-slate-50 ${
                dateParam === today ? "bg-brand/10" : ""
              }`}
            >
              <div className={`text-xs ${dateParam === today ? "font-semibold text-brand" : "text-slate-600"}`}>{date.getDate()}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {modes.map((mode) => (
                  <span key={mode} className={`h-1.5 w-1.5 rounded-full ${MODE_DOT_STYLES[mode]}`} />
                ))}
              </div>
              {dayBlocks.length > 0 && <div className="mt-1 text-[10px] text-slate-400">{dayBlocks.length} block{dayBlocks.length === 1 ? "" : "s"}</div>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
