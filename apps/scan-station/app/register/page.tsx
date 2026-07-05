"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setDeviceToken } from "@/lib/device";

interface Space {
  id: string;
  name: string;
}

/**
 * One-time setup screen for a new tablet — a staff member logs in (staff
 * dashboard JWT, used only for this request, never stored), picks the
 * space this kiosk is bolted to, and the resulting long-lived device token
 * is what the rest of this app uses from then on. Re-running this screen
 * re-binds the device to a (possibly different) space.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "bind">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [staffToken, setStaffToken] = useState("");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: { phone, password },
        bearer: "",
      });
      const spaceList = await apiFetch<Space[]>("/spaces", { bearer: result.token });
      setStaffToken(result.token);
      setSpaces(spaceList);
      setSpaceId(spaceList[0]?.id ?? "");
      setStep("bind");
    } catch {
      setError("Invalid staff phone or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBind(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ deviceToken: string; device: { spaceId: string } }>("/kiosk-devices", {
        method: "POST",
        body: { spaceId, deviceLabel },
        bearer: staffToken,
      });
      const space = spaces.find((s) => s.id === result.device.spaceId);
      setDeviceToken(result.deviceToken, space?.name ?? "Unknown space");
      router.push("/");
    } catch {
      setError("Could not register this device. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-8">
        <h1 className="mb-1 text-center text-xl font-bold text-brand">The Alumni Center</h1>
        <p className="mb-6 text-center text-sm text-slate-400">Scan station setup</p>

        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="tel"
              placeholder="Staff phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-lg"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-lg"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-3 text-lg font-semibold disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {step === "bind" && (
          <form onSubmit={handleBind} className="space-y-4">
            <label className="block text-sm text-slate-400">
              Space this kiosk is bound to
              <select
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-lg"
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="text"
              placeholder="Device label (e.g. Court 1 Tablet)"
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-lg"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-3 text-lg font-semibold disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register this kiosk"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
