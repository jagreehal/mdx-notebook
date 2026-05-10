// packages/core/test/cache.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeCacheKey, readCache, writeCache, type CacheKeyInputs } from "../src/cache.js";
import type { CellOutput } from "../src/types.js";

const sample: CellOutput = {
  cellId: "x",
  status: "ok",
  durationMs: 10,
  exitCode: 0,
  stdout: [{ ts: 1, stream: "stdout", text: "hi" }],
  stderr: []
};

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mdx-nb-cache-"));
});

describe("computeCacheKey", () => {
  it("is deterministic", () => {
    const a: CacheKeyInputs = {
      sourceBytes: "x", runner: "ts", runnerVersion: "1", nodeVersion: "20", lockfile: "abc", env: "", depsHash: ""
    };
    expect(computeCacheKey(a)).toBe(computeCacheKey(a));
  });
  it("changes when source changes", () => {
    const a: CacheKeyInputs = { sourceBytes: "x", runner: "ts", runnerVersion: "1", nodeVersion: "20", lockfile: "", env: "", depsHash: "" };
    const b: CacheKeyInputs = { ...a, sourceBytes: "y" };
    expect(computeCacheKey(a)).not.toBe(computeCacheKey(b));
  });
  it("changes when runner version changes", () => {
    const a: CacheKeyInputs = { sourceBytes: "x", runner: "ts", runnerVersion: "1", nodeVersion: "20", lockfile: "", env: "", depsHash: "" };
    const b: CacheKeyInputs = { ...a, runnerVersion: "2" };
    expect(computeCacheKey(a)).not.toBe(computeCacheKey(b));
  });
});

describe("readCache / writeCache", () => {
  it("write then read returns equal output", async () => {
    await writeCache(dir, "abc123", sample);
    const r = await readCache(dir, "abc123");
    expect(r).toEqual(sample);
  });

  it("read miss returns undefined", async () => {
    const r = await readCache(dir, "nope");
    expect(r).toBeUndefined();
  });

  it("read returns undefined for malformed JSON (warning behavior)", async () => {
    await writeFile(join(dir, ".cache", "broken.json"), "not json", { encoding: "utf8" }).catch(async () => {
      // Ensure dir exists by writing first then corrupting
      await writeCache(dir, "broken", sample);
      await writeFile(join(dir, ".cache", "broken.json"), "not json");
    });
    const r = await readCache(dir, "broken");
    expect(r).toBeUndefined();
  });
});
