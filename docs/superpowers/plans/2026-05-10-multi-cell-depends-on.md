# Multi-Cell `dependsOn` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow MDX notebook cells to declare `dependsOn` so they receive prior cells' `result` via `MDX_NB_DEPS` env var, executing in topological order.

**Architecture:** Add `dependsOn?: string[]` to `InlineCell` and `FileCell` types; parse the attribute in fence and directive parsers; replace the flat concurrent runner in `run-page.ts` with a topological scheduler that builds dep payloads, detects cycles/missing ids, and skips failed dependents. The `MDX_NB_DEPS` JSON payload is injected via `ctx.env` so it reaches runners without any runner API change; the harness also exposes it as `globalThis.MDX_NB_DEPS` for ergonomic access.

**Tech Stack:** TypeScript, Node.js, Vitest, existing `BuildError`/`CellOutput` types.

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/mdx-notebook-core/src/types.ts` | Add `dependsOn?: string[]` to `InlineCell` and `FileCell` |
| Modify | `packages/mdx-notebook-core/src/errors.ts` | Add `BAD_DEPENDS_ON`, `CYCLIC_DEPENDS_ON`, `UNKNOWN_DEP` to `BuildErrorCode` union |
| Modify | `packages/mdx-notebook-core/src/parse-fence.ts` | Export `parseDependsOn(value)` helper |
| Modify | `packages/mdx-notebook-core/src/parse-directive.ts` | Add `dependsOn?: string[]` to `RunAttrs`; call `parseDependsOn` |
| Modify | `packages/mdx-notebook-core/src/remark-plugin.ts` | Thread `dependsOn` into pushed `inline` and `file` cells |
| Create | `packages/mdx-notebook-core/src/scheduler.ts` | `topologicalRun(cells, runFn)` |
| Modify | `packages/mdx-notebook-core/src/cache.ts` | Add `depsHash: string` to `CacheKeyInputs` and hash it |
| Modify | `packages/mdx-notebook-core/src/run-page.ts` | Replace `runConcurrent` with `topologicalRun`; wire `MDX_NB_DEPS` and `depsHash` |
| Modify | `packages/mdx-notebook-runner-ts/src/harness/harness.mjs` | Parse `MDX_NB_DEPS` into `globalThis.MDX_NB_DEPS` |
| Modify | `packages/mdx-notebook-core/test/parse-fence.test.ts` | Add `parseDependsOn` tests |
| Modify | `packages/mdx-notebook-core/test/parse-directive.test.ts` | Add `dependsOn` attribute tests |
| Modify | `packages/mdx-notebook-core/test/remark-plugin.test.ts` | Add fence/directive `dependsOn` cell tests |
| Create | `packages/mdx-notebook-core/test/scheduler.test.ts` | Full scheduler suite |
| Modify | `packages/mdx-notebook-core/test/run-page.test.ts` | Downstream cache-bust test |
| Create | `packages/mdx-notebook-core/test/fixtures/multi-cell.mdx` | E2E fixture |
| Create | `packages/mdx-notebook-core/test/multi-cell.e2e.test.ts` | E2E test using real runner-ts |

---

## Task 1: Add error codes and `dependsOn` to types

**Files:**
- Modify: `packages/mdx-notebook-core/src/errors.ts:4`
- Modify: `packages/mdx-notebook-core/src/types.ts:3-23`

- [ ] **Step 1: Add new error codes to `BuildErrorCode`**

In `packages/mdx-notebook-core/src/errors.ts`, extend the union:

```ts
export type BuildErrorCode =
  | "MISSING_ID"
  | "DUPLICATE_ID"
  | "MISSING_SRC"
  | "UNKNOWN_LANG"
  | "BAD_CELLS_SELECTOR"
  | "IPYNB_PARSE"
  | "BAD_DEPENDS_ON"
  | "CYCLIC_DEPENDS_ON"
  | "UNKNOWN_DEP"
  | "INTERNAL";
