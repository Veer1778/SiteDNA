import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

// Self-hosted via next/font (built at compile time, no runtime request to Google Fonts).
// Fraunces (a warm, rounded serif) carries headings — it reads as tactile/crafted, fitting the
// skeuomorphic direction; Inter stays the body workhorse for readability at small sizes.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "BrandKit AI",
  description: "Extract a brand kit from any public URL.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
