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
  story.given("the starter dev server is up and the tutorial 01 page is loaded with the original agent output");

  const original = await readFile(AGENT, "utf8");
  await page.goto("/tutorials/01-getting-started");
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
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await expect(page.getByText(/HMR sentinel string from the test/).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    await writeFile(AGENT, original, "utf8");
  }
});
