import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ToolCallTimeline } from "../src/tool-call-timeline.js";

afterEach(cleanup);

describe("ToolCallTimeline", () => {
  it("renders ✓ for ok, ✗ for error, ⏳ for pending", () => {
    const calls = [
      { name: "tool-a", status: "ok" as const },
      { name: "tool-b", status: "error" as const },
      { name: "tool-c", status: "pending" as const },
    ];
    const { container } = render(<ToolCallTimeline calls={calls} />);
    expect(container.textContent).toContain("✓");
    expect(container.textContent).toContain("✗");
    expect(container.textContent).toContain("⏳");
    expect(container.querySelector(".mdx-nb-timeline-ok")).not.toBeNull();
    expect(container.querySelector(".mdx-nb-timeline-error")).not.toBeNull();
    expect(container.querySelector(".mdx-nb-timeline-pending")).not.toBeNull();
  });

  it("shows error message text when present", () => {
    const calls = [
      { name: "failing-tool", status: "error" as const, error: "Connection refused" },
    ];
    const { container } = render(<ToolCallTimeline calls={calls} />);
    expect(container.textContent).toContain("Connection refused");
    expect(container.querySelector(".mdx-nb-tool-error")).not.toBeNull();
  });

  it("renders input/output JSON in details", () => {
    const calls = [
      {
        name: "my-tool",
        status: "ok" as const,
        input: { key: "value" },
        output: { result: 42 },
        durationMs: 55,
      },
    ];
    const { container } = render(<ToolCallTimeline calls={calls} />);
    expect(container.textContent).toContain("my-tool");
    expect(container.textContent).toContain("55ms");
    expect(container.textContent).toContain('"key"');
    expect(container.textContent).toContain('"value"');
    expect(container.textContent).toContain('"result"');
    expect(container.textContent).toContain("42");
  });
});
