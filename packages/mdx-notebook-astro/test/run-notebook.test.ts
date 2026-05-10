import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runNotebook } from "../src/index.js";
import { clearRegistry, registerRunner } from "mdx-notebook-core";
import { runnerTs } from "mdx-notebook-runner-ts";

beforeAll(() => { clearRegistry(); registerRunner(runnerTs); });

describe("runNotebook", () => {
  it("returns a manifest for an MDX path with an inline TS cell", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-nb-astro-"));
    const mdx = join(root, "page.mdx");
    await writeFile(mdx, "```ts run id=hello\nconsole.log(\"hi\");\n```\n");
    const m = await runNotebook("page.mdx", { rootDir: root });
    expect(Object.keys(m.cells)).toEqual(["hello"]);
    expect(m.cells.hello!.status).toBe("ok");
    expect(m.cells.hello!.stdout.map((e) => e.text)).toContain("hi");
  }, 30_000);

  it("resolves an absolute path", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-nb-astro-abs-"));
    const mdx = join(root, "p.mdx");
    await writeFile(mdx, "```ts run id=x\nconsole.log(1);\n```\n");
    const m = await runNotebook(mdx, { rootDir: root });
    expect(m.cells.x!.status).toBe("ok");
  }, 30_000);
});
