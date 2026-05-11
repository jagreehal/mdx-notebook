import { describe, it, expect } from "vitest";
import { extractEnvRefs, envSnapshot } from "../src/extract-env-refs.js";

describe("extractEnvRefs", () => {
  it("returns empty array when no refs", () => {
    expect(extractEnvRefs("const x = 1;")).toEqual([]);
  });

  it("captures dot access", () => {
    const src = `const k = process.env.GOOGLE_API_KEY; if (process.env.DEBUG) {}`;
    expect(extractEnvRefs(src)).toEqual(["DEBUG", "GOOGLE_API_KEY"]);
  });

  it("captures bracket access with double quotes", () => {
    const src = `const k = process.env["DATABASE_URL"];`;
    expect(extractEnvRefs(src)).toEqual(["DATABASE_URL"]);
  });

  it("captures bracket access with single quotes", () => {
    const src = `const k = process.env['ANTHROPIC_API_KEY'];`;
    expect(extractEnvRefs(src)).toEqual(["ANTHROPIC_API_KEY"]);
  });

  it("dedupes when the same name appears multiple times", () => {
    const src = `process.env.A; process.env.A; process.env["A"];`;
    expect(extractEnvRefs(src)).toEqual(["A"]);
  });

  it("ignores lower/mixed case names (likely not env vars)", () => {
    const src = `process.env.foo; process.env.barBaz;`;
    expect(extractEnvRefs(src)).toEqual([]);
  });

  it("ignores indirect access patterns (won't catch them, by design)", () => {
    // Dynamic key access via a variable cannot be statically detected;
    // we explicitly choose not to over-match. Author can opt in with an
    // explicit reference if needed.
    const src = `const k = "GOOGLE_API_KEY"; process.env[k];`;
    expect(extractEnvRefs(src)).toEqual([]);
  });

  it("requires a word boundary before 'process'", () => {
    const src = `userprocess.env.SHOULD_NOT_MATCH;`;
    expect(extractEnvRefs(src)).toEqual([]);
  });
});

describe("envSnapshot", () => {
  it("returns empty string for empty names", () => {
    expect(envSnapshot([], { A: "1" })).toBe("");
  });

  it("emits name=value pairs sorted", () => {
    expect(envSnapshot(["B", "A"], { A: "1", B: "2" })).toBe("A=1;B=2");
  });

  it("missing values render as empty", () => {
    expect(envSnapshot(["X", "Y"], { X: "set" })).toBe("X=set;Y=");
  });

  it("changes when a referenced value changes", () => {
    const a = envSnapshot(["KEY"], { KEY: "old" });
    const b = envSnapshot(["KEY"], { KEY: "new" });
    expect(a).not.toBe(b);
  });

  it("does NOT change when an unreferenced value changes", () => {
    const a = envSnapshot(["KEY"], { KEY: "v", OTHER: "before" });
    const b = envSnapshot(["KEY"], { KEY: "v", OTHER: "after" });
    expect(a).toBe(b);
  });
});
