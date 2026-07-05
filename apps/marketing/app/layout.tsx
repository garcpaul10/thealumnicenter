import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Alumni Center — Every sport. One card.",
  description:
    "A multi-sport athletic facility with leagues, open play, camps, and reservations — all on one membership card.",
};

export const viewport: Viewport = {
  themeColor: "#0F5898",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
