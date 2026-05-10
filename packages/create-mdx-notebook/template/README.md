# mdx-notebook starter

Astro template demonstrating mdx-notebook end-to-end.

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:4321.

## Author tutorials

- Edit `src/content/tutorial.mdx`.
- Inline cells: ` ```ts run id=foo``` ` blocks.
- File reference: `:::run{src="../scripts/foo.ts" id="bar"}:::`
- Jupyter import: `:::ipynb{src="../notebooks/foo.ipynb" id="nb"}:::`

Each cell's id is the binding key for components like `<Stdout cellId="foo" />`, `<AgentTrace cellId="bar" />`, `<JsonEditor cellId="bar" />`.

## Build

```bash
pnpm build
```
