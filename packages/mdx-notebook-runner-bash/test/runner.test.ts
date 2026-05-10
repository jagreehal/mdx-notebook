import { describe, it, expect } from "vitest";
import { runnerBash } from "../src/runner.js";
import type { Cell, RunCtx } from "mdx-notebook-core";

function ctx(overrides: Partial<RunCtx> = {}): RunCtx {
  return {
    signal: new AbortController().signal,
    cwd: process.cwd(),
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
    timeoutMs: 5_000,
    ...overrides
  };
}

function inline(code: string, lang = "bash"): Cell {
  return { kind: "inline", id: "b", lang, code, loc: { file: "p.mdx", line: 1, column: 1 } };
}

describe("runnerBash", () => {
  it("captures stdout from inline bash", async () => {
    const out = await runnerBash.run(inline('echo "hello bash"'), ctx());
    expect(out.status).toBe("ok");
    expect(out.stdout.map((e) => e.text)).toContain("hello bash");
  });

  it("accepts lang=sh", async () => {
    const out = await runnerBash.run(inline('echo sh', "sh"), ctx());
    expect(out.status).toBe("ok");
  });

  it("captures stderr", async () => {
    const out = await runnerBash.run(inline('echo "warn" >&2'), ctx());
    expect(out.status).toBe("ok");
    expect(out.stderr.map((e) => e.text)).toContain("warn");
  });

  it("reports non-zero exit as error", async () => {
    const out = await runnerBash.run(inline('exit 7'), ctx());
    expect(out.status).toBe("error");
    expect(out.exitCode).toBe(7);
    expect(out.error?.name).toBe("NonZeroExit");
  });

  it("times out long-running cell", async () => {
    const out = await runnerBash.run(inline('sleep 5'), ctx({ timeoutMs: 200 }));
    expect(out.status).toBe("timeout");
    expect(out.exitCode).toBe(124);
  });

  it("canHandle accepts lang bash and sh, rejects ts", () => {
    expect(runnerBash.canHandle(inline("", "bash"))).toBe(true);
    expect(runnerBash.canHandle(inline("", "sh"))).toBe(true);
    expect(runnerBash.canHandle(inline("", "ts"))).toBe(false);
  });

  it("canHandle accepts file cells with .sh extension", () => {
    const cell: Cell = { kind: "file", id: "f", lang: "bash", src: "./run.sh", loc: { file: "p.mdx", line: 1, column: 1 } };
    expect(runnerBash.canHandle(cell)).toBe(true);
  });

  it("rejects ipynb cells", () => {
    const cell: Cell = { kind: "ipynb", id: "i:0", src: "./n.ipynb", cellIndex: 0, loc: { file: "p.mdx", line: 1, column: 1 } };
    expect(runnerBash.canHandle(cell)).toBe(false);
  });
});
