# @mdx-notebook/core

MDX + `.ipynb` cell discovery, output store, runner dispatch, and cache for mdx-notebook.

See [design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md).

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
