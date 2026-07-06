"use client";

import { useActionState, useState } from "react";
import { uploadSiteImageAction, type UploadSiteImageState } from "./actions";

const initialState: UploadSiteImageState = { error: null };

// Matches apps/api's multipart limit and next.config.mjs's serverActions.bodySizeLimit.
// A file over this crashes the Server Action at the framework transport
// layer before our own error handling ever runs, so it's checked
// client-side too, where it degrades to a normal inline message instead.
const MAX_UPLOAD_MB = 20;

/** Client component so a failed upload (oversized file, wrong type, expired session) shows an inline message instead of crashing to Next.js's generic error overlay. */
export function UploadForm({ slotKey }: { slotKey: string }) {
  const [state, formAction, pending] = useActionState(uploadSiteImageAction, initialState);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const file = new FormData(e.currentTarget).get("file");
    if (file instanceof File && file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      e.preventDefault();
      setClientError(`That image is too large — max ${MAX_UPLOAD_MB}MB. Try a smaller export or a compressed copy.`);
      return;
    }
    setClientError(null);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="mt-3">
      <input type="hidden" name="slotKey" value={slotKey} />
      <input
        type="file"
        name="file"
        accept="image/*"
        required
        className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload"}
      </button>
      {(clientError ?? state.error) && <p className="mt-1.5 text-xs text-red-600">{clientError ?? state.error}</p>}
    </form>
  );
}
