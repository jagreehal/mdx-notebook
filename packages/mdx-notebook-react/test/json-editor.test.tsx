import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { JsonEditor } from "../src/json-editor.js";
import { mkManifest, withProvider } from "./test-utils.js";

afterEach(cleanup);

describe("JsonEditor", () => {
  it("shows the result as JSON in the textarea", () => {
    const m = mkManifest({ a: { result: { count: 1 } } });
    const { ui } = withProvider(m, <JsonEditor cellId="a" />);
    render(ui);
    const ta = screen.getByLabelText(/Edit JSON for a/) as HTMLTextAreaElement;
    expect(ta.value).toContain('"count": 1');
  });

  it("calls store.setResult on valid edit", () => {
    const m = mkManifest({ a: { result: { count: 1 } } });
    const { store, ui } = withProvider(m, <JsonEditor cellId="a" />);
    render(ui);
    const ta = screen.getByLabelText(/Edit JSON for a/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: '{"count": 5}' } });
    expect(store.get("a").result).toEqual({ count: 5 });
  });

  it("shows Invalid JSON on bad edit, preserves text", () => {
    const m = mkManifest({ a: { result: { x: 1 } } });
    const { store, ui } = withProvider(m, <JsonEditor cellId="a" />);
    render(ui);
    const ta = screen.getByLabelText(/Edit JSON for a/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "{not json" } });
    expect(screen.getByText(/Invalid JSON/)).toBeTruthy();
    expect(ta.value).toBe("{not json");
    expect(store.get("a").result).toEqual({ x: 1 }); // unchanged
  });
});
