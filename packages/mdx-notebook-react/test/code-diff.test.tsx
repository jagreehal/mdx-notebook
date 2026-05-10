import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CodeDiff } from "../src/code-diff.js";

afterEach(cleanup);

describe("CodeDiff", () => {
  it("renders default labels Before / After", () => {
    const { container } = render(<CodeDiff before="a\nb" after="a\nc" />);
    const titles = container.querySelectorAll(".mdx-nb-diff-title");
    expect(titles[0]?.textContent).toBe("Before");
    expect(titles[1]?.textContent).toBe("After");
  });

  it("renders custom labels", () => {
    const { container } = render(<CodeDiff before="x" after="y" leftLabel="Old" rightLabel="New" />);
    const titles = container.querySelectorAll(".mdx-nb-diff-title");
    expect(titles[0]?.textContent).toBe("Old");
    expect(titles[1]?.textContent).toBe("New");
  });

  it("applies language class when provided", () => {
    const { container } = render(<CodeDiff before="x" after="y" language="typescript" />);
    const codes = container.querySelectorAll("code");
    expect(codes[0]?.className).toContain("language-typescript");
  });

  it("marks common lines as common", () => {
    const { container } = render(<CodeDiff before={"same\ndiff-before"} after={"same\ndiff-after"} />);
    const common = container.querySelectorAll(".mdx-nb-diff-common");
    // "same" appears in both sides -> 2 common spans
    expect(common.length).toBeGreaterThanOrEqual(2);
  });
});
