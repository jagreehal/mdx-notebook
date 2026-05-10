// packages/core/test/remark-plugin.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkDirective from "remark-directive";
import { remarkMdxNotebook, type CellsCollected } from "../src/remark-plugin.js";
import { BuildError } from "../src/errors.js";

const mdx = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

function process(source: string, file: string) {
  const collected: CellsCollected = { cells: [] };
  const proc = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkDirective)
    .use(remarkMdxNotebook, { file, collect: collected });
  proc.parse(source);
  // Plugin runs in transform; we need .run + parse not just parse.
  const tree = proc.parse(source);
  proc.runSync(tree, { path: file });
  return collected;
}

describe("remarkMdxNotebook", () => {
  it("discovers a single inline cell", () => {
    const c = process(mdx("basic.mdx"), "fixtures/basic.mdx");
    expect(c.cells).toHaveLength(1);
    expect(c.cells[0]).toMatchObject({
      kind: "inline",
      id: "hello",
      lang: "ts",
      code: 'console.log("hello");\n'
    });
  });

  it("discovers all three cell kinds", () => {
    const c = process(mdx("all-kinds.mdx"), "test/fixtures/all-kinds.mdx");
    expect(c.cells.map((x) => x.kind)).toEqual(["inline", "file", "ipynb", "ipynb"]);
    const file = c.cells.find((x) => x.kind === "file")!;
    expect(file).toMatchObject({ id: "trace", lang: "ts", src: "./scripts/agent.ts" });
    const ipynbCells = c.cells.filter((x) => x.kind === "ipynb");
    expect(ipynbCells.map((x) => x.cellIndex)).toEqual([0, 1]);
  });

  it("throws on duplicate id", () => {
    expect(() => process(mdx("duplicate-id.mdx"), "fixtures/duplicate-id.mdx")).toThrow(
      /DUPLICATE_ID/
    );
  });

  it("throws on missing id", () => {
    expect(() => process(mdx("missing-id.mdx"), "fixtures/missing-id.mdx")).toThrow(
      /MISSING_ID/
    );
  });

  it("ignores fences without `run`", () => {
    const src = "```ts\nconsole.log(1);\n```\n";
    const c = process(src, "x.mdx");
    expect(c.cells).toHaveLength(0);
  });

  it("attaches loc info", () => {
    const c = process(mdx("basic.mdx"), "fixtures/basic.mdx");
    const cell = c.cells[0]!;
    expect(cell.loc.file).toBe("fixtures/basic.mdx");
    expect(cell.loc.line).toBeGreaterThan(0);
  });

  it("throws UNKNOWN_LANG when file ext is unsupported", () => {
    const src = ":::run{src=\"./x.rb\" id=\"r\"}\n:::\n";
    expect(() => process(src, "x.mdx")).toThrow(/UNKNOWN_LANG/);
  });

  it("attaches dependsOn from fence attrs to inline cell", () => {
    const src = "```ts run id=b dependsOn=a\nconsole.log(1);\n```\n";
    const c = process(src, "x.mdx");
    expect(c.cells[0]).toMatchObject({
      kind: "inline",
      id: "b",
      dependsOn: ["a"]
    });
  });

  it("attaches dependsOn from directive attrs to file cell", () => {
    const src = ':::run{src="./step2.ts" id="step2" dependsOn="step1,step0"}\n:::\n';
    const c = process(src, "x.mdx");
    expect(c.cells[0]).toMatchObject({
      kind: "file",
      id: "step2",
      dependsOn: ["step1", "step0"]
    });
  });
});
