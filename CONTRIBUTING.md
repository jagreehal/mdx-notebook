# Contributing to mdx-notebook

## Development

```bash
pnpm install
pnpm build
pnpm test         # unit tests across all packages
pnpm test:stories # vitest story tests
pnpm test:e2e     # playwright stories (boots starter dev server)
```

The starter app at `examples/starter` is the dogfooding ground for the integration; if you change `mdx-notebook-react` or `mdx-notebook-astro`, run the starter and the e2e tests.

## Conventions

- Single-responsibility files. If a file you're modifying has grown unwieldy, factoring is welcome.
- TDD where it adds clarity: failing test → minimal impl → verify pass → commit.
- `BuildError` messages include a code prefix (e.g. `MISSING_ID:`) so `toThrow(/CODE/)` regex tests match.
- Tests in `tests/` use the executable-stories format (`*.story.test.ts` for Vitest, `*.story.spec.ts` for Playwright).

## Adding a new runner

`mdx-notebook-core` exports a `Runner` interface. Implementing a new language (e.g. Python, Go, Rust) means:

1. Create a new package `packages/mdx-notebook-runner-<lang>` that implements `Runner`.
2. Self-register on import: `import { registerRunner } from "mdx-notebook-core"; registerRunner(...)`.
3. Provide a `register` side-effect entry point (mirror `mdx-notebook-runner-ts/register`).
4. Add an integration smoke test invoking it through `runPage`.

The runner just needs to spawn or invoke the language with the cell's source / file, capture the standardized `CellOutput` shape, and return it.
