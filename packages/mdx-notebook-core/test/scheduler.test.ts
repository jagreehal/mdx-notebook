import { describe, it, expect } from "vitest";
import { hashDepsResults, topologicalRun } from "../src/scheduler.js";
import type { Cell, CellOutput } from "../src/types.js";
import type { MatrixVariant } from "../src/parse-fence.js";

const loc = { file: "p", line: 1, column: 1 };

function inline(id: string, dependsOn?: string[], matrix?: MatrixVariant[]): Cell {
  return { kind: "inline", id, lang: "ts", code: "", dependsOn, ...(matrix ? { matrix } : {}), loc };
}

const okOut = (id: string, result?: unknown): CellOutput => ({
  cellId: id, status: "ok", durationMs: 1, exitCode: 0, stdout: [], stderr: [], result
});

describe("topologicalRun", () => {
  it("runs cells with no deps in any order; each gets empty deps", async () => {
    const cells = [inline("a"), inline("b")];
    const order: string[] = [];
    await topologicalRun(cells, async (cell, deps) => {
      order.push(cell.id);
      expect(deps).toEqual({});
      return okOut(cell.id);
    });
    expect(order.sort()).toEqual(["a", "b"]);
  });

  it("respects dependency order", async () => {
    const cells = [inline("c", ["b"]), inline("b", ["a"]), inline("a")];
    const order: string[] = [];
    await topologicalRun(cells, async (cell) => {
      order.push(cell.id);
      return okOut(cell.id);
    });
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("provides each cell's deps' results", async () => {
    const cells = [inline("a"), inline("b", ["a"])];
    const captured: Record<string, unknown> = {};
    await topologicalRun(cells, async (cell, deps) => {
      captured[cell.id] = deps;
      return okOut(cell.id, cell.id === "a" ? { value: 42 } : undefined);
    });
    expect(captured.a).toEqual({});
    expect(captured.b).toEqual({ a: { value: 42 } });
  });

  it("skips cells whose dep failed, marking them DependencyFailed", async () => {
    const cells = [inline("a"), inline("b", ["a"])];
    const collected = await topologicalRun(cells, async (cell) => {
      if (cell.id === "a") {
        return {
          cellId: "a", status: "error" as const, durationMs: 0, exitCode: 1,
          stdout: [], stderr: [], error: { name: "X", message: "boom" }
        };
      }
      return okOut(cell.id);
    });
    const b = collected.find((o) => o.cellId === "b")!;
    expect(b.status).toBe("error");
    expect(b.error?.name).toBe("DependencyFailed");
    expect(b.error?.message).toMatch(/dependency "a" failed/);
  });

  it("throws on cyclic dependencies", async () => {
    const cells = [inline("a", ["b"]), inline("b", ["a"])];
    await expect(topologicalRun(cells, async (c) => okOut(c.id))).rejects.toThrow(/CYCLIC_DEPENDS_ON/);
  });

  it("throws on unknown dep id", async () => {
    const cells = [inline("a", ["nope"])];
    await expect(topologicalRun(cells, async (c) => okOut(c.id))).rejects.toThrow(/UNKNOWN_DEP/);
  });

  it("ipynb cells participate as no-op nodes (always treated as ok with empty deps)", async () => {
    const ipynb: Cell = { kind: "ipynb", id: "n:0", src: "x.ipynb", cellIndex: 0, loc };
    const cells: Cell[] = [ipynb, inline("b", ["n:0"])];
    let bDeps: Record<string, unknown> = {};
    await topologicalRun(cells, async (cell, deps) => {
      if (cell.id === "b") bDeps = deps;
      return okOut(cell.id);
    });
    expect("n:0" in bDeps).toBe(true);
  });
});

describe("matrix cells", () => {
  it("matrix cells run once per variant; results aggregated under .variants", async () => {
    const matrix: MatrixVariant[] = [
      { label: "happy", env: {} },
      { label: "crash", env: { CRASH_AFTER: "2" } },
      { label: "resume", env: { RESUMING: "1" } }
    ];
    const cell = inline("a", undefined, matrix);
    const capturedEnvs: Array<Record<string, string> | undefined> = [];

    const results = await topologicalRun([cell], async (_cell, _deps, extraEnv) => {
      capturedEnvs.push(extraEnv);
      return {
        cellId: "a",
        status: "ok",
        durationMs: 1,
        exitCode: 0,
        stdout: [{ ts: 1, stream: "stdout", text: JSON.stringify(extraEnv ?? {}) }],
        stderr: [],
        result: extraEnv
      };
    });

    expect(results).toHaveLength(1);
    const out = results[0]!;
    // Top-level output mirrors first variant (happy)
    expect(out.cellId).toBe("a");
    expect(out.status).toBe("ok");
    // variants map captures all three
    expect(out.variants).toBeDefined();
    expect(Object.keys(out.variants!).sort()).toEqual(["crash", "happy", "resume"]);
    expect(out.variants!["happy"]!.result).toEqual({});
    expect(out.variants!["crash"]!.result).toEqual({ CRASH_AFTER: "2" });
    expect(out.variants!["resume"]!.result).toEqual({ RESUMING: "1" });
    // extraEnv was passed correctly for each variant
    expect(capturedEnvs).toEqual([{}, { CRASH_AFTER: "2" }, { RESUMING: "1" }]);
  });

  it("matrix is ignored on ipynb cells (runs normally without matrix loop)", async () => {
    const ipynb: Cell = { kind: "ipynb", id: "n:0", src: "x.ipynb", cellIndex: 0, loc };
    const called: string[] = [];
    const results = await topologicalRun([ipynb], async (cell, _deps, extraEnv) => {
      called.push(cell.id);
      expect(extraEnv).toBeUndefined();
      return okOut(cell.id);
    });
    expect(called).toEqual(["n:0"]);
    expect(results[0]!.variants).toBeUndefined();
  });
});

describe("hashDepsResults", () => {
  it("changes when nested dependency results change", () => {
    const h1 = hashDepsResults({ a: { nested: { x: 1 } } });
    const h2 = hashDepsResults({ a: { nested: { x: 2 } } });
    expect(h1).not.toBe(h2);
  });
});
