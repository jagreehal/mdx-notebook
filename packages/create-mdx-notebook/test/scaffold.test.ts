import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { scaffold } from "../src/index.js";

beforeAll(async () => {
  // Sync the template before tests run (mirrors the prebuild step).
  const { spawnSync } = await import("node:child_process");
  spawnSync("node", ["./scripts/sync-template.mjs"], { stdio: "inherit" });
});

describe("scaffold", () => {
  it("copies the template into a fresh directory", async () => {
    const target = await mkdtemp(join(tmpdir(), "cmn-"));
    // Need an empty target — scaffold throws if it exists and isn't empty.
    // mkdtemp returns an empty dir; pass it directly.
    await scaffold({ target, log: false, linked: false });
    const entries = await readdir(target);
    expect(entries).toContain("package.json");
    expect(entries).toContain("astro.config.mjs");
    expect(entries).toContain("src");
    expect(existsSync(join(target, "node_modules"))).toBe(false);
  });

  it("rewrites package.json name to basename and replaces workspace:* with latest", async () => {
    const target = await mkdtemp(join(tmpdir(), "cmn-"));
    await scaffold({ target, log: false, linked: false });
    const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8")) as Record<string, unknown>;
    expect(pkg["name"]).toMatch(/^cmn-/);
    for (const v of Object.values(pkg["dependencies"] as Record<string, string>)) {
      expect(v).not.toMatch(/^workspace:/);
    }
  });

  it("with linked=true keeps workspace:* deps", async () => {
    const target = await mkdtemp(join(tmpdir(), "cmn-"));
    await scaffold({ target, log: false, linked: true });
    const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8")) as Record<string, unknown>;
    const hasWorkspace = Object.values(pkg["dependencies"] as Record<string, string>).some((v) => v.startsWith("workspace:"));
    expect(hasWorkspace).toBe(true);
  });

  it("rejects non-empty target", async () => {
    const target = await mkdtemp(join(tmpdir(), "cmn-"));
    await scaffold({ target, log: false });
    // Try to scaffold again into the same now-non-empty dir
    await expect(scaffold({ target, log: false })).rejects.toThrow(/not empty/);
  });
});
