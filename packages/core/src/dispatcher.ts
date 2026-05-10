import { dirname, isAbsolute, resolve } from "node:path";
import { getRunner } from "./runner-registry.js";
import { parseIpynb, extractIpynbCells } from "./ipynb-parser.js";
import type { Cell, CellOutput } from "./types.js";

export interface DispatchCtx {
  cwd: string;
  env: Record<string, string>;
  defaultTimeoutMs: number;
  signal?: AbortSignal;
}

export type ReadFile = (absPath: string) => string;

export async function dispatchCell(
  cell: Cell,
  ctx: DispatchCtx,
  readFile: ReadFile
): Promise<CellOutput> {
  if (cell.kind === "ipynb") {
    const abs = isAbsolute(cell.src) ? cell.src : resolve(dirname(cell.loc.file), cell.src);
    try {
      const buf = readFile(abs);
      const nb = parseIpynb(buf);
      const cells = extractIpynbCells(nb, [cell.cellIndex]);
      const found = cells[0];
      const ipynbOutputs = found?.outputs ?? [];
      return {
        cellId: cell.id,
        status: "ok",
        durationMs: 0,
        exitCode: 0,
        stdout: [],
        stderr: [],
        ipynbOutputs
      };
    } catch (e) {
      return {
        cellId: cell.id,
        status: "error",
        durationMs: 0,
        exitCode: 1,
        stdout: [],
        stderr: [],
        error: { name: "IpynbError", message: String((e as Error).message ?? e) }
      };
    }
  }

  const runner = getRunner(cell.lang, cell);
  if (!runner) {
    return {
      cellId: cell.id,
      status: "error",
      durationMs: 0,
      exitCode: 1,
      stdout: [],
      stderr: [],
      error: { name: "UnknownLang", message: `no runner registered for language "${cell.lang}"` }
    };
  }

  const ac = new AbortController();
  if (ctx.signal) ctx.signal.addEventListener("abort", () => ac.abort(), { once: true });

  return runner.run(cell, {
    signal: ac.signal,
    cwd: ctx.cwd,
    env: ctx.env,
    timeoutMs: cell.timeout ?? ctx.defaultTimeoutMs
  });
}
