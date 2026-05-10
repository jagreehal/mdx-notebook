---
date: 2026-05-10
topic: mdx-notebook core + runner-ts
status: draft
supersedes: none
---

# mdx-notebook — `core` + `runner-ts` design

## 1. Vision

Change how people write runnable documentation. Authors write MDX. Code in the page — inline or in real source files — runs at build time. Outputs are captured in a typed manifest and bound to MDX components by id. Components render the captured data; viewers can edit the data live in the browser; components are immutable at view time.

This spec covers two packages of a larger pnpm turborepo: **`@mdx-notebook/core`** (parsing, cell discovery, output store, runner dispatch, caching) and **`@mdx-notebook/runner-ts`** (TS/JS execution + capture). React components and the Astro integration are deferred to follow-on specs.

## 2. Scope

**In scope:**
- MDX cell discovery via two surfaces: annotated code fences and remark directives.
- `.ipynb` import: parse and surface saved cell outputs (no re-execution).
- Pluggable `Runner` interface; first implementation is `runner-ts`.
- TS/JS execution via `tsx` in a child process per cell.
- Output capture: stdout/stderr line events with timestamps, default-export return value as `result`, exit code, duration, errors, timeouts.
- Per-page manifest written to a sidecar JSON; exposed to consumers via a virtual module + a tiny page-scoped store with mutable `result`.
- Content-hash cache for re-builds.
- Build-time-only execution. No runtime/server-side execution. No API surface.

**Out of scope (later cycles):**
- React renderers (`AgentTrace`, `JsonEditor`, `JsonView`, `OutputView`, etc.) — package `@mdx-notebook/react`.
- Astro integration, content collections, Vite plugin glue — package `@mdx-notebook/astro`.
- Starter template, reference docs site.
- Additional runners (`runner-py`, `runner-go`, `runner-rust`).
- `.ipynb` re-execution.
- Transitive import-graph hashing for cache keys (v1 hashes the entry file + lockfile only).
- Multi-language cells in a single fence; cross-cell dependencies.

## 3. Repository layout (turborepo, full picture)

```
mdx-notebook/
├── packages/
│   ├── core              # this spec
│   ├── runner-ts         # this spec
│   ├── react             # next cycle
│   └── astro             # next cycle
├── starters/
│   └── astro-notebook    # next cycle
└── apps/
    └── docs              # next cycle
```

Tooling: pnpm workspaces, Turborepo for task orchestration, tsdown for package builds, Vitest for tests, TypeScript strict.

## 4. Authoring surfaces

### 4.1 Inline code-fence cell

````md
```ts run id=hello timeout=10s
console.log("hello world");
```
````

- Fence info-string grammar: `<lang> run [key=value ...]`. The first token is the language (e.g. `ts`, `js`); the second token must be the literal word `run` for the cell to be executable. Subsequent tokens are key=value attrs; `id` is required.
- A fence like ` ```ts ` (no `run`) is rendered as a normal code block — no execution, no manifest entry.
- A fence whose language is `run` (e.g. ` ```run id=x `) is treated as a normal code block — the parser requires `run` in the second position to avoid this collision.

### 4.2 File-reference directive

```md
:::run{src="./agent.ts" id="weather-trace" timeout="60s"}
:::
```

- `src` is resolved relative to the MDX file.
- `lang` is inferred from extension; the dispatcher selects a runner.
- The directive body is reserved (currently ignored) for future fallback content rendered when execution fails in non-strict mode.

### 4.3 `.ipynb` import directive

```md
:::ipynb{src="./analysis.ipynb" id="analysis" cells="1-5"}
:::
```

- Parses `.ipynb` JSON; extracts saved outputs (`text/plain`, `image/png`, `application/json`, etc.).
- `cells` selector accepts ranges (`1-5`) and lists (`1,3,5,7-9`) — same semantics as the existing `notebook-mdx` library.
- Each selected notebook cell becomes one entry in the page manifest. The directive's `id` is the base; per-cell ids are `<id>:<cellIndex>` (e.g. `analysis:1`, `analysis:2`). Components reference them by the suffixed id.
- No execution; no runner involved.

### 4.4 Validation (during the remark pass)

Build fails with file:line on:
- Missing or empty `id`.
- Duplicate `id` on the same page.
- `src` file not found / unreadable.
- Language with no registered runner.
- Malformed `cells` selector.

## 5. Internal model

### 5.1 `Cell` discriminated union

```ts
type Loc = { file: string; line: number; column: number };

type Cell =
  | { kind: "inline"; id: string; lang: string; code: string;            timeout?: number; cache?: boolean; env?: string; loc: Loc }
  | { kind: "file";   id: string; lang: string; src: string;             timeout?: number; cache?: boolean; env?: string; loc: Loc }
  | { kind: "ipynb";  id: string;                src: string; cellIndex: number;                                          loc: Loc };
```

### 5.2 `CellOutput`

