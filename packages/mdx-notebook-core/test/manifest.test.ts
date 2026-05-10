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

  it("includes optional tutorial/checkpoint/progress fields", () => {
    const m = buildManifest("page1", [co("x")], {
      tutorial: { lessonId: "l1", title: "Intro" },
      checkpoints: [{
        id: "c1",
        cellId: "x",
        passed: true,
        required: true,
        weight: 1,
        op: "equals",
        path: "result"
      }],
      progress: {
        requiredTotal: 1,
        requiredPassed: 1,
        optionalTotal: 0,
        optionalPassed: 0,
        weightedScore: 1,
        weightedMax: 1,
        percent: 100,
        completed: true,
        prerequisites: { required: [], missing: [], satisfied: true }
      }
    });
    expect(m.tutorial?.lessonId).toBe("l1");
    expect(m.checkpoints?.[0]?.id).toBe("c1");
    expect(m.progress?.completed).toBe(true);
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
