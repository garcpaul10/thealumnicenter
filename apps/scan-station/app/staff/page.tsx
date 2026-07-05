"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, staffBearer } from "@/lib/api";
import { getStaffToken } from "@/lib/device";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

/** Staff-mode manual lookup — the fallback when a member's phone/QR isn't handy, and the anti-fraud "does this photo match" check DESIGN.md calls out. */
export default function StaffLookupPage() {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [result, setResult] = useState<{ participant: Participant; balance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStaffToken()) router.replace("/");
  }, [router]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<{ participant: Participant; balance: number }>(
        `/scan-station/member/${participantId}`,
        { bearer: staffBearer() },
      );
      setResult(data);
    } catch {
      setError("Participant not found");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-bold text-brand">Staff Lookup</h1>
          <a href="/" className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            Back to scan
          </a>
        </div>

        <form onSubmit={handleLookup} className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="Participant ID"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
          />
          <button type="submit" className="w-full rounded-lg bg-brand py-3 font-semibold">
            Look up
          </button>
        </form>

        {error && <p className="text-red-400">{error}</p>}

        {result && (
          <div className="rounded-2xl bg-slate-900 p-6 text-center">
            {result.participant.photoUrl ? (
              <img src={result.participant.photoUrl} alt="" className="mx-auto mb-4 h-32 w-32 rounded-full object-cover" />
            ) : (
              <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-slate-700 text-4xl">
                {result.participant.firstName[0]}
                {result.participant.lastName[0]}
              </div>
            )}
            <p className="text-xl font-bold">
              {result.participant.firstName} {result.participant.lastName}
            </p>
            <p className="mt-1 text-brand">{result.balance} tokens</p>
          </div>
        )}
      </div>
    </main>
  );
}
