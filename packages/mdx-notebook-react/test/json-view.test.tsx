import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { JsonView } from "../src/json-view.js";

afterEach(cleanup);

describe("JsonView", () => {
  it("pretty-prints JSON with default indent 2", () => {
    const { container } = render(<JsonView value={{ a: 1 }} />);
    expect(container.textContent).toContain('"a": 1');
  });
  it("falls back to String() for circular values", () => {
    const a: any = {}; a.self = a;
    const { container } = render(<JsonView value={a} />);
    expect(container.firstChild).not.toBeNull();
  });
});
