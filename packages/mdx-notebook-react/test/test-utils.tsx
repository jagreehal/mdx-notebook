import { OutputProvider, type Manifest, type CellOutput } from "mdx-notebook-core";
import { createOutputStore } from "mdx-notebook-core/runtime";
import { type ReactNode } from "react";

export function mkManifest(cells: Record<string, Partial<CellOutput>>): Manifest {
  const built: Record<string, CellOutput> = {};
  for (const [id, c] of Object.entries(cells)) {
    built[id] = {
      cellId: id,
      status: "ok",
      durationMs: 0,
      exitCode: 0,
      stdout: [],
      stderr: [],
      ...c
    } as CellOutput;
  }
  return { pageId: "p", builtAt: 0, cells: built };
}

export function withProvider(manifest: Manifest, children: ReactNode) {
  const store = createOutputStore(manifest);
  return { store, ui: <OutputProvider store={store}>{children}</OutputProvider> };
}
