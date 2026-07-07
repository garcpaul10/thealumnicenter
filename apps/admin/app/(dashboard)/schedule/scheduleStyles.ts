import type { ScheduleMode } from "../../../lib/types";

export const MODE_STYLES: Record<ScheduleMode, string> = {
  open_play: "bg-blue-100 border-blue-400 text-blue-900",
  reservable: "bg-amber-100 border-amber-400 text-amber-900",
  league: "bg-purple-100 border-purple-400 text-purple-900",
  camp: "bg-green-100 border-green-400 text-green-900",
  closed: "bg-slate-200 border-slate-400 text-slate-700",
};

export const MODE_DOT_STYLES: Record<ScheduleMode, string> = {
  open_play: "bg-blue-400",
  reservable: "bg-amber-400",
  league: "bg-purple-400",
  camp: "bg-green-400",
  closed: "bg-slate-400",
};

export const MODE_LABELS: Record<ScheduleMode, string> = {
  open_play: "Open Play",
  reservable: "Reservable",
  league: "League",
  camp: "Camp",
  closed: "Closed",
};
