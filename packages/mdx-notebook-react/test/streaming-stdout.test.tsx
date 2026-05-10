import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { StreamingStdout } from "../src/streaming-stdout.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("StreamingStdout", () => {
  it("with animate=false renders all events immediately", () => {
    const m = mkManifest({ a: { stdout: [
      { ts: 0, stream: "stdout", text: "first" },
      { ts: 10, stream: "stdout", text: "second" }
    ] } });
    const { ui } = withProvider(m, <StreamingStdout cellId="a" animate={false} />);
    const { container } = render(ui);
    expect(container.textContent).toContain("first");
    expect(container.textContent).toContain("second");
  });

  it("with empty events renders nothing", () => {
    const m = mkManifest({ a: { stdout: [] } });
    const { ui } = withProvider(m, <StreamingStdout cellId="a" />);
    const { container } = render(ui);
    expect(container.firstChild).toBeNull();
  });

  it("animates by progressively revealing events using fake timers", () => {
    vi.useFakeTimers();
    const m = mkManifest({ a: { stdout: [
      { ts: 0, stream: "stdout", text: "one" },
      { ts: 100, stream: "stdout", text: "two" },
      { ts: 200, stream: "stdout", text: "three" }
    ] } });
    const { ui } = withProvider(m, <StreamingStdout cellId="a" speed={1} maxDurationMs={300} />);
    const { container } = render(ui);
    // Initial render: zero events
    expect(container.querySelectorAll(".mdx-nb-line").length).toBe(0);
    act(() => { vi.advanceTimersByTime(50); });
    // First event should have fired
    expect(container.querySelectorAll(".mdx-nb-line").length).toBeGreaterThanOrEqual(1);
    act(() => { vi.advanceTimersByTime(500); });
    // All events should be shown
    expect(container.querySelectorAll(".mdx-nb-line").length).toBe(3);
  });

  it("colors stderr lines with the stderr class", () => {
    const m = mkManifest({ a: { stdout: [{ ts: 0, stream: "stderr", text: "boom" }] } });
    const { ui } = withProvider(m, <StreamingStdout cellId="a" animate={false} />);
    const { container } = render(ui);
    expect(container.querySelector(".mdx-nb-line-stderr")).not.toBeNull();
  });
});
