# mdx-notebook

**Runnable documentation, build-time.**

Write MDX. Code in your tutorials runs at build time. Outputs are typed, cached, and bound to React components by id. Viewers can edit JSON in the browser and components re-render. Comes with an Astro integration and a `npm create mdx-notebook` scaffolder.

---

## Why this exists

Documentation rots. The moment you copy a code snippet into a markdown file it begins drifting from the real codebase. The usual solutions trade one problem for another:

| Tool | Strength | Gap |
|---|---|---|
| Jupyter / Quarto | Live execution, rich outputs | Python-first; notebooks are not MDX; hard to version in prose |
| Observable | Reactive, browser-native | JavaScript-only; not a static-site authoring tool |
| Storybook | Great for components | Not for prose documentation or multi-language code |
| notebook-mdx | Renders *saved* Jupyter output in MDX | Outputs are static snapshots, not re-run at build time |

mdx-notebook occupies a different niche: **build-time execution, multi-language pluggable runners, viewer-mutable data, immutable components, in plain MDX.** Your tutorial code is always run fresh on each build. Readers can tweak JSON parameters in the browser and watch the bound React component re-render — without shipping a server.

---

## Quick start

```bash
npm create mdx-notebook my-tutorial
cd my-tutorial
pnpm install
pnpm dev
```

You will see something like this in your browser:

```
┌─────────────────────────────────────────────────────────┐
│  My Tutorial                                            │
│                                                         │
│  ┌─ hello.ts ──────────────────────────────────────┐   │
│  │  export default { greeting: "Hello, world!" }   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  stdout  ──────────────────────────────────────────    │
│  (empty)                                                │
│                                                         │
│  Result  ──────────────────────────────────────────    │
│  { "greeting": "Hello, world!" }                        │
│                                                         │
│  ┌─ JSON Editor ──────────────────────────────────┐    │
│  │  { "greeting": "Hello, world!" }               │    │
│  │                                    [Apply]      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

Edit the JSON in the browser — the bound React component re-renders instantly, no server round-trip needed.

---

## Authoring

mdx-notebook recognises three cell forms inside your `.mdx` files.

### 1. Inline code fence

Annotate any fenced code block with `run` and give it an `id`:

````mdx
```ts run id=hello
export default { greeting: "Hello, world!" };
```
````

The `id` is how you bind the cell's output to a React component on the same page.

### 2. File reference

Run an external file and capture its output:

```mdx
:::run{src="./agent.ts" id="trace"}
:::
```

Useful for larger scripts, agent pipelines, or anything that you also want importable by other tools.

### 3. Jupyter import

Render saved outputs from an `.ipynb` notebook:

```mdx
:::ipynb{src="./demo.ipynb" id="nb" cells="0-3"}
:::
```

Cells `0` through `3` are extracted; their saved outputs (text, images, rich media) are rendered via `IpynbOutputs`.

### Binding outputs to components

After a cell runs, bind its output to any React component using the same `id`:

```mdx
import { Stdout, ResultJSON, JsonEditor } from "mdx-notebook-react";

```ts run id=hello
export default { value: 42 };
```

<Stdout cellId="hello" />
<ResultJSON cellId="hello" />
<JsonEditor cellId="hello" />
```

---

## Components

All components live in [`mdx-notebook-react`](./packages/mdx-notebook-react/README.md). Wrap the page in `NotebookPage` so the store is available, then use any combination of the output components.

| Component | Description |
|---|---|
| `NotebookPage` | Context provider. Hydrates the page-scoped output store from the build manifest. Required root wrapper. |
| `Stdout` | Renders lines written to stdout during cell execution. |
| `Stderr` | Renders lines written to stderr during cell execution. |
| `ResultJSON` | Renders the cell's default-export return value as formatted JSON. |
| `JsonView` | Read-only JSON tree viewer. |
| `JsonEditor` | Editable JSON textarea. Mutations are local-state only; components subscribed to the same store key re-render. |
| `AgentTrace` | Renders a structured agent trace (array of step objects) as an expandable timeline. |
| `IpynbOutputs` | Renders Jupyter notebook saved outputs: text, images, rich media, errors. |
| `CodeBlock` | Syntax-highlighted code block with copy button. Language-agnostic. |
| `Math` | Inline and block math via KaTeX. |
| `NotebookCell` | Composite: code block + all output components for a single cell. Convenience wrapper for the common pattern. |

---

## Architecture

```
 MDX file
    │
    ▼
 remark plugin (mdx-notebook-core)
 discovers annotated fences, :::run, :::ipynb directives
    │
    ▼
 Runner registry  ◄── mdx-notebook-runner-ts (tsx child process)
 (pluggable)           future: python / go / rust runners
    │
    ▼
 runPage() → PageManifest
 { cells: [ { id, stdout, stderr, result, hash } ] }
    │
    ├── content-hash cache (skip re-run if source unchanged)
    │
    ▼
 Page-scoped runtime store  (Zustand, tree-shaken per page)
    │
    ▼
 React components subscribe via useCellOutput(id)
 JsonEditor mutations update the store → components re-render
