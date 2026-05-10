# mdx-notebook-astro

Astro integration for mdx-notebook. Registers the TypeScript runner automatically, exposes a `runNotebook` helper for running MDX notebooks at request/build time, and installs a Vite plugin that triggers full-reload HMR whenever a `.mdx`, `.ts`, or `.ipynb` file changes during development.

## Usage

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import mdxNotebook from "mdx-notebook-astro";

export default defineConfig({
  integrations: [mdxNotebook()]
});
```

```astro
---
// src/pages/tutorial.astro
import { runNotebook } from "mdx-notebook-astro";
import { NotebookPage, AgentTrace, JsonEditor } from "mdx-notebook-react";

const manifest = await runNotebook("./src/content/tutorial.mdx");
---
<NotebookPage manifest={manifest} client:load>
  <AgentTrace cellId="trace" />
  <JsonEditor cellId="trace" />
</NotebookPage>
```

`runNotebook` resolves paths relative to the Astro project root and wraps `runPage` from `mdx-notebook-core`. You do not need to call `registerRunner` yourself — the integration registers `mdx-notebook-runner-ts` on startup.

## What the integration does

- Calls `registerRunner(runnerTs)` during Astro setup so TypeScript/JavaScript cells work out of the box.
- Provides `runNotebook(path)` as a convenience wrapper around `runPage`.
- Installs a Vite plugin that watches `.mdx`, `.ts`, and `.ipynb` files and triggers a full-reload HMR event when any of them change, keeping the dev server in sync with your source.

## Links

- [Root README](../../README.md)
- [Design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md)
