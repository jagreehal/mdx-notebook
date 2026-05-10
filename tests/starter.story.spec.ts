import { expect, test } from "@playwright/test";
import { story } from "executable-stories-playwright";

test("Landing page lists all 4 tutorials", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["starter", "e2e"] });
  story.given("the starter Astro app is running on localhost:4321");

  story.when("the homepage is loaded");
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  story.then("the landing page headline is visible");
  await expect(page.getByText(/Runnable docs that don't go stale/)).toBeVisible();

  story.then("all 4 tutorial links are present");
  await expect(page.getByRole("link", { name: /Getting started/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /AI agents with tool use/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Streaming token output/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Comparing models/ }).first()).toBeVisible();

  story.then("the sidebar shows tutorial navigation");
  await expect(page.getByRole("navigation")).toBeVisible();
});

test("Tutorial 02: agents page renders MessageThread and ToolCallTimeline", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["starter", "e2e"] });
  story.given("the starter Astro app is running on localhost:4321");

  story.when("the agents tutorial page is loaded");
  await page.goto("/tutorials/02-agents");
  await page.waitForLoadState("networkidle");

  story.then("the page heading is visible");
  await expect(page.getByRole("heading", { name: /AI agents with tool use/ })).toBeVisible();

  story.then("the agent stdout steps are rendered");
  await expect(page.getByText(/Step 1/).first()).toBeVisible();

  story.then("the MessageThread shows conversation roles");
  await expect(page.getByText(/user/).first()).toBeVisible();
  await expect(page.getByText(/assistant/).first()).toBeVisible();

  story.then("the ToolCallTimeline lists the getWeather call");
  await expect(page.getByText(/getWeather/).first()).toBeVisible();

  story.then("the lesson nav links are present");
  await expect(page.getByRole("link", { name: /Getting started/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Streaming/ }).first()).toBeVisible();
});

test("Tutorial 03: streaming page renders StreamingStdout", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["starter", "e2e"] });
  story.given("the starter Astro app is running on localhost:4321");

  story.when("the streaming tutorial page is loaded");
  await page.goto("/tutorials/03-streaming");
  await page.waitForLoadState("networkidle");

  story.then("the page heading is visible");
  await expect(page.getByRole("heading", { name: /Streaming token output/ })).toBeVisible();

  story.then("the streaming output container is present");
  await expect(page.locator(".mdx-nb-streaming").first()).toBeVisible();

  story.then("the static stdout comparison is also present");
  await expect(page.getByText(/Static rendering/).first()).toBeVisible();

  story.then("the lesson nav links are present");
  await expect(page.getByRole("link", { name: /AI agents/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Comparing models/ }).first()).toBeVisible();
});

test("Components catalog page lists all renderers with live demos", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["catalog"] });
  story.given("the components page is loaded");
  await page.goto("/components");
  await page.waitForLoadState("networkidle");

  story.then("a Stdout demo renders");
  await expect(page.getByText(/<Stdout cellId='hello'>/).first()).toBeVisible();

  story.then("a Plot demo renders");
  await expect(page.getByText(/<Plot kind='bar'/).first()).toBeVisible();

  story.then("a MessageThread demo renders");
  await expect(page.getByText(/<MessageThread/).first()).toBeVisible();
});

test("Tutorial 05: crash-resume page renders matrix and diff", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["crash-resume"] });
  story.given("the crash-resume tutorial page is loaded");
  await page.goto("/tutorials/05-crash-resume");
  await page.waitForLoadState("networkidle");

  story.then("the RunMatrix tabs are visible");
  await expect(page.getByRole("tab", { name: /happy/i }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /crash/i }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /resume/i }).first()).toBeVisible();

  story.then("the DiffRuns shows the resume-only lines");
  await expect(page.getByText(/replayed from journal/i).first()).toBeVisible();

  story.then("the CodeDiff shows naive vs durable");
  await expect(page.getByText(/runStep\(state/).first()).toBeVisible();
});
