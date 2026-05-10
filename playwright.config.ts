import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    [process.env.CI ? "github" : "list"],
    [
      "executable-stories-playwright/reporter",
      {
        formats: ["markdown"],
        outputDir: "docs/evidence",
        outputName: "playwright-stories",
        rawRunPath: ".executable-stories/playwright-raw-run.json",
        output: { mode: "aggregated" },
        markdown: {
          title: "mdx-notebook Playwright Stories",
          includeStatusIcons: true,
          includeErrors: true,
          includeMetadata: true,
          sortScenarios: "source"
        }
      }
    ]
  ],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  webServer: {
    command: "pnpm --filter mdx-notebook-starter dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
