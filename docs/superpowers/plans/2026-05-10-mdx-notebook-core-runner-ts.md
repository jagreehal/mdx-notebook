# mdx-notebook `core` + `runner-ts` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@mdx-notebook/core` (MDX/`.ipynb` parsing, cell discovery, output store, runner dispatch, cache) and `@mdx-notebook/runner-ts` (TS/JS execution and output capture) in a pnpm + Turborepo monorepo, end-to-end testable with TDD.

**Architecture:** Two packages in a pnpm workspace. `core` parses MDX with remark + remark-directive, discovers executable cells (annotated fences and `:::run` / `:::ipynb` directives), assembles a per-page manifest of `CellOutput`s, caches by content hash, and exposes a runtime store. `runner-ts` implements a pluggable `Runner` interface by spawning `tsx` in a child process per cell with a small ESM harness that captures stdout/stderr line events, the optional default-export return value, errors, and timeouts.

**Tech Stack:** Node 20+, pnpm 9, Turborepo, TypeScript 5.5+ strict, tsdown (bundler), Vitest 3, unified ^11, remark-mdx ^3, remark-directive ^4, unist-util-visit ^5, mdast-util-to-string ^4, tsx ^4, react ^19 (peer for the runtime react shim).

---

## File Structure

```
mdx-notebook/
├── .gitignore
├── .npmrc
├── package.json                          # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── docs/superpowers/
│   ├── specs/2026-05-10-mdx-notebook-core-runner-ts-design.md
│   └── plans/2026-05-10-mdx-notebook-core-runner-ts.md
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsdown.config.ts
    │   ├── vitest.config.ts
    │   ├── README.md
    │   ├── src/
    │   │   ├── index.ts                   # public API barrel
    │   │   ├── types.ts                   # Cell, CellOutput, Runner, Manifest, ...
    │   │   ├── errors.ts                  # tagged build errors
    │   │   ├── cells-selector.ts          # parse "1-5,7,9-12"
    │   │   ├── ipynb-parser.ts            # parse + select cells, extract outputs
    │   │   ├── parse-fence.ts             # info-string grammar
    │   │   ├── parse-directive.ts         # :::run + :::ipynb
    │   │   ├── remark-plugin.ts           # remarkMdxNotebook (composes the parsers)
    │   │   ├── runner-registry.ts         # registerRunner / getRunner
    │   │   ├── cache.ts                   # SHA-256 cache by composed key
    │   │   ├── manifest.ts                # assemble + write sidecar JSON
    │   │   ├── dispatcher.ts              # resolves cell -> CellOutput
    │   │   ├── run-page.ts                # orchestrator: parse -> dispatch -> manifest
    │   │   ├── page-id.ts                 # stable hash of source path
    │   │   └── runtime/
    │   │       ├── store.ts               # createOutputStore (framework-agnostic)
    │   │       └── react.ts               # OutputContext + useCellOutput
    │   └── test/
    │       ├── fixtures/
    │       │   ├── basic.mdx
    │       │   ├── all-kinds.mdx
    │       │   ├── duplicate-id.mdx
    │       │   ├── missing-id.mdx
    │       │   ├── unknown-lang.mdx
    │       │   └── notebooks/
    │       │       ├── simple.ipynb
    │       │       └── with-image.ipynb
    │       ├── cells-selector.test.ts
    │       ├── ipynb-parser.test.ts
    │       ├── parse-fence.test.ts
    │       ├── parse-directive.test.ts
    │       ├── remark-plugin.test.ts
    │       ├── runner-registry.test.ts
    │       ├── cache.test.ts
    │       ├── manifest.test.ts
    │       ├── dispatcher.test.ts
    │       ├── page-id.test.ts
    │       ├── run-page.test.ts          # end-to-end smoke
    │       └── runtime/
    │           ├── store.test.ts
    │           └── react.test.tsx
    └── runner-ts/
        ├── package.json
        ├── tsconfig.json
        ├── tsdown.config.ts
        ├── vitest.config.ts
        ├── README.md
        ├── src/
        │   ├── index.ts                   # default Runner export
        │   ├── register.ts                # side-effect: registers with core
        │   ├── runner.ts                  # the Runner impl
        │   ├── spawn.ts                   # spawn + abort + stream collection
        │   ├── capture.ts                 # line-splitter, bounded buffer
        │   ├── env.ts                     # dotenv merge
        │   └── harness/
        │       ├── harness.mjs            # the in-child ESM wrapper
        │       └── locate.ts              # find harness path at runtime
        └── test/
            ├── fixtures/
            │   ├── plain-script.ts
            │   ├── default-export.ts
            │   ├── async-default-export.ts
            │   ├── throws.ts
            │   ├── timeout.ts
            │   ├── oversized-stdout.ts
            │   ├── nonserializable.ts
            │   ├── env-consumer.ts
            │   └── prints-stderr.ts
            ├── capture.test.ts
            ├── env.test.ts
            ├── spawn.test.ts
            └── runner.test.ts
```

---

## Phase 0 — Repo & Tooling Scaffolding

### Task 0.1: Root workspace configuration

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`

- [ ] **Step 1: Create `.gitignore`**

```
node_modules
dist
.turbo
.mdx-notebook
coverage
*.tsbuildinfo
.DS_Store
```

- [ ] **Step 2: Create `.npmrc`**

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "mdx-notebook",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch --parallel",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules .turbo"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.5.0",
    "tsdown": "^0.12.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

- [ ] **Step 4: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 5: Create `turbo.json`**

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:watch": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "clean": { "cache": false }
  }
}
```

- [ ] **Step 6: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 7: Install root deps and verify**

Run:
```bash
pnpm install
pnpm -v && node -v
```
Expected: pnpm ≥ 9, node ≥ 20. No errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm + turborepo workspace"
```

---

### Task 0.2: Scaffold `@mdx-notebook/core` package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsdown.config.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/README.md`

- [ ] **Step 1: `packages/core/package.json`**

```json
{
  "name": "@mdx-notebook/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./runtime": {
      "types": "./dist/runtime/store.d.ts",
      "import": "./dist/runtime/store.js"
    },
    "./runtime/react": {
      "types": "./dist/runtime/react.d.ts",
      "import": "./dist/runtime/react.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo coverage"
  },
  "dependencies": {
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-mdx": "^3.0.0",
    "remark-directive": "^4.0.0",
    "unist-util-visit": "^5.0.0",
    "mdast-util-to-string": "^4.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/mdast": "^4.0.0",
    "@types/unist": "^3.0.0",
    "react": "^19.0.0",
    "@testing-library/react": "^16.0.0",
    "jsdom": "^26.0.0"
  }
}
```

- [ ] **Step 2: `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: `packages/core/tsdown.config.ts`**

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/runtime/store.ts",
    "src/runtime/react.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true
});
```

- [ ] **Step 4: `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [["test/runtime/react.test.tsx", "jsdom"]],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 }
    }
  }
});
```

- [ ] **Step 5: `packages/core/src/index.ts` (placeholder barrel)**

```ts
export {};
```

- [ ] **Step 6: `packages/core/README.md`**

```markdown
# @mdx-notebook/core

MDX + `.ipynb` cell discovery, output store, runner dispatch, and cache for mdx-notebook.

See [design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md).
```

- [ ] **Step 7: Install and verify**

Run:
```bash
pnpm install
pnpm --filter @mdx-notebook/core typecheck
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(core): scaffold package"
```

---

### Task 0.3: Scaffold `@mdx-notebook/runner-ts` package

**Files:**
- Create: `packages/runner-ts/package.json`
- Create: `packages/runner-ts/tsconfig.json`
- Create: `packages/runner-ts/tsdown.config.ts`
- Create: `packages/runner-ts/vitest.config.ts`
- Create: `packages/runner-ts/src/index.ts`
- Create: `packages/runner-ts/README.md`

- [ ] **Step 1: `packages/runner-ts/package.json`**

```json
{
  "name": "@mdx-notebook/runner-ts",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./register": {
      "types": "./dist/register.d.ts",
      "import": "./dist/register.js"
    },
    "./harness/harness.mjs": "./dist/harness/harness.mjs",
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown && cp src/harness/harness.mjs dist/harness/harness.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo coverage"
  },
  "dependencies": {
    "@mdx-notebook/core": "workspace:*",
    "tsx": "^4.19.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: `packages/runner-ts/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: `packages/runner-ts/tsdown.config.ts`**

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/register.ts",
    "src/harness/locate.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true
});
```

- [ ] **Step 4: `packages/runner-ts/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/harness/harness.mjs"],
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 }
    }
  }
});
```

- [ ] **Step 5: `packages/runner-ts/src/index.ts` (placeholder)**

```ts
export {};
```

- [ ] **Step 6: `packages/runner-ts/README.md`**

```markdown
# @mdx-notebook/runner-ts

TypeScript / JavaScript build-time runner for mdx-notebook.

Implements the `Runner` interface from `@mdx-notebook/core`. Spawns `tsx` in a child process per cell, captures stdout/stderr, the optional default-export return value, errors, and enforces timeouts.

See [design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md).
```

- [ ] **Step 7: Install and verify**

Run:
```bash
pnpm install
pnpm --filter @mdx-notebook/runner-ts typecheck
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(runner-ts): scaffold package"
```

---

## Phase 1 — `core` Types and Errors

### Task 1.1: Define core types

**Files:**
- Create: `packages/core/src/types.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write `packages/core/src/types.ts`**

```ts
export type Loc = { file: string; line: number; column: number };

export type InlineCell = {
  kind: "inline";
  id: string;
  lang: string;
  code: string;
  timeout?: number;
  cache?: boolean;
  env?: string;
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
  loc: Loc;
};

export type IpynbCell = {
  kind: "ipynb";
  id: string;
  src: string;
  cellIndex: number;
  loc: Loc;
};

export type Cell = InlineCell | FileCell | IpynbCell;

export type LogEvent = {
  ts: number;
  stream: "stdout" | "stderr";
  text: string;
};

export type IpynbOutput =
  | { type: "stream"; name: "stdout" | "stderr"; text: string }
  | { type: "display_data" | "execute_result"; data: Record<string, unknown> }
  | { type: "error"; ename: string; evalue: string; traceback: string[] };

export type CellOutput = {
  cellId: string;
  status: "ok" | "error" | "timeout";
  durationMs: number;
  exitCode: number;
  stdout: LogEvent[];
  stderr: LogEvent[];
  result?: unknown;
  error?: { name: string; message: string; stack?: string };
  ipynbOutputs?: IpynbOutput[];
};

export type Manifest = {
  pageId: string;
  cells: Record<string, CellOutput>;
  builtAt: number;
};

export interface RunCtx {
  signal: AbortSignal;
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}

export interface Runner {
  language: string;
  version: string;
  canHandle(cell: Cell): boolean;
  run(cell: Cell, ctx: RunCtx): Promise<CellOutput>;
}
```

- [ ] **Step 2: Re-export from `packages/core/src/index.ts`**

```ts
export * from "./types.js";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @mdx-notebook/core typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): add core types"
```

---

### Task 1.2: Tagged build errors

