import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPage, clearRegistry, registerRunner } from "../src/index.js";
import { runnerTs } from "@mdx-notebook/runner-ts";

const PAGE = join(__dirname, "fixtures", "e2e", "page.mdx");

describe("E2E: runPage with real runner-ts", () => {
  beforeAll(() => { clearRegistry(); registerRunner(runnerTs); });

  it("produces a manifest with all three kinds of outputs", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-e2e-"));
    const m = await runPage(PAGE, { rootDir: root });
    expect(Object.keys(m.cells).sort()).toEqual(["inline", "nb:0", "trace"]);
    expect(m.cells.inline!.status).toBe("ok");
    expect(m.cells.inline!.result).toEqual({ from: "inline" });
    expect(m.cells.trace!.status).toBe("ok");
    expect(m.cells.trace!.stdout.map((e) => e.text)).toContain("agent step 1");
    expect(m.cells.trace!.result).toEqual({ steps: 2 });
    expect(m.cells["nb:0"]!.ipynbOutputs?.[0]).toMatchObject({ type: "stream", name: "stdout" });
  }, 60_000);
});
