# mdx-notebook-react

React renderer components for mdx-notebook. Drop them into your MDX pages to display captured cell outputs, render Jupyter notebook cells, show structured agent traces, edit JSON parameters in the browser, and more.

All components read from the page-scoped output store initialized by `NotebookPage`. Wrap your page content in `NotebookPage` once; all other components can appear anywhere in the tree.

## Usage

```mdx
---
# src/pages/tutorial.astro or similar
---
import { NotebookPage, Stdout, ResultJSON, JsonEditor, AgentTrace } from "mdx-notebook-react";

<NotebookPage manifest={manifest} client:load>

  ```ts run id=hello
  export default { message: "built at " + new Date().toISOString() };
  ```

  <Stdout cellId="hello" />
  <ResultJSON cellId="hello" />
  <JsonEditor cellId="hello" />

</NotebookPage>
```

### Tutorial status UI

`TutorialStatus` renders tutorial metadata and check/progress state from the build manifest (`tutorial`, `checkpoints`, `progress`), so learners get immediate completion and prerequisite feedback.

```tsx
import { NotebookPage, TutorialStatus, NotebookCell } from "mdx-notebook-react";

<NotebookPage manifest={manifest}>
  <TutorialStatus manifest={manifest} />
  <NotebookCell cellId="sum" />
</NotebookPage>
```

Field mapping:
- `manifest.tutorial`: lesson metadata (`title`, `difficulty`, `estimatedMinutes`, `prerequisites`).
- `manifest.checkpoints`: pass/fail list per check (`title`/`id`, `message` for failures).
- `manifest.progress`: completion percent, required passed/total, and missing prerequisites.

## Components

| Component | Description |
|---|---|
| `NotebookPage` | Context provider. Hydrates the page-scoped store from the build manifest. Required root wrapper. |
| `Stdout` | Lines written to stdout during cell execution. |
| `Stderr` | Lines written to stderr during cell execution. |
| `ResultJSON` | Cell default-export value as formatted, read-only JSON. |
| `JsonView` | Read-only JSON tree viewer. |
| `JsonEditor` | Editable JSON textarea. Changes update the store; bound components re-render. |
| `AgentTrace` | Structured agent-trace timeline (array of step objects). |
| `IpynbOutputs` | Jupyter notebook saved outputs: text, images, rich media, errors. |
| `CodeBlock` | Syntax-highlighted code block with copy button. |
| `Math` | Inline and block math via KaTeX. |
| `NotebookCell` | Convenience wrapper: code block + all output components for one cell. |
| `TutorialStatus` | Tutorial metadata + checkpoint/progress/prerequisite summary from manifest fields. |

## Links

- [Root README](../../README.md)
- [Design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md)
