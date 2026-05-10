# mdx-notebook-runner-ts

TypeScript and JavaScript build-time runner for mdx-notebook.

Implements the `Runner` interface from `mdx-notebook-core`. For each cell, it spawns `tsx` in a child process, captures stdout and stderr line by line, reads the default-export return value as structured JSON, and enforces a configurable timeout. The result is a typed `CellOutput` returned to `runPage`.

## Usage

Register manually alongside other runners:

```ts
import { registerRunner } from "mdx-notebook-core";
import { runnerTs } from "mdx-notebook-runner-ts";

registerRunner(runnerTs);
```

Or self-register via side-effect import (the Astro integration does this automatically):

```ts
import "mdx-notebook-runner-ts/register";
```

## Default-export contract

A cell that wants to produce a structured result exports it as the default:

```ts
// my-cell.ts
console.log("computing...");

export default { answer: 42, labels: ["a", "b"] };
```

The runner captures `console.log` as stdout lines and serializes the default export as `result` in `CellOutput`. Both are available to React components via `Stdout` and `ResultJSON`.

## Links

- [Root README](../../README.md)
- [Design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md)
