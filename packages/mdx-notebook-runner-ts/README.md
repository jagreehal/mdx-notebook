# @mdx-notebook/runner-ts

TypeScript / JavaScript build-time runner for mdx-notebook.

Implements the `Runner` interface from `@mdx-notebook/core`. Spawns `tsx` in a child process per cell, captures stdout/stderr, the optional default-export return value, errors, and enforces timeouts.

See [design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md).

## Usage

```ts
import { registerRunner } from "@mdx-notebook/core";
import { runnerTs } from "@mdx-notebook/runner-ts";

registerRunner(runnerTs);
```

Or self-register via side-effect import:

```ts
import "@mdx-notebook/runner-ts/register";
```
