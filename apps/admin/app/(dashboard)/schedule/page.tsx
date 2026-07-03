import { apiFetch } from "../../../lib/api";
import type { ScheduleBlock, Space, Sport } from "../../../lib/types";
import { ScheduleGrid } from "./ScheduleGrid";

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const dateParam = params.date ?? toDateParam(new Date());
  const dayStart = new Date(`${dateParam}T00:00:00`);
  const dayEnd = new Date(`${dateParam}T23:59:59`);

  const [spaces, blocks, sports] = await Promise.all([
    apiFetch<Space[]>("/spaces"),
    apiFetch<ScheduleBlock[]>(`/schedule-blocks?from=${dayStart.toISOString()}&to=${dayEnd.toISOString()}`),
    apiFetch<Sport[]>("/sports"),
  ]);

  const prevDate = toDateParam(new Date(dayStart.getTime() - 86400000));
  const nextDate = toDateParam(new Date(dayStart.getTime() + 86400000));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <div className="flex items-center gap-3 text-sm">
          <a href={`/schedule?date=${prevDate}`} className="text-brand hover:underline">
            ← Prev day
          </a>
          <span className="font-medium">{dateParam}</span>
          <a href={`/schedule?date=${nextDate}`} className="text-brand hover:underline">
            Next day →
          </a>
        </div>
      </div>

      <ScheduleGrid
        date={dateParam}
        spaces={spaces.filter((s) => s.active)}
        blocks={blocks}
        sports={sports}
      />
    </div>
  );
}
