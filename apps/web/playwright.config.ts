import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: `next dev --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { E2E_ALLOW_PRIVATE_NETWORK: "1" },
  },
});
