import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { NotebookPage } from "../src/notebook-page.js";
import { Stdout } from "../src/stdout.js";
import { mkManifest } from "./test-utils.js";

afterEach(cleanup);

describe("NotebookPage", () => {
  it("provides a store so children can read cells", () => {
    const m = mkManifest({ a: { stdout: [{ ts: 1, stream: "stdout", text: "hi" }] } });
    render(<NotebookPage manifest={m}><Stdout cellId="a" /></NotebookPage>);
    expect(screen.getByRole("code").textContent).toContain("hi");
  });
});
