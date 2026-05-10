import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Stderr } from "../src/stderr.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

describe("Stderr", () => {
  it("renders one span per stderr line", () => {
    const m = mkManifest({ a: { stderr: [
      { ts: 1, stream: "stderr", text: "warn" },
      { ts: 2, stream: "stderr", text: "err" }
    ] } });
    const { ui } = withProvider(m, <Stderr cellId="a" />);
    render(ui);
    expect(screen.getByRole("code").textContent).toContain("warn");
    expect(screen.getByRole("code").textContent).toContain("err");
  });

  it("applies mdx-nb-stderr class to the pre element", () => {
    const m = mkManifest({ a: { stderr: [
      { ts: 1, stream: "stderr", text: "oops" }
    ] } });
    const { ui } = withProvider(m, <Stderr cellId="a" />);
    const { container } = render(ui);
    const pre = container.querySelector("pre");
    expect(pre?.className).toContain("mdx-nb-stderr");
  });

  it("renders nothing when stderr is empty", () => {
    const m = mkManifest({ a: {} });
    const { ui } = withProvider(m, <Stderr cellId="a" />);
    const { container } = render(ui);
    expect(container.firstChild).toBeNull();
  });
});
