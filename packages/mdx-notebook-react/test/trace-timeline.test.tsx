import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { TraceTimeline, type TraceSpan } from "../src/trace-timeline.js";

afterEach(cleanup);

const spans: TraceSpan[] = [
  { id: "root", name: "root-span", startNs: 0, durationNs: 1_000_000, status: "ok" },
  { id: "child", parentId: "root", name: "child-span", startNs: 100_000, durationNs: 500_000, status: "ok" },
  { id: "errored", name: "error-span", startNs: 0, durationNs: 200_000, status: "error" }
];

describe("TraceTimeline", () => {
  it("returns null for empty spans", () => {
    const { container } = render(<TraceTimeline spans={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one row per span", () => {
    const { container } = render(<TraceTimeline spans={spans} />);
    const rows = container.querySelectorAll(".mdx-nb-trace-row");
    expect(rows.length).toBe(3);
  });

  it("renders span names", () => {
    const { container } = render(<TraceTimeline spans={spans} />);
    expect(container.textContent).toContain("root-span");
    expect(container.textContent).toContain("child-span");
    expect(container.textContent).toContain("error-span");
  });

  it("indents child span", () => {
    const { container } = render(<TraceTimeline spans={spans} />);
    const rows = container.querySelectorAll<HTMLElement>(".mdx-nb-trace-row");
    // root = depth 0, child = depth 1
    const childRow = Array.from(rows).find((r) => r.textContent?.includes("child-span"));
    expect(childRow?.style.paddingLeft).toBe("16px");
  });

  it("applies error class for errored spans", () => {
    const { container } = render(<TraceTimeline spans={spans} />);
    const errorDot = container.querySelector(".mdx-nb-trace-dot-error");
    expect(errorDot).toBeTruthy();
  });

  it("formats duration in ms when >= 1_000_000 ns", () => {
    const { container } = render(<TraceTimeline spans={[{ id: "a", name: "a", startNs: 0, durationNs: 1_000_000 }]} />);
    expect(container.textContent).toContain("1.0ms");
  });

  it("formats duration in ns when < 1_000_000 ns", () => {
    const { container } = render(<TraceTimeline spans={[{ id: "a", name: "a", startNs: 0, durationNs: 500 }]} />);
    expect(container.textContent).toContain("500ns");
  });
});
