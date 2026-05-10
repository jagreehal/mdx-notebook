import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { LogEvent } from "mdx-notebook-core";
import { collectLines } from "./capture.js";
import { locateHarness } from "./harness/locate.js";

export interface SpawnOptions {
  target: string;                          // absolute path to user file
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  resultFile?: string;                     // if set, harness used; else target run directly
  signal?: AbortSignal;
}

export interface SpawnResult {
  exitCode: number;
  signal: NodeJS.Signals | null;
  stdout: LogEvent[];
  stderr: LogEvent[];
  timedOut: boolean;
  durationMs: number;
}

const TSX_BIN = "tsx";
const KILL_GRACE_MS = 1_000;

export async function spawnTsx(opts: SpawnOptions): Promise<SpawnResult> {
  const start = Date.now();
  const useHarness = opts.resultFile !== undefined;
  const args = useHarness ? [locateHarness()] : [opts.target];
  const env = useHarness
    ? { ...opts.env, MDX_NB_TARGET: opts.target, MDX_NB_RESULT: opts.resultFile! }
    : opts.env;

  const child: ChildProcess = spawn(TSX_BIN, args, {
    cwd: opts.cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let timedOut = false;
  const killTimer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
    }, KILL_GRACE_MS).unref();
  }, opts.timeoutMs);

  const onAbort = () => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
    }, KILL_GRACE_MS).unref();
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  const stdoutP = collectLines(child.stdout!, "stdout");
  const stderrP = collectLines(child.stderr!, "stderr");

  const [stdout, stderr, exit] = await Promise.all([
    stdoutP,
    stderrP,
    new Promise<{ code: number; signal: NodeJS.Signals | null }>((resolve) => {
      child.once("close", (code, signal) => resolve({ code: code ?? 1, signal }));
    })
  ]);
  clearTimeout(killTimer);
  opts.signal?.removeEventListener("abort", onAbort);

  return {
    exitCode: timedOut ? 124 : exit.code,
    signal: exit.signal,
    stdout,
    stderr,
    timedOut,
    durationMs: Date.now() - start
  };
}
