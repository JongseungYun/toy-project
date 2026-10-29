import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

const baseURL = "http://localhost:3001";

export default defineConfig({
  ...base,
  testMatch: /read-errors\.spec\.ts$/,
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  use: { ...base.use, baseURL },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --port 3001",
    env: { NEXT_TEST_PROXY: "1" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
