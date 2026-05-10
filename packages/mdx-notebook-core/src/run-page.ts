import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkDirective from "remark-directive";
import { remarkMdxNotebook, type CellsCollected } from "./remark-plugin.js";
import { dispatchCell } from "./dispatcher.js";
import { computePageId } from "./page-id.js";
import { computeCacheKey, readCache, writeCache } from "./cache.js";
import { buildManifest, writeManifest } from "./manifest.js";
import { topologicalRun, hashDepsResults } from "./scheduler.js";
import { computeProgress, evaluateCheckpoints, parseTutorialMetaFromSource } from "./curriculum.js";
import type { Cell, Manifest } from "./types.js";
import { BuildError } from "./errors.js";

export interface RunPageOptions {
  rootDir: string;           // where .mdx-notebook/ lives (project root)
  useCache?: boolean;        // default true
  strict?: boolean;          // default false
  defaultTimeoutMs?: number; // default 30_000
  concurrency?: number;      // default os.cpus().length
  completedLessons?: string[]; // optional completed lesson ids for prereq progress
}

export async function runPage(mdxPath: string, opts: RunPageOptions): Promise<Manifest> {
  const absMdx = isAbsolute(mdxPath) ? mdxPath : resolve(process.cwd(), mdxPath);
  const projectRoot = opts.rootDir;
  const mdxRel = relative(projectRoot, absMdx) || absMdx;
  const pageId = computePageId(mdxRel);

  const source = await readFile(absMdx, "utf8");
  const collected: CellsCollected = { cells: [], checkpoints: [] };
  const tutorial = parseTutorialMetaFromSource(source);
  const proc = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkDirective)
    .use(remarkMdxNotebook, { file: absMdx, collect: collected });
  const tree = proc.parse(source);
  proc.runSync(tree, { path: absMdx });

  const useCache = opts.useCache !== false;
  const defaultTimeoutMs = opts.defaultTimeoutMs ?? 30_000;
  const cacheRoot = resolve(projectRoot, ".mdx-notebook");

  const lockfileContent = readLockfileContent(projectRoot);
  const nodeVersion = process.versions.node;

  const outputs = await topologicalRun(collected.cells, async (cell, depsResults, extraEnv) => {
    const depsHash = hashDepsResults(depsResults);
    const cacheKey = await maybeCacheKey(cell, absMdx, lockfileContent, nodeVersion, depsHash, extraEnv);
    const cacheEnabled = cell.kind === "ipynb" ? false : cell.cache !== false;
    if (useCache && cacheEnabled && cacheKey) {
      const hit = await readCache(cacheRoot, cacheKey);
      if (hit) return hit;
    }

    // Build MDX_NB_DEPS env var when deps are present
    const depsEnv: Record<string, string> =
      Object.keys(depsResults).length > 0
        ? { MDX_NB_DEPS: JSON.stringify(depsResults) }
        : {};

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...depsEnv,
      ...(extraEnv ?? {})
    };

    const out = await dispatchCell(cell, {
      cwd: dirname(absMdx),
      env,
      defaultTimeoutMs
    }, (p) => readFileSync(p, "utf8"));
    if (cacheKey && cacheEnabled) {
      await writeCache(cacheRoot, cacheKey, out);
    }
    if (opts.strict && out.status !== "ok") {
      throw new BuildError({
        code: "STRICT_CELL_FAILURE",
        message: `cell "${cell.id}" failed: ${out.error?.message ?? out.status}`,
        loc: cell.loc,
        cause: out.error
      });
    }
    return out;
  });

  const byId: Record<string, (typeof outputs)[number]> = {};
  for (const out of outputs) byId[out.cellId] = out;
  const checkpointResults = evaluateCheckpoints(byId, collected.checkpoints);
  const progress = computeProgress(checkpointResults, tutorial, opts.completedLessons);
  const manifest = buildManifest(pageId, outputs, {
    ...(tutorial !== undefined ? { tutorial } : {}),
    checkpoints: checkpointResults,
    progress
  });
  await writeManifest(cacheRoot, manifest);
  return manifest;
}

async function maybeCacheKey(
  cell: Cell,
  mdxAbs: string,
  lockfileContent: string,
  nodeVersion: string,
  depsHash: string,
  extraEnv?: Record<string, string>
): Promise<string | undefined> {
  if (cell.kind === "ipynb") return undefined; // ipynb is parse-only, cheap to redo
  let sourceBytes = "";
  if (cell.kind === "inline") {
    sourceBytes = cell.code;
  } else {
    const abs = isAbsolute(cell.src) ? cell.src : resolve(dirname(mdxAbs), cell.src);
    try { sourceBytes = await readFile(abs, "utf8"); } catch { return undefined; }
  }
  let envBytes = "";
  if (cell.env) {
    const abs = isAbsolute(cell.env) ? cell.env : resolve(dirname(mdxAbs), cell.env);
    try { envBytes = await readFile(abs, "utf8"); } catch { /* env optional */ }
  }
  // Include extraEnv (matrix variant env) in the cache key so variants don't share cache
  const extraEnvBytes = extraEnv && Object.keys(extraEnv).length > 0
    ? JSON.stringify(Object.fromEntries(Object.entries(extraEnv).sort()))
    : "";
  return computeCacheKey({
    sourceBytes,
    runner: cell.lang,
    runnerVersion: "0.0.0",
    nodeVersion,
    lockfile: lockfileContent,
    env: envBytes + extraEnvBytes,
    depsHash
  });
}

function readLockfileContent(root: string): string {
  const candidates = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock"];
  for (const c of candidates) {
    const p = resolve(root, c);
    if (existsSync(p)) {
      return readFileSync(p, "utf8");
    }
  }
  return "";
}
