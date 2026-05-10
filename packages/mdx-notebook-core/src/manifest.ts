import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CellOutput, CheckpointResult, Manifest, TutorialMeta, TutorialProgress } from "./types.js";

export interface BuildManifestExtras {
  tutorial?: TutorialMeta;
  checkpoints?: CheckpointResult[];
  progress?: TutorialProgress;
}

export function buildManifest(pageId: string, outputs: CellOutput[], extras: BuildManifestExtras = {}): Manifest {
  const cells: Record<string, CellOutput> = {};
  for (const o of outputs) cells[o.cellId] = o;
  return {
    pageId,
    cells,
    builtAt: Date.now(),
    ...(extras.tutorial !== undefined ? { tutorial: extras.tutorial } : {}),
    ...(extras.checkpoints !== undefined ? { checkpoints: extras.checkpoints } : {}),
    ...(extras.progress !== undefined ? { progress: extras.progress } : {})
  };
}

export function manifestPath(rootDir: string, pageId: string): string {
  return join(rootDir, `${pageId}.json`);
}

export async function writeManifest(rootDir: string, manifest: Manifest): Promise<void> {
  await mkdir(rootDir, { recursive: true });
  await writeFile(manifestPath(rootDir, manifest.pageId), JSON.stringify(manifest, null, 2));
}
