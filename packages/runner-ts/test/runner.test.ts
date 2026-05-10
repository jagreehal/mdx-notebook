// packages/runner-ts/test/runner.test.ts
import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { runnerTs } from "../src/runner.js";
import type { Cell, RunCtx } from "@mdx-notebook/core";

const FIX = resolve(__dirname, "fixtures");

function fileCell(filename: string, overrides: Partial<Cell> = {}): Cell {
  return {
    kind: "file",
    id: "x",
    lang: "ts",
    src: resolve(FIX, filename),
    loc: { file: "test.mdx", line: 1, column: 1 },
    ...overrides
  } as Cell;
}

function ctx(overrides: Partial<RunCtx> = {}): RunCtx {
  return {
    signal: new AbortController().signal,
    cwd: FIX,
    env: { ...(process.env as Record<string, string>) },
    timeoutMs: 10_000,
    ...overrides
  };
}

describe("runner-ts", () => {
  it("captures stdout from a plain script", async () => {
    const out = await runnerTs.run(fileCell("plain-script.ts"), ctx());
    expect(out.status).toBe("ok");
    expect(out.stdout.map((e) => e.text)).toContain("hello from plain script");
    expect(out.result).toBeUndefined();
    expect(out.exitCode).toBe(0);
  });

  it("captures default export return value", async () => {
    const out = await runnerTs.run(fileCell("default-export.ts"), ctx());
    expect(out.status).toBe("ok");
    expect(out.result).toEqual({ greeting: "hi", count: 42 });
  });

  it("awaits async default export", async () => {
    const out = await runnerTs.run(fileCell("async-default-export.ts"), ctx());
    expect(out.status).toBe("ok");
    expect(out.result).toEqual([1, 2, 3]);
  });

  it("captures errors from default export throw", async () => {
    const out = await runnerTs.run(fileCell("throws.ts"), ctx());
    expect(out.status).toBe("error");
    expect(out.error?.name).toBe("TypeError");
    expect(out.error?.message).toContain("bad input");
  });

  it("times out long-running cells", async () => {
    const out = await runnerTs.run(fileCell("timeout.ts"), ctx({ timeoutMs: 200 }));
    expect(out.status).toBe("timeout");
    expect(out.exitCode).toBe(124);
  });

  it("truncates oversized stdout", async () => {
    const out = await runnerTs.run(fileCell("oversized-stdout.ts"), ctx());
    expect(out.stdout.at(-1)!.text).toContain("[truncated]");
  });

  it("reports SerializationError on circular result", async () => {
    const out = await runnerTs.run(fileCell("nonserializable.ts"), ctx());
    expect(out.status).toBe("error");
    expect(out.error?.name).toBe("SerializationError");
  });

  it("inherits env from ctx", async () => {
    const out = await runnerTs.run(fileCell("env-consumer.ts"), ctx({ env: { FOO: "bar" } }));
    expect(out.stdout.map((e) => e.text)).toContain("FOO=bar");
  });

  it("supports inline cells via tempfile", async () => {
    const cell: Cell = {
      kind: "inline",
      id: "i",
      lang: "ts",
      code: 'console.log("inline ok");\n',
      loc: { file: "p.mdx", line: 1, column: 1 }
    };
    const out = await runnerTs.run(cell, ctx());
    expect(out.status).toBe("ok");
    expect(out.stdout.map((e) => e.text)).toContain("inline ok");
  });
});
