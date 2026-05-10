import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import mdxNotebook from "mdx-notebook-astro";
import expressiveCode from "astro-expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [
    // expressiveCode must come before mdx() so MDX pages can use code highlighting
    expressiveCode({
      themes: ["light-plus", "dark-plus"],
      plugins: [pluginCollapsibleSections(), pluginLineNumbers()]
    }),
    mdx(),
    react(),
    mdxNotebook({ callouts: true })
  ],
  vite: {
    server: { fs: { allow: ["..", "../../node_modules/.pnpm"] } },
    resolve: {
      // Deduplicate react to ensure only one React instance across workspace packages.
      dedupe: ["react", "react-dom"],
    },
    ssr: {
      // Keep these as CJS/ESM externals so import.meta.url resolves correctly
      // in the runner's harness locator (locateHarness uses import.meta.url)
      noExternal: [],
      external: [
        "mdx-notebook-runner-ts",
        "mdx-notebook-astro",
        "mdx-notebook-core",
      ]
    },
    build: {
      rollupOptions: {
        external: [
          "node:path",
          "node:fs",
          "node:fs/promises",
          "node:crypto",
          "node:os",
          "node:process",
          "node:url",
          "node:child_process",
        ]
      }
    }
  }
});
