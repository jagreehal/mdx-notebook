import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { LogEvent } from "mdx-notebook-core";
import { Readable } from "node:stream";

const KILL_GRACE_MS = 1_000;

export interface SpawnOptions {
  /** Either inline `code` (passed via -c) or a `file` to execute. */
  code?: string;
  file?: string;
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface SpawnResult {
  exitCode: number;
  stdout: LogEvent[];
  stderr: LogEvent[];
  timedOut: boolean;
  durationMs: number;
}

export async function spawnBash(opts: SpawnOptions): Promise<SpawnResult> {
  if (!opts.code && !opts.file) throw new Error("spawnBash: code or file required");
  const start = Date.now();
  const args = opts.file ? [opts.file] : ["-c", opts.code as string];
  const child: ChildProcess = spawn("bash", args, {
    cwd: opts.cwd,
    env: opts.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let timedOut = false;
  const killTimer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); }, KILL_GRACE_MS).unref();
  }, opts.timeoutMs);

  const onAbort = () => {
    timedOut = true;
    child.kill("SIGTERM");
  };
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  const [stdout, stderr, exit] = await Promise.all([
    collect(child.stdout!, "stdout"),
    collect(child.stderr!, "stderr"),
    new Promise<number>((resolve) => child.once("close", (code) => resolve(code ?? 1)))
  ]);
  clearTimeout(killTimer);
  opts.signal?.removeEventListener("abort", onAbort);

  return {
    exitCode: timedOut ? 124 : exit,
    stdout,
    stderr,
    timedOut,
    durationMs: Date.now() - start
  };
}

async function collect(stream: Readable, kind: "stdout" | "stderr"): Promise<LogEvent[]> {
  const out: LogEvent[] = [];
  let buffer = "";
  for await (const chunk of stream) {
    buffer += chunk.toString("utf8");
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      out.push({ ts: Date.now(), stream: kind, text: buffer.slice(0, nl) });
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf("\n");
    }
  }
  if (buffer.length > 0) out.push({ ts: Date.now(), stream: kind, text: buffer });
  return out;
}
