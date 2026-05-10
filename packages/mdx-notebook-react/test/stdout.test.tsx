import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Stdout } from "../src/stdout.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

describe("Stdout", () => {
  it("renders one span per stdout line", () => {
    const m = mkManifest({ a: { stdout: [
      { ts: 1, stream: "stdout", text: "first" },
      { ts: 2, stream: "stdout", text: "second" }
    ] } });
    const { ui } = withProvider(m, <Stdout cellId="a" />);
    render(ui);
    expect(screen.getByRole("code").textContent).toContain("first");
    expect(screen.getByRole("code").textContent).toContain("second");
  });

  it("renders nothing when stdout is empty", () => {
    const m = mkManifest({ a: {} });
    const { ui } = withProvider(m, <Stdout cellId="a" />);
    const { container } = render(ui);
    expect(container.firstChild).toBeNull();
  });
});