```

- [ ] **Step 2: Add `dependsOn` to `InlineCell` and `FileCell`**

In `packages/mdx-notebook-core/src/types.ts`, add `dependsOn?: string[]` to both types (but NOT `IpynbCell`):

```ts
export type InlineCell = {
  kind: "inline";
  id: string;
  lang: string;
  code: string;
  timeout?: number;
  cache?: boolean;
  env?: string;
  dependsOn?: string[];
  loc: Loc;
};

export type FileCell = {
  kind: "file";
  id: string;
  lang: string;
  src: string;
  timeout?: number;
  cache?: boolean;
  env?: string;
  dependsOn?: string[];
  loc: Loc;
};
```

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to these changes).

- [ ] **Step 4: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/src/errors.ts packages/mdx-notebook-core/src/types.ts
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(core): add dependsOn to InlineCell/FileCell types and new error codes"
```

---

## Task 2: `parseDependsOn` helper in `parse-fence.ts`

**Files:**
- Modify: `packages/mdx-notebook-core/src/parse-fence.ts`
- Modify: `packages/mdx-notebook-core/test/parse-fence.test.ts`

- [ ] **Step 1: Write failing tests first**

Append to `packages/mdx-notebook-core/test/parse-fence.test.ts`:

```ts
import { parseDependsOn } from "../src/parse-fence.js";

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
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "parseDependsOn|FAIL|Error" | head -20
```

Expected: FAIL because `parseDependsOn` is not yet exported.

- [ ] **Step 3: Implement `parseDependsOn` in `parse-fence.ts`**

Add at the end of `packages/mdx-notebook-core/src/parse-fence.ts`:

```ts
const VALID_ID_RE = /^[A-Za-z0-9_:-]+$/;

export function parseDependsOn(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const parts = value.split(",").map((s) => s.trim());
  for (const part of parts) {
    if (!part) {
      throw new BuildError({
        code: "BAD_DEPENDS_ON",
        message: `BAD_DEPENDS_ON: dependsOn contains an empty segment (got "${value}")`
      });
    }
    if (!VALID_ID_RE.test(part)) {
      throw new BuildError({
        code: "BAD_DEPENDS_ON",
        message: `BAD_DEPENDS_ON: invalid cell id "${part}" in dependsOn (must match [A-Za-z0-9_:-]+)`
      });
    }
  }
  return parts;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "parseDependsOn|✓|✗|FAIL|PASS" | head -30
```

Expected: all `parseDependsOn` tests green.

- [ ] **Step 5: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/src/parse-fence.ts packages/mdx-notebook-core/test/parse-fence.test.ts
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(core): add parseDependsOn helper to parse-fence"
```

---

## Task 3: Wire `dependsOn` in `parse-directive.ts`

**Files:**
- Modify: `packages/mdx-notebook-core/src/parse-directive.ts`
- Modify: `packages/mdx-notebook-core/test/parse-directive.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `packages/mdx-notebook-core/test/parse-directive.test.ts`:

```ts
describe("parseRunDirectiveAttrs — dependsOn", () => {
  it("parses dependsOn as string array", () => {
    const result = parseRunDirectiveAttrs(
      { src: "./x.ts", id: "x", dependsOn: "a,b" },
      loc()
    );
    expect(result.dependsOn).toEqual(["a", "b"]);
  });

  it("dependsOn absent → undefined", () => {
    const result = parseRunDirectiveAttrs({ src: "./x.ts", id: "x" }, loc());
    expect(result.dependsOn).toBeUndefined();
  });

  it("invalid dependsOn id throws BAD_DEPENDS_ON", () => {
    expect(() =>
      parseRunDirectiveAttrs({ src: "./x.ts", id: "x", dependsOn: "a/b" }, loc())
    ).toThrow(/BAD_DEPENDS_ON/);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "dependsOn|FAIL" | head -20
```

