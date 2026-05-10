# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `mdx-notebook-core`: MDX/.ipynb cell discovery (annotated fences, `:::run`, `:::ipynb`), pluggable `Runner` interface, content-hash cache, page-scoped runtime store, React `useCellOutput`/`useOutputStore` hooks, `runPage` orchestrator.
- `mdx-notebook-runner-ts`: TypeScript/JavaScript runner via `tsx` in a child process. Captures stdout/stderr line events, default-export return value, errors, and timeouts. Default-export contract.
- `mdx-notebook-react`: `NotebookPage`, `Stdout`, `Stderr`, `ResultJSON`, `JsonView`, `JsonEditor`, `AgentTrace`, `IpynbOutputs`, `CodeBlock`, `Math` (KaTeX), `NotebookCell`.
- `mdx-notebook-astro`: Astro integration with `runNotebook` helper and Vite plugin for full-reload HMR on `.mdx` / `.ts` / `.ipynb` changes.
- `create-mdx-notebook`: `npm create mdx-notebook <dir>` scaffolder. `--linked` flag preserves workspace deps for monorepo development; `--no-git` skips git init.
- `examples/starter`: Astro app demonstrating all three cell forms, `JsonEditor` live mutation, `AgentTrace`, `Math`, `NotebookCell`.
- `executable-stories-vitest` + `executable-stories-playwright` reporters; tests narrate as given/when/then and emit markdown evidence to `docs/evidence/`.
- ~165 unit tests + 2 Playwright e2e stories + 1 Vitest story.

[Unreleased]: https://github.com/jagreehal/mdx-notebook/compare/HEAD...HEAD
