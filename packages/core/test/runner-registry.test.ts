// packages/core/test/runner-registry.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerRunner,
  getRunner,
  clearRegistry,
  listRunners
} from "../src/runner-registry.js";
import type { Runner, Cell } from "../src/types.js";
import { BuildError } from "../src/errors.js";

const tsRunner: Runner = {
  language: "ts",
  version: "0.0.0-test",
  canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
  run: async () => {
    throw new Error("not used");
  }
};

const inlineCell: Cell = {
  kind: "inline",
  id: "x",
  lang: "ts",
  code: "",
  loc: { file: "p", line: 1, column: 1 }
};

describe("runner-registry", () => {
  beforeEach(() => clearRegistry());

  it("returns undefined when no runner registered", () => {
    expect(getRunner("ts")).toBeUndefined();
  });

  it("registers and retrieves by language", () => {
    registerRunner(tsRunner);
    expect(getRunner("ts")).toBe(tsRunner);
  });

  it("getRunner uses canHandle when a Cell is provided", () => {
    registerRunner(tsRunner);
    expect(getRunner("ts", inlineCell)).toBe(tsRunner);
  });

  it("returns undefined when canHandle rejects", () => {
    const picky: Runner = { ...tsRunner, canHandle: () => false };
    registerRunner(picky);
    expect(getRunner("ts", inlineCell)).toBeUndefined();
  });

  it("registering twice for the same language replaces", () => {
    registerRunner(tsRunner);
    const replaced: Runner = { ...tsRunner, version: "newer" };
    registerRunner(replaced);
    expect(getRunner("ts")?.version).toBe("newer");
  });

  it("listRunners returns all", () => {
    registerRunner(tsRunner);
    expect(listRunners().map((r) => r.language)).toEqual(["ts"]);
  });

  it("requires a non-empty language", () => {
    expect(() =>
      registerRunner({ ...tsRunner, language: "" })
    ).toThrow(BuildError);
  });
});
