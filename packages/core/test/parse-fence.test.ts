// packages/core/test/parse-fence.test.ts
import { describe, it, expect } from "vitest";
import { parseFenceInfo } from "../src/parse-fence.js";

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
