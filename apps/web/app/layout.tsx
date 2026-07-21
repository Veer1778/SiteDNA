import type { ReactNode } from "react";

export const metadata = {
  title: "BrandKit AI",
  description: "Extract a brand kit from any public URL.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
