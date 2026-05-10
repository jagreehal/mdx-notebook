import { story } from "executable-stories-vitest";
import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../packages/create-mdx-notebook/src/index.js";

describe("create-mdx-notebook scaffold", () => {
  it("scaffolds a working starter into a fresh directory", async ({ task }) => {
    story.init(task, { tags: ["scaffolder"] });
    story.given("an empty target directory");
    const target = await mkdtemp(join(tmpdir(), "mdx-nb-story-"));

    story.when("scaffold({ target, linked: true }) is invoked");
    await scaffold({ target, log: false, linked: true });

    story.then("the target contains the expected starter files");
    const entries = await readdir(target);
    expect(entries).toEqual(expect.arrayContaining(["package.json", "astro.config.mjs", "src", "notebooks", "scripts"]));
    const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    expect(pkg.dependencies["mdx-notebook-react"]).toMatch(/^workspace:/);
  });
});
