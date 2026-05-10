// packages/core/test/cells-selector.test.ts
import { describe, it, expect } from "vitest";
import { parseCellsSelector } from "../src/cells-selector.js";
import { BuildError } from "../src/errors.js";

describe("parseCellsSelector", () => {
  it("undefined selects all (returns null)", () => {
    expect(parseCellsSelector(undefined)).toBeNull();
  });

  it("single index", () => {
    expect(parseCellsSelector("3")).toEqual([3]);
  });

  it("comma list", () => {
    expect(parseCellsSelector("1,3,5")).toEqual([1, 3, 5]);
  });

  it("range inclusive", () => {
    expect(parseCellsSelector("2-5")).toEqual([2, 3, 4, 5]);
  });

  it("mixed list and ranges, deduped and sorted", () => {
    expect(parseCellsSelector("3,1-2,5,4-5")).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles whitespace", () => {
    expect(parseCellsSelector(" 1 - 3 , 5 ")).toEqual([1, 2, 3, 5]);
  });

  it("rejects empty string", () => {
    expect(() => parseCellsSelector("")).toThrow(BuildError);
  });

  it("rejects negative numbers", () => {
    expect(() => parseCellsSelector("-1")).toThrow(/BAD_CELLS_SELECTOR/);
  });

  it("rejects reversed range", () => {
    expect(() => parseCellsSelector("5-2")).toThrow(/BAD_CELLS_SELECTOR/);
  });

  it("rejects non-numeric", () => {
    expect(() => parseCellsSelector("a")).toThrow(/BAD_CELLS_SELECTOR/);
  });
});
