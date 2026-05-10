import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CellOutput, Manifest } from "./types.js";

export function buildManifest(pageId: string, outputs: CellOutput[]): Manifest {
  const cells: Record<string, CellOutput> = {};
  for (const o of outputs) cells[o.cellId] = o;
  return { pageId, cells, builtAt: Date.now() };
}

export function manifestPath(rootDir: string, pageId: string): string {
  return join(rootDir, `${pageId}.json`);
}

export async function writeManifest(rootDir: string, manifest: Manifest): Promise<void> {
  await mkdir(rootDir, { recursive: true });
  await writeFile(manifestPath(rootDir, manifest.pageId), JSON.stringify(manifest, null, 2));
}