```ts
type LogEvent = { ts: number; stream: "stdout" | "stderr"; text: string };

type IpynbOutput =
  | { type: "stream"; name: "stdout" | "stderr"; text: string }
  | { type: "display_data" | "execute_result"; data: Record<string, unknown> } // mime-keyed
  | { type: "error"; ename: string; evalue: string; traceback: string[] };

type CellOutput = {
  cellId: string;
  status: "ok" | "error" | "timeout";
  durationMs: number;
  exitCode: number;
  stdout: LogEvent[];
  stderr: LogEvent[];
  result?: unknown;                  // present on "ok" when default-export was a function
  error?: { name: string; message: string; stack?: string };
  ipynbOutputs?: IpynbOutput[];      // ipynb cells only
};
```

### 5.3 `Runner` interface (the extensibility point)

```ts
interface Runner {
  language: string;                  // "ts", "js", "py", "go", ...
  version: string;                   // semver of this runner; part of cache key
  canHandle(cell: Cell): boolean;
  run(cell: Cell, ctx: RunCtx): Promise<CellOutput>;
}

interface RunCtx {
  signal: AbortSignal;
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}
```

`core` ships a default registry; consumers register additional runners via `registerRunner(runner)`. `runner-ts` self-registers when imported.

### 5.4 Manifest

```ts
type Manifest = {
  pageId: string;                    // stable hash of the source file path
  cells: Record<string, CellOutput>; // keyed by cellId
  builtAt: number;
};
```

One manifest per page. Written to `.mdx-notebook/<pageId>.json`. Consumed by the page at runtime via a virtual module:

```ts
import outputs from "virtual:mdx-notebook/<pageId>"; // resolves to Manifest
```

The virtual module is implemented in `core` and surfaced through whatever bundler the consumer uses; `runner-ts` is unaware. (The Astro/Vite plugin in the next cycle is what plugs this into a real bundler; `core` provides the generator and a simple file-system fallback.)

## 6. Build-time pipeline

```
For each MDX page P:
  1. Parse with unified + remark-mdx + remark-directive.
  2. Walk the AST:
       - Code fences with `run` token → Cell{kind:"inline"}
       - Directives `run`               → Cell{kind:"file"}
       - Directives `ipynb`             → expand to many Cell{kind:"ipynb"}
     Validate ids, srcs, langs.
  3. For each Cell:
       a. Compute cache key (see §7).
       b. If cache hit and Cell.cache !== false: load CellOutput from cache.
       c. Else dispatch:
            - inline/file → runner registry → CellOutput
            - ipynb       → ipynb parser    → CellOutput
          Write to cache.
  4. Assemble Manifest, write `.mdx-notebook/<pageId>.json`.
  5. Emit virtual module entry for P.
```

Cells from one page run in parallel up to `os.cpus()` workers. Ordering is preserved in the manifest by `cellId` insertion order (Map).

## 7. Caching

**Cache key inputs (concatenated then SHA-256):**
- For `inline`: cell `code` bytes.
- For `file`: resolved file content bytes.
- Runner `language` + `version`.
- Node major version (`process.versions.node`).
- Lockfile content hash. The runner walks up from the entry file and uses the nearest `pnpm-lock.yaml`, falling back to `package-lock.json` / `yarn.lock` / `bun.lock` if pnpm isn't present. Missing lockfile → cache key uses an empty string (with a build warning).
- Cell `env` file content if specified.

**Out of scope for v1 cache key:** transitive import graph. A change in a dependency that isn't reflected in the lockfile won't bust the cache. Mitigation: lockfile changes (the common case) do bust it; users can pass `--no-cache` for forced re-run. Transitive graph hashing comes when the Astro/Vite integration lands and we can reuse Vite's resolver.

**Cache layout:** `.mdx-notebook/.cache/<hash>.json`. Add to `.gitignore` in starter.

**CLI flags:** `--no-cache`, `--strict`, `--filter <glob>` (only build matching pages).

## 8. `runner-ts` execution model

- **Process per cell.** `tsx <entry>` for file cells; for inline cells the runner writes the code to a tempfile under `.mdx-notebook/.tmp/<hash>.ts` and runs the same way. (Tempfiles deleted after the child process exits, regardless of status.)
- **Default-export contract:** the runner first imports the module via a tiny harness; if `module.default` is a function, it `await`s it with no args. Its return is JSON-stringified into `result`. If serialization throws, status becomes `error` with `name = "SerializationError"`.
- **Stdout/stderr capture:** child stdout/stderr piped, split on `\n`, each line emitted as a `LogEvent` with `Date.now()`. Bounded at 1 MiB per stream; overflow truncated with a `[truncated]` marker.
- **Timeout:** `AbortController` + `SIGKILL` after grace period (1s). Status becomes `timeout`.
- **Errors:** uncaught throws → harness writes JSON to a side channel (fd 3) with `{ name, message, stack }`; runner reads it. Status `error`, exit code preserved.
- **Env:** child inherits process env; `cell.env` (path) is parsed (dotenv) and merged on top.
- **Working directory:** the directory of the entry file (for file cells) or the MDX file's directory (for inline cells).

