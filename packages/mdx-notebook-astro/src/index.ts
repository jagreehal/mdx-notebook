import { isAbsolute, resolve } from "node:path";
import { spawn } from "node:child_process";
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
  /**
   * Shell commands to run BEFORE the Astro build (astro:build:start). Commands run sequentially.
   * Any non-zero exit aborts the build with a clear error message.
   * Each command runs via `bash -lc`, so shell syntax works.
   */
  before?: string[];
  /**
   * Shell commands to run AFTER the Astro build (astro:build:done), regardless of build success.
   * Useful for `docker compose down`. Non-zero exit logs a warning but does NOT change the build result.
   */
  after?: string[];
  /**
   * Names of environment variables your tutorials depend on. They're surfaced into the browser
   * as `window.MDX_NB_ENV_STATUS = { VAR: true/false }` so `<EnvBadge>` can show set/unset state.
   * The VALUES are never exposed — only the boolean presence flag.
   */
  env?: string[];
}

export interface CodeHighlightOptions {
  /** Tuple of [light, dark] theme names. Default: ["light-plus", "dark-plus"]. */
  themes?: [string, string];
}

export interface AstroIntegration {
  name: string;
  hooks: Record<string, unknown>;
}

async function runHookCommand(cmd: string, phase: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["-lc", cmd], { stdio: "inherit" });
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mdx-notebook-astro ${phase}-hook "${cmd}" exited with code ${code}`));
    });
    child.once("error", reject);
  });
}

/**
 * Astro integration entry. Registers a Vite plugin for HMR on .mdx, .ts, and
 * .ipynb file changes, triggering a full page reload in the dev server.
 *
 * Optional features:
 *   callouts: true       - enables :::tip / :::info / :::warn / :::danger / :::success
 *   codeHighlight: true  - registers astro-expressive-code (shiki) with collapsible sections + line numbers
 *   before: [...]        - shell commands to run before the Astro build
 *   after: [...]         - shell commands to run after the Astro build (teardown)
 *   env: [...]           - env var names surfaced as window.MDX_NB_ENV_STATUS booleans
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

        if (options.env && options.env.length > 0) {
          const status: Record<string, boolean> = {};
          for (const name of options.env) {
            status[name] = process.env[name] !== undefined && process.env[name] !== "";
          }
          ctx.updateConfig({
            vite: {
              plugins: [{
                name: "mdx-notebook-env-status",
                resolveId(id: string) { return id === "virtual:mdx-notebook/env-status" ? id : null; },
                load(id: string) {
                  if (id === "virtual:mdx-notebook/env-status") {
                    return `export const envStatus = ${JSON.stringify(status)};\nif (typeof window !== "undefined") window.MDX_NB_ENV_STATUS = envStatus;`;
                  }
                  return null;
                }
              }]
            }
          });
        }
      },

      async "astro:build:start"() {
        if (!options.before || options.before.length === 0) return;
        for (const cmd of options.before) {
          await runHookCommand(cmd, "before");
        }
      },

      async "astro:build:done"() {
        if (!options.after || options.after.length === 0) return;
        for (const cmd of options.after) {
          try {
            await runHookCommand(cmd, "after");
          } catch (err) {
            // After-hooks don't fail the build; log a warning instead.
            console.warn(`[mdx-notebook-astro] after-hook "${cmd}" failed:`, (err as Error).message);
          }
        }
      }
    }
  };
}

/**
 * Returns the env-status map injected by the `env` integration option at build time.
 * Only works inside .astro frontmatter when the mdx-notebook-astro integration is active.
 * Returns undefined when the virtual module is not available (e.g. outside an Astro build).
 */
export async function getEnvStatus(): Promise<Record<string, boolean> | undefined> {
  try {
    const mod = await import("virtual:mdx-notebook/env-status" as string);
    return (mod as { envStatus?: Record<string, boolean> }).envStatus;
  } catch {
    return undefined;
  }
}

export { mdxNotebookVitePlugin } from "./vite-plugin.js";
export { calloutsRemarkPlugin } from "./callouts.js";
export type { Manifest, CellOutput, RunPageOptions } from "mdx-notebook-core";