**Files:**
- Test: `packages/core/test/errors.test.ts`
- Create: `packages/core/src/errors.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/test/errors.test.ts
import { describe, it, expect } from "vitest";
import { BuildError, isBuildError } from "../src/errors.js";

describe("BuildError", () => {
  it("includes code, message, and location", () => {
    const e = new BuildError({
      code: "MISSING_ID",
      message: "Cell is missing required `id` attribute",
      loc: { file: "page.mdx", line: 3, column: 1 }
    });
    expect(e.code).toBe("MISSING_ID");
    expect(e.message).toContain("page.mdx:3:1");
    expect(e.message).toContain("missing required");
    expect(e.loc).toEqual({ file: "page.mdx", line: 3, column: 1 });
  });

  it("works without a location", () => {
    const e = new BuildError({ code: "INTERNAL", message: "boom" });
    expect(e.message).toBe("boom");
    expect(e.loc).toBeUndefined();
  });

  it("isBuildError narrows", () => {
    const e: unknown = new BuildError({ code: "X", message: "y" });
    expect(isBuildError(e)).toBe(true);
    expect(isBuildError(new Error("plain"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test errors`
Expected: FAIL — module `../src/errors.js` not found.

- [ ] **Step 3: Implement `packages/core/src/errors.ts`**

```ts
import type { Loc } from "./types.js";

export type BuildErrorCode =
  | "MISSING_ID"
  | "DUPLICATE_ID"
  | "MISSING_SRC"
  | "UNKNOWN_LANG"
  | "BAD_CELLS_SELECTOR"
  | "IPYNB_PARSE"
  | "INTERNAL";

export interface BuildErrorInit {
  code: BuildErrorCode | string;
  message: string;
  loc?: Loc;
  cause?: unknown;
}

export class BuildError extends Error {
  readonly code: string;
  readonly loc: Loc | undefined;

  constructor(init: BuildErrorInit) {
    const prefix = init.loc ? `${init.loc.file}:${init.loc.line}:${init.loc.column}: ` : "";
    super(prefix + init.message, { cause: init.cause });
    this.name = "BuildError";
    this.code = init.code;
    this.loc = init.loc;
  }
}

export function isBuildError(value: unknown): value is BuildError {
  return value instanceof BuildError;
}
```

- [ ] **Step 4: Re-export from `index.ts`**

Append to `packages/core/src/index.ts`:
```ts
export * from "./errors.js";
```

- [ ] **Step 5: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test errors`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/errors.ts packages/core/src/index.ts packages/core/test/errors.test.ts
git commit -m "feat(core): add BuildError with location-prefixed messages"
```

---

## Phase 2 — `core` Cells Selector

### Task 2.1: Parse cell selector grammar `"1-5,7,9-12"`

**Files:**
- Test: `packages/core/test/cells-selector.test.ts`
- Create: `packages/core/src/cells-selector.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/cells-selector.test.ts
import { describe, it, expect } from "vitest";
import { parseCellsSelector } from "../src/cells-selector.js";
import { BuildError } from "../src/errors.js";

describe("parseCellsSelector", () => {
  it("undefined selects all (returns null)", () => {
    expect(parseCellsSelector(undefined)).toBeNull();
  });

  it("single index", () => {
    expect(parseCellsSelector("3")).toEqual([3]);
  });

  it("comma list", () => {
    expect(parseCellsSelector("1,3,5")).toEqual([1, 3, 5]);
  });

  it("range inclusive", () => {
    expect(parseCellsSelector("2-5")).toEqual([2, 3, 4, 5]);
  });

  it("mixed list and ranges, deduped and sorted", () => {
    expect(parseCellsSelector("3,1-2,5,4-5")).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles whitespace", () => {
    expect(parseCellsSelector(" 1 - 3 , 5 ")).toEqual([1, 2, 3, 5]);
  });

  it("rejects empty string", () => {
    expect(() => parseCellsSelector("")).toThrow(BuildError);
  });

  it("rejects negative numbers", () => {
    expect(() => parseCellsSelector("-1")).toThrow(/BAD_CELLS_SELECTOR/);
  });

  it("rejects reversed range", () => {
    expect(() => parseCellsSelector("5-2")).toThrow(/BAD_CELLS_SELECTOR/);
  });

  it("rejects non-numeric", () => {
    expect(() => parseCellsSelector("a")).toThrow(/BAD_CELLS_SELECTOR/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test cells-selector`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/core/src/cells-selector.ts`**

```ts
import { BuildError } from "./errors.js";

export function parseCellsSelector(input: string | undefined): number[] | null {
  if (input === undefined) return null;
  const raw = input.trim();
  if (raw.length === 0) {
    throw new BuildError({ code: "BAD_CELLS_SELECTOR", message: "cells selector is empty" });
  }
  const parts = raw.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new BuildError({ code: "BAD_CELLS_SELECTOR", message: `cells selector "${input}" is empty` });
  }
  const out = new Set<number>();
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((s) => s.trim());
      const lo = parseNonNegativeInt(a, input);
      const hi = parseNonNegativeInt(b, input);
      if (hi < lo) {
        throw new BuildError({
          code: "BAD_CELLS_SELECTOR",
          message: `cells range "${part}" is reversed (in "${input}")`
        });
      }
      for (let i = lo; i <= hi; i++) out.add(i);
    } else {
      out.add(parseNonNegativeInt(part, input));
    }
  }
  return [...out].sort((a, b) => a - b);
}

