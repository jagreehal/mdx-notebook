import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RunMatrix } from "../src/run-matrix.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

const matrixManifest = mkManifest({
  demo: {
    stdout: [{ ts: 1, stream: "stdout", text: "first variant default" }],
    variants: {
      happy: {
        cellId: "demo",
        status: "ok",
        durationMs: 10,
        exitCode: 0,
        stdout: [{ ts: 1, stream: "stdout", text: "OK path" }],
        stderr: []
      },
      crash: {
        cellId: "demo",
        status: "error",
        durationMs: 5,
        exitCode: 1,
        stdout: [],
        stderr: [{ ts: 2, stream: "stderr", text: "boom" }],
        error: { name: "Crash", message: "boom" }
      }
    }
  } as any
});

describe("RunMatrix", () => {
  it("renders variant tabs", () => {
    const { ui } = withProvider(matrixManifest, <RunMatrix cellId="demo" />);
    render(ui);
    expect(screen.getByRole("tab", { name: /happy/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /crash/i })).toBeTruthy();
  });

  it("shows first variant stdout by default", () => {
    const { ui } = withProvider(matrixManifest, <RunMatrix cellId="demo" />);
    render(ui);
    expect(screen.getByRole("tabpanel").textContent).toContain("OK path");
  });

  it("switches to crash variant on click", () => {
    const { ui } = withProvider(matrixManifest, <RunMatrix cellId="demo" />);
    render(ui);
    fireEvent.click(screen.getByRole("tab", { name: /crash/i }));
    expect(screen.getByRole("tabpanel").textContent).toContain("Crash");
    expect(screen.getByRole("tabpanel").textContent).toContain("boom");
  });

  it("shows error message for crash variant", () => {
    const { ui } = withProvider(matrixManifest, <RunMatrix cellId="demo" />);
    render(ui);
    fireEvent.click(screen.getByRole("tab", { name: /crash/i }));
    const panel = screen.getByRole("tabpanel");
    expect(panel.textContent).toContain("Crash");
    expect(panel.textContent).toContain("boom");
  });

  it("shows no-variants error when cell has no variants", () => {
    const m = mkManifest({ plain: { stdout: [{ ts: 1, stream: "stdout", text: "hi" }] } });
    const { ui } = withProvider(m, <RunMatrix cellId="plain" />);
    render(ui);
    expect(screen.getByText(/no matrix variants/i)).toBeTruthy();
  });

  it("respects showStdout=false", () => {
    const { ui } = withProvider(matrixManifest, <RunMatrix cellId="demo" showStdout={false} />);
    render(ui);
    expect(screen.getByRole("tabpanel").textContent).not.toContain("OK path");
  });
});
