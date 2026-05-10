import { isAbsolute, resolve } from "node:path";
import { runPage, type RunPageOptions, type Manifest } from "mdx-notebook-core";
import "mdx-notebook-runner-ts/register";

export interface RunNotebookOptions extends Omit<RunPageOptions, "rootDir"> {
  rootDir?: string;
}

/**
 * Run an MDX page through mdx-notebook and return its manifest.
 * Defaults: rootDir = process.cwd(), useCache = true, defaultTimeoutMs = 30_000.
 */
export async function runNotebook(mdxPath: string, options: RunNotebookOptions = {}): Promise<Manifest> {
  const rootDir = options.rootDir ?? process.cwd();
  const absMdx = isAbsolute(mdxPath) ? mdxPath : resolve(rootDir, mdxPath);
  return runPage(absMdx, { rootDir, ...options });
}

export interface MdxNotebookIntegrationOptions {
  /**
   * Future: paths to scan for MDX. Currently unused.
   */
  paths?: string[];
}

export interface AstroIntegration {
  name: string;
  hooks: Record<string, unknown>;
}

/**
 * Astro integration entry. Currently a no-op for hooks; existence triggers the
 * runner-ts side-effect import via the package import graph. Future versions
 * will register a Vite plugin for virtual modules and HMR.
 */
export default function mdxNotebook(_options: MdxNotebookIntegrationOptions = {}): AstroIntegration {
  return {
    name: "mdx-notebook-astro",
    hooks: {}
  };
}

// Re-exports for convenience
export type { Manifest, CellOutput, RunPageOptions } from "mdx-notebook-core";
