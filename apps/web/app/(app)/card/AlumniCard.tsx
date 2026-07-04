"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { CardCosmetic, Participant } from "../../../lib/types";

const REFRESH_MS = 20_000; // token TTL is 30s server-side; refresh before it expires

const BACKGROUND_COLORS: Record<string, string> = {
  default: "#0F5898",
};

export function AlumniCard({
  participant,
  cosmetics,
}: {
  participant: Participant;
  cosmetics: CardCosmetic[];
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const res = await fetch(`/api/qr-token/${participant.id}`, { cache: "no-store" });
      const { token } = await res.json();
      const dataUrl = await QRCode.toDataURL(token, { margin: 1, width: 200 });
      if (!cancelled) setQrDataUrl(dataUrl);
    }

    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [participant.id]);

  const backgroundId = (participant.alumniCardConfig?.backgroundId as string) ?? "default";
  const backgroundColor = BACKGROUND_COLORS[backgroundId] ?? BACKGROUND_COLORS.default;
  const activeBadgeIds = (participant.alumniCardConfig?.badgeIds as string[]) ?? [];
  const activeBadges = cosmetics.filter((c) => c.type === "badge" && activeBadgeIds.includes(c.id));

  return (
    <div
      className="relative mx-auto aspect-[1.6/1] w-full max-w-sm overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{ backgroundColor }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide opacity-80">The Alumni Card</p>
          <p className="mt-1 text-lg font-bold">
            {participant.nickname ?? `${participant.firstName} ${participant.lastName}`}
          </p>
        </div>
        {participant.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={participant.photoUrl} alt="" className="h-12 w-12 rounded-full border-2 border-white object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white/20 text-lg font-bold">
            {participant.firstName[0]}
          </div>
        )}
      </div>

      {activeBadges.length > 0 && (
        <div className="mt-2 flex gap-1">
          {activeBadges.map((b) => (
            <span key={b.id} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
              {b.name}
            </span>
          ))}
        </div>
      )}

      {/* QR fixed in a constant position/size regardless of theme, per DESIGN.md CS3, for reliable scanning */}
      <div className="absolute bottom-4 right-4 rounded-lg bg-white p-1.5">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Scan at any station" width={72} height={72} />
        ) : (
          <div className="h-[72px] w-[72px] animate-pulse bg-slate-200" />
        )}
      </div>
    </div>
  );
}
