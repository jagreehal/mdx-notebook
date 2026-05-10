import { expect, test } from "@playwright/test";
import { story } from "executable-stories-playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STARTER = join(__dirname, "..", "examples", "starter");
const AGENT = join(STARTER, "scripts", "agent.ts");

test("editing agent.ts triggers a reload and updates the rendered output", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["hmr"] });
  story.given("the starter dev server is up and the homepage is loaded with the original agent output");

  const original = await readFile(AGENT, "utf8");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Pack a light jacket/).first()).toBeVisible();

  story.when("agent.ts is rewritten with a new finalResponse and saved");
  const edited = original.replace(
    "Pack a light jacket — Tokyo is mild today.",
    "HMR sentinel string from the test"
  );
  await writeFile(AGENT, edited, "utf8");

  try {
    story.then("the page reloads and the new output is rendered");
    // A full-reload causes window.location.reload(); wait for the navigation to
    // settle and then poll until the new content appears (the server re-runs
    // the notebook on the fresh request).
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    // Poll until the updated content is visible; the reload + re-execution may
    // take a few seconds.
    await expect(page.getByText(/HMR sentinel string from the test/).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    // Restore the file no matter what so the suite is repeatable.
    await writeFile(AGENT, original, "utf8");
  }
});