```

Runners implement a single async interface:

```ts
interface Runner {
  language: string;                       // e.g. "ts" | "js"
  run(cell: CellDescriptor): Promise<CellOutput>;
}
```

Registering a new language is one `registerRunner(myRunner)` call.

---

## Comparison

| | mdx-notebook | notebook-mdx | Quarto | Observable | Storybook |
|---|:---:|:---:|:---:|:---:|:---:|
| Build-time execution | Yes | No | Yes | No | No |
| Plain MDX authoring | Yes | Yes | No (QMD) | No | No |
| Multi-language runners | Yes (pluggable) | No | Yes | No | No |
| Viewer-mutable data | Yes (JSON editor) | No | No | Yes (reactive) | No |
| Jupyter import | Yes (saved output) | Yes | Yes | No | No |
| Astro integration | Yes | No | No | No | No |
| Best for | Runnable docs / tutorials | Rendering saved notebooks | Data science reports | Reactive notebooks | Component demos |

mdx-notebook is purpose-built for *runnable documentation and tutorials*. It is not a replacement for Jupyter analytics workflows, Quarto data-science reports, or Storybook component variant testing.

---

## Roadmap

- [x] Build-time TypeScript / JavaScript cell execution via `tsx`
- [x] `.ipynb` saved-output rendering (`IpynbOutputs`)
- [x] Astro integration with HMR (`mdx-notebook-astro`)
- [x] `npm create mdx-notebook` scaffolder
- [x] Content-hash cache (skip re-run when source is unchanged)
- [x] `JsonEditor` viewer-side mutation + store reactivity
- [x] `AgentTrace`, `Math` (KaTeX), `NotebookCell` convenience components
- [x] Executable-stories test reporters (Vitest + Playwright)
- [ ] Python / Go / Rust runners
- [ ] Virtual-module per page so manifests resolve via `import manifest from "virtual:mdx-notebook/<id>"`
- [ ] Syntax highlighting via Shiki (replace current CodeBlock)
- [ ] MDX components declared inside cells (cell controls which component renders its result)
- [ ] Astro content collection loader
- [ ] Publishing workflow and hosted docs site

---

## Packages

| Package | Description |
|---|---|
| [`mdx-notebook-core`](./packages/mdx-notebook-core/README.md) | Cell discovery, runner registry, content-hash cache, page manifest, runtime store, React hooks |
| [`mdx-notebook-runner-ts`](./packages/mdx-notebook-runner-ts/README.md) | TypeScript / JavaScript runner via `tsx` child process |
| [`mdx-notebook-react`](./packages/mdx-notebook-react/README.md) | All renderer components: NotebookPage, output displays, JsonEditor, AgentTrace, Math, etc. |
| [`mdx-notebook-astro`](./packages/mdx-notebook-astro/README.md) | Astro integration: `runNotebook` helper, Vite plugin for HMR |
| [`create-mdx-notebook`](./packages/create-mdx-notebook/README.md) | `npm create mdx-notebook` scaffolder |

---

## Development

Requires Node >= 20 and pnpm.

```bash
# Install all workspace dependencies
pnpm install

# Build all packages (via Turborepo)
pnpm build

# Run all unit tests (~165 tests across 5 packages)
pnpm test

# Run Vitest story tests
pnpm test:stories

# Run Playwright e2e stories (boots the starter dev server)
pnpm test:e2e
```

Story-style test outputs are written to [`docs/evidence/`](./docs/evidence/) by the `executable-stories-vitest` and `executable-stories-playwright` reporters. Each story narrates its steps as given / when / then and emits markdown evidence files — useful for reviewing what the tests actually exercise.

The starter app at [`examples/starter`](./examples/starter) is the integration dogfood. If you change `mdx-notebook-react` or `mdx-notebook-astro`, run the starter and the e2e tests before pushing.

## Deploying the starter

`examples/starter` is a real Astro site. Deploy it to get a live demo of mdx-notebook.

```bash
# Vercel
npx vercel --cwd examples/starter

# Netlify
npx netlify deploy --build --dir=examples/starter/dist
```

Set `ANTHROPIC_API_KEY` in the deployment environment to enable real Claude calls in tutorial 02 (the page falls back to mocked output when the key is unset). See [`DEPLOYING.md`](./DEPLOYING.md) for full instructions including Cloudflare Pages and sub-path deploys.

---

## Optional features

### Callouts and shiki highlighting

```js
// astro.config.mjs
import expressiveCode from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import mdx from "@astrojs/mdx";
import mdxNotebook from "mdx-notebook-astro";

export default defineConfig({
  integrations: [
    // expressiveCode must be listed before mdx()
    expressiveCode({ themes: ["light-plus", "dark-plus"], plugins: [pluginCollapsibleSections(), pluginLineNumbers()] }),
    mdx(),
    mdxNotebook({ callouts: true })
  ]
});
```

`callouts: true` adds `:::tip`, `:::info`, `:::warn`, `:::danger`, `:::success` directive blocks to your MDX/Markdown. The plugin auto-registers `remark-directive` as a prerequisite so directive syntax is parsed correctly.

For shiki-powered code highlighting, add `astro-expressive-code` directly to your integrations array **before** `mdx()` (required by `astro-expressive-code`). Install the packages first:

```bash
pnpm add astro-expressive-code @expressive-code/plugin-collapsible-sections @expressive-code/plugin-line-numbers
```

`mdxNotebook` also exposes a `codeHighlight: true` shorthand option that registers `astro-expressive-code` via `addIntegration` — suitable for plain `.md` files. For `.mdx` files, add `expressiveCode` directly as shown above.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) — Jag Reehal, 2026.
