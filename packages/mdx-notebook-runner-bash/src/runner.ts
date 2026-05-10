import { dirname, isAbsolute, resolve, extname } from "node:path";
import type { Cell, CellOutput, RunCtx, Runner } from "mdx-notebook-core";
import { spawnBash } from "./spawn.js";

const VERSION = "0.0.0";
const SUPPORTED_LANGS = new Set(["bash", "sh"]);
const SUPPORTED_EXTS = new Set([".sh", ".bash"]);

export const runnerBash: Runner = {
  language: "bash",
  version: VERSION,
  canHandle(cell: Cell): boolean {
    if (cell.kind === "ipynb") return false;
    if (cell.kind === "inline") return SUPPORTED_LANGS.has(cell.lang);
    if (cell.kind === "file") return SUPPORTED_EXTS.has(extname(cell.src).toLowerCase());
    return false;
  },
  async run(cell: Cell, ctx: RunCtx): Promise<CellOutput> {
    if (cell.kind === "ipynb") {
      return errorOutput(cell.id, "InternalError", "runner-bash does not handle ipynb cells");
    }
    const cwd = cell.kind === "file"
      ? dirname(resolveFromMdx(cell.src, cell.loc.file))
      : dirname(resolveFromMdx(cell.loc.file, cell.loc.file));
    const file = cell.kind === "file" ? resolveFromMdx(cell.src, cell.loc.file) : undefined;
    const code = cell.kind === "inline" ? cell.code : undefined;

    const r = await spawnBash({
      ...(code !== undefined ? { code } : {}),
      ...(file !== undefined ? { file } : {}),
      cwd,
      env: ctx.env,
      timeoutMs: cell.timeout ?? ctx.timeoutMs,
      signal: ctx.signal
    });

    if (r.timedOut) {
      return {
        cellId: cell.id,
        status: "timeout",
        durationMs: r.durationMs,
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr,
        error: { name: "TimeoutError", message: `bash cell timed out after ${cell.timeout ?? ctx.timeoutMs} ms` }
      };
    }
    if (r.exitCode !== 0) {
      return {
        cellId: cell.id,
        status: "error",
        durationMs: r.durationMs,
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr,
        error: { name: "NonZeroExit", message: `bash exited with code ${r.exitCode}` }
      };
    }
    return {
      cellId: cell.id,
      status: "ok",
      durationMs: r.durationMs,
      exitCode: r.exitCode,
      stdout: r.stdout,
      stderr: r.stderr
    };
  }
};

function resolveFromMdx(src: string, mdxFile: string): string {
  if (isAbsolute(src)) return src;
  const baseDir = isAbsolute(mdxFile) ? dirname(mdxFile) : resolve(process.cwd(), dirname(mdxFile));
  return resolve(baseDir, src);
}

function errorOutput(cellId: string, name: string, message: string): CellOutput {
  return {
    cellId,
    status: "error",
    durationMs: 0,
    exitCode: 1,
    stdout: [],
    stderr: [],
    error: { name, message }
  };
}
