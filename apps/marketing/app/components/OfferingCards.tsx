const OFFERINGS = [
  {
    title: "Adult leagues",
    copy: "8-week seasons, real standings, playoffs.",
    from: "from-sky-700",
    to: "to-sky-900",
  },
  {
    title: "Camps and lessons",
    copy: "Coached sessions for every age.",
    from: "from-amber-700",
    to: "to-amber-900",
  },
  {
    title: "Open play",
    copy: "Walk in, scan your card, play.",
    from: "from-emerald-700",
    to: "to-emerald-900",
  },
  {
    title: "Book a court",
    copy: "Reserve a space, split the cost with friends.",
    from: "from-orange-700",
    to: "to-orange-900",
  },
];

/** Card-style offering grid — image block on top, copy below, hover-lift. The gradient blocks stand in for real facility photography (see CLAUDE.md §4/§5 — a real photo shoot is a flagged follow-up, not done here). */
export function OfferingCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-6 sm:grid-cols-2">
      {OFFERINGS.map((offering) => (
        <div
          key={offering.title}
          className="group overflow-hidden rounded-xl bg-panel transition-transform duration-200 hover:-translate-y-1.5"
        >
          <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${offering.from} ${offering.to}`}>
            <span className="text-3xl font-semibold text-white/90">{offering.title[0]}</span>
          </div>
          <div className="p-4">
            <p className="font-medium">{offering.title}</p>
            <p className="mt-1 text-sm text-slate-400">{offering.copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
