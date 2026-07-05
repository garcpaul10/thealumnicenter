/**
 * Pure-CSS animated gradient blobs — the "high-end app" ambient motion
 * behind glass panels. No JS, no images, so it's free. `variant="light"`
 * (lower opacity) is for use directly on the white page background;
 * `variant="dark"` (default) is for use over a dark/photo hero.
 */
export function BlobBackground({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const light = variant === "light";
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className={`animate-blob-1 absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-400 blur-3xl ${light ? "opacity-10" : "opacity-40"}`} />
      <div className={`animate-blob-2 absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand blur-3xl ${light ? "opacity-10" : "opacity-40"}`} />
      <div className={`animate-blob-1 absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-live blur-3xl ${light ? "opacity-5" : "opacity-20"}`} />
    </div>
  );
}
