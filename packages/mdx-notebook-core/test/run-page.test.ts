// packages/core/test/run-page.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPage } from "../src/run-page.js";
import { clearRegistry, registerRunner } from "../src/runner-registry.js";
import type { Runner } from "../src/types.js";

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
});
