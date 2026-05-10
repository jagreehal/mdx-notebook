import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CodeBlock } from "../src/code-block.js";

afterEach(cleanup);

describe("CodeBlock", () => {
  it("renders code in a pre>code", () => {
    const { container } = render(<CodeBlock code="const x = 1;" language="ts" />);
    expect(container.querySelector("code.language-ts")).not.toBeNull();
    expect(container.textContent).toContain("const x = 1;");
  });
});
