# mdx-notebook-astro

Astro integration for mdx-notebook.

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

## What it does today

- Registers `mdx-notebook-runner-ts` automatically.
- `runNotebook(path)` resolves relative to your Astro project root and wraps `runPage` from `mdx-notebook-core`.

## Roadmap

- Virtual module per page so manifests resolve via `import manifest from "virtual:mdx-notebook/<id>"`.
- HMR / VFile dependency tracking so saved .ipynb / .ts files invalidate the consumer page.
- Astro content collection loader.
- Build-time scanning + manifest sidecar emission to a build directory.
