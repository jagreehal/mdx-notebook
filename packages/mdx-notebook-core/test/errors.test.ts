// packages/core/test/errors.test.ts
import { describe, it, expect } from "vitest";
import { BuildError, isBuildError } from "../src/errors.js";

describe("BuildError", () => {
  it("includes code, message, and location", () => {
    const e = new BuildError({
      code: "MISSING_ID",
      message: "Cell is missing required `id` attribute",
      loc: { file: "page.mdx", line: 3, column: 1 }
    });
    expect(e.code).toBe("MISSING_ID");
    expect(e.message).toContain("page.mdx:3:1");
    expect(e.message).toContain("missing required");
    expect(e.loc).toEqual({ file: "page.mdx", line: 3, column: 1 });
  });

  it("works without a location", () => {
    const e = new BuildError({ code: "INTERNAL", message: "boom" });
    expect(e.message).toBe("boom");
    expect(e.loc).toBeUndefined();
  });

  it("isBuildError narrows", () => {
    const e: unknown = new BuildError({ code: "X", message: "y" });
    expect(isBuildError(e)).toBe(true);
    expect(isBuildError(new Error("plain"))).toBe(false);
  });
});
