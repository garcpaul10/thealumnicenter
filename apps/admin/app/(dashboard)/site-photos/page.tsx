import { apiFetch } from "../../../lib/api";
import { uploadSiteImageAction } from "./actions";

interface SiteImageSlot {
  slotKey: string;
  imageUrl: string | null;
  updatedAt: string | null;
}

function slotLabel(slotKey: string): string {
  if (slotKey === "hero") return "Homepage hero";
  if (slotKey === "about") return "About page banner";
  if (slotKey.startsWith("offering:")) {
    const name = slotKey.split(":")[1];
    return `Offering card — ${name}`;
  }
  if (slotKey.startsWith("sport:")) {
    const slug = slotKey.split(":")[1];
    return `Sport — ${slug}`;
  }
  return slotKey;
}

export default async function SitePhotosPage() {
  const slots = await apiFetch<SiteImageSlot[]>("/site-images");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Site photos</h1>
      <p className="mb-6 max-w-2xl text-sm text-slate-500">
        Photos shown on the public main site (apps/marketing). Each slot falls back to a generic stock placeholder until a
        real photo is uploaded here.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <div key={slot.slotKey} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex h-32 items-center justify-center bg-slate-100">
              {slot.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">No photo set — using placeholder</span>
              )}
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-slate-900">{slotLabel(slot.slotKey)}</p>
              {slot.updatedAt && (
                <p className="mt-0.5 text-xs text-slate-400">Updated {new Date(slot.updatedAt).toLocaleDateString()}</p>
              )}
              <form action={uploadSiteImageAction} className="mt-3">
                <input type="hidden" name="slotKey" value={slot.slotKey} />
                <input
                  type="file"
                  name="file"
                  accept="image/*"
                  required
                  className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                />
                <button
                  type="submit"
                  className="mt-2 w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Upload
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
