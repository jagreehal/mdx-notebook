import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AgentTrace } from "../src/agent-trace.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

describe("AgentTrace", () => {
  it("groups stdout by --- Step N --- markers", () => {
    const m = mkManifest({ a: {
      stdout: [
        { ts: 1, stream: "stdout", text: "before" },
        { ts: 2, stream: "stdout", text: "--- Step 1 ---" },
        { ts: 3, stream: "stdout", text: "step1 content" },
        { ts: 4, stream: "stdout", text: "--- Step 2 ---" },
        { ts: 5, stream: "stdout", text: "step2 content" }
      ]
    } });
    const { ui } = withProvider(m, <AgentTrace cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("Step 1");
    expect(container.textContent).toContain("step1 content");
    expect(container.textContent).toContain("Step 2");
    expect(container.textContent).toContain("step2 content");
  });

  it("falls back to a single 'Output' group with no markers", () => {
    const m = mkManifest({ a: {
      stdout: [{ ts: 1, stream: "stdout", text: "hello" }, { ts: 2, stream: "stdout", text: "world" }]
    } });
    const { ui } = withProvider(m, <AgentTrace cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("Output");
    expect(container.textContent).toContain("hello");
  });

  it("renders Final result when present", () => {
    const m = mkManifest({ a: { stdout: [], result: { steps: 3 } } });
    const { ui } = withProvider(m, <AgentTrace cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("Final result");
    expect(container.textContent).toContain('"steps": 3');
  });

  it("renders error block when status is error", () => {
    const m = mkManifest({ a: { status: "error", error: { name: "X", message: "boom" } } });
    const { ui } = withProvider(m, <AgentTrace cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("boom");
  });
});
