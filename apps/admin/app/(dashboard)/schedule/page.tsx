import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import type { ScheduleBlock, Space, Sport } from "../../../lib/types";
import { ScheduleGrid } from "./ScheduleGrid";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";

type View = "day" | "week" | "month";

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const VIEW_LABELS: Record<View, string> = { day: "Day", week: "Week", month: "Month" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams;
  const view: View = params.view === "week" || params.view === "month" ? params.view : "day";
  const dateParam = params.date ?? toDateParam(new Date());
  const anchor = new Date(`${dateParam}T00:00:00`);

  // Fetch range depends on the view: day view needs one day, week needs 7,
  // month needs the full calendar month (including a little slack on either
  // side from MonthView's leading/trailing blanks isn't queried — those
  // cells are just empty, no data expected for adjacent-month padding).
  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === "day") {
    rangeStart = new Date(`${dateParam}T00:00:00`);
    rangeEnd = new Date(`${dateParam}T23:59:59`);
  } else if (view === "week") {
    rangeStart = startOfWeek(anchor);
    rangeEnd = new Date(rangeStart.getTime() + 7 * 86400000 - 1000);
  } else {
    const monthStart = startOfMonth(anchor);
    rangeStart = monthStart;
    rangeEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
  }

  const [spaces, blocks, sports] = await Promise.all([
    apiFetch<Space[]>("/spaces"),
    apiFetch<ScheduleBlock[]>(`/schedule-blocks?from=${rangeStart.toISOString()}&to=${rangeEnd.toISOString()}`),
    apiFetch<Sport[]>("/sports"),
  ]);

  const stepMs = view === "day" ? 86400000 : view === "week" ? 7 * 86400000 : 0;
  let prevDate: string;
  let nextDate: string;
  let label: string;
  if (view === "month") {
    const prev = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    prevDate = toDateParam(prev);
    nextDate = toDateParam(next);
    label = anchor.toLocaleDateString([], { month: "long", year: "numeric" });
  } else {
    prevDate = toDateParam(new Date(anchor.getTime() - stepMs));
    nextDate = toDateParam(new Date(anchor.getTime() + stepMs));
    label =
      view === "week"
        ? `Week of ${startOfWeek(anchor).toLocaleDateString([], { month: "short", day: "numeric" })}`
        : dateParam;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
          {(["day", "week", "month"] as View[]).map((v) => (
            <Link
              key={v}
              href={`/schedule?view=${v}&date=${dateParam}`}
              className={`rounded px-3 py-1 text-xs font-medium ${
                v === view ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {VIEW_LABELS[v]}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/schedule?view=${view}&date=${prevDate}`} className="text-brand hover:underline">
            ← Prev {view}
          </Link>
          <span className="font-medium">{label}</span>
          <Link href={`/schedule?view=${view}&date=${nextDate}`} className="text-brand hover:underline">
            Next {view} →
          </Link>
          <Link href={`/schedule?view=${view}&date=${toDateParam(new Date())}`} className="text-slate-400 hover:underline">
            Today
          </Link>
        </div>
      </div>

      {view === "day" && <ScheduleGrid date={dateParam} spaces={spaces.filter((s) => s.active)} blocks={blocks} sports={sports} />}
      {view === "week" && <WeekView weekStart={toDateParam(startOfWeek(anchor))} spaces={spaces} blocks={blocks} sports={sports} />}
      {view === "month" && <MonthView monthStart={toDateParam(startOfMonth(anchor))} blocks={blocks} />}
    </div>
  );
}
