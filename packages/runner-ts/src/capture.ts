import { Readable } from "node:stream";
import type { LogEvent } from "@mdx-notebook/core";

export const MAX_BYTES_PER_STREAM = 1024 * 1024; // 1 MiB

export async function collectLines(
  stream: Readable,
  kind: "stdout" | "stderr"
): Promise<LogEvent[]> {
  const out: LogEvent[] = [];
  let bytes = 0;
  let truncated = false;
  let buffer = "";
  for await (const chunk of stream) {
    if (truncated) continue;
    const text = chunk.toString("utf8");
    bytes += text.length;
    if (bytes > MAX_BYTES_PER_STREAM) {
      const allowed = MAX_BYTES_PER_STREAM - (bytes - text.length);
      buffer += text.slice(0, Math.max(0, allowed));
      flushLines(buffer, kind, out, /* finalFlush */ true);
      buffer = "";
      out.push({ ts: Date.now(), stream: kind, text: "[truncated]" });
      truncated = true;
      continue;
    }
    buffer += text;
    buffer = flushLines(buffer, kind, out, false);
  }
  if (!truncated && buffer.length > 0) {
    out.push({ ts: Date.now(), stream: kind, text: buffer });
  }
  return out;
}

function flushLines(
  buffer: string,
  kind: "stdout" | "stderr",
  out: LogEvent[],
  finalFlush: boolean
): string {
  let rest = buffer;
  let nl = rest.indexOf("\n");
  while (nl >= 0) {
    out.push({ ts: Date.now(), stream: kind, text: rest.slice(0, nl) });
    rest = rest.slice(nl + 1);
    nl = rest.indexOf("\n");
  }
  if (finalFlush && rest.length > 0) {
    out.push({ ts: Date.now(), stream: kind, text: rest });
    return "";
  }
  return rest;
}
