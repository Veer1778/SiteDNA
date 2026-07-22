import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

// Self-hosted via next/font (built at compile time, no runtime request to Google Fonts). Inter
// is the fallback for everywhere `-apple-system`/`BlinkMacSystemFont` doesn't resolve to San
// Francisco (see globals.css's `--font-sans`) — one grotesque family, hierarchy via weight, no
// separate display face, matching the Apple-product-page direction.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "BrandKit AI",
  description: "Extract a brand kit from any public URL.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
