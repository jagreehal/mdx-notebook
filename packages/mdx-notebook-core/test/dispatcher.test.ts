// packages/core/test/dispatcher.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { dispatchCell } from "../src/dispatcher.js";
import { clearRegistry, registerRunner } from "../src/runner-registry.js";
import { parseIpynb } from "../src/ipynb-parser.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Cell, CellOutput, Runner } from "../src/types.js";

const fakeTs: Runner = {
  language: "ts",
  version: "test",
  canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
  run: async (c) => ({
    cellId: c.id, status: "ok", durationMs: 1, exitCode: 0,
    stdout: [{ ts: 1, stream: "stdout", text: `ran ${c.id}` }],
    stderr: []
  })
};

describe("dispatchCell", () => {
  beforeEach(() => { clearRegistry(); registerRunner(fakeTs); });

  it("dispatches inline ts to ts runner", async () => {
    const cell: Cell = { kind: "inline", id: "i", lang: "ts", code: "1+1", loc: { file: "p", line: 1, column: 1 } };
    const out: CellOutput = await dispatchCell(cell, {
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
      defaultTimeoutMs: 1000
    }, () => "");
    expect(out.status).toBe("ok");
    expect(out.stdout[0]!.text).toBe("ran i");
  });

  it("ipynb cells render saved outputs", async () => {
    const nb = parseIpynb(readFileSync(join(__dirname, "fixtures", "notebooks", "simple.ipynb"), "utf8"));
    const ipynbCell: Cell = {
      kind: "ipynb", id: "nb:0", src: "./simple.ipynb", cellIndex: 0,
      loc: { file: "p", line: 1, column: 1 }
    };
    const out = await dispatchCell(ipynbCell, {
      cwd: process.cwd(), env: {}, defaultTimeoutMs: 1000
    }, () => readFileSync(join(__dirname, "fixtures", "notebooks", "simple.ipynb"), "utf8"));
    expect(out.status).toBe("ok");
    expect(out.ipynbOutputs?.[0]).toMatchObject({ type: "stream", name: "stdout" });
  });

  it("returns an error CellOutput when no runner matches", async () => {
    clearRegistry();
    const cell: Cell = { kind: "inline", id: "i", lang: "rust", code: "", loc: { file: "p", line: 1, column: 1 } };
    const out = await dispatchCell(cell, {
      cwd: process.cwd(), env: {}, defaultTimeoutMs: 1000
    }, () => "");
    expect(out.status).toBe("error");
    expect(out.error?.name).toBe("UnknownLang");
  });
});
