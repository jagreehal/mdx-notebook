import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ModelComparison } from "../src/model-comparison.js";

afterEach(cleanup);

describe("ModelComparison", () => {
  it("renders both sides with titles", () => {
    const left = { title: "GPT-4", content: "GPT-4 response" };
    const right = { title: "Claude", content: "Claude response" };
    const { container } = render(<ModelComparison left={left} right={right} />);
    const titles = container.querySelectorAll(".mdx-nb-compare-title");
    expect(titles).toHaveLength(2);
    expect(titles[0].textContent).toBe("GPT-4");
    expect(titles[1].textContent).toBe("Claude");
    expect(container.querySelector(".mdx-nb-compare")).not.toBeNull();
    expect(container.querySelectorAll(".mdx-nb-compare-side")).toHaveLength(2);
  });

  it("body content rendered as ReactNode (string or JSX)", () => {
    const left = { title: "Model A", content: "Plain string content" };
    const right = {
      title: "Model B",
      content: <span data-testid="jsx-content">JSX content here</span>,
    };
    const { container } = render(<ModelComparison left={left} right={right} />);
    const bodies = container.querySelectorAll(".mdx-nb-compare-body");
    expect(bodies).toHaveLength(2);
    expect(bodies[0].textContent).toBe("Plain string content");
    expect(bodies[1].textContent).toBe("JSX content here");
    expect(container.querySelector('[data-testid="jsx-content"]')).not.toBeNull();
  });
});
