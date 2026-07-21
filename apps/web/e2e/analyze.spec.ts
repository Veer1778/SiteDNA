import type { Server } from "node:http";

import { expect, test } from "@playwright/test";

import { startFixtureServer } from "../src/test-utils";

let fixtureServer: Server;
let fixtureUrl: string;

test.beforeAll(async () => {
  const { server, baseUrl } = await startFixtureServer();
  fixtureServer = server;
  fixtureUrl = baseUrl;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => fixtureServer.close(() => resolve()));
});

test("submits the fixture site and renders a completed Brand Kit", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Website URL").fill(fixtureUrl);
  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(page).toHaveURL(/\/analyze\//, { timeout: 15_000 });

  await expect(page.getByRole("heading", { name: "Brand Kit" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/% complete/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Typography" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Colors" })).toBeVisible();
});
