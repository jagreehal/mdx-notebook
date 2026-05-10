// packages/core/test/runtime/store.test.ts
import { describe, it, expect, vi } from "vitest";
import { createOutputStore } from "../../src/runtime/store.js";
import type { Manifest, CellOutput } from "../../src/types.js";

const co = (id: string, result?: unknown): CellOutput => ({
  cellId: id, status: "ok", durationMs: 0, exitCode: 0, stdout: [], stderr: [], result
});

const m: Manifest = {
  pageId: "p", builtAt: 0,
  cells: { a: co("a", { count: 1 }), b: co("b") }
};

describe("createOutputStore", () => {
  it("get returns the manifest cell", () => {
    const s = createOutputStore(m);
    expect(s.get("a").result).toEqual({ count: 1 });
  });

  it("setResult mutates only `result`", () => {
    const s = createOutputStore(m);
    s.setResult("a", { count: 2 });
    expect(s.get("a").result).toEqual({ count: 2 });
    expect(s.get("a").status).toBe("ok"); // unchanged
  });

  it("subscribe receives a notification on setResult", () => {
    const s = createOutputStore(m);
    const fn = vi.fn();
    const unsub = s.subscribe("a", fn);
    s.setResult("a", { count: 3 });
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    s.setResult("a", { count: 4 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("subscribe to one id is not notified by another id's update", () => {
    const s = createOutputStore(m);
    const fn = vi.fn();
    s.subscribe("a", fn);
    s.setResult("b", "x");
    expect(fn).not.toHaveBeenCalled();
  });

  it("get on unknown id throws a clear error", () => {
    const s = createOutputStore(m);
    expect(() => s.get("z")).toThrow(/unknown cellId "z"/);
  });
});
