import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DiffRuns } from "../src/diff-runs.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

const m = mkManifest({
  left: { stdout: [{ ts: 1, stream: "stdout", text: "hello" }, { ts: 2, stream: "stdout", text: "world" }] },
  right: { stdout: [{ ts: 1, stream: "stdout", text: "hello" }, { ts: 2, stream: "stdout", text: "there" }] }
});

describe("DiffRuns", () => {
  it("renders both side titles", () => {
    const { ui } = withProvider(m, <DiffRuns left="left" right="right" />);
    render(ui);
    const titles = document.querySelectorAll(".mdx-nb-diff-title");
    expect(titles[0]?.textContent).toBe("left");
    expect(titles[1]?.textContent).toBe("right");
  });

  it("uses custom labels", () => {
    const { ui } = withProvider(m, <DiffRuns left="left" right="right" leftLabel="Before" rightLabel="After" />);
    render(ui);
    const titles = document.querySelectorAll(".mdx-nb-diff-title");
    expect(titles[0]?.textContent).toBe("Before");
    expect(titles[1]?.textContent).toBe("After");
  });

  it("marks common lines with mdx-nb-diff-common", () => {
    const { ui } = withProvider(m, <DiffRuns left="left" right="right" />);
    const { container } = render(ui);
    const common = container.querySelectorAll(".mdx-nb-diff-common");
    // "hello" is in both, so at minimum 2 common spans (one per side)
    expect(common.length).toBeGreaterThanOrEqual(2);
  });

  it("marks unique lines with diff-only classes", () => {
    const { ui } = withProvider(m, <DiffRuns left="left" right="right" />);
    const { container } = render(ui);
    const onlyLeft = container.querySelectorAll(".mdx-nb-diff-only-left");
    const onlyRight = container.querySelectorAll(".mdx-nb-diff-only-right");
    expect(onlyLeft.length).toBeGreaterThan(0);
    expect(onlyRight.length).toBeGreaterThan(0);
  });
});
