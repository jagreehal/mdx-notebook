# mdx-notebook-core

MDX and `.ipynb` cell discovery, pluggable runner registry, content-hash cache, page manifest, and page-scoped runtime store for mdx-notebook.

This is the engine that every other package builds on. It parses your `.mdx` file with remark, finds annotated code fences and `:::run` / `:::ipynb` directives, dispatches each cell to the registered runner for its language, caches results by content hash, and assembles a `PageManifest`. The runtime store and React hooks (`useCellOutput`, `useOutputStore`) let components subscribe to outputs on the client.

## Usage

```ts
import { runPage, registerRunner } from "mdx-notebook-core";
import { runnerTs } from "mdx-notebook-runner-ts";

registerRunner(runnerTs);

const manifest = await runPage("./content/example.mdx", { rootDir: process.cwd() });
console.log(manifest.cells);
```

### Authoring cell forms

````md
```ts run id=hello
export default { greeting: "Hello" };
```

:::run{src="./agent.ts" id="trace"}
:::

:::ipynb{src="./analysis.ipynb" id="nb" cells="0-3"}
:::
````

### Tutorial checkpoints (`:::check`)

Use `:::check` directives to assert expected outcomes against a cell's output. Results are written to `manifest.checkpoints`, and aggregate progress is written to `manifest.progress`.

```mdx
```ts run id=sum
const nums = [1, 2, 3, 4];
console.log("sum", nums.reduce((a, b) => a + b, 0));
export default nums.reduce((a, b) => a + b, 0);
```

:::check{id="sum-result" cell="sum" equals=10 path="result" title="Result is 10" required=true weight=2}
:::

:::check{id="sum-stdout" cell="sum" includes="sum 10" path="stdout"}
:::
```

Supported operators:
- `equals`
- `includes`
- `regex`
- `exists`
- `gt`
- `gte`
- `lt`
- `lte`

Key fields:
- `id`: unique checkpoint id.
- `cell`: target cell id.
- `path`: where to read from (`result`, `stdout`, `stderr`, `status`, `exitCode`, `durationMs`, or nested dot-path).
- `required`: whether failing blocks completion (`true` by default).
- `weight`: weighted score contribution (`1` default).
- `title`, `hint`: optional learner-facing strings.

Frontmatter tutorial metadata is also parsed into `manifest.tutorial` (for example `lessonId`, `title`, `difficulty`, `estimatedMinutes`, `prerequisites`).

### React hooks

```ts
import { useCellOutput } from "mdx-notebook-core/runtime/react";

function MyComponent({ cellId }: { cellId: string }) {
  const output = useCellOutput(cellId);
  return <pre>{JSON.stringify(output?.result, null, 2)}</pre>;
}
```

## Links

- [Root README](../../README.md)
- [Design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md)
