import { createHash } from "node:crypto";
import { BuildError } from "./errors.js";
import type { Cell, CellOutput } from "./types.js";

export type RunFn = (cell: Cell, depsResults: Record<string, unknown>) => Promise<CellOutput>;

/**
 * Execute cells in topological order, respecting dependsOn.
 * Cells whose deps are satisfied can run concurrently.
 * Returns outputs in the same logical order as cells array.
 */
export async function topologicalRun(cells: Cell[], runFn: RunFn): Promise<CellOutput[]> {
  // Build a set of all cell ids for validation
  const allIds = new Set(cells.map((c) => c.id));

  // Validate deps: all referenced ids must exist
  for (const cell of cells) {
    if (cell.kind === "ipynb") continue;
    for (const depId of cell.dependsOn ?? []) {
      if (!allIds.has(depId)) {
        throw new BuildError({
          code: "UNKNOWN_DEP",
          message: `UNKNOWN_DEP: cell "${cell.id}" depends on unknown cell "${depId}"`,
          loc: cell.loc
        });
      }
    }
  }

  // Detect cycles via DFS
  detectCycles(cells);

  // Run in topological order
  const outputs = new Map<string, CellOutput>();
  const remaining = new Set(cells.map((c) => c.id));

  while (remaining.size > 0) {
    // Find all cells whose deps are all satisfied
    const ready: Cell[] = [];
    for (const id of remaining) {
      const cell = cells.find((c) => c.id === id)!;
      const deps = cell.kind === "ipynb" ? [] : (cell.dependsOn ?? []);
      if (deps.every((d) => outputs.has(d))) {
        ready.push(cell);
      }
    }

    if (ready.length === 0) {
      // This shouldn't happen if cycle detection passed, but guard anyway
      throw new BuildError({
        code: "CYCLIC_DEPENDS_ON",
        message: `CYCLIC_DEPENDS_ON: unable to schedule remaining cells (possible cycle)`
      });
    }

    // Run the ready wave in parallel
    const waveResults = await Promise.all(
      ready.map(async (cell) => {
        remaining.delete(cell.id);

        // ipynb cells: skip runFn for dep-failed check (no deps), just run normally
        const deps = cell.kind === "ipynb" ? [] : (cell.dependsOn ?? []);

        // Check if any dep failed
        const failedDep = deps.find((d) => outputs.get(d)?.status !== "ok");
        if (failedDep !== undefined) {
          const depStatus = outputs.get(failedDep)!.status;
          const out: CellOutput = {
            cellId: cell.id,
            status: "error",
            durationMs: 0,
            exitCode: 1,
            stdout: [],
            stderr: [],
            error: {
              name: "DependencyFailed",
              message: `cell "${cell.id}" was skipped because dependency "${failedDep}" failed (status: ${depStatus})`
            }
          };
          return out;
        }

        // Build depsResults map for this cell
        const depsResults: Record<string, unknown> = {};
        for (const d of deps) {
          depsResults[d] = outputs.get(d)?.result;
        }

        return runFn(cell, depsResults);
      })
    );

    for (const out of waveResults) {
      outputs.set(out.cellId, out);
    }
  }

  // Return in original cell order
  return cells.map((c) => outputs.get(c.id)!);
}

function detectCycles(cells: Cell[]): void {
  const adjList = new Map<string, string[]>();
  for (const cell of cells) {
    const deps = cell.kind === "ipynb" ? [] : (cell.dependsOn ?? []);
    adjList.set(cell.id, deps);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const cell of cells) color.set(cell.id, WHITE);

  function dfs(id: string, path: string[]): void {
    color.set(id, GRAY);
    for (const dep of adjList.get(id) ?? []) {
      if (color.get(dep) === GRAY) {
        throw new BuildError({
          code: "CYCLIC_DEPENDS_ON",
          message: `CYCLIC_DEPENDS_ON: cycle detected: ${[...path, id, dep].join(" → ")}`
        });
      }
      if (color.get(dep) === WHITE) {
        dfs(dep, [...path, id]);
      }
    }
    color.set(id, BLACK);
  }

  for (const cell of cells) {
    if (color.get(cell.id) === WHITE) {
      dfs(cell.id, []);
    }
  }
}

/**
 * Compute a stable hash of dep results for use in cache keys.
 * Returns empty string when depsResults is empty.
 */
export function hashDepsResults(depsResults: Record<string, unknown>): string {
  if (Object.keys(depsResults).length === 0) return "";
  return createHash("sha256")
    .update(JSON.stringify(depsResults, Object.keys(depsResults).sort()))
    .digest("hex");
}
