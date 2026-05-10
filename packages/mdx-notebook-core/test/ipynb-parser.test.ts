// packages/core/test/ipynb-parser.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseIpynb, extractIpynbCells } from "../src/ipynb-parser.js";
import { BuildError } from "../src/errors.js";

const fix = (name: string) =>
  readFileSync(join(__dirname, "fixtures", "notebooks", name), "utf8");

describe("parseIpynb", () => {
  it("parses simple notebook into code cells with outputs", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    expect(nb.codeCells).toHaveLength(2);
    expect(nb.codeCells[0]!.outputs[0]).toEqual({
      type: "stream",
      name: "stdout",
      text: "hello\n"
    });
  });

  it("parses execute_result with mime data", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const out = nb.codeCells[1]!.outputs[0];
    expect(out).toMatchObject({
      type: "execute_result",
      data: { "text/plain": "2" }
    });
  });

  it("parses display_data with image/png and error outputs", () => {
    const nb = parseIpynb(fix("with-image.ipynb"));
    expect(nb.codeCells[0]!.outputs[0]).toMatchObject({
      type: "display_data",
      data: { "image/png": expect.any(String), "text/plain": "<Figure>" }
    });
    expect(nb.codeCells[1]!.outputs[0]).toEqual({
      type: "error",
      ename: "ValueError",
      evalue: "boom",
      traceback: ["Traceback...", "ValueError: boom"]
    });
  });

  it("throws on malformed JSON", () => {
    expect(() => parseIpynb("not json")).toThrow(BuildError);
  });

  it("throws when 'cells' is missing", () => {
    expect(() => parseIpynb(JSON.stringify({}))).toThrow(/IPYNB_PARSE/);
  });
});

describe("extractIpynbCells", () => {
  it("returns all code cells when selector is null", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const cells = extractIpynbCells(nb, null);
    expect(cells).toHaveLength(2);
    expect(cells[0]!.cellIndex).toBe(0);
    expect(cells[1]!.cellIndex).toBe(1);
  });

  it("filters by selector", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const cells = extractIpynbCells(nb, [1]);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.cellIndex).toBe(1);
  });

  it("ignores out-of-range selectors silently", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const cells = extractIpynbCells(nb, [0, 99]);
    expect(cells).toHaveLength(1);
  });
});
