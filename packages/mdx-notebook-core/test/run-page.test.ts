// packages/core/test/run-page.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPage } from "../src/run-page.js";
import { clearRegistry, registerRunner } from "../src/runner-registry.js";
import type { Runner, RunCtx } from "../src/types.js";

const fakeTs: Runner = {
  language: "ts",
  version: "test-1",
  canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
  run: async (c) => ({
    cellId: c.id, status: "ok", durationMs: 1, exitCode: 0,
    stdout: [{ ts: 1, stream: "stdout", text: `ran ${c.id}` }], stderr: []
  })
};

const FIX = join(__dirname, "fixtures");

describe("runPage", () => {
  beforeEach(() => { clearRegistry(); registerRunner(fakeTs); });

  it("processes basic.mdx end-to-end and returns a manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    const m = await runPage(join(FIX, "basic.mdx"), { rootDir: root });
    expect(m.pageId).toMatch(/^[0-9a-f]{16}$/);
    expect(Object.keys(m.cells)).toEqual(["hello"]);
    expect(m.cells.hello!.status).toBe("ok");
  });

  it("uses cache on second run for unchanged source", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    let calls = 0;
    const counting: Runner = {
      ...fakeTs,
      run: async (c) => { calls++; return fakeTs.run(c, { signal: new AbortController().signal, cwd: ".", env: {}, timeoutMs: 1000 }); }
    };
    clearRegistry(); registerRunner(counting);
    await runPage(join(FIX, "basic.mdx"), { rootDir: root });
    await runPage(join(FIX, "basic.mdx"), { rootDir: root });
    expect(calls).toBe(1);
  });

  it("with --no-cache, re-runs every time", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    let calls = 0;
    const counting: Runner = { ...fakeTs, run: async (c) => { calls++; return fakeTs.run(c, { signal: new AbortController().signal, cwd: ".", env: {}, timeoutMs: 1000 }); } };
    clearRegistry(); registerRunner(counting);
    await runPage(join(FIX, "basic.mdx"), { rootDir: root, useCache: false });
    await runPage(join(FIX, "basic.mdx"), { rootDir: root, useCache: false });
    expect(calls).toBe(2);
  });

  it("strict mode rethrows when a cell errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    const erroring: Runner = {
      ...fakeTs,
      run: async (c) => ({ cellId: c.id, status: "error", durationMs: 0, exitCode: 1, stdout: [], stderr: [], error: { name: "X", message: "boom" } })
    };
    clearRegistry(); registerRunner(erroring);
    await expect(runPage(join(FIX, "basic.mdx"), { rootDir: root, strict: true }))
      .rejects.toThrow(/boom/);
  });

  it("re-runs downstream cell when upstream result changes (useCache:false)", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-dep-"));
    let upstreamResult: unknown = { v: 1 };
    const depRunner: Runner = {
      language: "ts",
      version: "test-2",
      canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
      run: async (c) => ({
        cellId: c.id,
        status: "ok",
        durationMs: 1,
        exitCode: 0,
        stdout: [],
        stderr: [],
        result: c.id === "numbers" ? upstreamResult : undefined
      })
    };

    clearRegistry(); registerRunner(depRunner);
    const m1 = await runPage(join(FIX, "multi-cell.mdx"), { rootDir: root, useCache: false });
    expect(m1.cells["numbers"]?.result).toEqual({ v: 1 });
    expect(m1.cells["sum"]?.status).toBe("ok");

    // Change upstream result and re-run without cache
    upstreamResult = { v: 2 };
    clearRegistry(); registerRunner(depRunner);
    const m2 = await runPage(join(FIX, "multi-cell.mdx"), { rootDir: root, useCache: false });
    expect(m2.cells["numbers"]?.result).toEqual({ v: 2 });
    expect(m2.cells["sum"]?.status).toBe("ok");
  });

  it("matrix cell: runFn receives per-variant env; manifest.cells contains variants", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-matrix-"));
    const capturedEnvs: Array<Record<string, string>> = [];
    const matrixRunner: Runner = {
      language: "ts",
      version: "test-matrix",
      canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
      run: async (c, ctx: RunCtx) => {
        capturedEnvs.push({ ...ctx.env });
        return {
          cellId: c.id,
          status: "ok",
          durationMs: 1,
          exitCode: 0,
          stdout: [],
          stderr: [],
          result: ctx.env
        };
      }
    };
    clearRegistry(); registerRunner(matrixRunner);
    const m = await runPage(join(FIX, "matrix.mdx"), { rootDir: root, useCache: false });

    // The cell should appear in manifest
    expect(m.cells["demo"]).toBeDefined();
    // variants should be present with all three labels
    const demo = m.cells["demo"]!;
    expect(demo.variants).toBeDefined();
    expect(Object.keys(demo.variants!).sort()).toEqual(["crash", "happy", "resume"]);
    // The "crash" variant should have CRASH_AFTER in its env result
    expect((demo.variants!["crash"]!.result as Record<string, string>)["CRASH_AFTER"]).toBe("2");
    // The "resume" variant should have RESUMING in its env result
    expect((demo.variants!["resume"]!.result as Record<string, string>)["RESUMING"]).toBe("1");
    // The "happy" variant has no extra env keys injected
    expect((demo.variants!["happy"]!.result as Record<string, string>)["CRASH_AFTER"]).toBeUndefined();
    // Runner was called 3 times (once per variant)
    expect(capturedEnvs).toHaveLength(3);
  });

  it("emits tutorial metadata, checkpoints, and progress", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-tutorial-"));
    const tutorialRunner: Runner = {
      language: "ts",
      version: "test-tutorial",
      canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
      run: async (c) => ({
        cellId: c.id,
        status: "ok",
        durationMs: 1,
        exitCode: 0,
        stdout: [{ ts: 1, stream: "stdout", text: `ran ${c.id}` }],
        stderr: [],
        result: c.id === "numbers" ? [1, 2, 3, 4] : c.id === "sum" ? 10 : undefined
      })
    };
    clearRegistry(); registerRunner(tutorialRunner);
    const m = await runPage(join(FIX, "tutorial-quality.mdx"), {
      rootDir: root,
      completedLessons: ["lesson-01"]
    });

    expect(m.tutorial?.lessonId).toBe("lesson-02");
    expect(m.tutorial?.prerequisites).toEqual(["lesson-01"]);
    expect(m.checkpoints?.map((c) => c.id)).toEqual(["sum-equals-10", "sum-stdout"]);
    expect(m.checkpoints?.every((c) => c.passed)).toBe(true);
    expect(m.progress).toMatchObject({
      requiredTotal: 1,
      requiredPassed: 1,
      optionalTotal: 1,
      optionalPassed: 1,
      percent: 100,
      completed: true
    });
  });
});
