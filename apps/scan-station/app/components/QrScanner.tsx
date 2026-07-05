"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Decodes QR codes from the device camera in a requestAnimationFrame loop.
 * Fires onDecode at most once per `cooldownMs` so holding a phone under the
 * camera doesn't spam the scan endpoint with the same token repeatedly.
 */
export function QrScanner({ onDecode, cooldownMs = 2000 }: { onDecode: (data: string) => void; cooldownMs?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDecodeRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        setError("Camera access is required to scan Alumni Cards — check the kiosk's browser permissions.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && Date.now() - lastDecodeRef.current > cooldownMs) {
            lastDecodeRef.current = Date.now();
            onDecode(code.data);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDecode, cooldownMs]);

  if (error) {
    return <div className="rounded-lg bg-red-950 p-4 text-center text-sm text-red-200">{error}</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-brand">
      <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
