import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Alumni Center — Scan Station",
  description: "Kiosk scan-in station.",
};

export const viewport: Viewport = {
  themeColor: "#0F5898",
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
