// packages/core/test/parse-fence.test.ts
import { describe, it, expect } from "vitest";
import { parseFenceInfo, parseTimeoutMs, parseDependsOn } from "../src/parse-fence.js";
import { BuildError } from "../src/errors.js";

describe("parseFenceInfo", () => {
  it("returns non-runnable for fence without `run` token in 2nd position", () => {
    expect(parseFenceInfo("ts")).toEqual({ runnable: false, lang: "ts" });
    expect(parseFenceInfo("javascript")).toEqual({ runnable: false, lang: "javascript" });
    expect(parseFenceInfo("")).toEqual({ runnable: false, lang: "" });
  });

  it("ignores `run` if it's the language (collision avoidance)", () => {
    expect(parseFenceInfo("run id=x")).toEqual({ runnable: false, lang: "run" });
  });

  it("recognizes `<lang> run`", () => {
    expect(parseFenceInfo("ts run id=hello")).toEqual({
      runnable: true,
      lang: "ts",
      attrs: { id: "hello" }
    });
  });

  it("parses multiple attrs", () => {
    expect(parseFenceInfo("ts run id=hello timeout=10s cache=false")).toEqual({
      runnable: true,
      lang: "ts",
      attrs: { id: "hello", timeout: "10s", cache: "false" }
    });
  });

  it("supports quoted attr values with spaces", () => {
    expect(parseFenceInfo(`ts run id=hello title="hello world"`)).toEqual({
      runnable: true,
      lang: "ts",
      attrs: { id: "hello", title: "hello world" }
    });
  });

  it("ignores trailing whitespace and tabs", () => {
    expect(parseFenceInfo("ts\trun\tid=x  ")).toEqual({
      runnable: true,
      lang: "ts",
      attrs: { id: "x" }
    });
  });
});

describe("parseTimeoutMs", () => {
  it("undefined -> undefined", () => expect(parseTimeoutMs(undefined)).toBeUndefined());
  it("plain number -> ms", () => expect(parseTimeoutMs("500")).toBe(500));
  it("ms suffix", () => expect(parseTimeoutMs("250ms")).toBe(250));
  it("seconds suffix", () => expect(parseTimeoutMs("10s")).toBe(10_000));
  it("minutes suffix", () => expect(parseTimeoutMs("2m")).toBe(120_000));
  it("rejects garbage", () => expect(() => parseTimeoutMs("abc")).toThrow(BuildError));
  it("rejects zero", () => expect(() => parseTimeoutMs("0")).toThrow(BuildError));
  it("rejects negative", () => expect(() => parseTimeoutMs("-5s")).toThrow(BuildError));
});

describe("parseDependsOn", () => {
  it("undefined → undefined", () => {
    expect(parseDependsOn(undefined)).toBeUndefined();
  });

  it('"a" → ["a"]', () => {
    expect(parseDependsOn("a")).toEqual(["a"]);
  });

  it('"a, b , c" → ["a","b","c"]', () => {
    expect(parseDependsOn("a, b , c")).toEqual(["a", "b", "c"]);
  });

  it('empty string → throws BAD_DEPENDS_ON', () => {
    expect(() => parseDependsOn("")).toThrow(/BAD_DEPENDS_ON/);
  });

  it('invalid character "a/b" → throws BAD_DEPENDS_ON', () => {
    expect(() => parseDependsOn("a/b")).toThrow(/BAD_DEPENDS_ON/);
  });

  it('whitespace-only segment "a, , b" → throws BAD_DEPENDS_ON', () => {
    expect(() => parseDependsOn("a, , b")).toThrow(/BAD_DEPENDS_ON/);
  });
});
