"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "../components/QrScanner";
import { apiFetch, staffBearer } from "@/lib/api";
import { getStaffToken } from "@/lib/device";

interface MenuItem {
  id: string;
  name: string;
  tokenPrice: number;
  partnerId: string | null;
}

/** Vendor/concession POS mode — "another scan point" per DESIGN.md: scan → ring up items → deduct. Staff-mode gated since it can charge any scanned member. */
export default function VendorPosPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getStaffToken()) {
      router.replace("/");
      return;
    }
    apiFetch<MenuItem[]>("/scan-station/menu-items").then(setMenuItems).catch(() => setMenuItems([]));
  }, [router]);

  const total = menuItems.reduce((sum, item) => sum + (cart[item.id] ?? 0) * item.tokenPrice, 0);
  const itemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  function addItem(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function removeItem(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) next[id]--;
      else delete next[id];
      return next;
    });
  }

  async function submitOrder() {
    if (!qrToken || itemCount === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const items = Object.entries(cart).map(([menuItemId, qty]) => ({ menuItemId, qty }));
      const firstItem = menuItems.find((item) => item.id === items[0]?.menuItemId);
      await apiFetch("/scan-station/vendor-orders", {
        method: "POST",
        body: { qrToken, partnerId: firstItem?.partnerId ?? null, items },
        bearer: staffBearer(),
      });
      setStatus(`Charged ${total} tokens.`);
      setCart({});
      setQrToken(null);
    } catch {
      setStatus("Order failed — insufficient balance or scan again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-bold text-brand">Vendor POS</h1>
          <a href="/" className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            Back to scan
          </a>
        </div>

        <div className="mb-4 space-y-2">
          {menuItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-400">{item.tokenPrice} tokens</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => removeItem(item.id)} className="rounded bg-slate-800 px-3 py-1">
                  −
                </button>
                <span>{cart[item.id] ?? 0}</span>
                <button onClick={() => addItem(item.id)} className="rounded bg-slate-800 px-3 py-1">
                  +
                </button>
              </div>
            </div>
          ))}
          {menuItems.length === 0 && <p className="text-slate-400">No menu items configured yet.</p>}
        </div>

        <p className="mb-4 text-right text-lg font-semibold">Total: {total} tokens</p>

        {!qrToken ? (
          <QrScanner onDecode={setQrToken} cooldownMs={500} />
        ) : (
          <button
            onClick={submitOrder}
            disabled={busy || itemCount === 0}
            className="w-full rounded-lg bg-brand py-4 text-lg font-semibold disabled:opacity-50"
          >
            {busy ? "Charging..." : `Charge ${total} tokens`}
          </button>
        )}

        {status && <p className="mt-4 text-center">{status}</p>}
      </div>
    </main>
  );
}
