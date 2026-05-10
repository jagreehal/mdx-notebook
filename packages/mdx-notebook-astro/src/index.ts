import { isAbsolute, resolve } from "node:path";
import { runPage, type RunPageOptions, type Manifest } from "mdx-notebook-core";
import "mdx-notebook-runner-ts/register";
import { mdxNotebookVitePlugin } from "./vite-plugin.js";

export { mdxNotebookVitePlugin } from "./vite-plugin.js";

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
 * Astro integration entry. Registers a Vite plugin for HMR on .mdx, .ts, and
 * .ipynb file changes, triggering a full page reload in the dev server.
 */
export default function mdxNotebook(_options: MdxNotebookIntegrationOptions = {}): AstroIntegration {
  return {
    name: "mdx-notebook-astro",
    hooks: {
      "astro:config:setup"({ updateConfig }: { updateConfig: (config: { vite: { plugins: unknown[] } }) => void }) {
        updateConfig({ vite: { plugins: [mdxNotebookVitePlugin()] } });
      }
    }
  };
}

// Re-exports for convenience
export type { Manifest, CellOutput, RunPageOptions } from "mdx-notebook-core";
