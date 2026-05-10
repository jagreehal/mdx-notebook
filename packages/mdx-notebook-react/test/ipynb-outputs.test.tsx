import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { IpynbOutputs } from "../src/ipynb-outputs.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

describe("IpynbOutputs", () => {
  it("renders stream output", () => {
    const m = mkManifest({ a: { ipynbOutputs: [{ type: "stream", name: "stdout", text: "hi\n" }] } });
    const { ui } = withProvider(m, <IpynbOutputs cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("hi");
  });

  it("renders text/plain from execute_result", () => {
    const m = mkManifest({ a: { ipynbOutputs: [{ type: "execute_result", data: { "text/plain": "42" } }] } });
    const { ui } = withProvider(m, <IpynbOutputs cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("42");
  });

  it("renders image/png as base64 img", () => {
    const m = mkManifest({ a: { ipynbOutputs: [{ type: "display_data", data: { "image/png": "AAAA" } }] } });
    const { ui } = withProvider(m, <IpynbOutputs cellId="a" />);
    const { container } = render(ui);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.src).toContain("data:image/png;base64,AAAA");
  });

  it("renders error output", () => {
    const m = mkManifest({ a: { ipynbOutputs: [{ type: "error", ename: "ValueError", evalue: "boom", traceback: ["t1", "t2"] }] } });
    const { ui } = withProvider(m, <IpynbOutputs cellId="a" />);
    const { container } = render(ui);
    expect(container.textContent).toContain("ValueError");
    expect(container.textContent).toContain("boom");
  });

  it("renders nothing when no ipynbOutputs", () => {
    const m = mkManifest({ a: {} });
    const { ui } = withProvider(m, <IpynbOutputs cellId="a" />);
    const { container } = render(ui);
    expect(container.firstChild).toBeNull();
  });
});