**Rejected alternatives:** jiti (slower ESM), vite-node (overkill standalone), in-process `import()` (no isolation, can't reliably timeout, module cache leaks).

## 9. Runtime data flow (in the rendered page)

`core` exposes a small framework-agnostic store and a React hook (since `react` is the next cycle's consumer). The store is page-scoped — each page mounts its own provider with that page's manifest.

```ts
// @mdx-notebook/core/runtime
function createOutputStore(manifest: Manifest): OutputStore;

interface OutputStore {
  get(cellId: string): CellOutput;
  setResult(cellId: string, next: unknown): void;   // only `result` is mutable
  subscribe(cellId: string, fn: () => void): () => void;
}
```

```tsx
// @mdx-notebook/core/react (thin shim — consumed by @mdx-notebook/react later)
const OutputContext = createContext<OutputStore | null>(null);
function useCellOutput<T>(cellId: string): CellOutput & { result?: T };
```

**Mutability rule:** only `result` is mutable. `stdout`, `stderr`, `status`, `error`, `durationMs`, `exitCode` are read-only at runtime. The `JsonEditor` (next cycle) calls `setResult`; consumer components re-render via subscription.

**Why a store rather than props:** decouples editor and renderer, allows multiple consumers per cell, gives one place to instrument for the editor.

## 10. Error handling

| Failure | Build | Runtime |
|---|---|---|
| Discovery error (bad id, missing src, unknown lang) | **fails build** | n/a |
| Cell throws / non-zero exit | captured as `status:"error"` (default); `--strict` fails build | renders error block |
| Cell timeout | captured as `status:"timeout"`; `--strict` fails build | renders timeout block |
| Non-serializable result | captured as `status:"error"`, `name:"SerializationError"` | renders error block |
| `.ipynb` parse error | **fails build** | n/a |
| Cache read failure | warning; falls through to re-execute | n/a |

## 11. Testing strategy

- **`core` unit tests (vitest):**
  - Remark plugin: fence detection (`run` token, attrs, edge cases like `run` inside backticked text), directive detection, validation errors.
  - `.ipynb` parser: real fixtures with each output mime type; `cells` selector parsing.
  - Manifest assembly: id uniqueness, ordering preserved, snapshot-tested.
- **`runner-ts` integration tests:**
  - Fixtures for: plain script, default-export, async default-export, throws, timeout, oversized stdout, non-serializable result, env-var consumption.
  - Each fixture executed via the real runner; output asserted against a snapshot.
- **End-to-end smoke test:** `fixtures/sample-page.mdx` containing all three cell kinds → full pipeline → assert manifest JSON matches snapshot. Run in CI.
- **Cache tests:** hit/miss/invalidation by source change, runner-version bump, lockfile change.
- **Coverage gate:** 90% lines `core`, 85% lines `runner-ts`.

## 12. Public API surface (this spec)

`@mdx-notebook/core`:
- `remarkMdxNotebook(options?)` — unified plugin.
- `parseIpynb(buf)` — returns extracted `IpynbOutput[]` per cell.
- `registerRunner(runner)` / `getRunner(lang)`.
- `runPage(mdxPath, options)` — orchestrator (used by integrations).
- `createOutputStore(manifest)` — runtime store factory.
- React shim: `OutputContext`, `useCellOutput`.
- Types: `Cell`, `CellOutput`, `Runner`, `Manifest`, `LogEvent`, `IpynbOutput`.

`@mdx-notebook/runner-ts`:
- Default export: a `Runner` instance.
- Self-registers when imported as a side effect entry (`@mdx-notebook/runner-ts/register`).

## 13. Build sequence (this spec only)

1. Scaffold turborepo: pnpm workspaces, Turbo, tsdown, vitest, TS strict, ESLint with object-params + boundary rules. `packages/core` and `packages/runner-ts` only.
2. `core` types + remark plugin + validation, with unit tests.
3. `core` `.ipynb` parser + `cells` selector, with unit tests.
4. `runner-ts` minimal: spawn tsx, capture stdout/stderr, return `CellOutput`. Integration tests.
5. `runner-ts` default-export contract + serialization handling.
6. `runner-ts` timeouts + abort.
7. `core` runner registry + dispatcher.
8. `core` manifest assembly + sidecar writer.
9. `core` cache layer.
10. `core` runtime store + React shim.
11. End-to-end smoke fixture and CI wiring.
12. Coverage gate, README per package.

## 14. Open questions for follow-on cycles

- Astro virtual-module integration vs. file-system manifest only.
- Streaming stdout to the browser during dev (HMR).
- Transitive import-graph cache invalidation.
- A `dev` mode that re-runs cells on save.
- Image / binary outputs from TS cells (currently only `result` JSON; `.ipynb` already carries binary outputs).
- Cross-cell dependencies (cell B reads cell A's `result`).
- Component naming convention and discovery (`@mdx-notebook/react` cycle).