Expected: FAIL because `dependsOn` is not yet in `RunAttrs`.

- [ ] **Step 3: Update `RunAttrs` and `parseRunDirectiveAttrs`**

In `packages/mdx-notebook-core/src/parse-directive.ts`:

1. Import `parseDependsOn` (add to the existing import from `./parse-fence.js`):

```ts
import { parseTimeoutMs, parseDependsOn } from "./parse-fence.js";
```

2. Update `RunAttrs` interface:

```ts
export interface RunAttrs {
  id: string;
  src: string;
  timeout: number | undefined;
  cache: boolean | undefined;
  env: string | undefined;
  dependsOn: string[] | undefined;
}
```

3. Update the return of `parseRunDirectiveAttrs`:

```ts
export function parseRunDirectiveAttrs(
  raw: Record<string, string | undefined>,
  loc: Loc
): RunAttrs {
  const id = required(raw.id, "MISSING_ID", "MISSING_ID: directive `:::run` missing required `id`", loc);
  const src = required(raw.src, "MISSING_SRC", "MISSING_SRC: directive `:::run` missing required `src`", loc);
  return {
    id,
    src,
    timeout: parseTimeoutMs(raw.timeout),
    cache: parseBool(raw.cache),
    env: raw.env,
    dependsOn: parseDependsOn(raw.dependsOn)
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "dependsOn|✓|✗" | head -30
```

Expected: all `dependsOn` directive tests green.

- [ ] **Step 5: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/src/parse-directive.ts packages/mdx-notebook-core/test/parse-directive.test.ts
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(core): add dependsOn parsing to parseRunDirectiveAttrs"
```

---

## Task 4: Thread `dependsOn` through `remark-plugin.ts`

**Files:**
- Modify: `packages/mdx-notebook-core/src/remark-plugin.ts`
- Modify: `packages/mdx-notebook-core/test/remark-plugin.test.ts`

- [ ] **Step 1: Write a failing test**

Append to the `describe("remarkMdxNotebook")` block in `packages/mdx-notebook-core/test/remark-plugin.test.ts`:

```ts
it("attaches dependsOn from fence attrs to inline cell", () => {
  const src = "```ts run id=b dependsOn=a\nconsole.log(1);\n```\n";
  const c = process(src, "x.mdx");
  expect(c.cells[0]).toMatchObject({
    kind: "inline",
    id: "b",
    dependsOn: ["a"]
  });
});

