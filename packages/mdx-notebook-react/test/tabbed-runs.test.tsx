import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TabbedRuns } from "../src/tabbed-runs.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

const m = mkManifest({
  cell1: { stdout: [{ ts: 1, stream: "stdout", text: "from cell1" }] },
  cell2: { stdout: [{ ts: 1, stream: "stdout", text: "from cell2" }] }
});

describe("TabbedRuns", () => {
  it("returns null for empty cellIds", () => {
    const { ui } = withProvider(m, <TabbedRuns cellIds={[]} />);
    const { container } = render(ui);
    expect(container.firstChild).toBeNull();
  });

  it("renders tabs for each cellId", () => {
    const { ui } = withProvider(m, <TabbedRuns cellIds={["cell1", "cell2"]} />);
    render(ui);
    expect(screen.getByRole("tab", { name: "cell1" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "cell2" })).toBeTruthy();
  });

  it("shows first cell content by default", () => {
    const { ui } = withProvider(m, <TabbedRuns cellIds={["cell1", "cell2"]} />);
    render(ui);
    expect(screen.getByRole("tabpanel").textContent).toContain("from cell1");
    expect(screen.getByRole("tabpanel").textContent).not.toContain("from cell2");
  });

  it("switches content on tab click", () => {
    const { ui } = withProvider(m, <TabbedRuns cellIds={["cell1", "cell2"]} />);
    render(ui);
    fireEvent.click(screen.getByRole("tab", { name: "cell2" }));
    expect(screen.getByRole("tabpanel").textContent).toContain("from cell2");
  });

  it("uses custom labels when provided", () => {
    const { ui } = withProvider(m, <TabbedRuns cellIds={["cell1", "cell2"]} labels={["First", "Second"]} />);
    render(ui);
    expect(screen.getByRole("tab", { name: "First" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Second" })).toBeTruthy();
  });
});
