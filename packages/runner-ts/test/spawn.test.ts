// packages/runner-ts/test/spawn.test.ts
import { describe, it, expect } from "vitest";
import { spawnTsx } from "../src/spawn.js";
import { join } from "node:path";

const fix = (n: string) => join(__dirname, "fixtures", n);

describe("spawnTsx", () => {
  it("captures stdout from a plain script", async () => {
    const r = await spawnTsx({
      target: fix("plain-script.ts"),
      cwd: __dirname,
      env: { ...process.env, NODE_OPTIONS: "" } as Record<string, string>,
      timeoutMs: 10_000
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout.map((e) => e.text)).toContain("hello from plain script");
  });

  it("captures stderr", async () => {
    const r = await spawnTsx({
      target: fix("prints-stderr.ts"),
      cwd: __dirname,
      env: { ...process.env } as Record<string, string>,
      timeoutMs: 10_000
    });
    expect(r.stderr.some((e) => e.text.includes("warn!"))).toBe(true);
  });

  it("returns timedOut on long script", async () => {
    const r = await spawnTsx({
      target: fix("timeout.ts"),
      cwd: __dirname,
      env: { ...process.env } as Record<string, string>,
      timeoutMs: 200
    });
    expect(r.timedOut).toBe(true);
  });
});
