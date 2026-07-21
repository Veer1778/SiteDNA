import { createApp } from "../../../src/app";

// `E2E_ALLOW_PRIVATE_NETWORK` is set only by `playwright.config.ts`'s `webServer.env`, so the
// Playwright E2E suite can submit `packages/crawler`'s local loopback fixture site — never set
// this outside of that test run.
const app = createApp({
  allowPrivateNetwork: process.env.E2E_ALLOW_PRIVATE_NETWORK === "1",
});

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;
