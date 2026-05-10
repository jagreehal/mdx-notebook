// packages/runner-ts/test/env.test.ts
import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { mergeEnv } from "../src/env.js";

const fixturePath = join(__dirname, "fixtures", "sample.env");

describe("mergeEnv", () => {
  it("returns base when no env path", async () => {
    const base = { A: "1" };
    expect(await mergeEnv(base, undefined, "/tmp")).toEqual(base);
  });

  it("merges dotenv on top of base", async () => {
    const merged = await mergeEnv({ A: "1" }, fixturePath, "/tmp");
    expect(merged).toMatchObject({ A: "1", FOO: "hello", BAR: "quoted value", NUM: "42" });
  });

  it("dotenv overrides base for same key", async () => {
    const merged = await mergeEnv({ FOO: "old" }, fixturePath, "/tmp");
    expect(merged.FOO).toBe("hello");
  });

  it("resolves env path relative to cwd", async () => {
    const merged = await mergeEnv({}, "fixtures/sample.env", __dirname);
    expect(merged.FOO).toBe("hello");
  });
});
