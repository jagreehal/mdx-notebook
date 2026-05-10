# create-mdx-notebook

Scaffolder for new mdx-notebook tutorial sites. Running `npm create mdx-notebook` copies the starter template, optionally installs dependencies, and optionally initialises a git repository — giving you a working Astro + mdx-notebook project in under a minute.

## Usage

```bash
npm create mdx-notebook my-tutorial
# or
pnpm create mdx-notebook my-tutorial
# or
bunx create-mdx-notebook my-tutorial
```

After scaffolding:

```bash
cd my-tutorial
pnpm install
pnpm dev
```

## Options

| Flag | Description |
|---|---|
| `--linked` | Keep `workspace:*` dependency versions. Use this when developing inside the mdx-notebook monorepo itself. |
| `--no-git` | Skip `git init` after copying the template. |

## Links

- [Root README](../../README.md)
- [Design spec](../../docs/superpowers/specs/2026-05-10-mdx-notebook-core-runner-ts-design.md)
