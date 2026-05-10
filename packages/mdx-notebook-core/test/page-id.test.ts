// packages/core/test/page-id.test.ts
import { describe, it, expect } from "vitest";
import { computePageId } from "../src/page-id.js";

describe("computePageId", () => {
  it("is deterministic for the same path", () => {
    expect(computePageId("a/b.mdx")).toBe(computePageId("a/b.mdx"));
  });
  it("differs across paths", () => {
    expect(computePageId("a.mdx")).not.toBe(computePageId("b.mdx"));
  });
  it("normalizes platform separators", () => {
    expect(computePageId("a/b.mdx")).toBe(computePageId("a\\b.mdx"));
  });
  it("returns 16 hex chars", () => {
    expect(computePageId("a.mdx")).toMatch(/^[0-9a-f]{16}$/);
  });
});