it("attaches dependsOn from directive attrs to file cell", () => {
  const src = ':::run{src="./step2.ts" id="step2" dependsOn="step1,step0"}\n:::\n';
  const c = process(src, "x.mdx");
  expect(c.cells[0]).toMatchObject({
    kind: "file",
    id: "step2",
    dependsOn: ["step1", "step0"]
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "attaches dependsOn|FAIL" | head -10
```

Expected: FAIL — `dependsOn` will be undefined since plugin doesn't yet pass it.

- [ ] **Step 3: Update `remark-plugin.ts` to import and use `parseDependsOn`**

1. Update the import line at the top of `packages/mdx-notebook-core/src/remark-plugin.ts`:

```ts
import { parseFenceInfo, parseTimeoutMs, parseDependsOn } from "./parse-fence.js";
```

2. In the `visit(tree, "code", ...)` handler, add `dependsOn` to the pushed cell:

```ts
opts.collect.cells.push({
  kind: "inline",
  id,
  lang: info.lang,
  code: node.value + (node.value.endsWith("\n") ? "" : "\n"),
  timeout: parseTimeoutMs(info.attrs.timeout),
  cache: parseCacheAttr(info.attrs.cache),
  env: info.attrs.env,
  dependsOn: parseDependsOn(info.attrs.dependsOn),
  loc
});
```

3. In the `visit(tree, ..., "containerDirective")` handler for `dir.name === "run"`, add `dependsOn` to the pushed cell. Note: `a` (the result of `parseRunDirectiveAttrs`) already includes `dependsOn` after Task 3:

```ts
opts.collect.cells.push({
  kind: "file",
  id: a.id,
  lang,
  src: a.src,
  timeout: a.timeout,
  cache: a.cache,
  env: a.env,
  dependsOn: a.dependsOn,
  loc
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "dependsOn|✓|✗" | head -30
```

Expected: all `dependsOn` remark tests green; no regressions.

- [ ] **Step 5: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/src/remark-plugin.ts packages/mdx-notebook-core/test/remark-plugin.test.ts
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(core): thread dependsOn through remark-plugin for inline and file cells"
```

---

## Task 5: `depsHash` in cache key

**Files:**
- Modify: `packages/mdx-notebook-core/src/cache.ts`

- [ ] **Step 1: Add `depsHash` to `CacheKeyInputs` and include it in the hash**

In `packages/mdx-notebook-core/src/cache.ts`, update the interface and `computeCacheKey`:

```ts
export interface CacheKeyInputs {
  sourceBytes: string;
  runner: string;
  runnerVersion: string;
  nodeVersion: string;
  lockfile: string;
  env: string;
  depsHash: string;   // SHA-256 of JSON-stringified dep results; empty string when no deps
}

export function computeCacheKey(inputs: CacheKeyInputs): string {
  const h = createHash("sha256");
  const parts: Array<keyof CacheKeyInputs> = [
    "sourceBytes", "runner", "runnerVersion", "nodeVersion", "lockfile", "env", "depsHash"
  ];
  for (const k of parts) {
    h.update(`${k} ${inputs[k]}`);
  }
  return h.digest("hex");
}
```

- [ ] **Step 2: Build to confirm no TypeScript errors**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core exec tsc --noEmit 2>&1 | head -20
```

Expected: TypeScript will report that callers of `computeCacheKey` don't pass `depsHash`. Note those call sites — they will be fixed in Task 6 when we update `run-page.ts`.

- [ ] **Step 3: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/src/cache.ts
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(core): add depsHash field to CacheKeyInputs"
```

---

## Task 6: Create `scheduler.ts` with `topologicalRun`

**Files:**
- Create: `packages/mdx-notebook-core/src/scheduler.ts`
- Create: `packages/mdx-notebook-core/test/scheduler.test.ts`

- [ ] **Step 1: Write failing scheduler tests**

Create `packages/mdx-notebook-core/test/scheduler.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { topologicalRun } from "../src/scheduler.js";
import type { Cell, CellOutput } from "../src/types.js";

const loc = { file: "p", line: 1, column: 1 };

function inline(id: string, dependsOn?: string[]): Cell {
  return { kind: "inline", id, lang: "ts", code: "", dependsOn, loc };
}

const okOut = (id: string, result?: unknown): CellOutput => ({
  cellId: id, status: "ok", durationMs: 1, exitCode: 0, stdout: [], stderr: [], result
});

describe("topologicalRun", () => {
  it("runs cells with no deps in any order; each gets empty deps", async () => {
    const cells = [inline("a"), inline("b")];
    const order: string[] = [];
    await topologicalRun(cells, async (cell, deps) => {
      order.push(cell.id);
      expect(deps).toEqual({});
      return okOut(cell.id);
    });
    expect(order.sort()).toEqual(["a", "b"]);
  });

  it("respects dependency order", async () => {
    const cells = [inline("c", ["b"]), inline("b", ["a"]), inline("a")];
    const order: string[] = [];
    await topologicalRun(cells, async (cell) => {
      order.push(cell.id);
      return okOut(cell.id);
    });
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("provides each cell's deps' results", async () => {
    const cells = [inline("a"), inline("b", ["a"])];
    const captured: Record<string, unknown> = {};
    await topologicalRun(cells, async (cell, deps) => {
      captured[cell.id] = deps;
      return okOut(cell.id, cell.id === "a" ? { value: 42 } : undefined);
    });
    expect(captured.a).toEqual({});
    expect(captured.b).toEqual({ a: { value: 42 } });
  });

  it("skips cells whose dep failed, marking them DependencyFailed", async () => {
    const cells = [inline("a"), inline("b", ["a"])];
    const collected = await topologicalRun(cells, async (cell) => {
      if (cell.id === "a") {
        return {
          cellId: "a", status: "error" as const, durationMs: 0, exitCode: 1,
          stdout: [], stderr: [], error: { name: "X", message: "boom" }
        };
      }
      return okOut(cell.id);
    });
    const b = collected.find((o) => o.cellId === "b")!;
    expect(b.status).toBe("error");
    expect(b.error?.name).toBe("DependencyFailed");
    expect(b.error?.message).toMatch(/dependency "a" failed/);
  });

  it("throws on cyclic dependencies", async () => {
    const cells = [inline("a", ["b"]), inline("b", ["a"])];
    await expect(topologicalRun(cells, async (c) => okOut(c.id))).rejects.toThrow(/CYCLIC_DEPENDS_ON/);
  });

  it("throws on unknown dep id", async () => {
    const cells = [inline("a", ["nope"])];
    await expect(topologicalRun(cells, async (c) => okOut(c.id))).rejects.toThrow(/UNKNOWN_DEP/);
  });

  it("ipynb cells participate as no-op nodes (always treated as ok with empty deps)", async () => {
    const ipynb: Cell = { kind: "ipynb", id: "n:0", src: "x.ipynb", cellIndex: 0, loc };
    const cells: Cell[] = [ipynb, inline("b", ["n:0"])];
    let bDeps: Record<string, unknown> = {};
    await topologicalRun(cells, async (cell, deps) => {
      if (cell.id === "b") bDeps = deps;
      return okOut(cell.id);
    });
    expect("n:0" in bDeps).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "topologicalRun|FAIL|Cannot find" | head -20
```

Expected: FAIL with module not found / import error.

- [ ] **Step 3: Implement `scheduler.ts`**

Create `packages/mdx-notebook-core/src/scheduler.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "topologicalRun|✓|✗|FAIL" | head -40
```

Expected: all 7 scheduler tests green.

- [ ] **Step 5: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/src/scheduler.ts packages/mdx-notebook-core/test/scheduler.test.ts
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(core): add topologicalRun scheduler with cycle/missing-dep detection"
```

---

## Task 7: Update `run-page.ts` to use topological scheduler

**Files:**
- Modify: `packages/mdx-notebook-core/src/run-page.ts`
- Modify: `packages/mdx-notebook-core/test/run-page.test.ts`

- [ ] **Step 1: Write a failing test for downstream cache bust**

Append to the `describe("runPage")` block in `packages/mdx-notebook-core/test/run-page.test.ts`:

```ts
it("re-runs downstream cell when upstream result changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "mdx-rp-dep-"));
  let upstreamResult: unknown = { v: 1 };
  const depRunner: Runner = {
    language: "ts",
    version: "test-2",
    canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
    run: async (c) => ({
      cellId: c.id,
      status: "ok",
      durationMs: 1,
      exitCode: 0,
      stdout: [],
      stderr: [],
      result: c.id === "numbers" ? upstreamResult : undefined
    })
  };

  // Use the multi-cell fixture (created in Task 9)
  const multiFixture = join(FIX, "multi-cell.mdx");

  clearRegistry(); registerRunner(depRunner);
  const m1 = await runPage(multiFixture, { rootDir: root });
  expect(m1.cells["numbers"]?.result).toEqual({ v: 1 });

  // Change upstream result
  upstreamResult = { v: 2 };

  // First re-run: upstream is cached (same code) → downstream should also be cached
  // But upstream result hash changed (in cache key for downstream) → downstream re-runs
  // Since we're using a fake runner and cache is file-based, we need to bust the upstream cache manually.
  // Actually with useCache:false this is simpler to test:
  clearRegistry(); registerRunner(depRunner);
  const m2 = await runPage(multiFixture, { rootDir: root, useCache: false });
  expect(m2.cells["numbers"]?.result).toEqual({ v: 2 });
  expect(m2.cells["sum"]?.status).toBe("ok");
});
```

- [ ] **Step 2: Create the `multi-cell.mdx` fixture** (needed for the test above — also used in Task 9 E2E)

Create `packages/mdx-notebook-core/test/fixtures/multi-cell.mdx`:

```md
```ts run id=numbers
export default async () => [1, 2, 3, 4];
```

```ts run id=sum dependsOn=numbers
const deps = globalThis.MDX_NB_DEPS ?? {};
const arr = deps.numbers ?? [];
export default () => arr.reduce((a, b) => a + b, 0);
```
```

- [ ] **Step 3: Update `run-page.ts`**

Replace the contents of `packages/mdx-notebook-core/src/run-page.ts` with:

```ts
import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkDirective from "remark-directive";
import { remarkMdxNotebook, type CellsCollected } from "./remark-plugin.js";
import { dispatchCell } from "./dispatcher.js";
import { computePageId } from "./page-id.js";
import { computeCacheKey, readCache, writeCache } from "./cache.js";
import { buildManifest, writeManifest } from "./manifest.js";
import { topologicalRun, hashDepsResults } from "./scheduler.js";
import type { Cell, CellOutput, Manifest } from "./types.js";
import { BuildError } from "./errors.js";

export interface RunPageOptions {
  rootDir: string;
  useCache?: boolean;
  strict?: boolean;
  defaultTimeoutMs?: number;
  concurrency?: number;
}

export async function runPage(mdxPath: string, opts: RunPageOptions): Promise<Manifest> {
  const absMdx = isAbsolute(mdxPath) ? mdxPath : resolve(process.cwd(), mdxPath);
  const projectRoot = opts.rootDir;
  const mdxRel = relative(projectRoot, absMdx) || absMdx;
  const pageId = computePageId(mdxRel);

  const source = await readFile(absMdx, "utf8");
  const collected: CellsCollected = { cells: [] };
  const proc = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkDirective)
    .use(remarkMdxNotebook, { file: absMdx, collect: collected });
  const tree = proc.parse(source);
  proc.runSync(tree, { path: absMdx });

  const useCache = opts.useCache !== false;
  const defaultTimeoutMs = opts.defaultTimeoutMs ?? 30_000;
  const cacheRoot = resolve(projectRoot, ".mdx-notebook");

  const lockfileContent = readLockfileContent(projectRoot);
  const nodeVersion = process.versions.node;

  const outputs = await topologicalRun(collected.cells, async (cell, depsResults) => {
    const depsHash = hashDepsResults(depsResults);
    const cacheKey = await maybeCacheKey(cell, absMdx, lockfileContent, nodeVersion, depsHash);
    if (useCache && cell.cache !== false && cacheKey) {
      const hit = await readCache(cacheRoot, cacheKey);
      if (hit) return hit;
    }

    // Build MDX_NB_DEPS env var for this cell
    const depsEnv: Record<string, string> =
      Object.keys(depsResults).length > 0
        ? { MDX_NB_DEPS: JSON.stringify(depsResults) }
        : {};

    const out = await dispatchCell(cell, {
      cwd: dirname(absMdx),
      env: { ...(process.env as Record<string, string>), ...depsEnv },
      defaultTimeoutMs
    }, (p) => readFileSync(p, "utf8"));

    if (cacheKey && cell.cache !== false) {
      await writeCache(cacheRoot, cacheKey, out);
    }
    if (opts.strict && out.status !== "ok") {
      throw new BuildError({
        code: "STRICT_CELL_FAILURE",
        message: `cell "${cell.id}" failed: ${out.error?.message ?? out.status}`,
        loc: cell.loc,
        cause: out.error
      });
    }
    return out;
  });

  const manifest = buildManifest(pageId, outputs);
  await writeManifest(cacheRoot, manifest);
  return manifest;
}

async function maybeCacheKey(
  cell: Cell,
  mdxAbs: string,
  lockfileContent: string,
  nodeVersion: string,
  depsHash: string
): Promise<string | undefined> {
  if (cell.kind === "ipynb") return undefined;
  let sourceBytes = "";
  if (cell.kind === "inline") {
    sourceBytes = cell.code;
  } else {
    const abs = isAbsolute(cell.src) ? cell.src : resolve(dirname(mdxAbs), cell.src);
    try { sourceBytes = await readFile(abs, "utf8"); } catch { return undefined; }
  }
  let envBytes = "";
  if (cell.env) {
    const abs = isAbsolute(cell.env) ? cell.env : resolve(dirname(mdxAbs), cell.env);
    try { envBytes = await readFile(abs, "utf8"); } catch { /* env optional */ }
  }
  return computeCacheKey({
    sourceBytes,
    runner: cell.lang,
    runnerVersion: "0.0.0",
    nodeVersion,
    lockfile: lockfileContent,
    env: envBytes,
    depsHash
  });
}

function readLockfileContent(root: string): string {
  const candidates = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock"];
  for (const c of candidates) {
    const p = resolve(root, c);
    if (existsSync(p)) {
      return readFileSync(p, "utf8");
    }
  }
  return "";
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose 2>&1 | grep -E "runPage|✓|✗|FAIL" | head -40
```

Expected: all existing `runPage` tests still pass; the new dep test passes (it uses `useCache: false`).

- [ ] **Step 5: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/src/run-page.ts packages/mdx-notebook-core/test/run-page.test.ts packages/mdx-notebook-core/test/fixtures/multi-cell.mdx
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(core): replace runConcurrent with topologicalRun; wire MDX_NB_DEPS and depsHash"
```

---

## Task 8: Update runner-ts harness to expose `globalThis.MDX_NB_DEPS`

**Files:**
- Modify: `packages/mdx-notebook-runner-ts/src/harness/harness.mjs`

- [ ] **Step 1: Add `globalThis.MDX_NB_DEPS` assignment after env reads**

In `packages/mdx-notebook-runner-ts/src/harness/harness.mjs`, add after the `const resultFile = ...` line (before the `const envelope` declaration):

```js
if (process.env.MDX_NB_DEPS) {
  try {
    globalThis.MDX_NB_DEPS = JSON.parse(process.env.MDX_NB_DEPS);
  } catch {
    // ignore parse failure; users can still read process.env.MDX_NB_DEPS as string
  }
}
```

The full updated file becomes:

```js
// Runs inside the child process via tsx. Imports the user module,
// optionally invokes default export if it's a function, then writes a
// JSON envelope to MDX_NB_RESULT.

import { writeFile } from "node:fs/promises";

const target = process.env.MDX_NB_TARGET;
const resultFile = process.env.MDX_NB_RESULT;

if (!target || !resultFile) {
  process.stderr.write("[mdx-notebook harness] MDX_NB_TARGET and MDX_NB_RESULT are required\n");
  process.exit(2);
}

if (process.env.MDX_NB_DEPS) {
  try {
    globalThis.MDX_NB_DEPS = JSON.parse(process.env.MDX_NB_DEPS);
  } catch {
    // ignore parse failure; users can still read process.env.MDX_NB_DEPS as string
  }
}

const envelope = { ok: true, hasResult: false, result: undefined, error: undefined };

try {
  const mod = await import(target);
  if (mod && typeof mod.default === "function") {
    const value = await mod.default();
    envelope.hasResult = true;
    try {
      JSON.stringify(value);
      envelope.result = value;
    } catch (cause) {
      envelope.ok = false;
      envelope.error = {
        name: "SerializationError",
        message: `default export return value is not JSON-serializable: ${String(cause?.message ?? cause)}`
      };
    }
  }
} catch (err) {
  envelope.ok = false;
  const e = err && typeof err === "object" ? err : { message: String(err) };
  envelope.error = {
    name: e.name ?? "Error",
    message: String(e.message ?? err),
    stack: typeof e.stack === "string" ? e.stack : undefined
  };
}

try {
  await writeFile(resultFile, JSON.stringify(envelope));
} catch (writeErr) {
  process.stderr.write(`[mdx-notebook harness] failed to write result file: ${String(writeErr?.message ?? writeErr)}\n`);
  process.exit(3);
}

if (!envelope.ok) process.exit(1);
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-runner-ts test 2>&1 | tail -20
```

Expected: existing runner-ts tests still pass.

- [ ] **Step 3: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-runner-ts/src/harness/harness.mjs
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "feat(runner-ts): expose MDX_NB_DEPS as globalThis.MDX_NB_DEPS in harness"
```

---

## Task 9: End-to-end smoke test

**Files:**
- Create: `packages/mdx-notebook-core/test/multi-cell.e2e.test.ts`

(The fixture `packages/mdx-notebook-core/test/fixtures/multi-cell.mdx` was created in Task 7.)

- [ ] **Step 1: Create the E2E test**

Create `packages/mdx-notebook-core/test/multi-cell.e2e.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the E2E test**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-core test -- --reporter=verbose multi-cell 2>&1 | tail -30
```

Expected: both `numbers` and `sum` pass; `sum.result` is `10`.

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm test 2>&1 | tail -30
```

Expected: all packages green; total mdx-notebook-core tests up by ~10-12 from baseline.

- [ ] **Step 4: Commit**

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook add packages/mdx-notebook-core/test/multi-cell.e2e.test.ts
git -C /Users/jreehal/dev/js/r/mdx-notebook commit -m "test(core): add multi-cell E2E smoke test (numbers → sum = 10)"
```

---

## Task 10: Final commit and verification

- [ ] **Step 1: Run the full test suite one more time**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm test 2>&1 | tail -40
```

Expected: all packages pass. Count the `mdx-notebook-core` tests to confirm growth.

- [ ] **Step 2: Create the final feature commit**

If all commits from Tasks 1–9 are already in place, create a single cohesive message if a squash is appropriate, or leave the granular commits and create the summary:

```bash
git -C /Users/jreehal/dev/js/r/mdx-notebook log --oneline -10
```

Verify the commits look correct. No additional commit needed unless there are unstaged changes.

---

## Spec Coverage Checklist

| Spec Item | Task |
|-----------|------|
| `dependsOn?: string[]` on `InlineCell` and `FileCell` | Task 1 |
| Not on `IpynbCell` | Task 1 |
| `parseDependsOn` helper with validation | Task 2 |
| `parseDependsOn` tests (5 cases) | Task 2 |
| Fence parser calls `parseDependsOn` | Task 4 |
| Directive parser returns `dependsOn` | Task 3 |
| Topological scheduler | Task 6 |
| Cycle detection → `CYCLIC_DEPENDS_ON` | Task 6 |
| Missing dep → `UNKNOWN_DEP` | Task 6 |
| Dep failed → `DependencyFailed` skip | Task 6 |
| `MDX_NB_DEPS` env var injected | Task 7 |
| `depsHash` in cache key | Tasks 5 + 7 |
| Runner-ts `globalThis.MDX_NB_DEPS` | Task 8 |
| Scheduler unit tests (7 cases) | Task 6 |
| `parse-fence.test.ts` `parseDependsOn` cases | Task 2 |
| `parse-directive.test.ts` `dependsOn` cases | Task 3 |
| `remark-plugin.test.ts` fence + directive | Task 4 |
| `run-page.test.ts` downstream cache bust | Task 7 |
| `multi-cell.mdx` fixture | Task 7 |
| E2E `numbers → sum = 10` | Task 9 |
