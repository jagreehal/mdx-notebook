import { mkdtemp, writeFile, readFile, unlink, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Cell, CellOutput, RunCtx, Runner } from "@mdx-notebook/core";
import { spawnTsx } from "./spawn.js";
import { mergeEnv } from "./env.js";

const VERSION = "0.0.0";
const SUPPORTED = new Set(["ts", "js"]);

export const runnerTs: Runner = {
  language: "ts",
  version: VERSION,
  canHandle(cell: Cell): boolean {
    if (cell.kind === "ipynb") return false;
    return SUPPORTED.has(cell.lang);
  },
  async run(cell: Cell, ctx: RunCtx): Promise<CellOutput> {
    if (cell.kind === "ipynb") {
      return error(cell.id, "INTERNAL", "runner-ts does not handle ipynb cells");
    }

    const tmpRoot = await mkdtemp(join(tmpdir(), "mdx-nb-"));
    const resultFile = join(tmpRoot, "result.json");
    let inlineFile: string | undefined;
    try {
      const target = cell.kind === "file"
        ? resolveTarget(cell.src, cell.loc.file)
        : (inlineFile = await writeInlineTempfile(tmpRoot, cell.code, cell.lang));
      const cwd = cell.kind === "file" ? dirname(target) : dirname(resolveFromMdx(cell.loc.file));
      const baseEnv = { ...(process.env as Record<string, string>), ...ctx.env };
      const env = await mergeEnv(baseEnv, cell.env, cwd);

      const r = await spawnTsx({
        target,
        cwd,
        env,
        timeoutMs: cell.timeout ?? ctx.timeoutMs,
        resultFile,
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
          error: { name: "TimeoutError", message: `cell timed out after ${cell.timeout ?? ctx.timeoutMs} ms` }
        };
      }

      const envelope = await readEnvelope(resultFile);
      if (!envelope.ok && envelope.error) {
        return {
          cellId: cell.id,
          status: "error",
          durationMs: r.durationMs,
          exitCode: r.exitCode,
          stdout: r.stdout,
          stderr: r.stderr,
          error: envelope.error
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
          error: { name: "NonZeroExit", message: `process exited with code ${r.exitCode}` }
        };
      }
      const out: CellOutput = {
        cellId: cell.id,
        status: "ok",
        durationMs: r.durationMs,
        exitCode: r.exitCode,
        stdout: r.stdout,
        stderr: r.stderr
      };
      if (envelope.hasResult) out.result = envelope.result;
      return out;
    } finally {
      if (inlineFile) await unlink(inlineFile).catch(() => {});
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
};

interface Envelope {
  ok: boolean;
  hasResult: boolean;
  result?: unknown;
  error?: { name: string; message: string; stack?: string };
}

async function readEnvelope(path: string): Promise<Envelope> {
  try {
    const buf = await readFile(path, "utf8");
    return JSON.parse(buf) as Envelope;
  } catch {
    return { ok: false, hasResult: false, error: { name: "InternalError", message: "harness wrote no result" } };
  }
}

function resolveTarget(src: string, mdxFile: string): string {
  if (isAbsolute(src)) return src;
  return resolve(dirname(resolveFromMdx(mdxFile)), src);
}

function resolveFromMdx(mdxFile: string): string {
  return isAbsolute(mdxFile) ? mdxFile : resolve(process.cwd(), mdxFile);
}

async function writeInlineTempfile(dir: string, code: string, lang: string): Promise<string> {
  const ext = lang === "js" ? "mjs" : "ts";
  const hash = createHash("sha256").update(code).digest("hex").slice(0, 8);
  const path = join(dir, `inline-${hash}.${ext}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, code, "utf8");
  return path;
}

function error(cellId: string, name: string, message: string): CellOutput {
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
