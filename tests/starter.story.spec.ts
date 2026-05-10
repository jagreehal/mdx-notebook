import { expect, test } from "@playwright/test";
import { story } from "executable-stories-playwright";

test("Starter renders all 3 cell kinds and JsonEditor mutates state", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["starter", "e2e"] });
  story.given("the starter Astro app is running on localhost:4321");

  story.when("the homepage is loaded");
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  story.then("the inline cell stdout is visible");
  await expect(page.getByText(/Hello from inline TypeScript/).first()).toBeVisible();

  story.then("the agent trace shows captured steps");
  // "Step 1" appears as a <summary> heading in the AgentTrace component
  await expect(page.locator("summary", { hasText: "Step 1" }).first()).toBeVisible();
  // "Pack a light jacket" appears in the AgentTrace "Final result" details; use first() to avoid strict-mode error
  await expect(page.getByText(/Pack a light jacket/).first()).toBeVisible();

  story.then("the Jupyter notebook output is visible");
  await expect(page.getByText(/Hello from Jupyter!/)).toBeVisible();

  story.then("the JsonEditor textarea is present and contains the cell result as JSON");
  // Open the <details> wrapping the JsonEditor
  await page.locator("summary", { hasText: "Edit the result live" }).click();
  const editor = page.getByLabel(/Edit JSON for trace/);
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue(/finalResponse/);

  story.when("the editor's JSON is replaced with a new value");
  // Playwright fill() updates the DOM value and fires input/change events.
  // React 19 handles 'change' events for controlled textarea onChange.
  await editor.fill(JSON.stringify({ finalResponse: "Edited live", steps: 99 }, null, 2));
  await page.waitForTimeout(300);

  story.then("the displayed result reflects the edit");
  // The ResultJSON re-renders with the new value; it appears in the AgentTrace final-result code
  // block AND in the ResultJSON below the editor. Use first() to avoid strict-mode error.
  await expect(page.getByText(/Edited live/).first()).toBeVisible();

  story.then("the Math section renders KaTeX output");
  await expect(page.locator(".katex").first()).toBeVisible();

  story.then("the NotebookCell composite renders code + output together");
  await expect(page.getByText(/NotebookCell composite/)).toBeVisible();

  story.then("the callouts demo renders with the tip class");
  await expect(page.locator(".mdx-nb-callout-tip").first()).toBeVisible();

  story.then("Expressive Code applies shiki highlighting");
  // Expressive Code emits .expressive-code wrapper; verify presence
  await expect(page.locator(".expressive-code").first()).toBeVisible();
});
