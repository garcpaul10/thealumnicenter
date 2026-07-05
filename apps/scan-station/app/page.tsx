"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "./components/QrScanner";
import { apiFetch } from "@/lib/api";
import { getDeviceToken, getDeviceSpaceName, getStaffToken, setStaffToken, clearStaffToken } from "@/lib/device";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  accountId: string;
}

type ScanDecision =
  | { resolution: "pass_checkin"; participant: Participant }
  | { resolution: "enrollment_checkin"; participant: Participant }
  | { resolution: "walk_in_available"; participant: Participant; scheduleBlockId: string; walkInTokenPrice: number | null }
  | { resolution: "denied"; participant: Participant | null; denialReason: string };

export default function KioskPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [decision, setDecision] = useState<ScanDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (!getDeviceToken()) {
      router.replace("/register");
      return;
    }
    setSpaceName(getDeviceSpaceName() ?? "");
    setStaffName(getStaffToken()?.name ?? null);
    setReady(true);
  }, [router]);

  const handleDecode = useCallback(
    async (qrToken: string) => {
      if (busy || decision) return;
      setBusy(true);
      try {
        const result = await apiFetch<ScanDecision>("/scan-station/scan", { method: "POST", body: { qrToken } });
        setDecision(result);
        if (result.resolution !== "walk_in_available") {
          setTimeout(() => setDecision(null), 3000);
        }
      } catch {
        setDecision({ resolution: "denied", participant: null, denialReason: "Could not reach the server" });
        setTimeout(() => setDecision(null), 3000);
      } finally {
        setBusy(false);
      }
    },
    [busy, decision],
  );

  async function handleConfirmWalkIn() {
    if (!decision || decision.resolution !== "walk_in_available" || decision.walkInTokenPrice == null) return;
    setBusy(true);
    try {
      await apiFetch("/scan-station/confirm-walk-in", {
        method: "POST",
        body: {
          participantId: decision.participant.id,
          accountId: decision.participant.accountId,
          scheduleBlockId: decision.scheduleBlockId,
          amountTokens: decision.walkInTokenPrice,
        },
      });
      setDecision(null);
    } catch {
      setPinError(null);
      setDecision({ resolution: "denied", participant: decision.participant, denialReason: "Charge failed — insufficient balance?" });
      setTimeout(() => setDecision(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    try {
      const result = await apiFetch<{ staffToken: string; staffUser: { name: string } }>("/scan-station/pin-unlock", {
        method: "POST",
        body: { pin },
      });
      setStaffToken(result.staffToken, result.staffUser.name);
      setStaffName(result.staffUser.name);
      setShowPinPad(false);
      setPin("");
    } catch {
      setPinError("Invalid PIN");
    }
  }

  if (!ready) return null;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <header className="mb-6 flex w-full max-w-md items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-brand">The Alumni Center</h1>
          <p className="text-sm text-slate-400">{spaceName}</p>
        </div>
        {staffName ? (
          <div className="flex items-center gap-2 text-sm">
            <a href="/staff" className="rounded-lg bg-slate-800 px-3 py-2">
              Staff: {staffName}
            </a>
            <a href="/vendor" className="rounded-lg bg-slate-800 px-3 py-2">
              Vendor POS
            </a>
            <button
              onClick={() => {
                clearStaffToken();
                setStaffName(null);
              }}
              className="rounded-lg bg-slate-800 px-3 py-2"
            >
              Lock
            </button>
          </div>
        ) : (
          <button onClick={() => setShowPinPad(true)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm">
            Staff Mode
          </button>
        )}
      </header>

      <div className="w-full max-w-md">
        {!decision && <QrScanner onDecode={handleDecode} />}

        {decision && (
          <ResultCard decision={decision} busy={busy} onConfirm={handleConfirmWalkIn} onCancel={() => setDecision(null)} />
        )}
      </div>

      {showPinPad && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-4 rounded-2xl bg-slate-900 p-6">
            <h2 className="text-center text-lg font-semibold">Staff PIN</h2>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center text-2xl tracking-widest"
            />
            {pinError && <p className="text-center text-sm text-red-400">{pinError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPinPad(false);
                  setPin("");
                  setPinError(null);
                }}
                className="flex-1 rounded-lg bg-slate-800 py-3"
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 rounded-lg bg-brand py-3 font-semibold">
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function ResultCard({
  decision,
  busy,
  onConfirm,
  onCancel,
}: {
  decision: ScanDecision;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const name = decision.participant ? `${decision.participant.firstName} ${decision.participant.lastName}` : null;

  if (decision.resolution === "denied") {
    return (
      <div className="rounded-2xl bg-red-950 p-8 text-center">
        <p className="mb-2 text-4xl">✕</p>
        {name && <p className="mb-1 text-lg font-semibold">{name}</p>}
        <p className="text-red-200">{decision.denialReason}</p>
      </div>
    );
  }

  if (decision.resolution === "pass_checkin" || decision.resolution === "enrollment_checkin") {
    return (
      <div className="rounded-2xl bg-green-950 p-8 text-center">
        <p className="mb-2 text-4xl">✓</p>
        <p className="mb-1 text-xl font-bold">{name}</p>
        <p className="text-green-200">
          {decision.resolution === "pass_checkin" ? "Checked in — free play pass" : "Checked in — enrolled"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 p-8 text-center">
      <p className="mb-1 text-xl font-bold">{name}</p>
      <p className="mb-6 text-slate-300">
        No pass or enrollment found. Walk-in: <span className="font-semibold text-brand">{decision.walkInTokenPrice} tokens</span>
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={busy} className="flex-1 rounded-lg bg-slate-800 py-3">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={busy || decision.walkInTokenPrice == null} className="flex-1 rounded-lg bg-brand py-3 font-semibold disabled:opacity-50">
          {busy ? "Charging..." : "Confirm & Deduct"}
        </button>
      </div>
    </div>
  );
}
