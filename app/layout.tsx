import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strava Map Silhouette",
  description:
    "Next.js migration baseline for Strava map silhouette generation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
