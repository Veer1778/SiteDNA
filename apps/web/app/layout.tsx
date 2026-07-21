import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "BrandKit AI",
  description: "Extract a brand kit from any public URL.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
