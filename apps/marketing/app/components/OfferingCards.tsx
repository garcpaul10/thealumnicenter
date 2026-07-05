const OFFERINGS = [
  { title: "Adult leagues", copy: "8-week seasons. Real standings.", from: "from-sky-700", to: "to-brand-dark" },
  { title: "Camps & lessons", copy: "Coached, for every age.", from: "from-amber-700", to: "to-amber-900" },
  { title: "Open play", copy: "Walk in, scan your card, play.", from: "from-emerald-700", to: "to-emerald-900" },
  { title: "Book a court", copy: "Reserve a space, split the cost.", from: "from-orange-700", to: "to-orange-900" },
];

/** Card-style offering grid, Apple-restrained: no copy beyond one short line, the color block stands in for real facility photography (see CLAUDE.md §5/§11 — a real photo shoot is a flagged, not-yet-done dependency). */
export function OfferingCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {OFFERINGS.map((offering) => (
        <div
          key={offering.title}
          className="group overflow-hidden rounded-2xl border border-neutral-200 transition-transform duration-200 hover:-translate-y-1"
        >
          <div className={`h-36 bg-gradient-to-br ${offering.from} ${offering.to}`} />
          <div className="p-5">
            <p className="text-[15px] font-semibold">{offering.title}</p>
            <p className="mt-1 text-sm text-neutral-500">{offering.copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
