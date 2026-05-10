import { extname } from "node:path";

const TRACKED = new Set([".mdx", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".ipynb"]);
const SKIP = ["/node_modules/", "/dist/", "/.astro/", "/.mdx-notebook/"];

interface ViteServer {
  ws: { send: (payload: { type: "full-reload" }) => void };
  moduleGraph: { invalidateAll: () => void };
  watcher: { add: (glob: string) => void };
}

interface HmrCtx {
  file: string;
  server: ViteServer;
}

export function mdxNotebookVitePlugin() {
  return {
    name: "mdx-notebook-astro:hmr",
    configureServer(server: ViteServer) {
      // Ensure Vite watches files that may live outside the default watched root
      // (e.g. scripts/ and notebooks/ in the project dir).
      server.watcher.add("**/*.{ts,mts,cts,tsx,js,jsx,mjs,cjs,mdx,ipynb}");
    },
    handleHotUpdate(ctx: HmrCtx) {
      const { file, server } = ctx;
      if (SKIP.some((s) => file.includes(s))) return;
      const ext = extname(file).toLowerCase();
      if (!TRACKED.has(ext)) return;
      if (ext !== ".mdx") server.moduleGraph.invalidateAll();
      server.ws.send({ type: "full-reload" });
      return [];
    }
  };
}
