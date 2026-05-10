import { isAbsolute, resolve } from "node:path";
import { runPage, type RunPageOptions, type Manifest } from "mdx-notebook-core";
import "mdx-notebook-runner-ts/register";
import { mdxNotebookVitePlugin } from "./vite-plugin.js";
import { calloutsRemarkPlugin } from "./callouts.js";

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
  /** Add :::tip / :::info / :::warn / :::danger / :::success callouts as a remark plugin. Default: false. */
  callouts?: boolean;
  /** Register astro-expressive-code with collapsible-sections + line-numbers. Default: false. */
  codeHighlight?: boolean | CodeHighlightOptions;
}

export interface CodeHighlightOptions {
  /** Tuple of [light, dark] theme names. Default: ["light-plus", "dark-plus"]. */
  themes?: [string, string];
}

export interface AstroIntegration {
  name: string;
  hooks: Record<string, unknown>;
}

/**
 * Astro integration entry. Registers a Vite plugin for HMR on .mdx, .ts, and
 * .ipynb file changes, triggering a full page reload in the dev server.
 *
 * Optional features:
 *   callouts: true       - enables :::tip / :::info / :::warn / :::danger / :::success
 *   codeHighlight: true  - registers astro-expressive-code (shiki) with collapsible sections + line numbers
 */
export default function mdxNotebook(options: MdxNotebookIntegrationOptions = {}): AstroIntegration {
  return {
    name: "mdx-notebook-astro",
    hooks: {
      async "astro:config:setup"(ctx: {
        updateConfig: (config: Record<string, unknown>) => void;
        addIntegration?: (integration: unknown) => void;
        config: Record<string, unknown>;
      }) {
        ctx.updateConfig({ vite: { plugins: [mdxNotebookVitePlugin()] } });

        if (options.callouts) {
          const { default: remarkDirective } = await import("remark-directive");
          ctx.updateConfig({
            markdown: {
              remarkPlugins: [remarkDirective, calloutsRemarkPlugin]
            }
          });
        }

        if (options.codeHighlight && ctx.addIntegration) {
          const themes: [string, string] =
            typeof options.codeHighlight === "object" && options.codeHighlight.themes
              ? options.codeHighlight.themes
              : ["light-plus", "dark-plus"];
          try {
            const [{ default: expressiveCode }, { pluginCollapsibleSections }, { pluginLineNumbers }] = await Promise.all([
              import("astro-expressive-code"),
              import("@expressive-code/plugin-collapsible-sections"),
              import("@expressive-code/plugin-line-numbers")
            ]);
            ctx.addIntegration((expressiveCode as (config: unknown) => unknown)({
              themes,
              plugins: [pluginCollapsibleSections(), pluginLineNumbers()]
            }));
          } catch (err) {
            // If user enabled codeHighlight but didn't install astro-expressive-code,
            // surface a clear error instead of crashing silently.
            const msg = (err as Error).message;
            throw new Error(
              `mdx-notebook-astro: codeHighlight is enabled but its dependencies are not installed. ` +
              `Please install astro-expressive-code, @expressive-code/plugin-collapsible-sections, and @expressive-code/plugin-line-numbers. ` +
              `Original error: ${msg}`
            );
          }
        }
      }
    }
  };
}

export { mdxNotebookVitePlugin } from "./vite-plugin.js";
export { calloutsRemarkPlugin } from "./callouts.js";
export type { Manifest, CellOutput, RunPageOptions } from "mdx-notebook-core";
