import { apiFetch } from "../../../lib/api";
import type { MeResponse, Offering, ScheduleBlock } from "../../../lib/types";
import { purchaseOfferingAction } from "./actions";

const TYPE_LABELS: Record<string, string> = {
  walk_in: "Walk-In",
  free_play_pass: "Free Play",
  league: "League",
  camp: "Camp",
  reservation: "Reservation",
  lesson: "Lesson",
  clinic: "Clinic",
};

export default async function BrowsePage() {
  const [me, offerings, openNow] = await Promise.all([
    apiFetch<MeResponse>("/me"),
    apiFetch<Offering[]>("/offerings"),
    apiFetch<ScheduleBlock[]>("/schedule-blocks/open-now"),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Browse</h1>

      {openNow.length > 0 && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-semibold text-green-800">Open now</p>
          <p className="text-sm text-green-700">{openNow.length} space(s) currently open for drop-in play.</p>
        </div>
      )}

      <div className="space-y-3">
        {offerings
          .filter((o) => o.type !== "reservation")
          .map((offering) => (
            <div key={offering.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium">{offering.name}</p>
                  <p className="text-xs uppercase text-slate-400">{TYPE_LABELS[offering.type]}</p>
                </div>
                <p className="font-semibold text-brand">{offering.tokenPrice} tokens</p>
              </div>
              {offering.description && <p className="mb-3 text-sm text-slate-500">{offering.description}</p>}
              <PurchaseForm offering={offering} participants={me.participants} />
            </div>
          ))}
        {offerings.length === 0 && <p className="text-sm text-slate-400">Nothing available yet — check back soon.</p>}
      </div>
    </div>
  );
}

function PurchaseForm({
  offering,
  participants,
}: {
  offering: Offering;
  participants: MeResponse["participants"];
}) {
  return (
    <form action={purchaseOfferingAction} className="flex items-center gap-2">
      <input type="hidden" name="offeringId" value={offering.id} />
      <select name="participantId" className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
        {participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.firstName} ({p.tokenBalance} tokens)
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
        {offering.type === "league" || offering.type === "camp" ? "Enroll" : "Buy"}
      </button>
    </form>
  );
}
