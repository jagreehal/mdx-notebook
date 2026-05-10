// packages/runner-ts/test/capture.test.ts
import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import { collectLines, MAX_BYTES_PER_STREAM } from "../src/capture.js";

function streamFrom(parts: string[]): Readable {
  return Readable.from((async function* () {
    for (const p of parts) yield Buffer.from(p);
  })());
}

describe("collectLines", () => {
  it("emits one event per line", async () => {
    const events = await collectLines(streamFrom(["a\nb\nc\n"]), "stdout");
    expect(events.map((e) => e.text)).toEqual(["a", "b", "c"]);
    expect(events.every((e) => e.stream === "stdout")).toBe(true);
    expect(events.every((e) => typeof e.ts === "number")).toBe(true);
  });

  it("handles split chunks across newlines", async () => {
    const events = await collectLines(streamFrom(["he", "llo\nwor", "ld\n"]), "stdout");
    expect(events.map((e) => e.text)).toEqual(["hello", "world"]);
  });

  it("emits trailing line without newline", async () => {
    const events = await collectLines(streamFrom(["a\nb"]), "stdout");
    expect(events.map((e) => e.text)).toEqual(["a", "b"]);
  });

  it("truncates after MAX_BYTES_PER_STREAM", async () => {
    const big = "x".repeat(MAX_BYTES_PER_STREAM + 100) + "\n";
    const events = await collectLines(streamFrom([big]), "stdout");
    expect(events.at(-1)!.text).toContain("[truncated]");
    const total = events.reduce((n, e) => n + e.text.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_BYTES_PER_STREAM + 200);
  });
});
