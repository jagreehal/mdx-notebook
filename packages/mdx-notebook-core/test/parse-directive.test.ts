// packages/core/test/parse-directive.test.ts
import { describe, it, expect } from "vitest";
import { parseRunDirectiveAttrs, parseIpynbDirectiveAttrs, inferLang } from "../src/parse-directive.js";
import { BuildError } from "../src/errors.js";

describe("parseRunDirectiveAttrs", () => {
  it("requires id", () => {
    expect(() => parseRunDirectiveAttrs({ src: "./x.ts" }, loc())).toThrow(/MISSING_ID/);
  });
  it("requires src", () => {
    expect(() => parseRunDirectiveAttrs({ id: "x" }, loc())).toThrow(/MISSING_SRC/);
  });
  it("returns parsed attrs", () => {
    expect(parseRunDirectiveAttrs({ src: "./x.ts", id: "x", timeout: "10s" }, loc())).toEqual({
      id: "x",
      src: "./x.ts",
      timeout: 10_000,
      cache: undefined,
      env: undefined
    });
  });
  it("parses cache=false", () => {
    expect(
      parseRunDirectiveAttrs({ src: "./x.ts", id: "x", cache: "false" }, loc()).cache
    ).toBe(false);
  });
});

describe("parseIpynbDirectiveAttrs", () => {
  it("requires id and src", () => {
    expect(() => parseIpynbDirectiveAttrs({ src: "./n.ipynb" }, loc())).toThrow(/MISSING_ID/);
    expect(() => parseIpynbDirectiveAttrs({ id: "x" }, loc())).toThrow(/MISSING_SRC/);
  });
  it("returns parsed attrs with cells selector", () => {
    expect(parseIpynbDirectiveAttrs({ id: "n", src: "./n.ipynb", cells: "1-3" }, loc())).toEqual({
      id: "n",
      src: "./n.ipynb",
      cells: [1, 2, 3]
    });
  });
});

describe("inferLang", () => {
  it.each([
    [".ts", "ts"],
    [".tsx", "ts"],
    [".js", "js"],
    [".mjs", "js"],
    [".cjs", "js"],
    [".jsx", "js"]
  ])("infers %s", (ext, lang) => {
    expect(inferLang(`./file${ext}`)).toBe(lang);
  });
  it("throws on unknown extension", () => {
    expect(() => inferLang("./file.rb")).toThrow(BuildError);
  });
});

describe("parseRunDirectiveAttrs — dependsOn", () => {
  it("parses dependsOn as string array", () => {
    const result = parseRunDirectiveAttrs(
      { src: "./x.ts", id: "x", dependsOn: "a,b" },
      loc()
    );
    expect(result.dependsOn).toEqual(["a", "b"]);
  });

  it("dependsOn absent → undefined", () => {
    const result = parseRunDirectiveAttrs({ src: "./x.ts", id: "x" }, loc());
    expect(result.dependsOn).toBeUndefined();
  });

  it("invalid dependsOn id throws BAD_DEPENDS_ON", () => {
    expect(() =>
      parseRunDirectiveAttrs({ src: "./x.ts", id: "x", dependsOn: "a/b" }, loc())
    ).toThrow(/BAD_DEPENDS_ON/);
  });
});

function loc() {
  return { file: "p.mdx", line: 1, column: 1 };
}
