import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CellOutput } from "./types.js";

export interface CacheKeyInputs {
  sourceBytes: string;        // for inline: code; for file: file content
  runner: string;             // language id
  runnerVersion: string;
  nodeVersion: string;
  lockfile: string;           // lockfile content hash or empty
  env: string;                // env file content if used, else empty
  depsHash: string;           // SHA-256 of JSON-stringified dep results; empty string when no deps
}

export function computeCacheKey(inputs: CacheKeyInputs): string {
  const h = createHash("sha256");
  const parts: Array<keyof CacheKeyInputs> = [
    "sourceBytes", "runner", "runnerVersion", "nodeVersion", "lockfile", "env", "depsHash"
  ];
  for (const k of parts) {
    h.update(`${k} ${inputs[k]}`);
  }
  return h.digest("hex");
}

export async function writeCache(rootDir: string, key: string, output: CellOutput): Promise<void> {
  const cacheDir = join(rootDir, ".cache");
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, `${key}.json`), JSON.stringify(output));
}

export async function readCache(rootDir: string, key: string): Promise<CellOutput | undefined> {
  const path = join(rootDir, ".cache", `${key}.json`);
  let buf: string;
  try {
    buf = await readFile(path, "utf8");
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(buf) as CellOutput;
  } catch {
    // Treat malformed cache as a miss (warning at orchestrator layer)
    return undefined;
  }
}
