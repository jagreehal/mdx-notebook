import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { ResultJSON } from "../src/result-json.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

describe("ResultJSON", () => {
  it("renders the result JSON", () => {
    const m = mkManifest({ a: { result: { hello: "world", n: 42 } } });
    const { ui } = withProvider(m, <ResultJSON cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("hello");
    expect(container.textContent).toContain("42");
  });

  it("re-renders when setResult mutates the store", () => {
    const m = mkManifest({ a: { result: { n: 1 } } });
    const { store, ui } = withProvider(m, <ResultJSON cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("1");
    act(() => { store.setResult("a", { n: 99 }); });
    expect(container.textContent).toContain("99");
  });

  it("renders nothing when result is undefined", () => {
    const m = mkManifest({ a: {} });
    const { ui } = withProvider(m, <ResultJSON cellId="a" />);
    const { container } = render(ui);
    expect(container.firstChild).toBeNull();
  });
});
