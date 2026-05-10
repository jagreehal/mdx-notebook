# Callouts + Expressive Code Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two opt-in features to `mdx-notebook-astro`: a callouts remark plugin (`:::tip` etc.) and Expressive Code (shiki) syntax highlighting via `astro-expressive-code`.

**Architecture:** Users pass `{ callouts: true, codeHighlight: true }` to the `mdxNotebook()` Astro integration. The integration's `astro:config:setup` hook conditionally registers the callouts remark plugin via `updateConfig({ markdown: { remarkPlugins: [...] } })` and conditionally calls `addIntegration(expressiveCode(...))`. The callouts plugin is a pure remark transformer that rewrites `:::tip` container directives into `<div class="mdx-nb-callout mdx-nb-callout-tip">` wrappers using `hastscript` + `unist-util-visit`.

**Tech Stack:** TypeScript, unified/remark ecosystem (`mdast-util-directive`, `hastscript`, `unist-util-visit`), `astro-expressive-code`, `@expressive-code/plugin-collapsible-sections`, `@expressive-code/plugin-line-numbers`, Vitest, Playwright.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| CREATE | `packages/mdx-notebook-astro/src/callouts.ts` | Remark plugin that transforms `:::tip/info/warn/danger/success` directives |
| MODIFY | `packages/mdx-notebook-astro/src/index.ts` | Add `callouts`/`codeHighlight` options; wire up plugins |
| MODIFY | `packages/mdx-notebook-astro/package.json` | Add new deps/peerDeps/devDeps |
| MODIFY | `packages/mdx-notebook-astro/tsdown.config.ts` | Export `callouts.ts` as additional entry |
| CREATE | `packages/mdx-notebook-astro/test/callouts.test.ts` | Unit tests for the callouts remark plugin |
| MODIFY | `packages/mdx-notebook-astro/test/integration.test.ts` | Tests for new integration options |
| MODIFY | `examples/starter/package.json` | Add expressive-code + plugin deps |
| MODIFY | `examples/starter/astro.config.mjs` | Enable `callouts: true, codeHighlight: true` |
| CREATE | `examples/starter/src/content/callouts-demo.md` | Demo content showing callouts + highlighted code block |
| MODIFY | `examples/starter/src/pages/index.astro` | Import + render `<CalloutsDemo />`, add callout CSS |
| MODIFY | `tests/starter.story.spec.ts` | Assert `.mdx-nb-callout-tip` and `.expressive-code` visible |
| MODIFY | `README.md` | Document new options |

---

### Task 1: Add dependencies to `packages/mdx-notebook-astro/package.json`

**Files:**
- Modify: `packages/mdx-notebook-astro/package.json`

- [ ] **Step 1: Update package.json**

Replace the entire file content:

```json
{
  "name": "mdx-notebook-astro",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "scripts": {
    "build": "bash -lc 'set -o pipefail; tsdown 2>&1 | rg -v \"Invalid input options \\(1 issue found\\)|For the \\\"define\\\"\\.  Invalid key\"; exit ${PIPESTATUS[0]}'",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo coverage"
  },
  "dependencies": {
    "mdx-notebook-core": "workspace:*",
    "mdx-notebook-runner-ts": "workspace:*",
    "mdast-util-directive": "^3.0.0",
    "hastscript": "^9.0.0",
    "unist-util-visit": "^5.0.0"
  },
  "peerDependencies": {
    "astro": "^4.0.0 || ^5.0.0 || ^6.0.0",
    "astro-expressive-code": "^0.35.0 || ^0.40.0",
    "@expressive-code/plugin-collapsible-sections": "^0.35.0 || ^0.40.0",
    "@expressive-code/plugin-line-numbers": "^0.35.0 || ^0.40.0"
  },
  "peerDependenciesMeta": {
    "astro": { "optional": true },
    "astro-expressive-code": { "optional": true },
    "@expressive-code/plugin-collapsible-sections": { "optional": true },
    "@expressive-code/plugin-line-numbers": { "optional": true }
  },
  "devDependencies": {
    "@types/mdast": "^4.0.0",
    "@types/node": "^20.19.0",
    "@types/unist": "^3.0.0",
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-directive": "^4.0.0"
  }
}
```

