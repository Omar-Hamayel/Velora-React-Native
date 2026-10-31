import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/sdk-upgrade",
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:18083",
    channel: "msedge",
    headless: true,
    viewport: { width: 430, height: 932 },
    trace: "off",
    screenshot: "only-on-failure",
  },
  outputDir: "test-results/sdk-upgrade",
  reporter: [["list"], ["json", { outputFile: "test-results/sdk-upgrade-results.json" }]],
});
