import type { Metadata } from "next";
import "./globals.css";

// This is a 100% authenticated, session-driven dashboard — nothing here is
// valid to statically prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Alumni Center — Admin",
  description: "Staff dashboard for The Alumni Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