- [ ] **Step 2: Install new deps**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm install
```

Expected: pnpm resolves workspace + new packages, no errors.

---

### Task 2: Create the callouts remark plugin

**Files:**
- Create: `packages/mdx-notebook-astro/src/callouts.ts`

- [ ] **Step 1: Write the failing test first**

Create `packages/mdx-notebook-astro/test/callouts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import { calloutsRemarkPlugin } from "../src/callouts.js";

function process(source: string) {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(source);
  unified().use(calloutsRemarkPlugin).runSync(tree);
  return tree;
}

describe("calloutsRemarkPlugin", () => {
  it("transforms a :::tip directive into a callout div", () => {
    const tree = process(":::tip\nHello world\n:::\n");
    const node = (tree.children[0] as { data?: { hName?: string; hProperties?: { class?: string } }; children?: Array<{ data?: { hProperties?: { class?: string } }; children?: Array<{ value?: string }> }> });
    expect(node.data?.hName).toBe("div");
    expect(node.data?.hProperties?.class).toContain("mdx-nb-callout-tip");
    const title = node.children?.[0];
    expect(title?.data?.hProperties?.class).toContain("mdx-nb-callout-title");
    // Default title for :::tip is "Tip"
    expect(title?.children?.[0]?.value).toBe("Tip");
  });

  it("uses a custom label when [Custom title] is provided", () => {
    const tree = process(":::warn[Heads up]\nDanger\n:::\n");
    const node = tree.children[0] as { children?: Array<{ children?: Array<{ value?: string }> }> };
    const title = node.children?.[0];
    expect(title?.children?.[0]?.value).toBe("Heads up");
  });

  it("ignores unknown directive names", () => {
    const tree = process(":::nope\nbody\n:::\n");
    const node = (tree.children[0] as { data?: { hName?: string } });
    expect(node.data?.hName).toBeUndefined();
  });

  it("supports each variant", () => {
    for (const v of ["tip", "info", "warn", "danger", "success"]) {
      const tree = process(`:::${v}\nbody\n:::\n`);
      const node = (tree.children[0] as { data?: { hProperties?: { class?: string } } });
      expect(node.data?.hProperties?.class).toContain(`mdx-nb-callout-${v}`);
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-astro test 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../src/callouts.js'"

- [ ] **Step 3: Create the callouts plugin implementation**

Create `packages/mdx-notebook-astro/src/callouts.ts`:

```ts
import { h } from "hastscript";
import type { BlockContent, DefinitionContent, Node, Parent, Root } from "mdast";
import type { Directives } from "mdast-util-directive";
import type { Plugin, Transformer } from "unified";
import { visit } from "unist-util-visit";

type Children = Array<BlockContent | DefinitionContent>;

const CALLOUTS = {
  tip:     { label: "Tip" },
  info:    { label: "Info" },
  warn:    { label: "Warning" },
  danger:  { label: "Danger" },
  success: { label: "Success" }
} as const;

type CalloutVariant = keyof typeof CALLOUTS;
const VARIANTS = new Set<string>(Object.keys(CALLOUTS));

function isDirective(node: Node): node is Directives {
  return (
    node.type === "containerDirective" ||
    node.type === "leafDirective" ||
    node.type === "textDirective"
  );
}

export const calloutsRemarkPlugin: Plugin<[], Root> = () => {
  const transformer: Transformer<Root> = (tree) => {
    visit(tree, (node, index, parent: Parent | undefined) => {
      if (!isDirective(node)) return;
      if (!VARIANTS.has(node.name)) return;

      const variant = node.name as CalloutVariant;
      const config = CALLOUTS[variant];

      // Only handle container directives for v1; ignore inline/leaf forms.
      if (node.type !== "containerDirective") return;

      const titleNode = (node.children[0] as { data?: { directiveLabel?: boolean }; children?: Children } | undefined);
      let titleChildren: Children;
      let bodyChildren: Children;

      if (titleNode && titleNode.data?.directiveLabel && Array.isArray(titleNode.children)) {
        titleChildren = titleNode.children;
        bodyChildren = node.children.slice(1) as Children;
      } else {
        titleChildren = [{ type: "text", value: config.label } as never];
        bodyChildren = node.children as Children;
      }

      const data = node.data ?? (node.data = {});
      const tagName = "div";
      const properties = h(tagName, { class: `mdx-nb-callout mdx-nb-callout-${variant}` }).properties;
      data.hName = tagName;
      data.hProperties = properties;

      // Replace children with: <div class="mdx-nb-callout-title">title</div> + body
      const titleWrap = {
        type: "paragraph" as const,
        data: {
          hName: "div",
          hProperties: { class: "mdx-nb-callout-title" }
        },
        children: titleChildren
      };

      node.children = [titleWrap, ...bodyChildren] as never;

      // Avoid lint warnings about unused params:
      void index; void parent;
    });
  };
  return transformer;
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-astro test 2>&1 | tail -30
```

Expected: all callouts tests PASS (4 tests).

---

### Task 3: Update tsdown config to export callouts.ts

**Files:**
- Modify: `packages/mdx-notebook-astro/tsdown.config.ts`

- [ ] **Step 1: Add callouts.ts as an entry point**

Current content:
```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/vite-plugin.ts"],
  format: ["esm"],
  dts: true,
  unbundle: true,
  clean: true,
  sourcemap: true,
});
```

Update to:
```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/vite-plugin.ts", "src/callouts.ts"],
  format: ["esm"],
  dts: true,
  unbundle: true,
  clean: true,
  sourcemap: true,
});
```

---

### Task 4: Update `packages/mdx-notebook-astro/src/index.ts`

**Files:**
- Modify: `packages/mdx-notebook-astro/src/index.ts`

- [ ] **Step 1: Replace index.ts with the updated version**

Replace the entire file with:

```ts
import { isAbsolute, resolve } from "node:path";
import { runPage, type RunPageOptions, type Manifest } from "mdx-notebook-core";
import "mdx-notebook-runner-ts/register";
import { mdxNotebookVitePlugin } from "./vite-plugin.js";
import { calloutsRemarkPlugin } from "./callouts.js";

export interface RunNotebookOptions extends Omit<RunPageOptions, "rootDir"> {
  rootDir?: string;
}

/**
 * Run an MDX page through mdx-notebook and return its manifest.
 * Defaults: rootDir = process.cwd(), useCache = true, defaultTimeoutMs = 30_000.
 */
export async function runNotebook(mdxPath: string, options: RunNotebookOptions = {}): Promise<Manifest> {
  const rootDir = options.rootDir ?? process.cwd();
  const absMdx = isAbsolute(mdxPath) ? mdxPath : resolve(rootDir, mdxPath);
  return runPage(absMdx, { rootDir, ...options });
}

export interface MdxNotebookIntegrationOptions {
  /** Add :::tip / :::info / :::warn / :::danger / :::success callouts as a remark plugin. Default: false. */
  callouts?: boolean;
  /** Register astro-expressive-code with collapsible-sections + line-numbers. Default: false. */
  codeHighlight?: boolean | CodeHighlightOptions;
}

export interface CodeHighlightOptions {
  /** Tuple of [light, dark] theme names. Default: ["light-plus", "dark-plus"]. */
  themes?: [string, string];
}

export interface AstroIntegration {
  name: string;
  hooks: Record<string, unknown>;
}

/**
 * Astro integration entry. Registers a Vite plugin for HMR on .mdx, .ts, and
 * .ipynb file changes, triggering a full page reload in the dev server.
 *
 * Optional features:
 *   callouts: true       - enables :::tip / :::info / :::warn / :::danger / :::success
 *   codeHighlight: true  - registers astro-expressive-code (shiki) with collapsible sections + line numbers
 */
export default function mdxNotebook(options: MdxNotebookIntegrationOptions = {}): AstroIntegration {
  return {
    name: "mdx-notebook-astro",
    hooks: {
      async "astro:config:setup"(ctx: {
        updateConfig: (config: Record<string, unknown>) => void;
        addIntegration?: (integration: unknown) => void;
        config: Record<string, unknown>;
      }) {
        ctx.updateConfig({ vite: { plugins: [mdxNotebookVitePlugin()] } });

        if (options.callouts) {
          ctx.updateConfig({
            markdown: {
              remarkPlugins: [calloutsRemarkPlugin]
            }
          });
        }

        if (options.codeHighlight && ctx.addIntegration) {
          const themes: [string, string] =
            typeof options.codeHighlight === "object" && options.codeHighlight.themes
              ? options.codeHighlight.themes
              : ["light-plus", "dark-plus"];
          try {
            const [{ default: expressiveCode }, { pluginCollapsibleSections }, { pluginLineNumbers }] = await Promise.all([
              import("astro-expressive-code"),
              import("@expressive-code/plugin-collapsible-sections"),
              import("@expressive-code/plugin-line-numbers")
            ]);
            ctx.addIntegration(expressiveCode({
              themes,
              plugins: [pluginCollapsibleSections(), pluginLineNumbers()]
            }));
          } catch (err) {
            // If user enabled codeHighlight but didn't install astro-expressive-code,
            // surface a clear error instead of crashing silently.
            const msg = (err as Error).message;
            throw new Error(
              `mdx-notebook-astro: codeHighlight is enabled but its dependencies are not installed. ` +
              `Please install astro-expressive-code, @expressive-code/plugin-collapsible-sections, and @expressive-code/plugin-line-numbers. ` +
              `Original error: ${msg}`
            );
          }
        }
      }
    }
  };
}

export { mdxNotebookVitePlugin } from "./vite-plugin.js";
export { calloutsRemarkPlugin } from "./callouts.js";
export type { Manifest, CellOutput, RunPageOptions } from "mdx-notebook-core";
```

---

### Task 5: Update integration tests

**Files:**
- Modify: `packages/mdx-notebook-astro/test/integration.test.ts`

- [ ] **Step 1: Replace integration.test.ts with expanded version**

```ts
import { describe, it, expect, vi } from "vitest";
import mdxNotebook from "../src/index.js";

describe("default integration export", () => {
  it("returns an Astro integration object with a name and the config:setup hook", () => {
    const integration = mdxNotebook();
    expect(integration.name).toBe("mdx-notebook-astro");
    expect(typeof integration.hooks["astro:config:setup"]).toBe("function");
  });
});

describe("mdxNotebook integration options", () => {
  it("with no options: only registers the Vite HMR plugin", async () => {
    const integration = mdxNotebook();
    const updateConfig = vi.fn();
    const addIntegration = vi.fn();
    await (integration.hooks["astro:config:setup"] as (c: unknown) => Promise<void>)({
      updateConfig, addIntegration, config: {}
    });
    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(addIntegration).not.toHaveBeenCalled();
  });

  it("with callouts:true: registers callouts remark plugin", async () => {
    const integration = mdxNotebook({ callouts: true });
    const calls: unknown[] = [];
    const updateConfig = vi.fn((c: unknown) => { calls.push(c); });
    const addIntegration = vi.fn();
    await (integration.hooks["astro:config:setup"] as (c: unknown) => Promise<void>)({
      updateConfig, addIntegration, config: {}
    });
    // Two updateConfig calls: one for vite plugins, one for markdown.remarkPlugins
    expect(updateConfig).toHaveBeenCalledTimes(2);
    const found = calls.find((c) => (c as { markdown?: { remarkPlugins?: unknown[] } }).markdown);
    expect(found).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-astro test 2>&1 | tail -30
```

Expected: all tests pass (callouts: 4, integration: 3, existing: all).

---

### Task 6: Build the package to verify TypeScript compiles

**Files:**
- No file changes — just build verification

- [ ] **Step 1: Build mdx-notebook-astro**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-astro build 2>&1
```

Expected: tsdown exits 0, `dist/callouts.js` and `dist/callouts.d.ts` appear alongside `dist/index.js`.

---

### Task 7: Update starter's package.json + astro.config.mjs

**Files:**
- Modify: `examples/starter/package.json`
- Modify: `examples/starter/astro.config.mjs`

- [ ] **Step 1: Add expressive-code deps to starter package.json**

Replace the `"dependencies"` block:

```json
"dependencies": {
  "@astrojs/check": "^0.9.0",
  "@astrojs/mdx": "^4.0.0",
  "@astrojs/react": "^4.0.0",
  "astro": "^5.0.0",
  "astro-expressive-code": "^0.40.0",
  "@expressive-code/plugin-collapsible-sections": "^0.40.0",
  "@expressive-code/plugin-line-numbers": "^0.40.0",
  "mdx-notebook-astro": "workspace:*",
  "mdx-notebook-core": "workspace:*",
  "mdx-notebook-react": "workspace:*",
  "mdx-notebook-runner-ts": "workspace:*",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

- [ ] **Step 2: Update astro.config.mjs to enable both features**

Replace the entire file:

```js
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import mdxNotebook from "mdx-notebook-astro";

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [
    mdx(),
    react(),
    mdxNotebook({ callouts: true, codeHighlight: true })
  ],
  vite: {
    server: { fs: { allow: ["..", "../../node_modules/.pnpm"] } },
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    ssr: {
      noExternal: [],
      external: [
        "mdx-notebook-runner-ts",
        "mdx-notebook-astro",
        "mdx-notebook-core",
      ]
    },
    build: {
      rollupOptions: {
        external: [
          "node:path",
          "node:fs",
          "node:fs/promises",
          "node:crypto",
          "node:os",
          "node:process",
          "node:url",
          "node:child_process",
        ]
      }
    }
  }
});
```

- [ ] **Step 3: Install new deps**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm install
```

Expected: `astro-expressive-code` and both plugins appear in `examples/starter/node_modules` (or workspace root).

---

### Task 8: Create callouts demo content

**Files:**
- Create: `examples/starter/src/content/callouts-demo.md`

- [ ] **Step 1: Create the demo markdown file**

Create `examples/starter/src/content/callouts-demo.md`:

````md
# Callouts demo

:::tip
Code in this site runs at build time. Outputs are typed and bound to React components.
:::

:::warn
Cells declared with `id` must be unique on the page — duplicate ids fail the build.
:::

:::info[Authoring]
You can also reference real source files: `:::run{src="./agent.ts" id="trace"}:::`.
:::

## A highlighted code block

```ts showLineNumbers
import { runNotebook } from "mdx-notebook-astro";
import { Page } from "../components/Page.tsx";

const manifest = await runNotebook("./src/content/tutorial.mdx");
```
````

---

### Task 9: Update index.astro to render callouts demo + add CSS

**Files:**
- Modify: `examples/starter/src/pages/index.astro`

- [ ] **Step 1: Replace index.astro with updated version**

Replace the entire file:

```astro
---
import { runNotebook } from "mdx-notebook-astro";
import { Page } from "../components/Page.tsx";
import { Content as CalloutsDemo } from "../content/callouts-demo.md";

const manifest = await runNotebook("./src/content/tutorial.mdx");
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>mdx-notebook starter</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
      h1 { font-size: 2rem; margin-bottom: 0.5rem; }
      h2 { font-size: 1.25rem; margin-top: 2rem; }
      section { margin-bottom: 1.5rem; }

      .mdx-nb-callout {
        border-left: 4px solid #999;
        padding: 0.6rem 0.9rem;
        margin: 0.75rem 0;
        background: #f6f7f9;
        border-radius: 0 6px 6px 0;
      }
      .mdx-nb-callout-title { font-weight: 600; margin-bottom: 0.25rem; }
      .mdx-nb-callout-tip { border-left-color: #2da44e; background: #f1faf3; }
      .mdx-nb-callout-tip .mdx-nb-callout-title { color: #1a7f37; }
      .mdx-nb-callout-info { border-left-color: #1f6feb; background: #f0f6ff; }
      .mdx-nb-callout-info .mdx-nb-callout-title { color: #1f6feb; }
      .mdx-nb-callout-warn { border-left-color: #d4a72c; background: #fff8c5; }
      .mdx-nb-callout-warn .mdx-nb-callout-title { color: #9a6700; }
      .mdx-nb-callout-danger { border-left-color: #cf222e; background: #ffebe9; }
      .mdx-nb-callout-danger .mdx-nb-callout-title { color: #cf222e; }
      .mdx-nb-callout-success { border-left-color: #2da44e; background: #dafbe1; }
      .mdx-nb-callout-success .mdx-nb-callout-title { color: #1a7f37; }
    </style>
  </head>
  <body>
    <h1>mdx-notebook starter</h1>
    <p>Cells executed at build. Open <code>src/content/tutorial.mdx</code> to author.</p>
    <CalloutsDemo />
    <Page manifest={manifest} client:load />
  </body>
</html>
```

---

### Task 10: Update Playwright e2e test

**Files:**
- Modify: `tests/starter.story.spec.ts`

- [ ] **Step 1: Add callouts and Expressive Code assertions**

Append before the final `});` of the test:

```ts
  story.then("the callouts demo renders with the tip class");
  await expect(page.locator(".mdx-nb-callout-tip").first()).toBeVisible();

  story.then("Expressive Code applies shiki highlighting");
  // Expressive Code emits .expressive-code wrapper; verify presence
  await expect(page.locator(".expressive-code").first()).toBeVisible();
```

---

### Task 11: Run all tests

- [ ] **Step 1: Run unit tests for all packages**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm test 2>&1 | tail -40
```

Expected: all packages pass.

- [ ] **Step 2: Build the starter to verify Expressive Code integration works**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm --filter mdx-notebook-starter build 2>&1 | tail -40
```

Expected: `dist/` produced, no errors, shiki theme files referenced.

- [ ] **Step 3: Run e2e tests**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && pnpm test:e2e 2>&1 | tail -40
```

Expected: all e2e tests pass including the two new assertions.

---

### Task 12: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append optional features section**

Append to the end of `README.md`:

````md
## Optional features

### Callouts and shiki highlighting

```js
// astro.config.mjs
import mdxNotebook from "mdx-notebook-astro";

export default defineConfig({
  integrations: [
    mdxNotebook({ callouts: true, codeHighlight: true })
  ]
});
```

`callouts: true` adds `:::tip`, `:::info`, `:::warn`, `:::danger`, `:::success` blocks to your MDX/Markdown.
`codeHighlight: true` registers `astro-expressive-code` with collapsible sections and line numbers (you must install `astro-expressive-code` and the plugin packages).
````

---

### Task 13: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook && git add \
  packages/mdx-notebook-astro/src/callouts.ts \
  packages/mdx-notebook-astro/src/index.ts \
  packages/mdx-notebook-astro/package.json \
  packages/mdx-notebook-astro/tsdown.config.ts \
  packages/mdx-notebook-astro/test/callouts.test.ts \
  packages/mdx-notebook-astro/test/integration.test.ts \
  examples/starter/package.json \
  examples/starter/astro.config.mjs \
  examples/starter/src/content/callouts-demo.md \
  examples/starter/src/pages/index.astro \
  tests/starter.story.spec.ts \
  README.md \
  pnpm-lock.yaml
git commit -m "feat(astro): callouts remark plugin + Expressive Code (shiki) integration"
```

Expected: commit succeeds, SHA printed.
