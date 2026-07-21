import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Playwright E2E suite drives `next dev` from 127.0.0.1; without this, Next.js blocks
  // its dev-only resources (HMR, etc.) as a cross-origin request.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