function parseNonNegativeInt(token: string | undefined, original: string): number {
  if (token === undefined || !/^\d+$/.test(token)) {
    throw new BuildError({
      code: "BAD_CELLS_SELECTOR",
      message: `invalid integer "${token ?? ""}" in cells selector "${original}"`
    });
  }
  return Number(token);
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test cells-selector`
Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/cells-selector.ts packages/core/test/cells-selector.test.ts
git commit -m "feat(core): cells selector parser"
```

---

## Phase 3 — `core` `.ipynb` Parser

### Task 3.1: Create test fixtures

**Files:**
- Create: `packages/core/test/fixtures/notebooks/simple.ipynb`
- Create: `packages/core/test/fixtures/notebooks/with-image.ipynb`

- [ ] **Step 1: Create `simple.ipynb`**

```json
{
  "cells": [
    {
      "cell_type": "markdown",
      "metadata": {},
      "source": ["# Title\n", "intro"]
    },
    {
      "cell_type": "code",
      "execution_count": 1,
      "metadata": {},
      "source": ["print('hello')\n"],
      "outputs": [
        { "output_type": "stream", "name": "stdout", "text": ["hello\n"] }
      ]
    },
    {
      "cell_type": "code",
      "execution_count": 2,
      "metadata": {},
      "source": ["1 + 1"],
      "outputs": [
        {
          "output_type": "execute_result",
          "execution_count": 2,
          "metadata": {},
          "data": { "text/plain": ["2"] }
        }
      ]
    }
  ],
  "metadata": { "kernelspec": { "name": "python3", "display_name": "Python 3" } },
  "nbformat": 4,
  "nbformat_minor": 5
}
```

- [ ] **Step 2: Create `with-image.ipynb`**

```json
{
  "cells": [
    {
      "cell_type": "code",
      "execution_count": 1,
      "metadata": {},
      "source": ["plot()"],
      "outputs": [
        {
          "output_type": "display_data",
          "data": {
            "text/plain": ["<Figure>"],
            "image/png": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          },
          "metadata": {}
        }
      ]
    },
    {
      "cell_type": "code",
      "execution_count": 2,
      "metadata": {},
      "source": ["raise ValueError('boom')"],
      "outputs": [
        {
          "output_type": "error",
          "ename": "ValueError",
          "evalue": "boom",
          "traceback": ["Traceback...", "ValueError: boom"]
        }
      ]
    }
  ],
  "metadata": {},
  "nbformat": 4,
  "nbformat_minor": 5
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/test/fixtures/notebooks
git commit -m "test(core): ipynb fixtures"
```

---

### Task 3.2: ipynb parser

**Files:**
- Test: `packages/core/test/ipynb-parser.test.ts`
- Create: `packages/core/src/ipynb-parser.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/ipynb-parser.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseIpynb, extractIpynbCells } from "../src/ipynb-parser.js";
import { BuildError } from "../src/errors.js";

const fix = (name: string) =>
  readFileSync(join(__dirname, "fixtures", "notebooks", name), "utf8");

describe("parseIpynb", () => {
  it("parses simple notebook into code cells with outputs", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    expect(nb.codeCells).toHaveLength(2);
    expect(nb.codeCells[0]!.outputs[0]).toEqual({
      type: "stream",
      name: "stdout",
      text: "hello\n"
    });
  });

  it("parses execute_result with mime data", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const out = nb.codeCells[1]!.outputs[0];
    expect(out).toMatchObject({
      type: "execute_result",
      data: { "text/plain": "2" }
    });
  });

  it("parses display_data with image/png and error outputs", () => {
    const nb = parseIpynb(fix("with-image.ipynb"));
    expect(nb.codeCells[0]!.outputs[0]).toMatchObject({
      type: "display_data",
      data: { "image/png": expect.any(String), "text/plain": "<Figure>" }
    });
    expect(nb.codeCells[1]!.outputs[0]).toEqual({
      type: "error",
      ename: "ValueError",
      evalue: "boom",
      traceback: ["Traceback...", "ValueError: boom"]
    });
  });

  it("throws on malformed JSON", () => {
    expect(() => parseIpynb("not json")).toThrow(BuildError);
  });

  it("throws when 'cells' is missing", () => {
    expect(() => parseIpynb(JSON.stringify({}))).toThrow(/IPYNB_PARSE/);
  });
});

describe("extractIpynbCells", () => {
  it("returns all code cells when selector is null", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const cells = extractIpynbCells(nb, null);
    expect(cells).toHaveLength(2);
    expect(cells[0]!.cellIndex).toBe(0);
    expect(cells[1]!.cellIndex).toBe(1);
  });

  it("filters by selector", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const cells = extractIpynbCells(nb, [1]);
    expect(cells).toHaveLength(1);
    expect(cells[0]!.cellIndex).toBe(1);
  });

  it("ignores out-of-range selectors silently", () => {
    const nb = parseIpynb(fix("simple.ipynb"));
    const cells = extractIpynbCells(nb, [0, 99]);
    expect(cells).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test ipynb-parser`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/core/src/ipynb-parser.ts`**

```ts
import { BuildError } from "./errors.js";
import type { IpynbOutput } from "./types.js";

export interface ParsedIpynbCodeCell {
  cellIndex: number;        // index among code cells only
  source: string;
  outputs: IpynbOutput[];
}

export interface ParsedIpynb {
  codeCells: ParsedIpynbCodeCell[];
}

interface RawCell {
  cell_type: string;
  source: string | string[];
  outputs?: RawOutput[];
}

interface RawOutput {
  output_type: string;
  name?: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export function parseIpynb(input: string): ParsedIpynb {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch (cause) {
    throw new BuildError({ code: "IPYNB_PARSE", message: "invalid JSON in .ipynb", cause });
  }
  if (!json || typeof json !== "object" || !Array.isArray((json as { cells?: unknown }).cells)) {
    throw new BuildError({ code: "IPYNB_PARSE", message: ".ipynb missing 'cells' array" });
  }
  const rawCells = (json as { cells: RawCell[] }).cells;
  const codeCells: ParsedIpynbCodeCell[] = [];
  let codeIdx = 0;
  for (const cell of rawCells) {
    if (cell.cell_type !== "code") continue;
    codeCells.push({
      cellIndex: codeIdx++,
      source: joinText(cell.source),
      outputs: (cell.outputs ?? []).map(convertOutput)
    });
  }
  return { codeCells };
}

export function extractIpynbCells(
  nb: ParsedIpynb,
  selector: number[] | null
): ParsedIpynbCodeCell[] {
  if (selector === null) return nb.codeCells;
  const wanted = new Set(selector);
  return nb.codeCells.filter((c) => wanted.has(c.cellIndex));
}

function joinText(text: string | string[]): string {
  return Array.isArray(text) ? text.join("") : text;
}

function convertOutput(raw: RawOutput): IpynbOutput {
  switch (raw.output_type) {
    case "stream": {
      const name = raw.name === "stderr" ? "stderr" : "stdout";
      return { type: "stream", name, text: joinText(raw.text ?? "") };
    }
    case "display_data":
    case "execute_result": {
      const data: Record<string, unknown> = {};
      for (const [mime, value] of Object.entries(raw.data ?? {})) {
        data[mime] = typeof value === "string" ? value : joinText(value);
      }
      return { type: raw.output_type, data };
    }
    case "error": {
      return {
        type: "error",
        ename: raw.ename ?? "Error",
        evalue: raw.evalue ?? "",
        traceback: raw.traceback ?? []
      };
    }
    default:
      // Unknown output type: preserve as a stream entry to avoid losing info
      return { type: "stream", name: "stdout", text: `[unknown output_type: ${raw.output_type}]` };
  }
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test ipynb-parser`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/ipynb-parser.ts packages/core/test/ipynb-parser.test.ts
git commit -m "feat(core): ipynb parser with output mime-type extraction"
```

---

## Phase 4 — `core` Fence Parsing

### Task 4.1: Parse fence info-string

**Files:**
- Test: `packages/core/test/parse-fence.test.ts`
- Create: `packages/core/src/parse-fence.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test parse-fence`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/parse-fence.ts`**

```ts
export type FenceInfo =
  | { runnable: false; lang: string }
  | { runnable: true; lang: string; attrs: Record<string, string> };

export function parseFenceInfo(info: string): FenceInfo {
  const tokens = tokenize(info);
  const lang = tokens[0] ?? "";
  if (tokens[1] !== "run") return { runnable: false, lang };
  const attrs: Record<string, string> = {};
  for (const tok of tokens.slice(2)) {
    const eq = tok.indexOf("=");
    if (eq <= 0) continue;
    const key = tok.slice(0, eq);
    const raw = tok.slice(eq + 1);
    attrs[key] = unquote(raw);
  }
  return { runnable: true, lang, attrs };
}

function tokenize(input: string): string[] {
  const out: string[] = [];
  const s = input;
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    let tok = "";
    while (i < s.length && s[i] !== " " && s[i] !== "\t") {
      const ch = s[i]!;
      if (ch === '"') {
        tok += '"';
        i++;
        while (i < s.length && s[i] !== '"') {
          tok += s[i]!;
          i++;
        }
        if (i < s.length) {
          tok += '"';
          i++;
        }
      } else {
        tok += ch;
        i++;
      }
    }
    if (tok.length > 0) out.push(tok);
  }
  return out;
}

function unquote(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test parse-fence`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parse-fence.ts packages/core/test/parse-fence.test.ts
git commit -m "feat(core): fence info-string parser"
```

---

### Task 4.2: Helper for `timeout=10s` parsing

**Files:**
- Test: extend `packages/core/test/parse-fence.test.ts`
- Modify: `packages/core/src/parse-fence.ts`

- [ ] **Step 1: Append a `parseTimeoutMs` test**

Add to `packages/core/test/parse-fence.test.ts`:
```ts
import { parseTimeoutMs } from "../src/parse-fence.js";
import { BuildError } from "../src/errors.js";

describe("parseTimeoutMs", () => {
  it("undefined -> undefined", () => expect(parseTimeoutMs(undefined)).toBeUndefined());
  it("plain number -> ms", () => expect(parseTimeoutMs("500")).toBe(500));
  it("ms suffix", () => expect(parseTimeoutMs("250ms")).toBe(250));
  it("seconds suffix", () => expect(parseTimeoutMs("10s")).toBe(10_000));
  it("minutes suffix", () => expect(parseTimeoutMs("2m")).toBe(120_000));
  it("rejects garbage", () => expect(() => parseTimeoutMs("abc")).toThrow(BuildError));
  it("rejects zero", () => expect(() => parseTimeoutMs("0")).toThrow(BuildError));
  it("rejects negative", () => expect(() => parseTimeoutMs("-5s")).toThrow(BuildError));
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test parse-fence`
Expected: FAIL on the new tests.

- [ ] **Step 3: Append `parseTimeoutMs` to `parse-fence.ts`**

```ts
import { BuildError } from "./errors.js";

export function parseTimeoutMs(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const m = /^(\d+)(ms|s|m)?$/.exec(value.trim());
  if (!m) {
    throw new BuildError({ code: "BAD_TIMEOUT", message: `invalid timeout "${value}"` });
  }
  const n = Number(m[1]);
  if (n <= 0) {
    throw new BuildError({ code: "BAD_TIMEOUT", message: `timeout must be > 0 (got "${value}")` });
  }
  const unit = m[2] ?? "ms";
  const factor = unit === "ms" ? 1 : unit === "s" ? 1000 : 60_000;
  return n * factor;
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test parse-fence`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parse-fence.ts packages/core/test/parse-fence.test.ts
git commit -m "feat(core): parseTimeoutMs helper"
```

---

## Phase 5 — `core` Directive Parsing

### Task 5.1: Parse directive attributes for `:::run` and `:::ipynb`

**Files:**
- Test: `packages/core/test/parse-directive.test.ts`
- Create: `packages/core/src/parse-directive.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/parse-directive.test.ts
import { describe, it, expect } from "vitest";
import { parseRunDirectiveAttrs, parseIpynbDirectiveAttrs, inferLang } from "../src/parse-directive.js";
import { BuildError } from "../src/errors.js";

describe("parseRunDirectiveAttrs", () => {
  it("requires id", () => {
    expect(() => parseRunDirectiveAttrs({ src: "./x.ts" }, loc())).toThrow(/MISSING_ID/);
  });
  it("requires src", () => {
    expect(() => parseRunDirectiveAttrs({ id: "x" }, loc())).toThrow(/MISSING_SRC/);
  });
  it("returns parsed attrs", () => {
    expect(parseRunDirectiveAttrs({ src: "./x.ts", id: "x", timeout: "10s" }, loc())).toEqual({
      id: "x",
      src: "./x.ts",
      timeout: 10_000,
      cache: undefined,
      env: undefined
    });
  });
  it("parses cache=false", () => {
    expect(
      parseRunDirectiveAttrs({ src: "./x.ts", id: "x", cache: "false" }, loc()).cache
    ).toBe(false);
  });
});

describe("parseIpynbDirectiveAttrs", () => {
  it("requires id and src", () => {
    expect(() => parseIpynbDirectiveAttrs({ src: "./n.ipynb" }, loc())).toThrow(/MISSING_ID/);
    expect(() => parseIpynbDirectiveAttrs({ id: "x" }, loc())).toThrow(/MISSING_SRC/);
  });
  it("returns parsed attrs with cells selector", () => {
    expect(parseIpynbDirectiveAttrs({ id: "n", src: "./n.ipynb", cells: "1-3" }, loc())).toEqual({
      id: "n",
      src: "./n.ipynb",
      cells: [1, 2, 3]
    });
  });
});

describe("inferLang", () => {
  it.each([
    [".ts", "ts"],
    [".tsx", "ts"],
    [".js", "js"],
    [".mjs", "js"],
    [".cjs", "js"],
    [".jsx", "js"]
  ])("infers %s", (ext, lang) => {
    expect(inferLang(`./file${ext}`)).toBe(lang);
  });
  it("throws on unknown extension", () => {
    expect(() => inferLang("./file.rb")).toThrow(BuildError);
  });
});

function loc() {
  return { file: "p.mdx", line: 1, column: 1 };
}
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test parse-directive`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/parse-directive.ts`**

```ts
import { extname } from "node:path";
import { BuildError } from "./errors.js";
import { parseTimeoutMs } from "./parse-fence.js";
import { parseCellsSelector } from "./cells-selector.js";
import type { Loc } from "./types.js";

export interface RunAttrs {
  id: string;
  src: string;
  timeout: number | undefined;
  cache: boolean | undefined;
  env: string | undefined;
}

export interface IpynbAttrs {
  id: string;
  src: string;
  cells: number[] | null;
}

export function parseRunDirectiveAttrs(
  raw: Record<string, string | undefined>,
  loc: Loc
): RunAttrs {
  const id = required(raw.id, "MISSING_ID", "directive `:::run` missing required `id`", loc);
  const src = required(raw.src, "MISSING_SRC", "directive `:::run` missing required `src`", loc);
  return {
    id,
    src,
    timeout: parseTimeoutMs(raw.timeout),
    cache: parseBool(raw.cache),
    env: raw.env
  };
}

export function parseIpynbDirectiveAttrs(
  raw: Record<string, string | undefined>,
  loc: Loc
): IpynbAttrs {
  const id = required(raw.id, "MISSING_ID", "directive `:::ipynb` missing required `id`", loc);
  const src = required(raw.src, "MISSING_SRC", "directive `:::ipynb` missing required `src`", loc);
  return { id, src, cells: parseCellsSelector(raw.cells) };
}

export function inferLang(src: string): string {
  const ext = extname(src).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
    case ".mts":
    case ".cts":
      return "ts";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "js";
    default:
      throw new BuildError({
        code: "UNKNOWN_LANG",
        message: `cannot infer language from extension "${ext}" in "${src}"`
      });
  }
}

function required(value: string | undefined, code: string, msg: string, loc: Loc): string {
  if (value === undefined || value === "") {
    throw new BuildError({ code, message: msg, loc });
  }
  return value;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test parse-directive`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parse-directive.ts packages/core/test/parse-directive.test.ts
git commit -m "feat(core): directive attribute parsers + lang inference"
```

---

## Phase 6 — `core` Remark Plugin

### Task 6.1: Page-id helper

**Files:**
- Test: `packages/core/test/page-id.test.ts`
- Create: `packages/core/src/page-id.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/page-id.test.ts
import { describe, it, expect } from "vitest";
import { computePageId } from "../src/page-id.js";

describe("computePageId", () => {
  it("is deterministic for the same path", () => {
    expect(computePageId("a/b.mdx")).toBe(computePageId("a/b.mdx"));
  });
  it("differs across paths", () => {
    expect(computePageId("a.mdx")).not.toBe(computePageId("b.mdx"));
  });
  it("normalizes platform separators", () => {
    expect(computePageId("a/b.mdx")).toBe(computePageId("a\\b.mdx"));
  });
  it("returns 16 hex chars", () => {
    expect(computePageId("a.mdx")).toMatch(/^[0-9a-f]{16}$/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test page-id`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/page-id.ts`**

```ts
import { createHash } from "node:crypto";

export function computePageId(relPath: string): string {
  const normalized = relPath.split(/[\\/]+/).join("/");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test page-id`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/page-id.ts packages/core/test/page-id.test.ts
git commit -m "feat(core): stable page id from path"
```

---

### Task 6.2: MDX fixtures

**Files:**
- Create: `packages/core/test/fixtures/basic.mdx`
- Create: `packages/core/test/fixtures/all-kinds.mdx`
- Create: `packages/core/test/fixtures/duplicate-id.mdx`
- Create: `packages/core/test/fixtures/missing-id.mdx`
- Create: `packages/core/test/fixtures/unknown-lang.mdx`

- [ ] **Step 1: `basic.mdx`**

````md
# Basic

```ts run id=hello
console.log("hello");
```

This is normal text.
````

- [ ] **Step 2: `all-kinds.mdx`**

````md
# All kinds

Inline:

```ts run id=inline-1
export default async () => ({ greeting: "hi" });
```

File reference:

:::run{src="./scripts/agent.ts" id="trace"}
:::

Notebook import:

:::ipynb{src="./notebooks/simple.ipynb" id="nb" cells="0-1"}
:::
````

- [ ] **Step 3: `duplicate-id.mdx`**

````md
```ts run id=dup
console.log(1);
```

```ts run id=dup
console.log(2);
```
````

- [ ] **Step 4: `missing-id.mdx`**

````md
```ts run
console.log("no id");
```
````

- [ ] **Step 5: `unknown-lang.mdx`**

````md
```ruby run id=x
puts "hello"
```
````

- [ ] **Step 6: Commit**

```bash
git add packages/core/test/fixtures/*.mdx
git commit -m "test(core): mdx fixtures for remark plugin"
```

---

### Task 6.3: Remark plugin — discover cells

**Files:**
- Test: `packages/core/test/remark-plugin.test.ts`
- Create: `packages/core/src/remark-plugin.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/remark-plugin.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkDirective from "remark-directive";
import { remarkMdxNotebook, type CellsCollected } from "../src/remark-plugin.js";
import { BuildError } from "../src/errors.js";

const mdx = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

function process(source: string, file: string) {
  const collected: CellsCollected = { cells: [] };
  const proc = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkDirective)
    .use(remarkMdxNotebook, { file, collect: collected });
  proc.parse(source);
  // Plugin runs in transform; we need .run + parse not just parse.
  const tree = proc.parse(source);
  proc.runSync(tree, { path: file });
  return collected;
}

describe("remarkMdxNotebook", () => {
  it("discovers a single inline cell", () => {
    const c = process(mdx("basic.mdx"), "fixtures/basic.mdx");
    expect(c.cells).toHaveLength(1);
    expect(c.cells[0]).toMatchObject({
      kind: "inline",
      id: "hello",
      lang: "ts",
      code: 'console.log("hello");\n'
    });
  });

  it("discovers all three cell kinds", () => {
    const c = process(mdx("all-kinds.mdx"), "fixtures/all-kinds.mdx");
    expect(c.cells.map((x) => x.kind)).toEqual(["inline", "file", "ipynb", "ipynb"]);
    const file = c.cells.find((x) => x.kind === "file")!;
    expect(file).toMatchObject({ id: "trace", lang: "ts", src: "./scripts/agent.ts" });
    const ipynbCells = c.cells.filter((x) => x.kind === "ipynb");
    expect(ipynbCells.map((x) => x.cellIndex)).toEqual([0, 1]);
  });

  it("throws on duplicate id", () => {
    expect(() => process(mdx("duplicate-id.mdx"), "fixtures/duplicate-id.mdx")).toThrow(
      /DUPLICATE_ID/
    );
  });

  it("throws on missing id", () => {
    expect(() => process(mdx("missing-id.mdx"), "fixtures/missing-id.mdx")).toThrow(
      /MISSING_ID/
    );
  });

  it("ignores fences without `run`", () => {
    const src = "```ts\nconsole.log(1);\n```\n";
    const c = process(src, "x.mdx");
    expect(c.cells).toHaveLength(0);
  });

  it("attaches loc info", () => {
    const c = process(mdx("basic.mdx"), "fixtures/basic.mdx");
    const cell = c.cells[0]!;
    expect(cell.loc.file).toBe("fixtures/basic.mdx");
    expect(cell.loc.line).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test remark-plugin`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/core/src/remark-plugin.ts`**

```ts
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "unified";
import type { Root, Code } from "mdast";
import { visit } from "unist-util-visit";
import { BuildError } from "./errors.js";
import { parseFenceInfo, parseTimeoutMs } from "./parse-fence.js";
import {
  parseRunDirectiveAttrs,
  parseIpynbDirectiveAttrs,
  inferLang
} from "./parse-directive.js";
import { parseIpynb, extractIpynbCells } from "./ipynb-parser.js";
import type { Cell, Loc } from "./types.js";

export interface CellsCollected {
  cells: Cell[];
}

export interface RemarkMdxNotebookOptions {
  file: string;             // path to the MDX file (used for loc + relative resolution)
  collect: CellsCollected;  // mutable bag to receive discovered cells
  readIpynb?: (absPath: string) => string; // injectable for tests
}

interface ContainerDirective {
  type: "containerDirective";
  name: string;
  attributes?: Record<string, string | null>;
  position?: { start: { line: number; column: number } };
}

export const remarkMdxNotebook: Plugin<[RemarkMdxNotebookOptions], Root> = (opts) => {
  return (tree) => {
    const seen = new Set<string>();
    const file = opts.file;
    const readNb = opts.readIpynb ?? ((p) => readFileSync(p, "utf8"));

    visit(tree, "code", (node: Code) => {
      const info = parseFenceInfo(node.lang ? `${node.lang} ${node.meta ?? ""}`.trim() : (node.meta ?? ""));
      if (!info.runnable) return;
      const loc = makeLoc(file, node.position);
      const id = info.attrs.id;
      if (!id) {
        throw new BuildError({ code: "MISSING_ID", message: "code fence missing required `id`", loc });
      }
      assertUnique(seen, id, loc);
      opts.collect.cells.push({
        kind: "inline",
        id,
        lang: info.lang,
        code: node.value + (node.value.endsWith("\n") ? "" : "\n"),
        timeout: parseTimeoutMs(info.attrs.timeout),
        cache: parseCacheAttr(info.attrs.cache),
        env: info.attrs.env,
        loc
      });
    });

    visit(tree, (n) => (n as { type: string }).type === "containerDirective", (node) => {
      const dir = node as unknown as ContainerDirective;
      const loc = makeLoc(file, dir.position ? { start: dir.position.start } : undefined);
      const attrs = stripNulls(dir.attributes);
      if (dir.name === "run") {
        const a = parseRunDirectiveAttrs(attrs, loc);
        assertUnique(seen, a.id, loc);
        const lang = inferLang(a.src);
        opts.collect.cells.push({
          kind: "file",
          id: a.id,
          lang,
          src: a.src,
          timeout: a.timeout,
          cache: a.cache,
          env: a.env,
          loc
        });
      } else if (dir.name === "ipynb") {
        const a = parseIpynbDirectiveAttrs(attrs, loc);
        const absPath = resolve(dirname(file), a.src);
        const buf = readNb(absPath);
        const nb = parseIpynb(buf);
        const cells = extractIpynbCells(nb, a.cells);
        for (const cc of cells) {
          const cellId = `${a.id}:${cc.cellIndex}`;
          assertUnique(seen, cellId, loc);
          opts.collect.cells.push({
            kind: "ipynb",
            id: cellId,
            src: a.src,
            cellIndex: cc.cellIndex,
            loc
          });
        }
      }
    });
  };
};

function makeLoc(file: string, position: { start: { line: number; column: number } } | undefined): Loc {
  return {
    file,
    line: position?.start.line ?? 1,
    column: position?.start.column ?? 1
  };
}

function assertUnique(seen: Set<string>, id: string, loc: Loc): void {
  if (seen.has(id)) {
    throw new BuildError({ code: "DUPLICATE_ID", message: `duplicate cell id "${id}"`, loc });
  }
  seen.add(id);
}

function stripNulls(
  attrs: Record<string, string | null> | undefined
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (!attrs) return out;
  for (const [k, v] of Object.entries(attrs)) {
    out[k] = v ?? undefined;
  }
  return out;
}

function parseCacheAttr(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value !== "false";
}
```

- [ ] **Step 4: Note about fence info handling**

Markdown parsers split the info string into `lang` (first token) and `meta` (rest). We reconstruct full info via `node.lang + " " + node.meta`. This means:
- ` ```ts run id=x ` → lang=`ts`, meta=`run id=x`, full=`ts run id=x` ✓

- [ ] **Step 5: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test remark-plugin`
Expected: 6 passed.

- [ ] **Step 6: Add the unknown-lang test**

Append to `packages/core/test/remark-plugin.test.ts`:
```ts
it("throws UNKNOWN_LANG when file ext is unsupported", () => {
  const src = ":::run{src=\"./x.rb\" id=\"r\"}\n:::\n";
  expect(() => process(src, "x.mdx")).toThrow(/UNKNOWN_LANG/);
});
```

Run: `pnpm --filter @mdx-notebook/core test remark-plugin`
Expected: 7 passed.

- [ ] **Step 7: Re-export from index**

Append to `packages/core/src/index.ts`:
```ts
export { remarkMdxNotebook, type RemarkMdxNotebookOptions, type CellsCollected } from "./remark-plugin.js";
export { parseIpynb, extractIpynbCells } from "./ipynb-parser.js";
```

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/remark-plugin.ts packages/core/src/index.ts packages/core/test/remark-plugin.test.ts
git commit -m "feat(core): remark plugin discovers fences + directives + ipynb"
```

---

## Phase 7 — `core` Runner Registry

### Task 7.1: Registry for runners

**Files:**
- Test: `packages/core/test/runner-registry.test.ts`
- Create: `packages/core/src/runner-registry.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test runner-registry`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/runner-registry.ts`**

```ts
import { BuildError } from "./errors.js";
import type { Cell, Runner } from "./types.js";

const REGISTRY = new Map<string, Runner>();

export function registerRunner(runner: Runner): void {
  if (!runner.language) {
    throw new BuildError({ code: "INTERNAL", message: "runner.language must be non-empty" });
  }
  REGISTRY.set(runner.language, runner);
}

export function getRunner(language: string, cell?: Cell): Runner | undefined {
  const r = REGISTRY.get(language);
  if (!r) return undefined;
  if (cell && !r.canHandle(cell)) return undefined;
  return r;
}

export function listRunners(): Runner[] {
  return [...REGISTRY.values()];
}

export function clearRegistry(): void {
  REGISTRY.clear();
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test runner-registry`
Expected: 7 passed.

- [ ] **Step 5: Re-export from index**

Append to `packages/core/src/index.ts`:
```ts
export { registerRunner, getRunner, listRunners, clearRegistry } from "./runner-registry.js";
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/runner-registry.ts packages/core/src/index.ts packages/core/test/runner-registry.test.ts
git commit -m "feat(core): runner registry"
```

---

## Phase 8 — `runner-ts` Capture (line splitter)

### Task 8.1: Bounded line capture

**Files:**
- Test: `packages/runner-ts/test/capture.test.ts`
- Create: `packages/runner-ts/src/capture.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/runner-ts/test/capture.test.ts
import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { collectLines, MAX_BYTES_PER_STREAM } from "../src/capture.js";

function streamFrom(parts: string[]): Readable {
  return Readable.from((async function* () {
    for (const p of parts) yield Buffer.from(p);
  })());
}

describe("collectLines", () => {
  it("emits one event per line", async () => {
    const events = await collectLines(streamFrom(["a\nb\nc\n"]), "stdout");
    expect(events.map((e) => e.text)).toEqual(["a", "b", "c"]);
    expect(events.every((e) => e.stream === "stdout")).toBe(true);
    expect(events.every((e) => typeof e.ts === "number")).toBe(true);
  });

  it("handles split chunks across newlines", async () => {
    const events = await collectLines(streamFrom(["he", "llo\nwor", "ld\n"]), "stdout");
    expect(events.map((e) => e.text)).toEqual(["hello", "world"]);
  });

  it("emits trailing line without newline", async () => {
    const events = await collectLines(streamFrom(["a\nb"]), "stdout");
    expect(events.map((e) => e.text)).toEqual(["a", "b"]);
  });

  it("truncates after MAX_BYTES_PER_STREAM", async () => {
    const big = "x".repeat(MAX_BYTES_PER_STREAM + 100) + "\n";
    const events = await collectLines(streamFrom([big]), "stdout");
    expect(events.at(-1)!.text).toContain("[truncated]");
    const total = events.reduce((n, e) => n + e.text.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_BYTES_PER_STREAM + 200);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/runner-ts test capture`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/runner-ts/src/capture.ts`**

```ts
import { Readable } from "node:stream";
import type { LogEvent } from "@mdx-notebook/core";

export const MAX_BYTES_PER_STREAM = 1024 * 1024; // 1 MiB

export async function collectLines(
  stream: Readable,
  kind: "stdout" | "stderr"
): Promise<LogEvent[]> {
  const out: LogEvent[] = [];
  let bytes = 0;
  let truncated = false;
  let buffer = "";
  for await (const chunk of stream) {
    if (truncated) continue;
    const text = chunk.toString("utf8");
    bytes += text.length;
    if (bytes > MAX_BYTES_PER_STREAM) {
      const allowed = MAX_BYTES_PER_STREAM - (bytes - text.length);
      buffer += text.slice(0, Math.max(0, allowed));
      flushLines(buffer, kind, out, /* finalFlush */ true);
      buffer = "";
      out.push({ ts: Date.now(), stream: kind, text: "[truncated]" });
      truncated = true;
      continue;
    }
    buffer += text;
    buffer = flushLines(buffer, kind, out, false);
  }
  if (!truncated && buffer.length > 0) {
    out.push({ ts: Date.now(), stream: kind, text: buffer });
  }
  return out;
}

function flushLines(
  buffer: string,
  kind: "stdout" | "stderr",
  out: LogEvent[],
  finalFlush: boolean
): string {
  let rest = buffer;
  let nl = rest.indexOf("\n");
  while (nl >= 0) {
    out.push({ ts: Date.now(), stream: kind, text: rest.slice(0, nl) });
    rest = rest.slice(nl + 1);
    nl = rest.indexOf("\n");
  }
  if (finalFlush && rest.length > 0) {
    out.push({ ts: Date.now(), stream: kind, text: rest });
    return "";
  }
  return rest;
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/runner-ts test capture`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/runner-ts/src/capture.ts packages/runner-ts/test/capture.test.ts
git commit -m "feat(runner-ts): bounded line-event stream collector"
```

---

## Phase 9 — `runner-ts` Env Merge

### Task 9.1: Merge dotenv on top of base env

**Files:**
- Test: `packages/runner-ts/test/env.test.ts`
- Create: `packages/runner-ts/src/env.ts`
- Create test fixture: `packages/runner-ts/test/fixtures/sample.env`

- [ ] **Step 1: Create fixture `sample.env`**

```
FOO=hello
BAR="quoted value"
NUM=42
```

- [ ] **Step 2: Write the failing tests**

```ts
// packages/runner-ts/test/env.test.ts
import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { mergeEnv } from "../src/env.js";

const fixturePath = join(__dirname, "fixtures", "sample.env");

describe("mergeEnv", () => {
  it("returns base when no env path", async () => {
    const base = { A: "1" };
    expect(await mergeEnv(base, undefined, "/tmp")).toEqual(base);
  });

  it("merges dotenv on top of base", async () => {
    const merged = await mergeEnv({ A: "1" }, fixturePath, "/tmp");
    expect(merged).toMatchObject({ A: "1", FOO: "hello", BAR: "quoted value", NUM: "42" });
  });

  it("dotenv overrides base for same key", async () => {
    const merged = await mergeEnv({ FOO: "old" }, fixturePath, "/tmp");
    expect(merged.FOO).toBe("hello");
  });

  it("resolves env path relative to cwd", async () => {
    const merged = await mergeEnv({}, "fixtures/sample.env", __dirname);
    expect(merged.FOO).toBe("hello");
  });
});
```

- [ ] **Step 3: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/runner-ts test env`
Expected: FAIL.

- [ ] **Step 4: Implement `packages/runner-ts/src/env.ts`**

```ts
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";

export async function mergeEnv(
  base: Record<string, string>,
  envPath: string | undefined,
  cwd: string
): Promise<Record<string, string>> {
  if (!envPath) return { ...base };
  const abs = isAbsolute(envPath) ? envPath : resolve(cwd, envPath);
  const buf = await readFile(abs, "utf8");
  const parsed = parseDotenv(buf);
  return { ...base, ...parsed };
}
```

- [ ] **Step 5: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/runner-ts test env`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/runner-ts/src/env.ts packages/runner-ts/test/env.test.ts packages/runner-ts/test/fixtures/sample.env
git commit -m "feat(runner-ts): dotenv merge helper"
```

---

## Phase 10 — `runner-ts` Harness

### Task 10.1: ESM harness file

**Files:**
- Create: `packages/runner-ts/src/harness/harness.mjs`
- Create: `packages/runner-ts/src/harness/locate.ts`

- [ ] **Step 1: `packages/runner-ts/src/harness/harness.mjs`**

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

- [ ] **Step 2: `packages/runner-ts/src/harness/locate.ts`**

```ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export function locateHarness(): string {
  // After build, harness.mjs is colocated under dist/harness/harness.mjs.
  // During tests against src/, this resolves to src/harness/harness.mjs.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "harness.mjs");
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/runner-ts/src/harness
git commit -m "feat(runner-ts): child-process harness + locator"
```

---

## Phase 11 — `runner-ts` Spawn

### Task 11.1: Spawn primitive with timeout + capture

**Files:**
- Test: `packages/runner-ts/test/spawn.test.ts`
- Create: `packages/runner-ts/src/spawn.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Create the fixtures**

`packages/runner-ts/test/fixtures/plain-script.ts`:
```ts
console.log("hello from plain script");
```

`packages/runner-ts/test/fixtures/prints-stderr.ts`:
```ts
console.error("warn!");
console.log("ok");
```

`packages/runner-ts/test/fixtures/timeout.ts`:
```ts
await new Promise((r) => setTimeout(r, 5000));
console.log("never");
```

- [ ] **Step 3: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/runner-ts test spawn`
Expected: FAIL.

- [ ] **Step 4: Implement `packages/runner-ts/src/spawn.ts`**

```ts
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { LogEvent } from "@mdx-notebook/core";
import { collectLines } from "./capture.js";
import { locateHarness } from "./harness/locate.js";

export interface SpawnOptions {
  target: string;                          // absolute path to user file
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  resultFile?: string;                     // if set, harness used; else target run directly
  signal?: AbortSignal;
}

export interface SpawnResult {
  exitCode: number;
  signal: NodeJS.Signals | null;
  stdout: LogEvent[];
  stderr: LogEvent[];
  timedOut: boolean;
  durationMs: number;
}

const TSX_BIN = "tsx";
const KILL_GRACE_MS = 1_000;

export async function spawnTsx(opts: SpawnOptions): Promise<SpawnResult> {
  const start = Date.now();
  const useHarness = opts.resultFile !== undefined;
  const args = useHarness ? [locateHarness()] : [opts.target];
  const env = useHarness
    ? { ...opts.env, MDX_NB_TARGET: opts.target, MDX_NB_RESULT: opts.resultFile! }
    : opts.env;

  const child: ChildProcess = spawn(TSX_BIN, args, {
    cwd: opts.cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let timedOut = false;
  const killTimer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
    }, KILL_GRACE_MS).unref();
  }, opts.timeoutMs);

  const onAbort = () => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
    }, KILL_GRACE_MS).unref();
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  const stdoutP = collectLines(child.stdout!, "stdout");
  const stderrP = collectLines(child.stderr!, "stderr");

  const [stdout, stderr, exit] = await Promise.all([
    stdoutP,
    stderrP,
    new Promise<{ code: number; signal: NodeJS.Signals | null }>((resolve) => {
      child.once("close", (code, signal) => resolve({ code: code ?? 1, signal }));
    })
  ]);
  clearTimeout(killTimer);
  opts.signal?.removeEventListener("abort", onAbort);

  return {
    exitCode: timedOut ? 124 : exit.code,
    signal: exit.signal,
    stdout,
    stderr,
    timedOut,
    durationMs: Date.now() - start
  };
}
```

- [ ] **Step 5: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/runner-ts test spawn`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/runner-ts/src packages/runner-ts/test
git commit -m "feat(runner-ts): spawn tsx with bounded capture and timeout"
```

---

## Phase 12 — `runner-ts` Runner Implementation

### Task 12.1: Additional fixtures

**Files:**
- Create: `packages/runner-ts/test/fixtures/default-export.ts`
- Create: `packages/runner-ts/test/fixtures/async-default-export.ts`
- Create: `packages/runner-ts/test/fixtures/throws.ts`
- Create: `packages/runner-ts/test/fixtures/oversized-stdout.ts`
- Create: `packages/runner-ts/test/fixtures/nonserializable.ts`
- Create: `packages/runner-ts/test/fixtures/env-consumer.ts`

- [ ] **Step 1: `default-export.ts`**

```ts
export default function () {
  return { greeting: "hi", count: 42 };
}
```

- [ ] **Step 2: `async-default-export.ts`**

```ts
export default async function () {
  await new Promise((r) => setTimeout(r, 10));
  return [1, 2, 3];
}
```

- [ ] **Step 3: `throws.ts`**

```ts
export default function () {
  throw new TypeError("bad input");
}
```

- [ ] **Step 4: `oversized-stdout.ts`**

```ts
const line = "x".repeat(8 * 1024);
for (let i = 0; i < 200; i++) console.log(line);
```

- [ ] **Step 5: `nonserializable.ts`**

```ts
export default function () {
  const a: any = {};
  a.self = a;
  return a;
}
```

- [ ] **Step 6: `env-consumer.ts`**

```ts
console.log(`FOO=${process.env.FOO ?? "missing"}`);
```

- [ ] **Step 7: Commit**

```bash
git add packages/runner-ts/test/fixtures
git commit -m "test(runner-ts): runner behavior fixtures"
```

---

### Task 12.2: The Runner implementation

**Files:**
- Test: `packages/runner-ts/test/runner.test.ts`
- Create: `packages/runner-ts/src/runner.ts`
- Create: `packages/runner-ts/src/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/runner-ts/test/runner.test.ts
import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { runnerTs } from "../src/runner.js";
import type { Cell, RunCtx } from "@mdx-notebook/core";

const FIX = resolve(__dirname, "fixtures");

function fileCell(filename: string, overrides: Partial<Cell> = {}): Cell {
  return {
    kind: "file",
    id: "x",
    lang: "ts",
    src: resolve(FIX, filename),
    loc: { file: "test.mdx", line: 1, column: 1 },
    ...overrides
  } as Cell;
}

function ctx(overrides: Partial<RunCtx> = {}): RunCtx {
  return {
    signal: new AbortController().signal,
    cwd: FIX,
    env: { ...(process.env as Record<string, string>) },
    timeoutMs: 10_000,
    ...overrides
  };
}

describe("runner-ts", () => {
  it("captures stdout from a plain script", async () => {
    const out = await runnerTs.run(fileCell("plain-script.ts"), ctx());
    expect(out.status).toBe("ok");
    expect(out.stdout.map((e) => e.text)).toContain("hello from plain script");
    expect(out.result).toBeUndefined();
    expect(out.exitCode).toBe(0);
  });

  it("captures default export return value", async () => {
    const out = await runnerTs.run(fileCell("default-export.ts"), ctx());
    expect(out.status).toBe("ok");
    expect(out.result).toEqual({ greeting: "hi", count: 42 });
  });

  it("awaits async default export", async () => {
    const out = await runnerTs.run(fileCell("async-default-export.ts"), ctx());
    expect(out.status).toBe("ok");
    expect(out.result).toEqual([1, 2, 3]);
  });

  it("captures errors from default export throw", async () => {
    const out = await runnerTs.run(fileCell("throws.ts"), ctx());
    expect(out.status).toBe("error");
    expect(out.error?.name).toBe("TypeError");
    expect(out.error?.message).toContain("bad input");
  });

  it("times out long-running cells", async () => {
    const out = await runnerTs.run(fileCell("timeout.ts"), ctx({ timeoutMs: 200 }));
    expect(out.status).toBe("timeout");
    expect(out.exitCode).toBe(124);
  });

  it("truncates oversized stdout", async () => {
    const out = await runnerTs.run(fileCell("oversized-stdout.ts"), ctx());
    expect(out.stdout.at(-1)!.text).toContain("[truncated]");
  });

  it("reports SerializationError on circular result", async () => {
    const out = await runnerTs.run(fileCell("nonserializable.ts"), ctx());
    expect(out.status).toBe("error");
    expect(out.error?.name).toBe("SerializationError");
  });

  it("inherits env from ctx", async () => {
    const out = await runnerTs.run(fileCell("env-consumer.ts"), ctx({ env: { FOO: "bar" } }));
    expect(out.stdout.map((e) => e.text)).toContain("FOO=bar");
  });

  it("supports inline cells via tempfile", async () => {
    const cell: Cell = {
      kind: "inline",
      id: "i",
      lang: "ts",
      code: 'console.log("inline ok");\n',
      loc: { file: "p.mdx", line: 1, column: 1 }
    };
    const out = await runnerTs.run(cell, ctx());
    expect(out.status).toBe("ok");
    expect(out.stdout.map((e) => e.text)).toContain("inline ok");
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/runner-ts test runner`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/runner-ts/src/runner.ts`**

```ts
import { mkdtemp, writeFile, readFile, unlink, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Cell, CellOutput, RunCtx, Runner } from "@mdx-notebook/core";
import { spawnTsx } from "./spawn.js";
import { mergeEnv } from "./env.js";

const VERSION = "0.0.0";
const SUPPORTED = new Set(["ts", "js"]);

export const runnerTs: Runner = {
  language: "ts",
  version: VERSION,
  canHandle(cell: Cell): boolean {
    if (cell.kind === "ipynb") return false;
    return SUPPORTED.has(cell.lang);
  },
  async run(cell: Cell, ctx: RunCtx): Promise<CellOutput> {
    if (cell.kind === "ipynb") {
      return error(cell.id, "INTERNAL", "runner-ts does not handle ipynb cells");
    }

    const tmpRoot = await mkdtemp(join(tmpdir(), "mdx-nb-"));
    const resultFile = join(tmpRoot, "result.json");
    let inlineFile: string | undefined;
    try {
      const target = cell.kind === "file"
        ? resolveTarget(cell.src, cell.loc.file)
        : (inlineFile = await writeInlineTempfile(tmpRoot, cell.code, cell.lang));
      const cwd = cell.kind === "file" ? dirname(target) : dirname(resolveFromMdx(cell.loc.file));
      const env = await mergeEnv(ctx.env, cell.env, cwd);

      const r = await spawnTsx({
        target,
        cwd,
        env,
        timeoutMs: cell.timeout ?? ctx.timeoutMs,
        resultFile,
        signal: ctx.signal
      });

      if (r.timedOut) {
        return {
          cellId: cell.id,
          status: "timeout",
          durationMs: r.durationMs,
          exitCode: r.exitCode,
          stdout: r.stdout,
          stderr: r.stderr,
          error: { name: "TimeoutError", message: `cell timed out after ${cell.timeout ?? ctx.timeoutMs} ms` }
        };
      }

      const envelope = await readEnvelope(resultFile);
      if (!envelope.ok && envelope.error) {
        return {
          cellId: cell.id,
          status: "error",
          durationMs: r.durationMs,
          exitCode: r.exitCode,
          stdout: r.stdout,
          stderr: r.stderr,
          error: envelope.error
        };
      }
      if (r.exitCode !== 0) {
        return {
          cellId: cell.id,
          status: "error",
          durationMs: r.durationMs,
          exitCode: r.exitCode,
          stdout: r.stdout,
          stderr: r.stderr,
          error: { name: "NonZeroExit", message: `process exited with code ${r.exitCode}` }
        };
      }
      const out: CellOutput = {
        cellId: cell.id,
        status: "ok",
        durationMs: r.durationMs,
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr
      };
      if (envelope.hasResult) out.result = envelope.result;
      return out;
    } finally {
      if (inlineFile) await unlink(inlineFile).catch(() => {});
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
};

interface Envelope {
  ok: boolean;
  hasResult: boolean;
  result?: unknown;
  error?: { name: string; message: string; stack?: string };
}

async function readEnvelope(path: string): Promise<Envelope> {
  try {
    const buf = await readFile(path, "utf8");
    return JSON.parse(buf) as Envelope;
  } catch {
    return { ok: false, hasResult: false, error: { name: "InternalError", message: "harness wrote no result" } };
  }
}

function resolveTarget(src: string, mdxFile: string): string {
  if (isAbsolute(src)) return src;
  return resolve(dirname(resolveFromMdx(mdxFile)), src);
}

function resolveFromMdx(mdxFile: string): string {
  return isAbsolute(mdxFile) ? mdxFile : resolve(process.cwd(), mdxFile);
}

async function writeInlineTempfile(dir: string, code: string, lang: string): Promise<string> {
  const ext = lang === "js" ? "mjs" : "ts";
  const hash = createHash("sha256").update(code).digest("hex").slice(0, 8);
  const path = join(dir, `inline-${hash}.${ext}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, code, "utf8");
  return path;
}

function error(cellId: string, name: string, message: string): CellOutput {
  return {
    cellId,
    status: "error",
    durationMs: 0,
    exitCode: 1,
    stdout: [],
    stderr: [],
    error: { name, message }
  };
}
```

- [ ] **Step 4: Implement `packages/runner-ts/src/index.ts`**

```ts
export { runnerTs } from "./runner.js";
export { runnerTs as default } from "./runner.js";
```

- [ ] **Step 5: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/runner-ts test runner`
Expected: 9 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/runner-ts
git commit -m "feat(runner-ts): Runner impl with default-export contract + timeouts"
```

---

### Task 12.3: Self-registration entrypoint

**Files:**
- Create: `packages/runner-ts/src/register.ts`

- [ ] **Step 1: Implement**

```ts
import { registerRunner } from "@mdx-notebook/core";
import { runnerTs } from "./runner.js";

registerRunner(runnerTs);

export {};
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @mdx-notebook/runner-ts build`
Expected: dist contains `register.js`.

- [ ] **Step 3: Commit**

```bash
git add packages/runner-ts/src/register.ts
git commit -m "feat(runner-ts): self-registration side-effect entry"
```

---

## Phase 13 — `core` Cache

### Task 13.1: Content-addressed cache

**Files:**
- Test: `packages/core/test/cache.test.ts`
- Create: `packages/core/src/cache.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/cache.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeCacheKey, readCache, writeCache, type CacheKeyInputs } from "../src/cache.js";
import type { CellOutput } from "../src/types.js";

const sample: CellOutput = {
  cellId: "x",
  status: "ok",
  durationMs: 10,
  exitCode: 0,
  stdout: [{ ts: 1, stream: "stdout", text: "hi" }],
  stderr: []
};

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mdx-nb-cache-"));
});

describe("computeCacheKey", () => {
  it("is deterministic", () => {
    const a: CacheKeyInputs = {
      sourceBytes: "x", runner: "ts", runnerVersion: "1", nodeVersion: "20", lockfile: "abc", env: ""
    };
    expect(computeCacheKey(a)).toBe(computeCacheKey(a));
  });
  it("changes when source changes", () => {
    const a: CacheKeyInputs = { sourceBytes: "x", runner: "ts", runnerVersion: "1", nodeVersion: "20", lockfile: "", env: "" };
    const b: CacheKeyInputs = { ...a, sourceBytes: "y" };
    expect(computeCacheKey(a)).not.toBe(computeCacheKey(b));
  });
  it("changes when runner version changes", () => {
    const a: CacheKeyInputs = { sourceBytes: "x", runner: "ts", runnerVersion: "1", nodeVersion: "20", lockfile: "", env: "" };
    const b: CacheKeyInputs = { ...a, runnerVersion: "2" };
    expect(computeCacheKey(a)).not.toBe(computeCacheKey(b));
  });
});

describe("readCache / writeCache", () => {
  it("write then read returns equal output", async () => {
    await writeCache(dir, "abc123", sample);
    const r = await readCache(dir, "abc123");
    expect(r).toEqual(sample);
  });

  it("read miss returns undefined", async () => {
    const r = await readCache(dir, "nope");
    expect(r).toBeUndefined();
  });

  it("read returns undefined for malformed JSON (warning behavior)", async () => {
    await writeFile(join(dir, ".cache", "broken.json"), "not json", { encoding: "utf8" }).catch(async () => {
      // Ensure dir exists by writing first then corrupting
      await writeCache(dir, "broken", sample);
      await writeFile(join(dir, ".cache", "broken.json"), "not json");
    });
    const r = await readCache(dir, "broken");
    expect(r).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test cache`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/cache.ts`**

```ts
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CellOutput } from "./types.js";

export interface CacheKeyInputs {
  sourceBytes: string;        // for inline: code; for file: file content
  runner: string;             // language id
  runnerVersion: string;
  nodeVersion: string;
  lockfile: string;           // lockfile content hash or empty
  env: string;                // env file content if used, else empty
}

export function computeCacheKey(inputs: CacheKeyInputs): string {
  const h = createHash("sha256");
  const parts: Array<keyof CacheKeyInputs> = [
    "sourceBytes", "runner", "runnerVersion", "nodeVersion", "lockfile", "env"
  ];
  for (const k of parts) {
    h.update(`${k} ${inputs[k]}`);
  }
  return h.digest("hex");
}

export async function writeCache(rootDir: string, key: string, output: CellOutput): Promise<void> {
  const cacheDir = join(rootDir, ".cache");
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, `${key}.json`), JSON.stringify(output));
}

export async function readCache(rootDir: string, key: string): Promise<CellOutput | undefined> {
  const path = join(rootDir, ".cache", `${key}.json`);
  let buf: string;
  try {
    buf = await readFile(path, "utf8");
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(buf) as CellOutput;
  } catch {
    // Treat malformed cache as a miss (warning at orchestrator layer)
    return undefined;
  }
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test cache`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/cache.ts packages/core/test/cache.test.ts
git commit -m "feat(core): content-addressed cache"
```

---

## Phase 14 — `core` Manifest Assembly

### Task 14.1: Manifest assembly + sidecar writer

**Files:**
- Test: `packages/core/test/manifest.test.ts`
- Create: `packages/core/src/manifest.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/manifest.test.ts
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildManifest, writeManifest, manifestPath } from "../src/manifest.js";
import type { CellOutput } from "../src/types.js";

const co = (id: string): CellOutput => ({
  cellId: id, status: "ok", durationMs: 1, exitCode: 0, stdout: [], stderr: []
});

describe("buildManifest", () => {
  it("preserves insertion order in cells", () => {
    const m = buildManifest("page1", [co("a"), co("b"), co("c")]);
    expect(Object.keys(m.cells)).toEqual(["a", "b", "c"]);
  });
  it("includes pageId and builtAt", () => {
    const m = buildManifest("page1", [co("x")]);
    expect(m.pageId).toBe("page1");
    expect(typeof m.builtAt).toBe("number");
  });
});

describe("writeManifest", () => {
  it("writes JSON to .mdx-notebook/<pageId>.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdx-mf-"));
    const m = buildManifest("p1", [co("x")]);
    await writeManifest(dir, m);
    const got = JSON.parse(await readFile(manifestPath(dir, "p1"), "utf8"));
    expect(got).toEqual(m);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test manifest`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/manifest.ts`**

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CellOutput, Manifest } from "./types.js";

export function buildManifest(pageId: string, outputs: CellOutput[]): Manifest {
  const cells: Record<string, CellOutput> = {};
  for (const o of outputs) cells[o.cellId] = o;
  return { pageId, cells, builtAt: Date.now() };
}

export function manifestPath(rootDir: string, pageId: string): string {
  return join(rootDir, `${pageId}.json`);
}

export async function writeManifest(rootDir: string, manifest: Manifest): Promise<void> {
  await mkdir(rootDir, { recursive: true });
  await writeFile(manifestPath(rootDir, manifest.pageId), JSON.stringify(manifest, null, 2));
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test manifest`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/manifest.ts packages/core/test/manifest.test.ts
git commit -m "feat(core): manifest assembly + sidecar writer"
```

---

## Phase 15 — `core` Dispatcher

### Task 15.1: Dispatcher converts a Cell to a CellOutput

**Files:**
- Test: `packages/core/test/dispatcher.test.ts`
- Create: `packages/core/src/dispatcher.ts`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test dispatcher`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/dispatcher.ts`**

```ts
import { dirname, isAbsolute, resolve } from "node:path";
import { getRunner } from "./runner-registry.js";
import { parseIpynb, extractIpynbCells } from "./ipynb-parser.js";
import type { Cell, CellOutput } from "./types.js";

export interface DispatchCtx {
  cwd: string;
  env: Record<string, string>;
  defaultTimeoutMs: number;
  signal?: AbortSignal;
}

export type ReadFile = (absPath: string) => string;

export async function dispatchCell(
  cell: Cell,
  ctx: DispatchCtx,
  readFile: ReadFile
): Promise<CellOutput> {
  if (cell.kind === "ipynb") {
    const abs = isAbsolute(cell.src) ? cell.src : resolve(dirname(cell.loc.file), cell.src);
    try {
      const buf = readFile(abs);
      const nb = parseIpynb(buf);
      const cells = extractIpynbCells(nb, [cell.cellIndex]);
      const found = cells[0];
      const ipynbOutputs = found?.outputs ?? [];
      return {
        cellId: cell.id,
        status: "ok",
        durationMs: 0,
        exitCode: 0,
        stdout: [],
        stderr: [],
        ipynbOutputs
      };
    } catch (e) {
      return {
        cellId: cell.id,
        status: "error",
        durationMs: 0,
        exitCode: 1,
        stdout: [],
        stderr: [],
        error: { name: "IpynbError", message: String((e as Error).message ?? e) }
      };
    }
  }

  const runner = getRunner(cell.lang, cell);
  if (!runner) {
    return {
      cellId: cell.id,
      status: "error",
      durationMs: 0,
      exitCode: 1,
      stdout: [],
      stderr: [],
      error: { name: "UnknownLang", message: `no runner registered for language "${cell.lang}"` }
    };
  }

  const ac = new AbortController();
  if (ctx.signal) ctx.signal.addEventListener("abort", () => ac.abort(), { once: true });

  return runner.run(cell, {
    signal: ac.signal,
    cwd: ctx.cwd,
    env: ctx.env,
    timeoutMs: cell.timeout ?? ctx.defaultTimeoutMs
  });
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test dispatcher`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/dispatcher.ts packages/core/test/dispatcher.test.ts
git commit -m "feat(core): dispatcher resolves a Cell to a CellOutput"
```

---

## Phase 16 — `core` Page Orchestrator

### Task 16.1: `runPage` ties parsing + dispatching + caching + manifest

**Files:**
- Test: `packages/core/test/run-page.test.ts`
- Create: `packages/core/src/run-page.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/run-page.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPage } from "../src/run-page.js";
import { clearRegistry, registerRunner } from "../src/runner-registry.js";
import type { Runner } from "../src/types.js";

const fakeTs: Runner = {
  language: "ts",
  version: "test-1",
  canHandle: (c) => c.kind !== "ipynb" && c.lang === "ts",
  run: async (c) => ({
    cellId: c.id, status: "ok", durationMs: 1, exitCode: 0,
    stdout: [{ ts: 1, stream: "stdout", text: `ran ${c.id}` }], stderr: []
  })
};

const FIX = join(__dirname, "fixtures");

describe("runPage", () => {
  beforeEach(() => { clearRegistry(); registerRunner(fakeTs); });

  it("processes basic.mdx end-to-end and returns a manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    const m = await runPage(join(FIX, "basic.mdx"), { rootDir: root });
    expect(m.pageId).toMatch(/^[0-9a-f]{16}$/);
    expect(Object.keys(m.cells)).toEqual(["hello"]);
    expect(m.cells.hello!.status).toBe("ok");
  });

  it("uses cache on second run for unchanged source", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    let calls = 0;
    const counting: Runner = {
      ...fakeTs,
      run: async (c) => { calls++; return fakeTs.run(c, { signal: new AbortController().signal, cwd: ".", env: {}, timeoutMs: 1000 }); }
    };
    clearRegistry(); registerRunner(counting);
    await runPage(join(FIX, "basic.mdx"), { rootDir: root });
    await runPage(join(FIX, "basic.mdx"), { rootDir: root });
    expect(calls).toBe(1);
  });

  it("with --no-cache, re-runs every time", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    let calls = 0;
    const counting: Runner = { ...fakeTs, run: async (c) => { calls++; return fakeTs.run(c, { signal: new AbortController().signal, cwd: ".", env: {}, timeoutMs: 1000 }); } };
    clearRegistry(); registerRunner(counting);
    await runPage(join(FIX, "basic.mdx"), { rootDir: root, useCache: false });
    await runPage(join(FIX, "basic.mdx"), { rootDir: root, useCache: false });
    expect(calls).toBe(2);
  });

  it("strict mode rethrows when a cell errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "mdx-rp-"));
    const erroring: Runner = {
      ...fakeTs,
      run: async (c) => ({ cellId: c.id, status: "error", durationMs: 0, exitCode: 1, stdout: [], stderr: [], error: { name: "X", message: "boom" } })
    };
    clearRegistry(); registerRunner(erroring);
    await expect(runPage(join(FIX, "basic.mdx"), { rootDir: root, strict: true }))
      .rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test run-page`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/run-page.ts`**

```ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
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
import type { Cell, CellOutput, Manifest } from "./types.js";
import { BuildError } from "./errors.js";

export interface RunPageOptions {
  rootDir: string;          // where .mdx-notebook/ lives (project root)
  useCache?: boolean;       // default true
  strict?: boolean;         // default false
  defaultTimeoutMs?: number; // default 30_000
  concurrency?: number;     // default os.cpus().length
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
  const concurrency = opts.concurrency ?? Math.max(1, Math.min(8, (await import("node:os")).cpus().length));
  const cacheRoot = resolve(projectRoot, ".mdx-notebook");

  const lockfileContent = readLockfileContent(projectRoot);
  const nodeVersion = process.versions.node;

  const outputs = await runConcurrent(collected.cells, concurrency, async (cell) => {
    const cacheKey = await maybeCacheKey(cell, absMdx, lockfileContent, nodeVersion);
    if (useCache && cell.cache !== false && cacheKey) {
      const hit = await readCache(cacheRoot, cacheKey);
      if (hit) return hit;
    }
    const out = await dispatchCell(cell, {
      cwd: dirname(absMdx),
      env: process.env as Record<string, string>,
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

async function maybeCacheKey(cell: Cell, mdxAbs: string, lockfileContent: string, nodeVersion: string) {
  if (cell.kind === "ipynb") return undefined; // ipynb is parse-only, cheap to redo
  let sourceBytes = "";
  if (cell.kind === "inline") sourceBytes = cell.code;
  else {
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
    env: envBytes
  });
}

function readLockfileContent(root: string): string {
  const candidates = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock"];
  for (const c of candidates) {
    const p = resolve(root, c);
    if (existsSync(p)) {
      const buf = readFileSync(p, "utf8");
      // NB: hash inline to avoid imports here; spec accepts content as opaque
      return buf;
    }
  }
  return "";
}

async function runConcurrent<T, R>(items: T[], concurrency: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return out;
}
```

- [ ] **Step 4: Re-export from index**

Append to `packages/core/src/index.ts`:
```ts
export { runPage, type RunPageOptions } from "./run-page.js";
export { computePageId } from "./page-id.js";
export { buildManifest, writeManifest, manifestPath } from "./manifest.js";
export { computeCacheKey, readCache, writeCache, type CacheKeyInputs } from "./cache.js";
export { dispatchCell, type DispatchCtx } from "./dispatcher.js";
```

- [ ] **Step 5: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test run-page`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src packages/core/test/run-page.test.ts
git commit -m "feat(core): runPage orchestrator with cache + concurrency + strict mode"
```

---

## Phase 17 — Runtime Store

### Task 17.1: Framework-agnostic page-scoped store

**Files:**
- Test: `packages/core/test/runtime/store.test.ts`
- Create: `packages/core/src/runtime/store.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/test/runtime/store.test.ts
import { describe, it, expect, vi } from "vitest";
import { createOutputStore } from "../../src/runtime/store.js";
import type { Manifest, CellOutput } from "../../src/types.js";

const co = (id: string, result?: unknown): CellOutput => ({
  cellId: id, status: "ok", durationMs: 0, exitCode: 0, stdout: [], stderr: [], result
});

const m: Manifest = {
  pageId: "p", builtAt: 0,
  cells: { a: co("a", { count: 1 }), b: co("b") }
};

describe("createOutputStore", () => {
  it("get returns the manifest cell", () => {
    const s = createOutputStore(m);
    expect(s.get("a").result).toEqual({ count: 1 });
  });

  it("setResult mutates only `result`", () => {
    const s = createOutputStore(m);
    s.setResult("a", { count: 2 });
    expect(s.get("a").result).toEqual({ count: 2 });
    expect(s.get("a").status).toBe("ok"); // unchanged
  });

  it("subscribe receives a notification on setResult", () => {
    const s = createOutputStore(m);
    const fn = vi.fn();
    const unsub = s.subscribe("a", fn);
    s.setResult("a", { count: 3 });
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    s.setResult("a", { count: 4 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("subscribe to one id is not notified by another id's update", () => {
    const s = createOutputStore(m);
    const fn = vi.fn();
    s.subscribe("a", fn);
    s.setResult("b", "x");
    expect(fn).not.toHaveBeenCalled();
  });

  it("get on unknown id throws a clear error", () => {
    const s = createOutputStore(m);
    expect(() => s.get("z")).toThrow(/unknown cellId "z"/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test runtime/store`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/runtime/store.ts`**

```ts
import type { CellOutput, Manifest } from "../types.js";

export interface OutputStore {
  get(cellId: string): CellOutput;
  setResult(cellId: string, next: unknown): void;
  subscribe(cellId: string, fn: () => void): () => void;
}

export function createOutputStore(manifest: Manifest): OutputStore {
  const cells: Record<string, CellOutput> = { ...manifest.cells };
  const subs: Record<string, Set<() => void>> = {};

  function notify(cellId: string) {
    const set = subs[cellId];
    if (!set) return;
    for (const fn of set) fn();
  }

  return {
    get(cellId) {
      const c = cells[cellId];
      if (!c) throw new Error(`unknown cellId "${cellId}"`);
      return c;
    },
    setResult(cellId, next) {
      const c = cells[cellId];
      if (!c) throw new Error(`unknown cellId "${cellId}"`);
      cells[cellId] = { ...c, result: next };
      notify(cellId);
    },
    subscribe(cellId, fn) {
      const set = subs[cellId] ?? (subs[cellId] = new Set());
      set.add(fn);
      return () => { set.delete(fn); };
    }
  };
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test runtime/store`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/runtime/store.ts packages/core/test/runtime/store.test.ts
git commit -m "feat(core): runtime output store with mutable result"
```

---

### Task 17.2: React hook + provider

**Files:**
- Test: `packages/core/test/runtime/react.test.tsx`
- Create: `packages/core/src/runtime/react.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/core/test/runtime/react.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";
import { OutputProvider, useCellOutput } from "../../src/runtime/react.js";
import { createOutputStore } from "../../src/runtime/store.js";
import type { Manifest } from "../../src/types.js";

const m: Manifest = {
  pageId: "p", builtAt: 0,
  cells: {
    a: { cellId: "a", status: "ok", durationMs: 0, exitCode: 0, stdout: [], stderr: [], result: { n: 1 } }
  }
};

function Reader() {
  const out = useCellOutput<{ n: number }>("a");
  return <div data-testid="n">{out.result?.n ?? "-"}</div>;
}

describe("useCellOutput", () => {
  it("reads from the store", () => {
    const store = createOutputStore(m);
    render(<OutputProvider store={store}><Reader /></OutputProvider>);
    expect(screen.getByTestId("n").textContent).toBe("1");
  });

  it("re-renders when result changes", () => {
    const store = createOutputStore(m);
    render(<OutputProvider store={store}><Reader /></OutputProvider>);
    act(() => { store.setResult("a", { n: 5 }); });
    expect(screen.getByTestId("n").textContent).toBe("5");
  });

  it("throws when no provider in scope", () => {
    expect(() => render(<Reader />)).toThrow(/OutputProvider/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @mdx-notebook/core test runtime/react`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/runtime/react.ts`**

```ts
import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
  type ReactNode
} from "react";
import type { CellOutput } from "../types.js";
import type { OutputStore } from "./store.js";

const OutputContext = createContext<OutputStore | null>(null);

export function OutputProvider(props: { store: OutputStore; children: ReactNode }) {
  return createElement(OutputContext.Provider, { value: props.store }, props.children);
}

export function useCellOutput<T = unknown>(cellId: string): CellOutput & { result?: T } {
  const store = useContext(OutputContext);
  if (!store) throw new Error("useCellOutput must be used within an <OutputProvider>");
  const value = useSyncExternalStore(
    (cb) => store.subscribe(cellId, cb),
    () => store.get(cellId),
    () => store.get(cellId)
  );
  return value as CellOutput & { result?: T };
}

export { OutputContext };
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm --filter @mdx-notebook/core test runtime/react`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/runtime/react.ts packages/core/test/runtime/react.test.tsx
git commit -m "feat(core): React hook + provider over the output store"
```

---

## Phase 18 — End-to-End Smoke Test

### Task 18.1: Real `runner-ts` end-to-end through `runPage`

**Files:**
- Create: `packages/core/test/fixtures/e2e/page.mdx`
- Create: `packages/core/test/fixtures/e2e/scripts/agent.ts`
- Create: `packages/core/test/fixtures/e2e/notebooks/simple.ipynb` (copy)
- Create: `packages/core/test/e2e.test.ts`
- Modify: `packages/core/package.json` (devDependencies: add `@mdx-notebook/runner-ts`)

- [ ] **Step 1: Add devDependency**

In `packages/core/package.json` `devDependencies`, add:
```json
"@mdx-notebook/runner-ts": "workspace:*"
```

Run: `pnpm install`
Expected: success.

- [ ] **Step 2: Create `e2e/page.mdx`**

````md
# E2E

```ts run id=inline
console.log("inline ran");
export default async () => ({ from: "inline" });
```

:::run{src="./scripts/agent.ts" id="trace"}
:::

:::ipynb{src="./notebooks/simple.ipynb" id="nb" cells="0"}
:::
````

- [ ] **Step 3: Create `e2e/scripts/agent.ts`**

```ts
console.log("agent step 1");
console.log("agent step 2");
export default async function () {
  return { steps: 2 };
}
```

- [ ] **Step 4: Copy `simple.ipynb` into `e2e/notebooks/`**

```bash
mkdir -p packages/core/test/fixtures/e2e/notebooks
cp packages/core/test/fixtures/notebooks/simple.ipynb packages/core/test/fixtures/e2e/notebooks/simple.ipynb
```

- [ ] **Step 5: Write `packages/core/test/e2e.test.ts`**

```ts
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
```

- [ ] **Step 6: Build runner-ts (so the workspace dep resolves at runtime via dist)**

Run: `pnpm --filter @mdx-notebook/runner-ts build`
Expected: dist created.

- [ ] **Step 7: Run E2E**

Run: `pnpm --filter @mdx-notebook/core test e2e`
Expected: 1 passed (within 60s).

- [ ] **Step 8: Commit**

```bash
git add packages/core/package.json packages/core/test/e2e.test.ts packages/core/test/fixtures/e2e
git commit -m "test(core): E2E smoke through runner-ts"
```

---

## Phase 19 — Coverage, Build, READMEs

### Task 19.1: Verify coverage gates

**Files:**
- (no source changes; verification step)

- [ ] **Step 1: Run coverage for core**

Run: `pnpm --filter @mdx-notebook/core test:coverage`
Expected: thresholds met (lines ≥ 90, functions ≥ 90, branches ≥ 85, statements ≥ 90).

- [ ] **Step 2: Run coverage for runner-ts**

Run: `pnpm --filter @mdx-notebook/runner-ts test:coverage`
Expected: thresholds met (lines ≥ 85, functions ≥ 85, branches ≥ 80, statements ≥ 85).

- [ ] **Step 3: If any threshold fails**

Add the smallest possible test that exercises the missing branch. Common likely gaps:
- `parse-fence.ts` quoted attr edge cases without trailing quote.
- `runner.ts` ipynb cell early-return path.
- `cache.ts` `readCache` malformed-JSON path.

Re-run until passing. Commit any new tests:

```bash
git add packages/*/test
git commit -m "test: lift coverage to thresholds"
```

---

### Task 19.2: Verify build artifacts

- [ ] **Step 1: Build everything**

Run: `pnpm build`
Expected: turbo runs both packages; `dist/` contains `index.js`, `index.d.ts`, `runtime/store.js`, `runtime/react.js` (core); `index.js`, `register.js`, `harness/locate.js`, `harness/harness.mjs` (runner-ts).

- [ ] **Step 2: Sanity-import the built ESM**

Create a temporary script:
```bash
node --input-type=module -e '
import("./packages/core/dist/index.js").then(m => console.log(Object.keys(m).sort()));
import("./packages/runner-ts/dist/index.js").then(m => console.log(Object.keys(m).sort()));
'
```
Expected: prints arrays containing `runPage`, `registerRunner`, etc., and `runnerTs`.

- [ ] **Step 3: Commit any tweaks (e.g., tsdown entrypoints, scripts)**

```bash
git add -A
git commit -m "chore: verify build artifacts"
```

---

### Task 19.3: Update package READMEs with a usage snippet

**Files:**
- Modify: `packages/core/README.md`
- Modify: `packages/runner-ts/README.md`

- [ ] **Step 1: Append usage to `packages/core/README.md`**

````markdown
## Usage (preview — Astro/Vite glue lands in next cycle)

```ts
import { runPage, registerRunner } from "@mdx-notebook/core";
import { runnerTs } from "@mdx-notebook/runner-ts";

registerRunner(runnerTs);

const manifest = await runPage("./content/example.mdx", { rootDir: process.cwd() });
console.log(manifest.cells);
```

### Authoring

````md
```ts run id=hello
console.log("hi");
```

:::run{src="./agent.ts" id="trace"}
:::

:::ipynb{src="./analysis.ipynb" id="nb" cells="0-3"}
:::
````
````

- [ ] **Step 2: Append usage to `packages/runner-ts/README.md`**

```markdown
## Usage

```ts
import { registerRunner } from "@mdx-notebook/core";
import { runnerTs } from "@mdx-notebook/runner-ts";

registerRunner(runnerTs);
```

Or self-register via side-effect import:

```ts
import "@mdx-notebook/runner-ts/register";
```
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/README.md packages/runner-ts/README.md
git commit -m "docs: add usage snippets to package READMEs"
```

---

## Phase 20 — Final Verification

### Task 20.1: Single-shot full run

- [ ] **Step 1: Clean and re-build, re-test from scratch**

Run:
```bash
pnpm clean
pnpm install
pnpm build
pnpm test
```
Expected: all packages pass, no errors.

- [ ] **Step 2: Confirm git is clean**

Run: `git status`
Expected: nothing to commit.

- [ ] **Step 3: Tag the milestone (optional)**

Run:
```bash
git tag -a core-runner-ts-v0.0.0 -m "core + runner-ts initial implementation"
```

---

## Self-Review (writer's checklist — do not delete)

- ✅ Spec coverage: every `In scope` item in the spec maps to a phase: cell discovery (4–6), `.ipynb` parsing (3), runner registry (7), runner-ts execution (8–12), cache (13), manifest (14), dispatcher (15), orchestrator (16), runtime store + react (17), end-to-end (18). `Out of scope` items are explicitly absent.
- ✅ Placeholder scan: no "TBD"/"TODO"/"similar to" in steps.
- ✅ Type consistency: `Cell`, `CellOutput`, `Runner`, `Manifest`, `LogEvent`, `IpynbOutput`, `RunCtx` defined once in `types.ts` and referenced consistently. `runnerTs` named consistently. `clearRegistry`/`registerRunner`/`getRunner`/`listRunners` named consistently across registry tests and impl. `parseTimeoutMs` lives in `parse-fence.ts` and is reused by `parse-directive.ts`. `parseCellsSelector` reused by `parse-directive.ts`.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-mdx-notebook-core-runner-ts.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
