// packages/core/test/manifest.test.ts
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildManifest, writeManifest, manifestPath } from "../src/manifest.js";
import type { CellOutput } from "../src/types.js";

const co = (id: string): CellOutput => ({
  cellId: id, status: "ok", durationMs: 1, exitCode: 0, stdout: [], stderr: []
});

describe("buildManifest", () => {
  it("preserves insertion order in cells", () => {
    const m = buildManifest("page1", [co("a"), co("b"), co("c")]);
    expect(Object.keys(m.cells)).toEqual(["a", "b", "c"]);
  });
  it("includes pageId and builtAt", () => {
    const m = buildManifest("page1", [co("x")]);
    expect(m.pageId).toBe("page1");
    expect(typeof m.builtAt).toBe("number");
  });
});

describe("writeManifest", () => {
  it("writes JSON to .mdx-notebook/<pageId>.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdx-mf-"));
    const m = buildManifest("p1", [co("x")]);
    await writeManifest(dir, m);
    const got = JSON.parse(await readFile(manifestPath(dir, "p1"), "utf8"));
    expect(got).toEqual(m);
  });
});
