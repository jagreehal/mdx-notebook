import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { NotebookCell } from "../src/notebook-cell.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

describe("NotebookCell", () => {
  it("renders code, stdout, and result for an ok cell", () => {
    const m = mkManifest({ a: {
      stdout: [{ ts: 1, stream: "stdout", text: "hello" }],
      result: { n: 1 }
    } });
    const { ui } = withProvider(m, <NotebookCell cellId="a" code="console.log('hi');" language="ts" />);
    const { container } = render(ui);
    expect(container.querySelector("code.language-ts")).not.toBeNull();
    expect(container.textContent).toContain("hello");
    expect(container.textContent).toContain('"n": 1');
  });

  it("renders ipynb outputs when present", () => {
    const m = mkManifest({ a: {
      ipynbOutputs: [{ type: "stream", name: "stdout", text: "from notebook\n" }]
    } });
    const { ui } = withProvider(m, <NotebookCell cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("from notebook");
  });

  it("shows error message when status is error", () => {
    const m = mkManifest({ a: { status: "error", error: { name: "TypeError", message: "boom" } } });
    const { ui } = withProvider(m, <NotebookCell cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("TypeError");
    expect(container.textContent).toContain("boom");
  });

  it("shows timeout message when status is timeout", () => {
    const m = mkManifest({ a: { status: "timeout", durationMs: 30000 } });
    const { ui } = withProvider(m, <NotebookCell cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toMatch(/timed out/);
  });

  it("can hide stdout/result via props", () => {
    const m = mkManifest({ a: { stdout: [{ ts: 1, stream: "stdout", text: "hi" }], result: { n: 1 } } });
    const { ui } = withProvider(m, <NotebookCell cellId="a" showStdout={false} showResult={false} />);
    const { container } = render(ui);
    expect(container.textContent).not.toContain("hi");
    expect(container.textContent).not.toContain('"n"');
  });
});
