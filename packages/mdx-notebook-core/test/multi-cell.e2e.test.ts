import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPage, clearRegistry, registerRunner } from "../src/index.js";
import { runnerTs } from "mdx-notebook-runner-ts";

const PAGE = join(__dirname, "fixtures", "multi-cell.mdx");

describe("E2E: multi-cell dependsOn with real runner-ts", () => {
  beforeAll(() => { clearRegistry(); registerRunner(runnerTs); });

  it("numbers runs first, sum reads its result and returns 10", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-e2e-dep-"));
    const m = await runPage(PAGE, { rootDir: root });

    expect(m.cells["numbers"]?.status).toBe("ok");
    expect(m.cells["numbers"]?.result).toEqual([1, 2, 3, 4]);

    expect(m.cells["sum"]?.status).toBe("ok");
    expect(m.cells["sum"]?.result).toBe(10);
  }, 60_000);
});
