// packages/runner-ts/test/coverage-gaps.test.ts
// Targeted tests to lift runner-ts coverage to thresholds.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve, join } from "node:path";
import { clearRegistry } from "mdx-notebook-core";
import type { Cell, RunCtx } from "mdx-notebook-core";

const FIX = resolve(__dirname, "fixtures");

function ctx(overrides: Partial<RunCtx> = {}): RunCtx {
  return {
    signal: new AbortController().signal,
    cwd: FIX,
    env: { ...(process.env as Record<string, string>) },
    timeoutMs: 10_000,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// index.ts — re-export coverage
// ---------------------------------------------------------------------------
describe("index.ts exports", () => {
  it("exports runnerTs as named and default", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.runnerTs).toBe("object");
    expect(mod.default).toBe(mod.runnerTs);
  });
});

// ---------------------------------------------------------------------------
// register.ts — side-effect import coverage
// ---------------------------------------------------------------------------
describe("register.ts", () => {
  afterEach(() => {
    clearRegistry();
  });

  it("registers runnerTs as a side-effect", async () => {
    const { getRunner } = await import("mdx-notebook-core");
    // register.ts calls registerRunner(runnerTs) on import
    await import("../src/register.js");
    const runner = getRunner("ts");
    expect(runner).toBeDefined();
    expect(runner?.language).toBe("ts");
  });
});

// ---------------------------------------------------------------------------
// runner.ts — ipynb cell path (exercises `error()` helper, lines 130-140)
// ---------------------------------------------------------------------------
describe("runner-ts ipynb cell path", () => {
  it("canHandle returns false for ipynb cells", async () => {
    const { runnerTs } = await import("../src/runner.js");
    const cell: Cell = {
      kind: "ipynb",
      id: "nb1",
      lang: "python",
      src: "/fake/notebook.ipynb",
      cells: "0",
      loc: { file: "doc.mdx", line: 1, column: 1 }
    } as unknown as Cell;
    expect(runnerTs.canHandle(cell)).toBe(false);
  });

  it("run returns error for ipynb cells", async () => {
    const { runnerTs } = await import("../src/runner.js");
    const cell: Cell = {
      kind: "ipynb",
      id: "nb1",
      lang: "python",
      src: "/fake/notebook.ipynb",
      cells: "0",
      loc: { file: "doc.mdx", line: 1, column: 1 }
    } as unknown as Cell;
    const out = await runnerTs.run(cell, ctx());
    expect(out.status).toBe("error");
    expect(out.error?.name).toBe("INTERNAL");
    expect(out.stdout).toEqual([]);
    expect(out.stderr).toEqual([]);
    expect(out.durationMs).toBe(0);
    expect(out.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// runner.ts — file cell with absolute src (exercises resolveTarget absolute
// branch, line 113, and resolveFromMdx relative path)
// ---------------------------------------------------------------------------
describe("runner-ts file cell with absolute src", () => {
  it("resolves absolute src directly", async () => {
    const { runnerTs } = await import("../src/runner.js");
    const absSrc = join(FIX, "plain-script.ts");
    const cell: Cell = {
      kind: "file",
      id: "abs",
      lang: "ts",
      src: absSrc,
      loc: { file: "relative.mdx", line: 1, column: 1 }
    } as unknown as Cell;
    const out = await runnerTs.run(cell, ctx());
    expect(out.status).toBe("ok");
    expect(out.stdout.map((e) => e.text)).toContain("hello from plain script");
  });

  it("resolves file cell with relative mdxFile (exercises resolveFromMdx non-absolute branch)", async () => {
    const { runnerTs } = await import("../src/runner.js");
    const absSrc = join(FIX, "plain-script.ts");
    const cell: Cell = {
      kind: "file",
      id: "rel",
      lang: "ts",
      src: absSrc,
      // relative mdxFile → resolveFromMdx will resolve(cwd, mdxFile)
      loc: { file: "some/relative/doc.mdx", line: 1, column: 1 }
    } as unknown as Cell;
    const out = await runnerTs.run(cell, ctx());
    expect(out.status).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// spawn.ts — abort signal path (exercises lines 52-57)
// ---------------------------------------------------------------------------
describe("spawnTsx abort signal", () => {
  it("aborts a long-running script via AbortSignal", async () => {
    const { spawnTsx } = await import("../src/spawn.js");
    const ac = new AbortController();
    const runP = spawnTsx({
      target: join(FIX, "timeout.ts"),
      cwd: __dirname,
      env: { ...process.env } as Record<string, string>,
      timeoutMs: 30_000,
      signal: ac.signal
    });
    // Abort shortly after spawn so the process is definitely running
    setTimeout(() => ac.abort(), 100);
    const r = await runP;
    expect(r.timedOut).toBe(true);
  });
});
